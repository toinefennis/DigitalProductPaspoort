import assert from "node:assert/strict";
import test from "node:test";
import express, { type Request } from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { publicGS1Partner, registerLegacyGS1Routes, type LegacyGS1Service } from "../server/gs1-legacy-routes";
import type { gs1Partners } from "../shared/schema";

const fakeKey = "FAKE_PRIVATE_KEY";
const fakeCertificate = "FAKE_PRIVATE_CERTIFICATE";
const partner: typeof gs1Partners.$inferSelect = {
  id: "partner-test", name: "Test partner", gln: "1234567890123",
  endpoint: `https://fake-user:${fakeKey}@example.org/api?tenant=test&apiKey=${fakeKey}&client_secret=${fakeKey}#${fakeCertificate}`,
  apiKey: fakeKey, certificate: fakeCertificate,
  status: "connected", syncEnabled: true, lastSync: null,
  settings: { syncInterval: 15, syncTypes: ["inventory_update"], autoRetry: false },
  createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
};
const routes = [
  ["GET", "/api/gs1/partners"],
  ["POST", "/api/gs1/partners"],
  ["PATCH", "/api/gs1/partners/partner-test"],
  ["POST", "/api/gs1/sync"],
  ["GET", "/api/gs1/sync-events"],
  ["GET", "/api/gs1/sync-status"],
] as const;

async function withServer(
  run: (base: string, calls: string[], inputs: unknown[]) => Promise<void>,
  overrides: Partial<LegacyGS1Service> = {},
) {
  const app = express(); app.use(express.json());
  // Isolated test-only sessions; no bypass is installed in the application.
  app.use((req, _res, next) => {
    const role = req.header("x-test-role");
    if (role) (req as Request & { session?: unknown }).session = {
      user: { id: req.header("x-test-no-id") ? undefined : 17, role },
    };
    next();
  });
  const calls: string[] = [], inputs: unknown[] = [];
  const service: LegacyGS1Service = {
    getAllPartners: async () => { calls.push("partners"); return [partner]; },
    addPartner: async data => { calls.push("add"); inputs.push(data); return partner; },
    updatePartner: async (id, data) => { calls.push("update"); inputs.push({ id, data }); return partner; },
    syncPartner: async id => { calls.push("sync"); inputs.push(id); return "sync-test"; },
    getSyncEvents: async () => { calls.push("events"); return []; },
    getSyncStatus: () => { calls.push("status"); return { isRunning: false, autoSyncEnabled: true }; },
    ...overrides,
  };
  registerLegacyGS1Routes(app, async () => { calls.push("load"); return service; });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls, inputs); }
  finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}
function request(base: string, method: string, path: string, headers: Record<string, string> = {}) {
  return fetch(base + path, {
    method, headers: { ...headers, "content-type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify({
      partnerId: "partner-test", role: "superadmin",
      name: "Test partner", gln: partner.gln, endpoint: partner.endpoint,
      apiKey: fakeKey, certificate: fakeCertificate,
    }) }),
  });
}

