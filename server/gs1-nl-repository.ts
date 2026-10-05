import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { gs1NlRecords, gs1NlJobs, products, gtinRegistry } from "../shared/schema";
import type { GS1Data, GS1Environment, GS1Job, GS1Record } from "../shared/gs1";
import { GS1ApiError } from "./gs1-nl-client";
import { generateAndSaveQRCode } from "./qrcode-generator";
import { isDeepStrictEqual } from "node:util";

export type RecordUpdates = Partial<Omit<GS1Record, "id" | "gtin" | "environment" | "version" | "updatedAt">>;
export interface GS1Repository {
  listRecords(): Promise<GS1Record[]>;
  getRecord(gtin: string): Promise<GS1Record | undefined>;
  saveRecord(gtin: string, updates: RecordUpdates, expectedVersion?: number, internal?: boolean): Promise<GS1Record>;
  validateLinks(gtin: string, productId?: number | null, registryId?: number | null): Promise<void>;
  importProduct(gtin: string, name: string, type: string, expectedVersion: number): Promise<GS1Record>;
  listJobs(): Promise<GS1Job[]>;
  getJob(id: string): Promise<GS1Job | undefined>;
  createJob(data: Pick<GS1Job, "id" | "userId" | "request">): Promise<{ job: GS1Job; created: boolean }>;
  saveDraft(data: Pick<GS1Job, "id" | "userId" | "request">): Promise<GS1Job>;
  updateJob(id: string, updates: Partial<Pick<GS1Job, "status" | "result" | "lastError" | "invocationId">>): Promise<GS1Job>;
}

export function gtinVariants(gtin: string) {
  return [14, 13, 12, 8].map(length => gtin.slice(-length)).filter(v => v.padStart(14, "0") === gtin);
}

export class GS1NLRepository implements GS1Repository {
  constructor(private environment: GS1Environment) {}

