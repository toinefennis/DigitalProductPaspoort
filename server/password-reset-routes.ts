import type { Express } from "express";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { ResetRepository } from "./password-reset-repository";

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");
const requestSchema = z.object({ email: z.string().trim().email().max(255).transform(v => v.toLowerCase()) });
const completeSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: z.string().refine(v => Array.from(v).length >= 12 && Buffer.byteLength(v, "utf8") <= 72),
});
const genericMessage = "Als er een actief account met dit e-mailadres bestaat, ontvang je een herstelmail. Controleer ook je spammap. Een nieuw verzoek kan na 5 minuten.";

export function registerPasswordResetRoutes(app: Express, repo: ResetRepository, mail: {
  configured(): boolean;
  send(email: string, token: string): Promise<void>;
}) {
  // Per-process IP throttling plus persistent per-account cooldown in the repository.
  const attempts = new Map<string, { count: number; until: number }>();
  function limited(key: string, max: number) {
    const now = Date.now();
    attempts.forEach((v, k) => { if (v.until <= now) attempts.delete(k); });
    const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    entry.count++;
    attempts.set(key, entry);
    return entry.count > max;
  }
  app.post("/api/auth/password-reset/request", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const input = requestSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Vul een geldig e-mailadres in." });
    if (limited(`request:${req.ip}`, 5)) return res.status(429).json({ message: "Te veel verzoeken. Probeer het over 15 minuten opnieuw." });
    // Fail equally for every address when configuration is missing.
    if (!mail.configured()) return res.status(503).json({ message: "Wachtwoordherstel per e-mail is nog niet ingesteld. De beheerder moet het afzenderadres configureren." });
    try {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashResetToken(token);
      const account = await repo.issue(input.data.email, tokenHash, new Date(Date.now() + 30 * 60_000));
      if (account) {
        try { await mail.send(account.email, token); }
        catch {
          try { await repo.cancel(tokenHash); }
          catch { console.error("Password reset token revocation storage failed."); }
          console.error("Password reset email delivery failed; token revoked.");
        }
      }
      return res.json({ message: genericMessage });
    } catch {
      console.error("Password reset request storage failed.");
      return res.status(503).json({ message: "Wachtwoordherstel is tijdelijk niet beschikbaar. Probeer later opnieuw." });
    }
  });
  app.post("/api/auth/password-reset/complete", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (limited(`complete:${req.ip}`, 10)) return res.status(429).json({ message: "Te veel pogingen. Probeer het over 15 minuten opnieuw." });
    const input = completeSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ message: "Gebruik een geldige herstellink en een wachtwoord van minimaal 12 tekens en maximaal 72 bytes." });
    try {
      const hash = await bcrypt.hash(input.data.password, 12);
      const updated = await repo.complete(hashResetToken(input.data.token), hash);
      if (!updated) return res.status(400).json({ message: "Deze herstellink is ongeldig of verlopen. Vraag een nieuwe link aan." });
      // Never authenticate automatically; the user must log in with their new password.
      return res.json({ message: "Je wachtwoord is gewijzigd. Log opnieuw in met je nieuwe wachtwoord." });
    } catch {
      return res.status(503).json({ message: "Wachtwoord wijzigen is tijdelijk niet beschikbaar." });
    }
  });
}

export function registerResetSessionGuard(app: Express, repo: ResetRepository) {
  app.use(async (req, res, next) => {
    const current = req.session as typeof req.session & { user?: { id: number }; authenticatedAt?: number };
    if (!current?.user) return next();
    try {
      if (!await repo.sessionIsValid(current.user.id, current.authenticatedAt)) {
        delete current.user;
        delete current.authenticatedAt;
      }
      next();
    } catch {
      res.status(503).json({ message: "Sessiecontrole is tijdelijk niet beschikbaar." });
    }
  });
}
