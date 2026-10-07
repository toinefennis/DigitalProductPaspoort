import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  createAdminAccessRequestEmailText,
  type AdminAccessRequestEmailData,
  type AdminEmailRecipient,
} from "../server/admin-access-request-email";
import { registerAdminAccessRequestRoutes } from "../server/admin-access-request-routes";

const endpoint = "/api/admin/access-requests";
const recipients: AdminEmailRecipient[] = [
  { email: "admin@example.invalid" },
  { email: "superadmin@example.invalid" },
];

async function withFixture(
  user: { id: number; email: string; role: string } | null,
  run: (
    base: string,
    sent: Array<{ request: AdminAccessRequestEmailData; recipients: AdminEmailRecipient[] }>,
  ) => Promise<void>,
  options: {
    recipients?: AdminEmailRecipient[];
    failDelivery?: boolean;
    persistedUser?: { email: string; role: string; isActive: boolean };
    fallbackEmail?: string;
  } = {},
) {
  const sent: Array<{ request: AdminAccessRequestEmailData; recipients: AdminEmailRecipient[] }> = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).session = { user };
    next();
  });
  registerAdminAccessRequestRoutes(app, {
    getRequester: async id => id === user?.id
      ? options.persistedUser ?? { email: user.email, role: user.role, isActive: true }
      : undefined,
    getActiveAdmins: async () => [...(options.recipients ?? recipients)],
    getFallbackRecipient: () => options.fallbackEmail,
    send: async (request, targets) => {
      if (options.failDelivery) throw new Error("private provider response");
      sent.push({ request, recipients: targets });
    },
  });

  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, sent);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

const post = (base: string, body: unknown) => fetch(base + endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const validRequest = { fullName: "Voorbeeld Gebruiker", mobileNumber: "+31 6 12345678" };
const ordinaryUser = { id: 24, email: "user@example.invalid", role: "user" };

test("requires an authenticated non-admin account and validates contact details", async () => {
  await withFixture(null, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 401);
    assert.equal(sent.length, 0);
  });
  await withFixture({ ...ordinaryUser, role: "admin" }, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 409);
    assert.equal(sent.length, 0);
  });
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, { ...validRequest, mobileNumber: "call me" })).status, 400);
    assert.equal((await post(base, { ...validRequest, fullName: "Invalid\nName" })).status, 400);
    assert.equal(sent.length, 0);
  });
});

test("sends the request only to active admin recipients without changing the user's role", async () => {
  await withFixture(ordinaryUser, async (base, sent) => {
    const response = await post(base, validRequest);
    assert.equal(response.status, 200);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].recipients, recipients);
    assert.deepEqual(sent[0].request, {
      userId: ordinaryUser.id,
      accountEmail: ordinaryUser.email,
      accountRole: ordinaryUser.role,
      ...validRequest,
    });
    assert.match((await response.json()).message, /Je rol verandert pas na beoordeling/);
  });
});

test("uses the operator-configured fallback only when there are no active admins", async () => {
  const fallback = "operator@example.invalid";
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 200);
    assert.deepEqual(sent[0].recipients, [{ email: fallback }]);
    assert.equal(sent[0].request.accountRole, "user");
  }, { recipients: [], fallbackEmail: fallback });
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 200);
    assert.deepEqual(sent[0].recipients, recipients);
  }, { fallbackEmail: fallback });
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 503);
    assert.equal(sent.length, 0);
  }, { recipients: [], fallbackEmail: "invalid-mailbox" });
});

test("callers cannot select their own recipients or change account roles through requests", async () => {
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, {
      ...validRequest,
      recipient: "attacker@example.invalid",
      role: "superadmin",
    })).status, 400);
    assert.equal(sent.length, 0);
  });
});

test("uses persisted identity rather than editable session profile fields and rejects inactive accounts", async () => {
  await withFixture({ ...ordinaryUser, email: "spoofed@example.invalid" }, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 200);
    assert.equal(sent[0].request.accountEmail, ordinaryUser.email);
  }, { persistedUser: { ...ordinaryUser, isActive: true } });
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 401);
    assert.equal(sent.length, 0);
  }, { persistedUser: { ...ordinaryUser, isActive: false } });
});

test("throttles repeat requests and handles missing admins or email delivery failures", async () => {
  await withFixture(ordinaryUser, async (base, sent) => {
    assert.equal((await post(base, validRequest)).status, 200);
    assert.equal((await post(base, validRequest)).status, 429);
    assert.equal(sent.length, 1);
  });
  await withFixture(ordinaryUser, async (base) => {
    assert.equal((await post(base, validRequest)).status, 503);
  }, { recipients: [] });
  await withFixture(ordinaryUser, async (base, sent) => {
    const response = await post(base, validRequest);
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("private provider response"));
    assert.equal(sent.length, 0);
  }, { failDelivery: true });
});

test("creates a plain-text admin email with the requester contact details and no automatic role change", () => {
  const request: AdminAccessRequestEmailData = {
    userId: 24,
    accountEmail: "user@example.invalid",
    accountRole: "user",
    fullName: "Voorbeeld Gebruiker",
    mobileNumber: "+31 6 12345678",
  };
  const text = createAdminAccessRequestEmailText(request);
  assert.ok(text.includes("Naam: Voorbeeld Gebruiker"));
  assert.ok(text.includes("Mobiel nummer: +31 6 12345678"));
  assert.ok(text.includes("Account e-mailadres: user@example.invalid"));
  assert.ok(text.includes("wijzigt de accountrol niet"));
});
