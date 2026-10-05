import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { apiRequest } from "../client/src/lib/queryClient";
import { insertProductSchema, insertNotificationSchema, type Product, type Event } from "../shared/schema";
import { userNotificationFilter } from "../server/notification-filter";
import { MYSQL_PRODUCT_UPSERT, mysqlProductValues } from "../server/mysql-product-export";

async function captureRequest(data?: unknown, status = 200) {
  const originalFetch = globalThis.fetch;
  let captured: RequestInit = {};
  globalThis.fetch = async (_input, init) => {
    captured = init ?? {};
    return new Response(status === 200 ? "{}" : "Validation failed", { status });
  };
  try {
    await apiRequest("POST", "/api/test", data);
    return captured;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("photo uploads preserve FormData and let the browser set the multipart boundary", async () => {
  const form = new FormData();
  form.append("title", "Test story");
  form.append("photos", new Blob(["photo"], { type: "image/png" }), "test.png");
  const request = await captureRequest(form);
  assert.equal(request.body, form);
  assert.equal(new Headers(request.headers).get("content-type"), null);
  assert.equal(request.credentials, "include");
});

test("JSON requests serialize data and set their content type", async () => {
  const request = await captureRequest({ title: "Test story" });
  assert.equal(request.body, '{"title":"Test story"}');
  assert.equal(new Headers(request.headers).get("content-type"), "application/json");
});

test("JSON requests preserve false and zero", async () => {
  for (const value of [false, 0]) {
    const request = await captureRequest(value);
    assert.equal(request.body, JSON.stringify(value));
  }
});

test("requests with no payload do not add a body or content type", async () => {
  const request = await captureRequest();
  assert.equal(request.body, undefined);
  assert.equal(new Headers(request.headers).get("content-type"), null);
});

test("unsuccessful requests report the server error", async () => {
  await assert.rejects(captureRequest({}, 422), /422: Validation failed/);
});

test("product validation preserves typed JSON arrays, defaults and environmental zero values", () => {
  const parsed = insertProductSchema.parse({
    additionalPhotos: ["/uploads/test.png"],
    sourceGtins: ["2000000000001"],
    careSymbols: [{ symbol: "wash", code: "wash_30", description: "Wash at 30°C", temperature: 30 }],
    carbonFootprintDetailed: { totalKg: 0 },
    repairabilityIndex: 0,
    waterFootprintLiters: "",
  });
  assert.deepEqual(parsed.additionalPhotos, ["/uploads/test.png"]);
  assert.deepEqual(parsed.sourceGtins, ["2000000000001"]);
  assert.equal(parsed.careSymbols?.[0].temperature, 30);
  assert.equal(parsed.carbonFootprintDetailed?.totalKg, 0);
  assert.equal(parsed.repairabilityIndex, 0);
  assert.equal(parsed.waterFootprintLiters, null);
  assert.equal(parsed.name, "Nieuw Product");
  assert.equal(parsed.gtin, undefined);
});

test("invalid product JSON values are rejected rather than reaching storage", () => {
  for (const invalid of [
    { additionalPhotos: [123] },
    { sourceGtins: ["valid", false] },
    { careSymbols: [{ symbol: "wash" }] },
    { carbonFootprintDetailed: { totalKg: "not a number" } },
    { waterFootprintBreakdown: { fiber: "invalid" } },
    { fiberSheddingTestResults: { fibersPerWash: "invalid" } },
  ]) {
    assert.equal(insertProductSchema.safeParse(invalid).success, false);
  }
});

test("notification metadata validates its fields", () => {
  const base = { title: "Update", message: "Test", type: "system" };
  const metadata = { action: "update", oldValue: "old", newValue: "new", changedBy: "test" };
  assert.deepEqual(insertNotificationSchema.parse({ ...base, metadata }).metadata, metadata);
  assert.equal(insertNotificationSchema.safeParse({ ...base, metadata: { action: 123 } }).success, false);
});

test("notification queries always filter by the current user", () => {
  const filter = userNotificationFilter(17);
  assert.ok(filter);
  const query = new PgDialect().sqlToQuery(filter);
  assert.deepEqual(query.params, [17]);
  assert.match(query.sql, /"user_id"/);
});

test("unread notifications retain the user restriction as well as the unread filter", () => {
  const filter = userNotificationFilter(17, true);
  assert.ok(filter);
  const query = new PgDialect().sqlToQuery(filter);
  assert.deepEqual(query.params, [17, false]);
  assert.match(query.sql, /"user_id".*and.*"is_read"/);
});

const date = new Date("2026-01-01T00:00:00Z");
const product: Product = {
  id: 1, gtin: "2000000000001", name: "Test product", type: "kledingstuk",
  status: "beschikbaar", description: null, brand: null, material: "Cotton",
  photoUrl: null, additionalPhotos: [], sourceGtins: [], collection: null,
  story: null, origin: null, washingInstructions: null, co2Footprint: "2.5", esgScore: null,
  materialProperties: {}, gs1Registered: false, repairabilityIndex: 0, durabilityScore: null,
  careSymbols: [], dppUrl: null, qrCodeData: null, carbonFootprintDetailed: {},
  waterFootprintLiters: 0, waterFootprintBreakdown: {}, energyConsumptionKwh: null,
  renewableEnergyPercentage: 0, microplasticSheddingEstimated: null,
  fiberSheddingTestResults: {}, createdAt: date, updatedAt: date,
};
const event: Event = {
  id: 1, productId: 1, eventType: "reparatie", description: "Test repair", photoUrl: null,
  loanReference: null, expectedReturn: null, returnCondition: null, returnNotes: null,
  borrowerName: null, borrowerEmail: null, borrowerPhone: null, borrowerAddress: null, createdAt: date,
};

function exportRow(value: Product, events: Event[] = []) {
  const match = MYSQL_PRODUCT_UPSERT.match(/INSERT INTO products\s*\(([\s\S]*?)\)\s*VALUES/);
  assert.ok(match);
  const columns = match[1].split(",").map(column => column.trim());
  const values = mysqlProductValues(value, events);
  assert.equal(values.length, columns.length);
  assert.equal(values.length, (MYSQL_PRODUCT_UPSERT.match(/\?/g) ?? []).length);
  assert.ok(values.every(item => item !== undefined));
  return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
}

test("MySQL export uses actual product fields and preserves legacy MySQL-only columns", () => {
  const row = exportRow(product);
  assert.equal(row.gtin, product.gtin);
  assert.deepEqual(JSON.parse(String(row.materials)), ["Cotton"]);
  assert.equal(row.carbon_footprint, 2.5);
  assert.equal(row.water_footprint_liters, 0);
  assert.equal(row.created_at, date);
  assert.doesNotMatch(MYSQL_PRODUCT_UPSERT, /\b(location|owner_id|sustainability_score)\b/);
});

test("MySQL repair history comes only from repair events for the exported product", () => {
  const row = exportRow(product, [
    event,
    { ...event, id: 2, eventType: "creatie" },
    { ...event, id: 3, productId: 2 },
  ]);
  const history = JSON.parse(String(row.repair_history));
  assert.equal(history.length, 1);
  assert.equal(history[0].id, event.id);
});

test("structured carbon data takes precedence and preserves zero; unknown values remain null", () => {
  assert.equal(exportRow({ ...product, carbonFootprintDetailed: { totalKg: 0 } }).carbon_footprint, 0);
  assert.equal(exportRow({ ...product, co2Footprint: null }).carbon_footprint, null);
});

test("MySQL export explicitly rejects nonnumeric carbon values", () => {
  assert.throws(() => exportRow({ ...product, co2Footprint: "unknown" }), /finite number/);
});