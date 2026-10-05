import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registerLoginRoute, type LoginStorage } from "../server/auth-login-routes";
import { registerLegacyGS1Routes, type LegacyGS1Service } from "../server/gs1-legacy-routes";
import type { User } from "../shared/schema";

const testPassword = "isolated-test-account-passphrase";
const testHash = await bcrypt.hash(testPassword, 4);
const storedUser: User = {
  id: 17, username: "stored-test-user", password: testHash, role: "user",
  email: "fixture@example.invalid", firstName: "Test", lastName: "Fixture",
  isActive: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
};

async function withServer(
  user: User | undefined,
  run: (base: string, lookedUp: string[], protectedCalls: string[]) => Promise<void>,
  options: { storage?: LoginStorage; failSessionSave?: boolean } = {},
) {
  const app = express(); app.use(express.json());
  // Real express-session cookies, isolated in-memory store and fake data only.
  const store = new session.MemoryStore();
  if (options.failSessionSave) {
    const set = store.set.bind(store);
    let failed = false;
    store.set = (id, value, callback) => {
      if (!failed) { failed = true; callback?.(new Error("fake private storage failure")); return; }
      set(id, value, callback);
    };
  }
  app.use(session({ secret: "isolated-test-session-secret", resave: false, saveUninitialized: false, store }));
  const lookedUp: string[] = [], protectedCalls: string[] = [];
  registerLoginRoute(app, options.storage ?? {
    getUserByUsername: async name => { lookedUp.push(name); return user?.username === name ? user : undefined; },
  });
  app.get("/test/session", (req, res) => {
    const data = req.session as typeof req.session & { user?: unknown };
    res.status(data.user ? 200 : 401).json(data.user ? { user: data.user } : { message: "Not authenticated" });
  });
  app.get("/test/prelogin", (req, res) => {
    (req.session as typeof req.session & { prelogin?: boolean }).prelogin = true;
    res.json({ ready: true });
  });
  registerLegacyGS1Routes(app, async () => {
    protectedCalls.push("load");
    return { getSyncStatus: () => ({ isRunning: false, autoSyncEnabled: false }) } as LegacyGS1Service;
  });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, lookedUp, protectedCalls); }
  finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); store.clear(); }
}
const cookieFor = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";
const login = (base: string, body: unknown, cookie?: string) => fetch(base + "/api/auth/login", {
  method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});

