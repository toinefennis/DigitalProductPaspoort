import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  gtin: text("gtin").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'kledingstuk', 'materiaal', 'remake', 'overig'
  description: text("description"),
  brand: text("brand"),
  material: text("material"),
  photoUrl: text("photo_url"),
  additionalPhotos: jsonb("additional_photos").$type<string[]>().default([]),
  sourceGtins: jsonb("source_gtins").$type<string[]>().default([]),
  status: text("status").notNull().default("beschikbaar"), // 'beschikbaar', 'uitgeleend', 'in_reparatie'
  collection: text("collection"), // User-defined collection
  
  // Extended fields for sustainability and product information
  story: text("story"), // Product story/narrative
  origin: text("origin"), // Herkomst/origin
  washingInstructions: text("washing_instructions"), // Wasinstructies
  co2Footprint: text("co2_footprint"), // CO2 footprint
  esgScore: text("esg_score"), // ESG/CSRD waarden
  materialProperties: jsonb("material_properties").$type<{
    composition?: string;
    weight?: string;
    durability?: string;
    recyclability?: string;
    certifications?: string[];
  }>().default({}),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  eventType: text("event_type").notNull(), // 'creatie', 'schoonmaak', 'wassen', 'reparatie', 'impregneren', 'refurbish', 'uitleen', 'opslag', 'recycle', 'retour'
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  
  // Loan system fields
  loanReference: text("loan_reference"), // For loan events
  expectedReturn: timestamp("expected_return"), // For loan events
  returnCondition: text("return_condition"), // For return events
  returnNotes: text("return_notes"), // For return events
  
  // Borrower information
  borrowerName: text("borrower_name"), // Full name of borrower
  borrowerEmail: text("borrower_email"), // Email of borrower
  borrowerPhone: text("borrower_phone"), // Phone number of borrower
  borrowerAddress: text("borrower_address"), // Address of borrower
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  product: one(products, {
    fields: [events.productId],
    references: [products.id],
  }),
}));

// Users table for authentication and roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"), // 'admin', 'manager', 'user'
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications/Alerts table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'product_change', 'status_update', 'system'
  isRead: boolean("is_read").default(false),
  productId: integer("product_id").references(() => products.id),
  metadata: jsonb("metadata").$type<{
    action?: string;
    oldValue?: string;
    newValue?: string;
    changedBy?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Sessions table
export const userSessions = pgTable("user_sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
  sessions: many(userSessions),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [notifications.productId],
    references: [products.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Statistics type for dashboard
export type DashboardStats = {
  totalProducts: number;
  totalRepairs: number;
  itemsOnLoan: number;
  remadeItems: number;
};

// Product with events for detailed view
export type ProductWithEvents = Product & {
  events: Event[];
};
