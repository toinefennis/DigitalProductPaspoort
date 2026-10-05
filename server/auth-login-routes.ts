import type { Express } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { User } from "../shared/schema";

export interface LoginStorage {
  getUserByUsername(username: string): Promise<User | undefined>;
}
type LoginUser = Pick<User, "id" | "username" | "email" | "role"> & { fullName: string };
const credentialsSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1),
});
const bcryptHash = /^\$2[aby]\$(?:0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

export function registerLoginRoute(app: Express, storage: LoginStorage) {
  app.post("/api/auth/login", async (req, res) => {
    const credentials = credentialsSchema.safeParse(req.body);
    if (!credentials.success) {
      res.status(400).json({ message: "Gebruikersnaam en wachtwoord zijn verplicht en moeten tekst zijn." });
      return;
    }
    try {
      const { username, password } = credentials.data;
      // Only persisted accounts can authenticate. No synthetic/demo user fallback.
      const user = await storage.getUserByUsername(username);
      if (!user || typeof user.password !== "string" || !bcryptHash.test(user.password) ||
          !await bcrypt.compare(password, user.password)) {
        res.status(401).json({ message: "Onjuiste gebruikersnaam of wachtwoord" });
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
      const authenticatedSession = req.session as typeof req.session & { user?: LoginUser };
      authenticatedSession.user = publicUser;
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