import type { Express } from "express";
import { z } from "zod";
import type {
  AdminAccessRequestEmailData,
  AdminEmailRecipient,
} from "./admin-access-request-email";

const requestSchema = z.object({
  fullName: z.string().trim().min(2).max(120)
    .refine(value => !/[\u0000-\u001f\u007f]/.test(value)),
  mobileNumber: z.string().trim().min(8).max(32)
    .refine(value =>
      /^[0-9+(). -]+$/.test(value) &&
      (value.match(/\d/g)?.length ?? 0) >= 8,
    ),
}).strict();

const requestCooldownMs = 15 * 60_000;

interface AdminAccessRequestDependencies {
  getRequester(userId: number): Promise<{
    email: string;
    role: string;
    isActive: boolean;
  } | undefined>;
  getActiveAdmins(): Promise<AdminEmailRecipient[]>;
  getFallbackRecipient?(): string | undefined;
  send(
    request: AdminAccessRequestEmailData,
    recipients: AdminEmailRecipient[],
  ): Promise<void>;
}

export function registerAdminAccessRequestRoutes(
  app: Express,
  dependencies: AdminAccessRequestDependencies,
) {
  const lastRequestAt = new Map<number, number>();
  const inFlight = new Set<number>();

  app.post("/api/admin/access-requests", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const sessionUser = (req as any).session?.user as {
      id?: number;
    } | undefined;

    if (
      !sessionUser ||
      !Number.isSafeInteger(sessionUser.id) ||
      sessionUser.id! <= 0
    ) {
      return res.status(401).json({ message: "Log in om een aanvraag te versturen." });
    }

    const input = requestSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({
        message: "Vul je naam en een geldig mobiel nummer in.",
      });
    }

    const userId = sessionUser.id!;
    const now = Date.now();
    lastRequestAt.forEach((timestamp, id) => {
      if (now - timestamp >= requestCooldownMs) lastRequestAt.delete(id);
    });
    const previousRequest = lastRequestAt.get(userId);
    if (
      inFlight.has(userId) ||
      (previousRequest !== undefined && now - previousRequest < requestCooldownMs)
    ) {
      return res.status(429).json({
        message: "Je hebt onlangs al een aanvraag verstuurd. Probeer het over 15 minuten opnieuw.",
      });
    }

    inFlight.add(userId);
    try {
      // Profile fields in the session can be edited; only the persisted account identifies the requester.
      const user = await dependencies.getRequester(userId);
      if (!user?.isActive || !z.string().email().max(255).safeParse(user.email).success) {
        return res.status(401).json({ message: "Log opnieuw in met een actief account." });
      }
      if (user.role === "admin" || user.role === "superadmin") {
        return res.status(409).json({ message: "Je account heeft al adminrechten." });
      }
      const recipients = await dependencies.getActiveAdmins();
      if (recipients.length === 0) {
        // Only an operator-configured mailbox can be used; never take a recipient from the request body.
        const fallback = dependencies.getFallbackRecipient?.()?.trim();
        if (fallback && z.string().email().max(255).safeParse(fallback).success) {
          recipients.push({ email: fallback });
        }
      }
      if (recipients.length === 0) {
        return res.status(503).json({
          message: "Je aanvraag kan nu niet worden doorgestuurd. Neem contact op met de systeembeheerder.",
        });
      }

      await dependencies.send({
        userId,
        accountEmail: user.email,
        accountRole: user.role,
        fullName: input.data.fullName,
        mobileNumber: input.data.mobileNumber,
      }, recipients);
      lastRequestAt.set(userId, now);
      return res.json({
        message: "Je aanvraag is per e-mail naar de beheerder gestuurd. Je rol verandert pas na beoordeling door een bevoegde beheerder.",
      });
    } catch {
      console.error("Admin access request could not be delivered.");
      return res.status(503).json({
        message: "Je aanvraag kon niet worden verstuurd. Probeer het later opnieuw.",
      });
    } finally {
      inFlight.delete(userId);
    }
  });
}
