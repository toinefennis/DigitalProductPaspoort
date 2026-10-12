import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerProductAdminRoutes } from "../server/product-admin-routes";

async function withFixture(
  sessionUser: { id: number; role?: string } | null,
  persistedUser: { role: string; isActive: boolean } | undefined,
  run: (base: string, deletedIds: number[]) => Promise<void>,
) {
  const deletedIds: number[] = [];
  const app = express();
  app.use((req, _res, next) => {
    if (sessionUser) (req as any).session = { user: sessionUser };
    next();
  });
  registerProductAdminRoutes(app, {
    getUser: async id => id === sessionUser?.id ? persistedUser : undefined,
    archiveProduct: async id => {
      deletedIds.push(id);
      return id === 8;
    },
  });

  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, deletedIds);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

const archiveProduct = (base: string, id: string) =>
  fetch(`${base}/api/products/${id}/archive`, { method: "PATCH" });

test("product archiving requires an active persisted superadmin", async () => {
  await withFixture(null, undefined, async base => {
    assert.equal((await archiveProduct(base, "8")).status, 401);
  });
  await withFixture({ id: 24, role: "superadmin" }, { role: "admin", isActive: true }, async (base, deletedIds) => {
    assert.equal((await archiveProduct(base, "8")).status, 403);
    assert.deepEqual(deletedIds, []);
  });
  await withFixture({ id: 24 }, { role: "superadmin", isActive: false }, async (base, deletedIds) => {
    assert.equal((await archiveProduct(base, "8")).status, 401);
    assert.deepEqual(deletedIds, []);
  });
  await withFixture({ id: 24 }, { role: "admin", isActive: true }, async (base, deletedIds) => {
    assert.equal((await archiveProduct(base, "8")).status, 403);
    assert.deepEqual(deletedIds, []);
  });
});

test("only a valid product ID is passed to archiving and missing products return 404", async () => {
  await withFixture({ id: 24 }, { role: "superadmin", isActive: true }, async (base, deletedIds) => {
    assert.equal((await archiveProduct(base, "invalid")).status, 400);
    assert.deepEqual(deletedIds, []);

    assert.equal((await archiveProduct(base, "9")).status, 404);
    assert.deepEqual(deletedIds, [9]);
  });
});

test("active superadmins can archive products without deleting their records", async () => {
  await withFixture({ id: 24 }, { role: "superadmin", isActive: true }, async (base, deletedIds) => {
    const response = await archiveProduct(base, "8");
    assert.equal(response.status, 200);
    assert.deepEqual(deletedIds, [8]);
    assert.match((await response.json()).message, /historie, meldingen en GS1-data zijn bewaard/);
  });
});