  private recordFilter(gtin: string) {
    return and(eq(gs1NlRecords.gtin, gtin), eq(gs1NlRecords.environment, this.environment));
  }
  private jobFilter(id: string) {
    return and(eq(gs1NlJobs.id, id), eq(gs1NlJobs.environment, this.environment));
  }
  async listRecords() {
    return db.select().from(gs1NlRecords).where(eq(gs1NlRecords.environment, this.environment)).orderBy(desc(gs1NlRecords.updatedAt));
  }
  async getRecord(gtin: string) {
    const [record] = await db.select().from(gs1NlRecords).where(this.recordFilter(gtin));
    return record;
  }
  async saveRecord(gtin: string, updates: RecordUpdates, expectedVersion?: number, internal = false) {
    const current = await this.getRecord(gtin);
    if (expectedVersion !== undefined && expectedVersion !== (current?.version ?? 0)) {
      throw new GS1ApiError(409, "Deze GS1-gegevens zijn ondertussen gewijzigd. Laad de nieuwste versie opnieuw.");
    }
    if (current?.syncState === "publishing" && !internal) {
      throw new GS1ApiError(409, "Er loopt al een GS1-aanvraag voor deze GTIN.");
    }
    const syncedAt = updates.syncedAt === null ? null : updates.syncedAt === undefined ? undefined : new Date(updates.syncedAt);
    const changes = { ...updates, syncedAt, updatedAt: new Date() };
    if (!current) {
      const [created] = await db.insert(gs1NlRecords).values({
        ...changes, gtin, environment: this.environment,
      }).onConflictDoNothing().returning();
      if (!created) throw new GS1ApiError(409, "Deze GTIN is ondertussen toegevoegd. Laad opnieuw.");
      return created;
    }
    const [record] = await db.update(gs1NlRecords).set({ ...changes, version: current.version + 1 })
      .where(and(this.recordFilter(gtin), eq(gs1NlRecords.version, current.version))).returning();
    if (!record) throw new GS1ApiError(409, "Deze GS1-gegevens zijn ondertussen gewijzigd. Laad opnieuw.");
    return record;
  }
  async validateLinks(gtin: string, productId?: number | null, registryId?: number | null) {
    for (const [id, table, label] of [[productId, products, "Product"], [registryId, gtinRegistry, "GTIN-register"]] as const) {
      if (id == null) continue;
      const [record] = await db.select({ gtin: table.gtin }).from(table).where(eq(table.id, id));
      if (!record) throw new GS1ApiError(404, `${label} niet gevonden.`);
      if (record.gtin.padStart(14, "0") !== gtin) {
        throw new GS1ApiError(400, `${label} heeft een andere GTIN. Bestaande productcodes worden niet stilzwijgend vervangen.`);
      }
    }
  }
  async importProduct(gtin: string, name: string, type: string, expectedVersion: number) {
    const record = await this.getRecord(gtin);
    if (!record) throw new GS1ApiError(404, "GS1-record niet gevonden.");
    if (record.version !== expectedVersion || record.syncState === "publishing") {
      throw new GS1ApiError(409, "Laad de nieuwste GS1-gegevens opnieuw.");
    }
    const qr = await generateAndSaveQRCode(gtin);
    return db.transaction(async tx => {
      const [locked] = await tx.select().from(gs1NlRecords).where(and(this.recordFilter(gtin), eq(gs1NlRecords.version, expectedVersion))).for("update");
      if (!locked) throw new GS1ApiError(409, "Deze GS1-gegevens zijn ondertussen gewijzigd.");
      const [existing] = await tx.select().from(products).where(inArray(products.gtin, gtinVariants(gtin)));
      // Do not overwrite an existing local product with external data.
      const [product] = existing ? [existing] : await tx.insert(products).values({
        gtin, name, type, gs1Registered: record.registrationStatus === "confirmed",
        ...qr,
      }).returning();
      if (existing && record.registrationStatus === "confirmed" && !existing.gs1Registered) {
        await tx.update(products).set({ gs1Registered: true, updatedAt: new Date() }).where(eq(products.id, existing.id));
      }
      const [existingRegistry] = await tx.select().from(gtinRegistry).where(inArray(gtinRegistry.gtin, gtinVariants(gtin)));
      const [registry] = existingRegistry ? [existingRegistry] : await tx.insert(gtinRegistry).values({
        gtin, productName: name, uniqueProductId: qr.dppUrl,
      }).returning();
      const [updated] = await tx.update(gs1NlRecords).set({
        productId: product.id, registryId: registry.id, version: expectedVersion + 1, updatedAt: new Date(),
      }).where(and(this.recordFilter(gtin), eq(gs1NlRecords.version, expectedVersion))).returning();
      return updated;
    });
  }
  async listJobs() {
    return db.select().from(gs1NlJobs).where(eq(gs1NlJobs.environment, this.environment)).orderBy(desc(gs1NlJobs.createdAt));
  }
  async getJob(id: string) {
    const [job] = await db.select().from(gs1NlJobs).where(this.jobFilter(id));
    return job;
  }
  async createJob(data: Pick<GS1Job, "id" | "userId" | "request">) {
    const [job] = await db.insert(gs1NlJobs).values({
      ...data, environment: this.environment, status: "submitting",
    }).onConflictDoUpdate({
      target: gs1NlJobs.id,
      set: { status: "submitting", request: data.request, updatedAt: new Date() },
      setWhere: and(eq(gs1NlJobs.status, "draft"), eq(gs1NlJobs.userId, data.userId), eq(gs1NlJobs.environment, this.environment)),
    }).returning();
    if (job) return { job, created: true };
    const existing = await this.getJob(data.id);
    if (!existing || existing.userId !== data.userId || !isDeepStrictEqual(existing.request, data.request)) {
      throw new GS1ApiError(409, "Dit aanvraagnummer is al gebruikt voor een andere aanvraag.");
    }
    return { job: existing, created: false };
  }
  async saveDraft(data: Pick<GS1Job, "id" | "userId" | "request">) {
    const [job] = await db.insert(gs1NlJobs).values({
      ...data, environment: this.environment, status: "draft",
    }).onConflictDoUpdate({
      target: gs1NlJobs.id,
      set: { request: data.request, updatedAt: new Date() },
      setWhere: and(eq(gs1NlJobs.status, "draft"), eq(gs1NlJobs.userId, data.userId), eq(gs1NlJobs.environment, this.environment)),
    }).returning();
    if (!job) throw new GS1ApiError(409, "Deze aanvraag is al ingediend of hoort bij een andere gebruiker/omgeving. Maak een nieuw concept.");
    return job;
  }
  async updateJob(id: string, updates: Partial<Pick<GS1Job, "status" | "result" | "lastError" | "invocationId">>) {
    const [job] = await db.update(gs1NlJobs).set({ ...updates, updatedAt: new Date() }).where(this.jobFilter(id)).returning();
    return job;
  }
}