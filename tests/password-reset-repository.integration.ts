// Run explicitly against the development DATABASE_URL:
// tsx --test tests/password-reset-repository.integration.ts
// Creates and deletes only synthetic fixture users; never sends email.
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { users, passwordResets } from "../shared/schema";
import { PasswordResetRepository } from "../server/password-reset-repository";

test("development repository: cooldown, expiration, atomic single use, and durable session revocation", async () => {
  const identifier = randomUUID();
  const [user] = await db.insert(users).values({
    email: `${identifier}@example.invalid`, username: identifier, password: "fixture-only-not-a-login-hash", isActive: true,
  }).returning();
  const repo = new PasswordResetRepository();
  const hash = "a".repeat(64);
  try {
    assert.deepEqual(await repo.issue(user.email.toUpperCase().toLowerCase(), hash, new Date(Date.now() + 60_000)),
      { email: user.email, username: user.username });
    assert.equal(await repo.issue(user.email, "b".repeat(64), new Date(Date.now() + 60_000)), undefined);
    assert.equal(await repo.sessionIsValid(user.id), true);
    await db.update(passwordResets).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(passwordResets.userId, user.id));
    assert.equal(await repo.complete(hash, "new-fixture-hash"), false);
    await db.update(passwordResets).set({ expiresAt: new Date(Date.now() + 60_000) }).where(eq(passwordResets.userId, user.id));
    const results = await Promise.all([repo.complete(hash, "new-fixture-hash"), repo.complete(hash, "other-fixture-hash")]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await repo.sessionIsValid(user.id, 0), false);
    assert.equal(await repo.sessionIsValid(user.id, Date.now() + 1000), true);
    await db.update(passwordResets).set({ requestedAt: new Date(Date.now() - 6 * 60_000) }).where(eq(passwordResets.userId, user.id));
    assert.ok(await repo.issue(user.email, "c".repeat(64), new Date(Date.now() + 60_000)));
    // Issuing a subsequent token must not undo previous-session revocation.
    assert.equal(await repo.sessionIsValid(user.id, 0), false);
    await repo.cancel("c".repeat(64));
    assert.equal(await repo.complete("c".repeat(64), "unused-hash"), false);
  } finally { await db.delete(users).where(eq(users.id, user.id)); await pool.end(); }
});
