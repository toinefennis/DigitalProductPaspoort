import type { Express, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { digitalLinkSchema, gtinSchema, normalizeGtin, registrationProductSchema, type GS1Data } from "../shared/gs1";
import { GS1ApiError, type GS1NLClient } from "./gs1-nl-client";
import type { GS1Repository } from "./gs1-nl-repository";
import { isDeepStrictEqual } from "node:util";

const prefix = "/api/gs1/nl";
const revision = z.number().int().nonnegative();
const referenceId = z.number().int().positive().nullable().optional();
const saveSchema = z.object({
  expectedVersion: revision,
  productId: referenceId,
  registryId: referenceId,
  basicDraft: z.record(z.unknown()).nullable().optional(),
  digitalLinkDraft: z.record(z.unknown()).nullable().optional(),
}).strict();
const confirmation = z.object({ confirm: z.literal(true), expectedVersion: revision }).strict();
const registrationSchema = z.object({
  requestId: z.string().uuid(), confirm: z.literal(true),
  registrationProduct: registrationProductSchema,
}).strict();

function permitted(handler: (req: Request, res: Response, userId: number) => Promise<void>): RequestHandler {
  return async (req, res) => {
    const user = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session?.user;
    if (!user?.id) { res.status(401).json({ message: "Niet ingelogd." }); return; }
    if (!["manager", "admin", "superadmin"].includes(user.role ?? "")) {
      res.status(403).json({ message: "GS1-beheer is alleen toegankelijk voor managers en beheerders." }); return;
    }
    try { await handler(req, res, user.id); }
    catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ message: "Controleer de GS1-velden.", issues: e.issues.map(i => ({ path: i.path, message: i.message })) });
      } else if (e instanceof GS1ApiError) {
        res.status([400, 401, 403, 404, 409, 429, 503, 504].includes(e.status) ? e.status : 502).json({ message: e.message, gs1Status: e.status });
      } else {
        // Errors may contain SQL values or upstream credentials; do not echo or log them.
        res.status(500).json({ message: "Opslaan of verwerken van GS1-gegevens is mislukt." });
      }
    }
  };
}

function payloadObject(data: unknown): GS1Data {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new GS1ApiError(502, "GS1 gaf een onverwacht gegevensformaat terug.");
  return data as GS1Data;
}