test("every legacy GS1 route rejects anonymous requests before even loading the service", async () => {
  await withServer(async (base, calls) => {
    for (const [method, path] of routes) {
      const response = await request(base, method, path, { role: "superadmin" });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.match(response.headers.get("content-type")!, /application\/json/);
      assert.deepEqual(await response.json(), { message: "Not authenticated" });
    }
    assert.deepEqual(calls, []);
  });
});
test("manager, ordinary, missing and unrecognized roles cannot read partners/events/status or trigger writes", async () => {
  await withServer(async (base, calls) => {
    for (const role of ["user", "manager", "Admin", "administrator", "undefined"]) {
      for (const [method, path] of routes) {
        const response = await request(base, method, path, { "x-test-role": role });
        assert.equal(response.status, 403, `${role}: ${method} ${path}`);
        assert.match(response.headers.get("content-type")!, /application\/json/);
      }
    }
    assert.deepEqual(calls, []);
  });
});
test("a role without an authenticated user ID is rejected before service initialization", async () => {
  await withServer(async (base, calls) => {
    for (const [method, path] of routes) {
      assert.equal((await request(base, method, path, { "x-test-role": "admin", "x-test-no-id": "yes" })).status, 401);
    }
    assert.deepEqual(calls, []);
  });
});
test("admin and superadmin retain all existing legacy operations and response statuses", async () => {
  await withServer(async (base, calls, inputs) => {
    for (const role of ["admin", "superadmin"]) {
      for (const [method, path] of routes) {
        const response = await request(base, method, path, { "x-test-role": role });
        assert.equal(response.status, method === "POST" && path.endsWith("/partners") ? 201 : 200);
        assert.match(response.headers.get("content-type")!, /application\/json/);
        const data = await response.json();
        if (path === "/api/gs1/sync") assert.deepEqual(data, { eventId: "sync-test", message: "Sync started successfully" });
        if (path.endsWith("sync-status")) assert.deepEqual(data, { isRunning: false, autoSyncEnabled: true });
        if (path.endsWith("sync-events")) assert.deepEqual(data, []);
      }
    }
    assert.equal(calls.filter(call => call === "load").length, 12);
    assert.equal(calls.filter(call => call === "sync").length, 2);
    const addInput = inputs[0] as Record<string, unknown>;
    assert.equal(addInput.apiKey, fakeKey); assert.equal(addInput.certificate, fakeCertificate);
    assert.equal(inputs[2], "partner-test");
  });
});
test("list, create and update responses never expose API keys, certificates or endpoint credentials", async () => {
  await withServer(async (base) => {
    for (const [method, path] of routes.slice(0, 3)) {
      const response = await request(base, method, path, { "x-test-role": "admin" });
      const raw = await response.text();
      assert.equal(raw.includes(fakeKey), false);
      assert.equal(raw.includes(fakeCertificate), false);
      const data = JSON.parse(raw);
      const view = Array.isArray(data) ? data[0] : data;
      assert.equal("apiKey" in view, false);
      assert.equal("certificate" in view, false);
      assert.equal(view.hasApiKey, true); assert.equal(view.hasCertificate, true);
      assert.equal(view.endpoint, "https://example.org/api?tenant=test");
      assert.deepEqual(view.settings, partner.settings);
    }
    assert.equal(partner.apiKey, fakeKey);
    assert.equal(partner.certificate, fakeCertificate);
    assert.equal(partner.endpoint.includes(fakeKey), true);
  });
});
test("partner allowlisting drops future credential columns and unknown nested settings without modifying storage", () => {
  const stored = {
    ...partner, futureCredential: fakeKey,
    settings: { ...partner.settings, apiKey: fakeKey, nested: { certificate: fakeCertificate }, syncTypes: ["inventory_update", { apiKey: fakeKey }] },
  };
  const before = structuredClone(stored);
  const view = publicGS1Partner(stored as unknown as typeof partner);
  assert.equal(JSON.stringify(view).includes(fakeKey), false);
  assert.equal(JSON.stringify(view).includes(fakeCertificate), false);
  assert.deepEqual(view.settings, partner.settings);
  assert.deepEqual(stored, before);
  assert.equal(publicGS1Partner({ ...partner, apiKey: null, certificate: null }).hasApiKey, false);
  assert.equal(publicGS1Partner({ ...partner, apiKey: null, certificate: null }).hasCertificate, false);
});
test("invalid stored endpoints are not reflected verbatim into public responses", () => {
  assert.equal(publicGS1Partner({ ...partner, endpoint: fakeKey }).endpoint, "[invalid endpoint]");
});
test("errors cannot echo credential-bearing database or upstream messages", async () => {
  const fail = () => { throw new Error(`SQL headers apiKey=${fakeKey}, certificate=${fakeCertificate}`); };
  await withServer(async base => {
    for (const [method, path] of routes) {
      const response = await request(base, method, path, { "x-test-role": "admin" });
      assert.equal(response.status, 500);
      const body = await response.text();
      assert.equal(body.includes(fakeKey), false); assert.equal(body.includes(fakeCertificate), false);
      assert.equal(typeof JSON.parse(body).message, "string");
    }
  }, { getAllPartners: fail, addPartner: fail, updatePartner: fail, syncPartner: fail, getSyncEvents: fail, getSyncStatus: fail });
});
test("missing partners report a JSON 404 on update rather than an empty success", async () => {
  await withServer(async base => {
    const response = await request(base, "PATCH", "/api/gs1/partners/missing", { "x-test-role": "superadmin" });
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), { message: "GS1 partner not found" });
  }, { updatePartner: async () => undefined as never });
});