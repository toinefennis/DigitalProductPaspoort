import type { Express, Request, Response, RequestHandler } from "express";
import type { GS1SyncService } from "./gs1-service";
import type { gs1Partners } from "../shared/schema";

type Partner = typeof gs1Partners.$inferSelect;
export type LegacyGS1Service = Pick<GS1SyncService,
  "getAllPartners" | "addPartner" | "updatePartner" | "syncPartner" | "getSyncEvents" | "getSyncStatus">;

function publicEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    url.username = "";
    url.password = "";
    // Keep non-secret configuration parameters, but never expose embedded credentials.
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(?:api[_-]?key|access[_-]?token|client[_-]?secret|token|secret|password|authorization|certificate|key)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "[invalid endpoint]";
  }
}

export function publicGS1Partner(partner: Partner) {
  // Explicit allowlist: future credential columns cannot accidentally become public.
  const settings = partner.settings;
  return {
    id: partner.id, name: partner.name, gln: partner.gln,
    endpoint: publicEndpoint(partner.endpoint), status: partner.status,
    syncEnabled: partner.syncEnabled, lastSync: partner.lastSync,
    createdAt: partner.createdAt, updatedAt: partner.updatedAt,
    settings: settings ? {
      ...(typeof settings.syncInterval === "number" ? { syncInterval: settings.syncInterval } : {}),
      ...(Array.isArray(settings.syncTypes) ? { syncTypes: settings.syncTypes.filter(value => typeof value === "string") } : {}),
      ...(typeof settings.autoRetry === "boolean" ? { autoRetry: settings.autoRetry } : {}),
    } : {},
    hasApiKey: Boolean(partner.apiKey),
    hasCertificate: Boolean(partner.certificate),
  };
}

function adminOnly(
  service: () => Promise<LegacyGS1Service>,
  failureMessage: string,
  handler: (req: Request, res: Response, service: LegacyGS1Service) => Promise<void>,
): RequestHandler {
  return async (req, res) => {
    const user = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session?.user;
    if (!user?.id) { res.status(401).json({ message: "Not authenticated" }); return; }
    if (user.role !== "admin" && user.role !== "superadmin") {
      res.status(403).json({ message: "Insufficient permissions. Only administrators can manage GS1 integrations." });
      return;
    }
    // Authorize before loading the service, reading any rows or making network calls.
    try { await handler(req, res, await service()); }
    catch {
      // Database/network errors may contain credentials; never echo or log their raw content.
      res.status(500).json({ message: failureMessage });
    }
  };
}

export function registerLegacyGS1Routes(app: Express, service: () => Promise<LegacyGS1Service>) {
  app.get("/api/gs1/partners", adminOnly(service, "Failed to fetch GS1 partners", async (_req, res, gs1) => {
    res.json((await gs1.getAllPartners()).map(publicGS1Partner));
  }));
  app.post("/api/gs1/partners", adminOnly(service, "Failed to add GS1 partner", async (req, res, gs1) => {
    res.status(201).json(publicGS1Partner(await gs1.addPartner(req.body)));
  }));
  app.patch("/api/gs1/partners/:id", adminOnly(service, "Failed to update GS1 partner", async (req, res, gs1) => {
    const partner = await gs1.updatePartner(req.params.id, req.body);
    if (!partner) { res.status(404).json({ message: "GS1 partner not found" }); return; }
    res.json(publicGS1Partner(partner));
  }));
  app.post("/api/gs1/sync", adminOnly(service, "Failed to start sync", async (req, res, gs1) => {
    const eventId = await gs1.syncPartner(req.body.partnerId);
    res.json({ eventId, message: "Sync started successfully" });
  }));
  app.get("/api/gs1/sync-events", adminOnly(service, "Failed to fetch sync events", async (_req, res, gs1) => {
    res.json(await gs1.getSyncEvents());
  }));
  app.get("/api/gs1/sync-status", adminOnly(service, "Failed to fetch sync status", async (_req, res, gs1) => {
    res.json(gs1.getSyncStatus());
  }));
}