test("missing database accounts, including historical demo names, never authenticate", async () => {
  await withServer(undefined, async (base, lookedUp, protectedCalls) => {
    for (const username of ["admin", "manager", "user", "superadmin", "unknown-test-user"]) {
      const response = await login(base, { username, password: testPassword, role: "superadmin", id: 1 });
      assert.equal(response.status, 401); assert.match(response.headers.get("content-type")!, /json/);
      assert.deepEqual(await response.json(), { message: "Onjuiste gebruikersnaam of wachtwoord" });
      assert.equal(cookieFor(response), "");
    }
    assert.equal(lookedUp.length, 5); assert.deepEqual(protectedCalls, []);
    assert.equal((await fetch(base + "/test/session")).status, 401);
  });
});
test("missing, blank, non-string and malformed credentials are rejected before database access", async () => {
  await withServer(storedUser, async (base, lookedUp) => {
    for (const body of [{}, { username: "" }, { username: [], password: testPassword },
      { username: storedUser.username, password: {} }, { username: storedUser.username, password: "" },
      { username: "x".repeat(101), password: testPassword }, null]) {
      const response = await login(base, body);
      assert.equal(response.status, 400); assert.equal(cookieFor(response), "");
    }
    assert.deepEqual(lookedUp, []);
  });
});
test("wrong passwords and plaintext or malformed stored passwords cannot create sessions", async () => {
  for (const password of [testHash, testPassword, "not-a-bcrypt-hash", "$2b$10$invalid"]) {
    await withServer({ ...storedUser, password }, async base => {
      const response = await login(base, { username: storedUser.username, password: password === testHash ? "wrong-test-passphrase" : testPassword });
      assert.equal(response.status, 401); assert.equal(cookieFor(response), "");
      assert.equal((await fetch(base + "/test/session")).status, 401);
    });
  }
});
test("inactive and unconfirmed-active database accounts never receive authenticated sessions", async () => {
  for (const isActive of [false, null]) {
    await withServer({ ...storedUser, isActive }, async base => {
      const response = await login(base, { username: storedUser.username, password: testPassword });
      assert.equal(response.status, 401); assert.equal(cookieFor(response), "");
      assert.equal((await fetch(base + "/test/session")).status, 401);
    });
  }
});
test("all stored active roles keep their real roles and safe cookie-backed sessions, including superadmin", async () => {
  for (const role of ["user", "manager", "admin", "superadmin"]) {
    const user = { ...storedUser, role };
    const before = structuredClone(user);
    await withServer(user, async (base, lookedUp, protectedCalls) => {
      const response = await login(base, { username: user.username, password: testPassword, role: "superadmin", id: 1 });
      assert.equal(response.status, 200);
      const raw = await response.text(); const data = JSON.parse(raw);
      assert.equal(data.user.role, role); assert.equal(data.user.id, user.id);
      assert.equal(data.user.fullName, "Test Fixture"); assert.equal(data.message, "Login successful");
      assert.equal(raw.includes(testPassword), false); assert.equal(raw.includes(testHash), false);
      assert.equal("password" in data.user, false);
      const cookie = cookieFor(response); assert.notEqual(cookie, "");
      const sessionResponse = await fetch(base + "/test/session", { headers: { cookie } });
      assert.equal(sessionResponse.status, 200); assert.deepEqual((await sessionResponse.json()).user, data.user);
      const guarded = await fetch(base + "/api/gs1/sync-status", { headers: { cookie } });
      assert.equal(guarded.status, ["admin", "superadmin"].includes(role) ? 200 : 403);
      assert.deepEqual(protectedCalls, ["admin", "superadmin"].includes(role) ? ["load"] : []);
      assert.deepEqual(lookedUp, [user.username]); assert.deepEqual(user, before);
    });
  }
});
test("stored accounts with historical demo names still require their actual hashed database password", async () => {
  await withServer({ ...storedUser, username: "admin", role: "superadmin", firstName: null, lastName: null }, async base => {
    assert.equal((await login(base, { username: "admin", password: "wrong-test-passphrase" })).status, 401);
    const response = await login(base, { username: "admin", password: testPassword });
    assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data.user.role, "superadmin"); assert.equal(data.user.fullName, "admin");
  });
});
test("successful login rotates the pre-login session and invalidates its old cookie", async () => {
  await withServer({ ...storedUser, role: "superadmin" }, async base => {
    const initial = await fetch(base + "/test/prelogin"); const oldCookie = cookieFor(initial);
    assert.notEqual(oldCookie, "");
    const response = await login(base, { username: storedUser.username, password: testPassword }, oldCookie);
    assert.equal(response.status, 200); const newCookie = cookieFor(response);
    assert.notEqual(newCookie, oldCookie);
    assert.equal((await fetch(base + "/test/session", { headers: { cookie: oldCookie } })).status, 401);
    assert.equal((await fetch(base + "/test/session", { headers: { cookie: newCookie } })).status, 200);
  });
});
test("database failures cannot authenticate or expose private error contents", async () => {
  await withServer(undefined, async base => {
    const response = await login(base, { username: storedUser.username, password: testPassword });
    assert.equal(response.status, 500); assert.equal(cookieFor(response), "");
    assert.deepEqual(await response.json(), { message: "Login failed" });
  }, { storage: { getUserByUsername: async () => { throw new Error(`fake SQL credentials ${testHash}`); } } });
});
test("failed session persistence never reports successful login or retains authenticated access", async () => {
  await withServer(storedUser, async base => {
    const response = await login(base, { username: storedUser.username, password: testPassword });
    assert.equal(response.status, 500); assert.deepEqual(await response.json(), { message: "Login failed" });
    const cookie = cookieFor(response);
    assert.equal((await fetch(base + "/test/session", { headers: { cookie } })).status, 401);
  }, { failSessionSave: true });
});