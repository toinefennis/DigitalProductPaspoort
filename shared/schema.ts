import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  loanReference: text("loan_reference"), // For loan events
  expectedReturn: timestamp("expected_return"), // For loan events
  returnCondition: text("return_condition"), // For return events
  returnNotes: text("return_notes"), // For return events
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

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

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
