import assert from "node:assert/strict";
import test from "node:test";
import express, { type Request } from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { GS1NLClient, GS1ApiError } from "../server/gs1-nl-client";
import { registerGS1NLRoutes } from "../server/gs1-nl-routes";
import type { GS1Repository, RecordUpdates } from "../server/gs1-nl-repository";
import { isValidGtin, normalizeGtin, registrationProductSchema, type GS1Job, type GS1Record } from "../shared/gs1";

const gtin = "09506000134352";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const draft = {
  accountNumber: "test-account", identificationKeyType: "Gtin", identificationKey: gtin,
  isEnabled: true, itemDescription: "Test",
  resolverSettings: { useGS1Resolver: true }, links: [],
  applicationIdentifiers: [{ identifier: "21", templateVariable: "serial" }],
};
const product = {
  index: 1, gtin: "1", status: "Concept", gpc: "10000000", consumerUnit: "Ja",
  packagingType: "PK", targetMarketCountry: "Nederland", description: "Test",
  language: "Nederlands", brandName: "Test", netContent: "1", measurementUnit: "Gram", contractNumber: "test",
};
const fixture: GS1Record = {
  id: 1, gtin, environment: "acceptance", productId: null, registryId: null,
  basicData: null, basicDraft: null, digitalLinkData: null, digitalLinkDraft: draft,
  externalReference: null, registrationStatus: "unverified", syncState: "draft", version: 1,
  lastError: null, syncedAt: null, updatedAt: new Date(),
};