export function registerGS1NLRoutes(app: Express, client: GS1NLClient, repo: GS1Repository) {
  const dppBaseUrl = (process.env.PUBLIC_DPP_BASE_URL || "https://dpp.gwcirculair.nl").replace(/\/$/, "");
  app.get(`${prefix}/config`, permitted(async (_req, res) => {
    res.json({ environment: client.environment, baseUrl: client.baseUrl, credentialsConfigured: client.configured, dppBaseUrl });
  }));
  app.post(`${prefix}/test`, permitted(async (_req, res) => { res.json(await client.testConnection()); }));
  for (const [path, action] of [
    ["contracts", () => client.contracts()], ["ranges", () => client.ranges()],
    ["link-types", () => client.linkTypes()], ["media-types", () => client.mediaTypes()],
  ] as const) {
    app.get(`${prefix}/${path}`, permitted(async (_req, res) => { res.json(await action()); }));
  }
  app.get(`${prefix}/records`, permitted(async (_req, res) => { res.json(await repo.listRecords()); }));
  app.get(`${prefix}/records/:gtin`, permitted(async (req, res) => {
    const record = await repo.getRecord(normalizeGtin(req.params.gtin));
    if (!record) throw new GS1ApiError(404, "GS1-record niet gevonden.");
    res.json(record);
  }));
  app.post(`${prefix}/lookup`, permitted(async (req, res) => {
    const gtin = normalizeGtin(z.object({ gtin: gtinSchema }).parse(req.body).gtin);
    const result = await client.lookup(gtin);
    if (!Array.isArray(result)) throw new GS1ApiError(502, "GS1 gaf geen lijst met GTIN-gegevens terug.");
    const data = result.find(d => typeof d?.gtin === "string" && d.gtin.padStart(14, "0") === gtin);
    if (!data) throw new GS1ApiError(404, "Deze GTIN is niet gevonden bij GS1.");
    // A provider-only response is not proof that the product is registered.
    const complete = data.isComplete === true && data.gtinRecordStatus === "OK";
    res.json(await repo.saveRecord(gtin, {
      basicData: data, ...(complete ? { registrationStatus: "confirmed" } : {}),
      syncedAt: new Date(), lastError: null,
    }));
  }));
  app.post(`${prefix}/records/:gtin`, permitted(async (req, res) => {
    const gtin = normalizeGtin(req.params.gtin);
    const { expectedVersion, ...updates } = saveSchema.parse(req.body);
    await repo.validateLinks(gtin, updates.productId, updates.registryId);
    // Saving an unfinished draft is allowed; only the external-submit action requires all fields.
    res.json(await repo.saveRecord(gtin, updates, expectedVersion));
  }));
  app.post(`${prefix}/records/:gtin/import`, permitted(async (req, res) => {
    const data = z.object({
      name: z.string().trim().min(1).max(255),
      type: z.enum(["kledingstuk", "materiaal", "remake", "overig"]).default("overig"),
      expectedVersion: revision.optional(),
    }).strict().parse(req.body);
    const gtin = normalizeGtin(req.params.gtin);
    const current = await repo.getRecord(gtin);
    if (!current) throw new GS1ApiError(404, "GS1-record niet gevonden.");
    res.json(await repo.importProduct(gtin, data.name, data.type, data.expectedVersion ?? current.version));
  }));
  app.post(`${prefix}/records/:gtin/digital-link/fetch`, permitted(async (req, res) => {
    const gtin = normalizeGtin(req.params.gtin);
    const data = payloadObject(await client.getDigitalLink(gtin));
    if (typeof data.identificationKey !== "string" || data.identificationKey.padStart(14, "0") !== gtin || data.identificationKeyType !== "Gtin") {
      throw new GS1ApiError(502, "GS1 gaf een Digital Link voor een andere identificatie terug.");
    }
    const draft: GS1Data = { ...data };
    delete draft.digitalLinkUrl;
    draft.links = data.links?.map(({ linkTypeTitle: _readOnly, ...link }: GS1Data) => link);
    draft.applicationIdentifiers = data.applicationIdentifiers?.map(({ name: _readOnly, ...identifier }: GS1Data) => identifier);
    const current = await repo.getRecord(gtin);
    res.json(await repo.saveRecord(gtin, {
      digitalLinkData: data,
      ...(!current?.digitalLinkDraft ? { digitalLinkDraft: draft } : {}),
      externalReference: typeof data.digitalLinkUrl === "string" ? data.digitalLinkUrl : null,
      syncState: "fetched",
      syncedAt: new Date(), lastError: null,
    }));
  }));
  app.post(`${prefix}/records/:gtin/digital-link/publish`, permitted(async (req, res) => {
    const gtin = normalizeGtin(req.params.gtin);
    const { expectedVersion } = confirmation.parse(req.body);
    const current = await repo.getRecord(gtin);
    if (!current) throw new GS1ApiError(404, "Sla eerst een Digital Link-concept op.");
    if (current.syncState === "unknown") {
      throw new GS1ApiError(409, "De vorige aanvraag is mogelijk al verwerkt. Haal eerst de Digital Link bij GS1 op en controleer het resultaat.");
    }
    const draft = digitalLinkSchema.parse(current.digitalLinkDraft);
    if (normalizeGtin(draft.identificationKey) !== gtin) throw new GS1ApiError(400, "De Digital Link-identificatie moet overeenkomen met deze GTIN.");
    await repo.validateLinks(gtin, current.productId, current.registryId);
    // Ensure the default DPP link points at an actual local product passport.
    if (draft.links?.some(link => link.targetUrl.startsWith(dppBaseUrl + "/dpp/")) && !current.productId) {
      throw new GS1ApiError(400, "Koppel of importeer eerst een lokaal product voor deze DPP-link.");
    }
    for (const link of draft.links ?? []) {
      if (!link.targetUrl.startsWith(dppBaseUrl + "/dpp/")) continue;
      const targetGtin = new URL(link.targetUrl).pathname.split("/")[2];
      if (!gtinSchema.safeParse(targetGtin).success || normalizeGtin(targetGtin) !== gtin) {
        throw new GS1ApiError(400, "De DPP-link moet naar het lokale product met dezelfde GTIN verwijzen.");
      }
    }
    const pending = await repo.saveRecord(gtin, { syncState: "publishing", lastError: null }, expectedVersion);
    try {
      await client.publishDigitalLink({ ...draft, identificationKey: gtin });
      // The documented write response is empty. Retain the submitted data and do not invent a resolver URL.
      res.json(await repo.saveRecord(gtin, {
        // The saved draft contains the submitted request. Preserve the complete last fetched
        // snapshot (including response-only/extension fields) until an explicit readback.
        syncState: "submitted",
        syncedAt: new Date(), lastError: null,
      }, pending.version, true));
    } catch (e) {
      await repo.saveRecord(gtin, {
        syncState: e instanceof GS1ApiError && e.status < 500 ? "error" : "unknown",
        lastError: e instanceof GS1ApiError ? e.message : "De GS1-aanvraag is mogelijk al verwerkt. Controleer bij GS1.",
      }, pending.version, true);
      throw e;
    }
  }));

  app.get(`${prefix}/jobs`, permitted(async (_req, res) => { res.json(await repo.listJobs()); }));
  app.post(`${prefix}/registration-drafts`, permitted(async (req, res, userId) => {
    const data = z.object({
      requestId: z.string().uuid(),
      registrationProduct: z.record(z.unknown()),
    }).strict().parse(req.body);
    res.json(await repo.saveDraft({
      id: data.requestId, userId, request: { registrationProduct: data.registrationProduct },
    }));
  }));
  app.post(`${prefix}/registrations`, permitted(async (req, res, userId) => {
    const data = registrationSchema.parse(req.body);
    const previous = await repo.getJob(data.requestId);
    if (previous && previous.status !== "draft") {
      if (previous.userId !== userId || !isDeepStrictEqual(previous.request, { registrationProduct: data.registrationProduct })) {
        throw new GS1ApiError(409, "Dit aanvraagnummer is al in gebruik.");
      }
      res.json(previous); return;
    }
    if (previous && previous.userId !== userId) throw new GS1ApiError(403, "Dit registratieconcept hoort bij een andere gebruiker.");
    const rawRanges = await client.ranges(); // Fails explicitly if the Basic IN subscription is missing.
    const ranges = Array.isArray(rawRanges) ? rawRanges : [rawRanges];
    const item = data.registrationProduct;
    const matching = ranges.filter(r => r?.contractNumber === item.contractNumber);
    if (!matching.length) throw new GS1ApiError(400, "Het contract hoort niet bij de opgehaalde GS1-codereeksen.");
    if (item.gtin !== "1") {
      const normalized = normalizeGtin(item.gtin);
      if (!matching.some(r => /^\d+$/.test(r.startNumber ?? "") && /^\d+$/.test(r.endNumber ?? "") &&
        BigInt(normalized) >= BigInt(r.startNumber) && BigInt(normalized) <= BigInt(r.endNumber))) {
        throw new GS1ApiError(400, "De GTIN valt buiten de GS1-codereeks van dit contract.");
      }
    }
    const { job, created } = await repo.createJob({
      id: data.requestId, userId, request: { registrationProduct: item },
    });
    if (!created) { res.json(job); return; }
    try {
      const result = await client.registerProduct(item);
      if (result.status !== 202 || typeof result.data !== "string" || !result.data) {
        throw new GS1ApiError(502, "GS1 gaf geen geldig registratie-aanvraagnummer terug. Controleer bij GS1 voordat je opnieuw indient.");
      }
      res.status(202).json(await repo.updateJob(job.id, { invocationId: result.data, status: "pending" }));
    } catch (e) {
      await repo.updateJob(job.id, {
        status: e instanceof GS1ApiError && e.status < 500 ? "rejected" : "unknown",
        lastError: e instanceof GS1ApiError ? e.message : "De GS1-aanvraag is mogelijk al verwerkt.",
      });
      throw e;
    }
  }));
  app.post(`${prefix}/jobs/:id/check`, permitted(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const job = await repo.getJob(id);
    if (!job) throw new GS1ApiError(404, "GS1-aanvraag niet gevonden.");
    if (!job.invocationId) throw new GS1ApiError(409, "Geen GS1-aanvraagnummer beschikbaar. Controleer deze aanvraag in MyGS1; dien hem niet automatisch opnieuw in.");
    if (job.status === "completed" || job.status === "rejected") { res.json(job); return; }
    const response = await client.registrationResults(job.invocationId);
    if (response.status === 202) { res.json(job); return; }
    const data = payloadObject(response.data);
    if (!Array.isArray(data.successfulProducts) || !Array.isArray(data.errorMessages)) {
      throw new GS1ApiError(502, "GS1 gaf geen herkenbaar registratieresultaat terug.");
    }
    for (const product of data.successfulProducts) {
      if (product.index !== 1) continue;
      const gtin = normalizeGtin(product.gtin);
      const current = await repo.getRecord(gtin);
      await repo.saveRecord(gtin, {
        ...(!current?.basicDraft ? { basicDraft: product } : {}),
        registrationStatus: "confirmed", syncedAt: new Date(), lastError: null,
      });
    }
    const successful = data.successfulProducts.some((p: GS1Data) => p.index === 1);
    const rejected = data.errorMessages.some((e: GS1Data) => e.index === 1);
    res.json(await repo.updateJob(id, {
      result: data, status: successful ? "completed" : rejected ? "rejected" : "pending",
    }));
  }));
}