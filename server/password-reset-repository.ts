import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { passwordResets, users } from "../shared/schema";

export interface ResetRepository {
  issue(email: string, tokenHash: string, expiresAt: Date): Promise<{ email: string; username: string } | undefined>;
  cancel(tokenHash: string): Promise<void>;
  complete(tokenHash: string, passwordHash: string): Promise<boolean>;
  sessionIsValid(userId: number, authenticatedAt?: number): Promise<boolean>;
}

export class PasswordResetRepository implements ResetRepository {
  async issue(email: string, tokenHash: string, expiresAt: Date) {
    return db.transaction(async tx => {
      // User-row locking serializes requests and completion across app instances.
      const matches = await tx.select().from(users)
        .where(sql`lower(${users.email}) = ${email}`).for("update");
      // Ambiguous case-insensitive matches must never recover the wrong account.
      if (matches.length !== 1 || matches[0].isActive !== true) return;
      const user = matches[0];
      const [previous] = await tx.select().from(passwordResets).where(eq(passwordResets.userId, user.id));
      const now = new Date();
      if (previous && now.getTime() - previous.requestedAt.getTime() < 5 * 60_000) return;
      await tx.insert(passwordResets).values({ userId: user.id, tokenHash, expiresAt, requestedAt: now })
        .onConflictDoUpdate({
          target: passwordResets.userId,
          set: { tokenHash, expiresAt, requestedAt: now },
        });
      return { email: user.email, username: user.username };
    });
  }

  async cancel(tokenHash: string) {
    await db.update(passwordResets).set({ tokenHash: null, expiresAt: null })
      .where(eq(passwordResets.tokenHash, tokenHash));
  }

  async complete(tokenHash: string, passwordHash: string) {
    return db.transaction(async tx => {
      const [candidate] = await tx.select().from(passwordResets).where(eq(passwordResets.tokenHash, tokenHash));
      if (!candidate) return false;
      const [user] = await tx.select().from(users).where(eq(users.id, candidate.userId)).for("update");
      if (!user || user.isActive !== true) return false;
      const now = new Date();
      const consumed = await tx.update(passwordResets)
        .set({ tokenHash: null, expiresAt: null, lastResetAt: now })
        .where(and(eq(passwordResets.userId, user.id), eq(passwordResets.tokenHash, tokenHash),
          gt(passwordResets.expiresAt, now))).returning({ id: passwordResets.userId });
      if (!consumed.length) return false;
      await tx.update(users).set({ password: passwordHash, updatedAt: now }).where(eq(users.id, user.id));
      return true;
    });
  }

  async sessionIsValid(userId: number, authenticatedAt?: number) {
    const [reset] = await db.select({ lastResetAt: passwordResets.lastResetAt })
      .from(passwordResets).where(eq(passwordResets.userId, userId));
    return !reset?.lastResetAt ||
      (typeof authenticatedAt === "number" && authenticatedAt > reset.lastResetAt.getTime());
  }
}