function fakeRepo(initial: GS1Record | undefined = fixture): GS1Repository {
  let record = initial ? structuredClone(initial) : undefined;
  const jobs = new Map<string, GS1Job>();
  return {
    listRecords: async () => record ? [record] : [],
    getRecord: async () => record,
    saveRecord: async (code: string, updates: RecordUpdates, version?: number, internal?: boolean) => {
      if (version !== undefined && version !== (record?.version ?? 0)) throw new GS1ApiError(409, "Version conflict");
      if (record?.syncState === "publishing" && !internal) throw new GS1ApiError(409, "Busy");
      record = { ...fixture, ...record, ...updates, gtin: code, version: (record?.version ?? 0) + 1 };
      return record;
    },
    validateLinks: async () => {},
    importProduct: async () => record!,
    listJobs: async () => [...jobs.values()],
    getJob: async id => jobs.get(id),
    saveDraft: async data => {
      const existing = jobs.get(data.id);
      if (existing && existing.status !== "draft") throw new GS1ApiError(409, "Already submitted");
      const job: GS1Job = {
        ...data, environment: "acceptance", productId: null, registryId: null,
        invocationId: null, result: null, status: "draft", lastError: null, createdAt: new Date(), updatedAt: new Date(),
      };
      jobs.set(job.id, job); return job;
    },
    createJob: async data => {
      if (jobs.has(data.id) && jobs.get(data.id)!.status !== "draft") return { job: jobs.get(data.id)!, created: false };
      const job: GS1Job = {
        ...data, environment: "acceptance", productId: null, registryId: null,
        invocationId: null, result: null, status: "submitting", lastError: null, createdAt: new Date(), updatedAt: new Date(),
      };
      jobs.set(job.id, job); return { job, created: true };
    },
    updateJob: async (id, updates) => {
      const job = { ...jobs.get(id)!, ...updates }; jobs.set(id, job); return job;
    },
  };
}
function fakeClient(action: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return new GS1NLClient(() => ({ clientId: "fake-id", clientSecret: "fake-secret" }), (async (url, init) => {
    if (String(url).endsWith("/authorization/token")) return json({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" });
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer fake-token");
    return action(String(url), init!);
  }) as typeof fetch, "acceptance");
}
async function withServer(client: GS1NLClient, repo: GS1Repository, run: (base: string) => Promise<void>) {
  const app = express(); app.use(express.json());
  // Test-only sessions in an isolated HTTP server; not an auth bypass in the app.
  app.use((req, _res, next) => {
    if (req.header("x-test-role")) (req as Request & { session?: any }).session = { user: { id: 17, role: req.header("x-test-role") } };
    next();
  });
  registerGS1NLRoutes(app, client, repo);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/gs1/nl`); }
  finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}
const headers = { "content-type": "application/json", "x-test-role": "manager" };
const post = (base: string, path: string, data: unknown) => fetch(base + path, { method: "POST", headers, body: JSON.stringify(data) });

test("GTIN validation uses official lengths and check digits; normalizes equivalent forms", () => {
  assert.equal(isValidGtin(gtin), true);
  assert.equal(isValidGtin(gtin.slice(0, -1) + "3"), false);
  assert.equal(isValidGtin("200000000000001"), false);
  assert.equal(normalizeGtin(gtin.slice(1)), gtin);
  assert.equal(registrationProductSchema.parse(product).gtin, "1");
  assert.throws(() => registrationProductSchema.parse({ ...product, status: "Active" }));
});
test("token requests use official headers, are deduplicated and never return credentials", async () => {
  let calls = 0;
  const client = new GS1NLClient(() => ({ clientId: "fake-id", clientSecret: "fake-secret" }), (async (url, init) => {
    calls++; assert.equal(String(url), "https://gs1nl-api.gs1.nl/authorization/token");
    assert.equal((init?.headers as any).client_id, "fake-id");
    assert.equal((init?.headers as any).client_secret, "fake-secret");
    assert.equal(init?.method, "POST"); assert.equal(init?.redirect, "error");
    return json({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" });
  }) as typeof fetch, "production");
  await Promise.all([client.authorization(), client.authorization()]);
  await client.authorization(); assert.equal(calls, 1);
});
test("Basic Product Data IN operations use the configured environment hosts", async () => {
  const cases = [
    { environment: "acceptance" as const, auth: "https://gs1nl-api.gs1.nl", basicIn: "https://gs1nl-api.gs1.nl" },
    { environment: "production" as const, auth: "https://gs1nl-api.gs1.nl", basicIn: "https://gs1nl-api.gs1.nl" },
  ];
  for (const { environment, auth, basicIn } of cases) {
    const urls: string[] = [];
    const client = new GS1NLClient(() => ({ clientId: "fake-id", clientSecret: "fake-secret" }), (async url => {
      urls.push(String(url));
      return String(url) === `${auth}/authorization/token`
        ? json({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" })
        : json([]);
    }) as typeof fetch, environment);

    await client.ranges();
    await client.registerProduct(product);
    await client.registrationResults("fake-invocation");

    assert.equal(urls[0], `${auth}/authorization/token`);
    assert.deepEqual(urls.slice(1), [
      `${basicIn}/basic-product-data-in/GtinCodeRanges`,
      `${basicIn}/basic-product-data-in/RegistrateGtinProducts`,
      `${basicIn}/basic-product-data-in/RegistrateProductResults/fake-invocation`,
    ]);
  }
});
test("both settings route every GS1 API family to the verified production host", async () => {
  for (const environment of ["acceptance", "production"] as const) {
  const urls: string[] = [];
  const productionHost = "https://gs1nl-api.gs1.nl";
  const client = new GS1NLClient(() => ({ clientId: "fake-id", clientSecret: "fake-secret" }), (async url => {
    urls.push(String(url));
    return String(url).endsWith("/authorization/token")
      ? json({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" })
      : json([]);
  }) as typeof fetch, environment);

  await client.contracts();
  await client.linkTypes();
  await client.mediaTypes();
  await client.ranges();
  await client.lookup(gtin);
  await client.getDigitalLink(gtin);
  await client.publishDigitalLink(draft);
  await client.registerProduct(product);
  await client.registrationResults("fake-invocation");

  assert.deepEqual(urls, [
    `${productionHost}/authorization/token`,
    `${productionHost}/digitallinkv2/contracts`,
    `${productionHost}/digitallinkv2/linktypes`,
    `${productionHost}/digitallinkv2/mediatypes`,
    `${productionHost}/basic-product-data-in/GtinCodeRanges`,
    `${productionHost}/basic-product-data-out/gtins`,
    `${productionHost}/digitallinkv2/v2/digitalLink/Gtin/${gtin}`,
    `${productionHost}/digitallinkv2/v2/digitallink`,
    `${productionHost}/basic-product-data-in/RegistrateGtinProducts`,
    `${productionHost}/basic-product-data-in/RegistrateProductResults/fake-invocation`,
  ]);
  }
});
test("upstream authentication errors do not leak raw secrets or response bodies", async () => {
  const client = new GS1NLClient(() => ({ clientId: "fake-id", clientSecret: "fake-secret" }),
    (async () => new Response("fake-secret and fake-token", { status: 400 })) as typeof fetch, "acceptance");
  await assert.rejects(client.authorization(), e => e instanceof GS1ApiError && !e.message.includes("fake-secret") && !e.message.includes("fake-token"));
});
test("write timeouts are not automatically retried", async () => {
  let writes = 0;
  const client = fakeClient(() => { writes++; throw new Error("timeout"); });
  await assert.rejects(client.publishDigitalLink(draft), e => e instanceof GS1ApiError && e.status === 504);
  assert.equal(writes, 1);
});
test("successful malformed JSON is rejected instead of silently reporting success", async () => {
  const client = fakeClient(() => new Response("<html>fallback</html>", { status: 200 }));
  await assert.rejects(client.lookup(gtin), e => e instanceof GS1ApiError && e.status === 502);
});
test("all official routes require login and reject ordinary users before calling GS1", async () => {
  const client = fakeClient(() => { throw new Error("must not reach upstream"); });
  await withServer(client, fakeRepo(), async base => {
    for (const path of ["/config", "/records", "/jobs", "/contracts", "/ranges"]) {
      const unauth = await fetch(base + path); assert.equal(unauth.status, 401);
      assert.match(unauth.headers.get("content-type")!, /json/);
      assert.equal((await fetch(base + path, { headers: { "x-test-role": "user" } })).status, 403);
    }
    assert.equal((await post(base, "/test", {})).status, 200);
  });
});
test("lookup preserves all nested and multilingual fields and does not confirm provider-only records", async () => {
  const data = {
    gtin, isComplete: false, gs1License: { Address: { unknownField: ["behoud"] } },
    brandName: [{ language: "nl", value: "Merk" }, { language: "en", value: "Brand" }],
    unknownExtension: { nested: false },
  };
  const repo = fakeRepo(undefined);
  await withServer(fakeClient(() => json([data])), repo, async base => {
    const response = await post(base, "/lookup", { gtin });
    assert.equal(response.status, 200);
    const record = await response.json(); assert.deepEqual(record.basicData, data);
    assert.equal(record.registrationStatus, "unverified");
  });
});
test("local drafts preserve unknown fields and cannot forge remote status or external references", async () => {
  await withServer(fakeClient(() => json({})), fakeRepo(), async base => {
    const data = { brandName: [{ language: "nl", value: "Test" }], extension: { present: false, amount: 0 } };
    const result = await post(base, `/records/${gtin}`, { expectedVersion: 1, basicDraft: data });
    assert.equal(result.status, 200); assert.deepEqual((await result.json()).basicDraft, data);
    assert.equal((await post(base, `/records/${gtin}`, { expectedVersion: 2, registrationStatus: "confirmed" })).status, 400);
    assert.equal((await post(base, `/records/${gtin}`, { expectedVersion: 1, basicDraft: {} })).status, 409);
  });
});
test("Digital Link publishing requires explicit confirmation and matching GTIN", async () => {
  let calls = 0;
  await withServer(fakeClient(() => { calls++; return new Response(null, { status: 200 }); }), fakeRepo(), async base => {
    const path = `/records/${gtin}/digital-link/publish`;
    assert.equal((await post(base, path, { expectedVersion: 1 })).status, 400);
    assert.equal(calls, 0);
    const response = await post(base, path, { expectedVersion: 1, confirm: true });
    assert.equal(response.status, 200);
    const record = await response.json();
    assert.equal(record.syncState, "submitted"); assert.equal(record.registrationStatus, "unverified");
    assert.equal(record.externalReference, null); assert.equal(calls, 1);
  });
});
test("fetch retains an edited Digital Link draft while storing the complete remote snapshot", async () => {
  const remote = { ...draft, itemDescription: "External description", digitalLinkUrl: "https://example.org/01/" + gtin, extra: { preserved: true } };
  await withServer(fakeClient(() => json(remote)), fakeRepo(), async base => {
    const response = await post(base, `/records/${gtin}/digital-link/fetch`, {});
    const record = await response.json();
    assert.deepEqual(record.digitalLinkData, remote); assert.deepEqual(record.digitalLinkDraft, draft);
    assert.equal(record.externalReference, remote.digitalLinkUrl);
  });
});
test("empty Digital Link write responses preserve response-only snapshot fields", async () => {
  const snapshot = { ...draft, digitalLinkUrl: "https://example.org/01/" + gtin, unknown: { licensing: ["behoud"] } };
  await withServer(fakeClient(() => new Response(null, { status: 200 })), fakeRepo({ ...fixture, digitalLinkData: snapshot }), async base => {
    const response = await post(base, `/records/${gtin}/digital-link/publish`, { confirm: true, expectedVersion: 1 });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).digitalLinkData, snapshot);
  });
});
test("unknown Digital Link submissions require explicit readback before another write", async () => {
  let requests = 0;
  await withServer(fakeClient(() => { requests++; throw new Error("timeout"); }), fakeRepo(), async base => {
    const path = `/records/${gtin}/digital-link/publish`;
    assert.equal((await post(base, path, { confirm: true, expectedVersion: 1 })).status, 504);
    const record = await (await fetch(base + `/records/${gtin}`, { headers })).json();
    assert.equal(record.syncState, "unknown");
    assert.equal((await post(base, path, { confirm: true, expectedVersion: record.version })).status, 409);
    assert.equal(requests, 1);
  });
});
test("missing Basic IN permissions prevent submitting or recording a registration job", async () => {
  const repo = fakeRepo();
  await withServer(fakeClient(() => new Response(null, { status: 403 })), repo, async base => {
    const response = await post(base, "/registrations", { requestId: "00000000-0000-4000-8000-000000000017", confirm: true, registrationProduct: product });
    assert.equal(response.status, 403); assert.equal((await repo.listJobs()).length, 0);
  });
});
test("unfinished registration drafts persist locally without a GS1 call or Basic IN rights", async () => {
  const repo = fakeRepo();
  await withServer(fakeClient(() => { throw new Error("no external requests"); }), repo, async base => {
    const draftData = { requestId: "00000000-0000-4000-8000-000000000019", registrationProduct: { gtin: "1", brandName: "" } };
    const response = await post(base, "/registration-drafts", draftData);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "draft");
    const updated = await post(base, "/registration-drafts", { ...draftData, registrationProduct: product });
    assert.deepEqual((await updated.json()).request.registrationProduct, product);
    assert.equal((await repo.listJobs()).length, 1);
  });
});
test("official auto-assignment is asynchronous, idempotent, and confirmed only from successfulProducts", async () => {
  let writes = 0; let polling = 0;
  const repo = fakeRepo();
  const client = fakeClient((url, init) => {
    if (url.endsWith("/GtinCodeRanges")) return json([{ contractNumber: "test", startNumber: "9506000134352", endNumber: "9506000999999" }]);
    if (url.endsWith("/RegistrateGtinProducts")) {
      writes++; assert.deepEqual(JSON.parse(init.body as string), { registrationProducts: [product] });
      return json("invocation-test", 202);
    }
    polling++;
    return polling === 1 ? json({}, 202) : json({ successfulProducts: [{ ...product, gtin }], errorMessages: [] });
  });
  await withServer(client, repo, async base => {
    const data = { requestId: "00000000-0000-4000-8000-000000000017", confirm: true, registrationProduct: product };
    await post(base, "/registration-drafts", { requestId: data.requestId, registrationProduct: { gtin: "1" } });
    const started = await post(base, "/registrations", data);
    assert.equal(started.status, 202); assert.equal((await started.json()).status, "pending");
    await post(base, "/registrations", data); assert.equal(writes, 1);
    assert.equal((await post(base, "/registration-drafts", { requestId: data.requestId, registrationProduct: {} })).status, 409);
    assert.equal((await (await post(base, `/jobs/${data.requestId}/check`, {})).json()).status, "pending");
    assert.equal((await repo.getRecord(gtin))?.registrationStatus, "unverified");
    assert.equal((await (await post(base, `/jobs/${data.requestId}/check`, {})).json()).status, "completed");
    assert.equal((await repo.getRecord(gtin))?.registrationStatus, "confirmed");
  });
});