import { and, eq } from "drizzle-orm";
import { notifications } from "@shared/schema";

export function userNotificationFilter(userId: number, unreadOnly = false) {
  return and(
    eq(notifications.userId, userId),
    unreadOnly ? eq(notifications.isRead, false) : undefined,
  );
}