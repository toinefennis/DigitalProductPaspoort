import type { Express } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { User } from "../shared/schema";

export interface LoginStorage {
  getLoginCandidates(identifier: string): Promise<User[]>;
}
type LoginUser = Pick<User, "id" | "username" | "email" | "role"> & { fullName: string };
const credentialsSchema = z.object({
  // Keep the request field compatible with existing clients; it accepts either identifier.
  username: z.string().trim().min(1).max(255)
    .refine(value => value.length <= 100 || z.string().email().safeParse(value).success),
  password: z.string().min(1),
});
const bcryptHash = /^\$2[aby]\$(?:0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

export function registerLoginRoute(app: Express, storage: LoginStorage) {
  app.post("/api/auth/login", async (req, res) => {
    const credentials = credentialsSchema.safeParse(req.body);
    if (!credentials.success) {
      res.status(400).json({ message: "E-mailadres of gebruikersnaam en wachtwoord zijn verplicht en moeten tekst zijn." });
      return;
    }
    try {
      const authenticatedAt = Date.now();
      const { username, password } = credentials.data;
      // Only persisted accounts can authenticate. No synthetic/demo user fallback.
      const candidates = await storage.getLoginCandidates(username);
      // Never choose arbitrarily between duplicate emails or email/username collisions.
      const user = candidates.length === 1 ? candidates[0] : undefined;
      if (!user || typeof user.password !== "string" || !bcryptHash.test(user.password) ||
          !await bcrypt.compare(password, user.password)) {
        res.status(401).json({ message: "Onjuist e-mailadres, gebruikersnaam of wachtwoord" });
        return;
      }
      if (user.isActive !== true) {
        res.status(401).json({ message: "Account is gedeactiveerd" });
        return;
      }
      const publicUser: LoginUser = {
        id: user.id, username: user.username, email: user.email, role: user.role,
        fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      };
      // Rotate the session ID on successful authentication; do not carry pre-login privileges.
      await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      const authenticatedSession = req.session as typeof req.session & { user?: LoginUser; authenticatedAt?: number };
      authenticatedSession.user = publicUser;
      authenticatedSession.authenticatedAt = authenticatedAt;
      try {
        await new Promise<void>((resolve, reject) => authenticatedSession.save(error => error ? reject(error) : resolve()));
      } catch {
        delete authenticatedSession.user;
        throw new Error("Session persistence failed");
      }
      res.json({ user: publicUser, message: "Login successful" });
    } catch {
      // Storage errors may contain SQL parameters or password hashes. Never log/echo them.
      res.status(500).json({ message: "Login failed" });
    }
  });
}