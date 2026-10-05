import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { hashResetToken, registerPasswordResetRoutes, registerResetSessionGuard } from "../server/password-reset-routes";
import { registerLoginRoute } from "../server/auth-login-routes";
import type { ResetRepository } from "../server/password-reset-repository";
import type { User } from "../shared/schema";

async function withFixture(run: (base: string, fixture: {
  sent: string[]; user: User; expire(): void; canceled(): number;
}) => Promise<void>, options: { configured?: boolean; failMail?: boolean } = {}) {
  const user: User = {
    id: 37, username: "reset-fixture", email: "reset@example.invalid",
    password: await bcrypt.hash("original-fixture-password", 4), role: "superadmin",
    firstName: null, lastName: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };
  let tokenHash: string | null = null, expiresAt = 0, resetAt = 0, canceled = 0;
  const sent: string[] = [];
  const repo: ResetRepository = {
    issue: async (email, hash, expires) => {
      if (email !== user.email || !user.isActive) return;
      tokenHash = hash; expiresAt = expires.getTime();
      assert.equal(hash.length, 64);
      return { email: user.email };
    },
    cancel: async () => { tokenHash = null; canceled++; },
    complete: async (hash, passwordHash) => {
      if (hash !== tokenHash || expiresAt <= Date.now() || !user.isActive) return false;
      tokenHash = null; user.password = passwordHash; resetAt = Date.now(); return true;
    },
    sessionIsValid: async (_id, authenticatedAt) => !resetAt || (authenticatedAt ?? 0) > resetAt,
  };
  const app = express(); app.use(express.json());
  const store = new session.MemoryStore();
  app.use(session({ secret: "isolated-reset-test", saveUninitialized: false, resave: false, store }));
  registerResetSessionGuard(app, repo);
  registerLoginRoute(app, { getUserByUsername: async name => name === user.username ? user : undefined });
  registerPasswordResetRoutes(app, repo, {
    configured: () => options.configured !== false,
    send: async (email, token) => {
      assert.equal(email, user.email);
      if (options.failMail) throw new Error("private provider response");
      assert.equal(hashResetToken(token), tokenHash);
      sent.push(token);
    },
  });
  app.get("/session", (req, res) => res.status((req.session as any).user ? 200 : 401).json({}));
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, {
      sent, user, expire: () => { expiresAt = 0; }, canceled: () => canceled,
    });
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.clear(); }
}
const post = (base: string, path: string, body: unknown, cookie?: string) => fetch(base + path, {
  method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
const requestPath = "/api/auth/password-reset/request";
const completePath = "/api/auth/password-reset/complete";

test("unknown, inactive and active accounts get identical responses; tokens are never returned", async () => {
  await withFixture(async (base, f) => {
    const unknown = await post(base, requestPath, { email: "unknown@example.invalid" });
    const known = await post(base, requestPath, { email: " RESET@example.invalid " });
    f.user.isActive = false;
    const inactive = await post(base, requestPath, { email: f.user.email });
    assert.equal(known.status, 200);
    const response = await known.text();
    assert.equal(await unknown.text(), response); assert.equal(await inactive.text(), response);
    assert.equal(f.sent.length, 1); assert.match(f.sent[0], /^[A-Za-z0-9_-]{43}$/);
    assert.ok(!response.includes(f.sent[0]));
  });
});
test("single-use reset hashes the password, preserves role, revokes old sessions and doesn't auto-login", async () => {
  await withFixture(async (base, f) => {
    const login = await post(base, "/api/auth/login", { username: f.user.username, password: "original-fixture-password" });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await fetch(base + "/session", { headers: { cookie } })).status, 200);
    await post(base, requestPath, { email: f.user.email });
    const complete = await post(base, completePath, { token: f.sent[0], password: "new-isolated-fixture-password" });
    assert.equal(complete.status, 200); assert.equal(complete.headers.get("set-cookie"), null);
    assert.ok(await bcrypt.compare("new-isolated-fixture-password", f.user.password));
    assert.equal(f.user.role, "superadmin");
    assert.equal((await fetch(base + "/session", { headers: { cookie } })).status, 401);
    assert.equal((await post(base, completePath, { token: f.sent[0], password: "another-valid-fixture-password" })).status, 400);
    assert.equal((await post(base, "/api/auth/login", { username: f.user.username, password: "original-fixture-password" })).status, 401);
    assert.equal((await post(base, "/api/auth/login", { username: f.user.username, password: "new-isolated-fixture-password" })).status, 200);
  });
});
test("invalid/expired tokens, short passwords and bcrypt-truncated Unicode passwords are rejected", async () => {
  await withFixture(async (base, f) => {
    assert.equal((await post(base, requestPath, { email: "bad" })).status, 400);
    await post(base, requestPath, { email: f.user.email });
    for (const body of [{ token: f.sent[0], password: "short" },
      { token: f.sent[0], password: "🙂".repeat(19) },
      { token: {}, password: "valid-fixture-passphrase" },
      { token: "x".repeat(43), password: "valid-fixture-passphrase" }]) {
      assert.equal((await post(base, completePath, body)).status, 400);
    }
    f.expire();
    assert.equal((await post(base, completePath, { token: f.sent[0], password: "valid-fixture-passphrase" })).status, 400);
  });
});
test("missing sender configuration fails for all accounts and request flooding is throttled", async () => {
  await withFixture(async (base, f) => {
    assert.equal((await post(base, requestPath, { email: f.user.email })).status, 503);
    assert.equal((await post(base, requestPath, { email: "unknown@example.invalid" })).status, 503);
    assert.equal(f.sent.length, 0);
  }, { configured: false });
  await withFixture(async (base, f) => {
    for (let i = 0; i < 5; i++) assert.equal((await post(base, requestPath, { email: f.user.email })).status, 200);
    assert.equal((await post(base, requestPath, { email: f.user.email })).status, 429);
  });
});
test("mail failures revoke tokens without exposing provider responses", async () => {
  const original = console.error;
  const logs: string[] = [];
  console.error = (...args) => { logs.push(args.join(" ")); };
  try {
    await withFixture(async (base, f) => {
      const result = await post(base, requestPath, { email: f.user.email });
      assert.equal(result.status, 200); assert.equal(f.canceled(), 1);
      assert.ok(!logs.join().includes("private provider response"));
      assert.ok(!logs.join().includes(f.user.email));
    }, { failMail: true });
  } finally { console.error = original; }
});
