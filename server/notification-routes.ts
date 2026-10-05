import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import type { IStorage } from "./storage";

export type NotificationStorage = Pick<IStorage,
  "getUserNotifications" | "createNotification" | "getProduct" |
  "markNotificationAsRead" | "markAllNotificationsAsRead"
>;

const notificationTitles = {
  loan_reminder: "Uitleenherinnering",
  return_reminder: "Retourherinnering",
  maintenance: "Onderhoud",
  status_update: "Statusupdate",
};
const createSchema = z.object({
  productId: z.number().int().positive(),
  type: z.enum(["loan_reminder", "return_reminder", "maintenance", "status_update"]),
  message: z.string().trim().min(1).max(2000),
});
const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

function authenticated(
  handler: (req: Request, res: Response, userId: number) => Promise<void>,
): RequestHandler {
  return async (req, res) => {
    const userId = (req as Request & { session?: { user?: { id?: unknown } } }).session?.user?.id;
    if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    try {
      await handler(req, res, userId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Ongeldige melding", errors: error.issues });
      } else {
        console.error("Notification operation failed:", error);
        res.status(500).json({ message: "Meldingen konden niet worden verwerkt" });
      }
    }
  };
}

export function registerNotificationRoutes(app: Express, storage: NotificationStorage) {
  app.get("/api/notifications", authenticated(async (req, res, userId) => {
    const unreadOnly = z.enum(["true", "false"]).optional().parse(req.query.unreadOnly) === "true";
    res.json(await storage.getUserNotifications(userId, unreadOnly));
  }));

  app.post("/api/notifications", authenticated(async (req, res, userId) => {
    const data = createSchema.parse(req.body);
    if (!await storage.getProduct(data.productId)) {
      res.status(404).json({ message: "Product niet gevonden" });
      return;
    }
    const notification = await storage.createNotification({
      ...data,
      userId,
      title: notificationTitles[data.type],
    });
    res.status(201).json(notification);
  }));

  app.patch("/api/notifications/mark-all-read", authenticated(async (_req, res, userId) => {
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  }));

  app.patch("/api/notifications/:id/read", authenticated(async (req, res, userId) => {
    const id = idSchema.parse(req.params.id);
    if (!await storage.markNotificationAsRead(id, userId)) {
      res.status(404).json({ message: "Melding niet gevonden" });
      return;
    }
    res.json({ success: true });
  }));
}