import assert from "node:assert/strict";
import test from "node:test";
import express, { type Request } from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { InsertNotification, Notification, Product } from "../shared/schema";
import { registerNotificationRoutes, type NotificationStorage } from "../server/notification-routes";

const fixture: Notification = {
  id: 1, userId: 17, title: "Test", message: "Test", type: "system",
  isRead: false, productId: 1, metadata: {}, createdAt: new Date("2026-01-01"),
};
const product: Product = {
  id: 1, gtin: "2000000000001", name: "Test", type: "product", status: "beschikbaar",
  description: null, brand: null, material: null, photoUrl: null, additionalPhotos: [],
  sourceGtins: [], collection: null, story: null, origin: null, washingInstructions: null,
  co2Footprint: null, esgScore: null, materialProperties: {}, gs1Registered: false,
  repairabilityIndex: null, durabilityScore: null, careSymbols: [], dppUrl: null,
  qrCodeData: null, carbonFootprintDetailed: {}, waterFootprintLiters: null,
  waterFootprintBreakdown: {}, energyConsumptionKwh: null, renewableEnergyPercentage: null,
  microplasticSheddingEstimated: null, fiberSheddingTestResults: {},
  createdAt: fixture.createdAt, updatedAt: fixture.createdAt,
};

async function withServer(
  overrides: Partial<NotificationStorage>,
  run: (base: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  // Fake sessions exist only in this isolated test server, never in the app.
  app.use((req, _res, next) => {
    const id = req.header("x-test-user");
    if (id) {
      (req as Request & { session?: { user: { id: number } } }).session = { user: { id: Number(id) } };
    }
    next();
  });
  const storage: NotificationStorage = {
    getUserNotifications: async () => [],
    getProduct: async () => product,
    createNotification: async data => ({ ...fixture, ...data }),
    markNotificationAsRead: async () => true,
    markAllNotificationsAsRead: async () => {},
    ...overrides,
  };
  registerNotificationRoutes(app, storage);
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
const userHeaders = { "x-test-user": "17", "content-type": "application/json" };

test("all notification actions reject unauthenticated requests with JSON", async () => {
  await withServer({}, async base => {
    for (const [method, path] of [
      ["GET", "/api/notifications"], ["POST", "/api/notifications"],
      ["PATCH", "/api/notifications/mark-all-read"], ["PATCH", "/api/notifications/1/read"],
    ]) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, 401);
      assert.match(response.headers.get("content-type") ?? "", /application\/json/);
      assert.equal((await response.json()).message, "Not authenticated");
    }
  });
});

test("notification lists derive their owner from the session, not request parameters", async () => {
  await withServer({
    getUserNotifications: async (userId, unreadOnly) => {
      assert.equal(userId, 17);
      assert.equal(unreadOnly, true);
      return [fixture];
    },
  }, async base => {
    const response = await fetch(base + "/api/notifications?userId=99&unreadOnly=true", { headers: userHeaders });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data[0].userId, 17);
  });
});

test("creating notifications sets the session owner and server-generated title", async () => {
  let created: InsertNotification | undefined;
  await withServer({
    createNotification: async data => {
      created = data;
      return { ...fixture, ...data };
    },
  }, async base => {
    const response = await fetch(base + "/api/notifications", {
      method: "POST", headers: userHeaders,
      body: JSON.stringify({ productId: 1, type: "maintenance", message: "Test maintenance", userId: 99 }),
    });
    assert.equal(response.status, 201);
    assert.equal(created?.userId, 17);
    assert.equal(created?.title, "Onderhoud");
  });
});

test("invalid notification payloads and IDs are rejected", async () => {
  await withServer({}, async base => {
    const create = await fetch(base + "/api/notifications", {
      method: "POST", headers: userHeaders,
      body: JSON.stringify({ productId: 1, type: "maintenance", message: "" }),
    });
    assert.equal(create.status, 400);
    const read = await fetch(base + "/api/notifications/invalid/read", { method: "PATCH", headers: userHeaders });
    assert.equal(read.status, 400);
  });
});

test("notification creation requires an existing product", async () => {
  await withServer({ getProduct: async () => undefined }, async base => {
    const response = await fetch(base + "/api/notifications", {
      method: "POST", headers: userHeaders,
      body: JSON.stringify({ productId: 99, type: "maintenance", message: "Test" }),
    });
    assert.equal(response.status, 404);
  });
});

test("single-read updates pass both the notification ID and the session owner", async () => {
  await withServer({
    markNotificationAsRead: async (id, userId) => {
      assert.equal(id, 1);
      assert.equal(userId, 17);
      return true;
    },
  }, async base => {
    const response = await fetch(base + "/api/notifications/1/read", { method: "PATCH", headers: userHeaders });
    assert.equal(response.status, 200);
  });
});

test("read updates report missing or other-user notifications without disclosing ownership", async () => {
  await withServer({ markNotificationAsRead: async () => false }, async base => {
    const response = await fetch(base + "/api/notifications/99/read", { method: "PATCH", headers: userHeaders });
    assert.equal(response.status, 404);
  });
});

test("mark-all-read updates use the current session owner", async () => {
  await withServer({
    markAllNotificationsAsRead: async userId => { assert.equal(userId, 17); },
  }, async base => {
    const response = await fetch(base + "/api/notifications/mark-all-read", { method: "PATCH", headers: userHeaders });
    assert.equal(response.status, 200);
  });
});