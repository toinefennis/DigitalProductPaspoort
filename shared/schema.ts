import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import type { GS1Data, GS1Environment } from "./gs1";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Helper function to parse optional integer values
// Empty string/undefined/null -> null, valid number -> integer, invalid -> null
export function parseOptionalInteger(val: unknown): number | null {
  if (val === '' || val === undefined || val === null) return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
}

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
  
  // GS1 registration status
  gs1Registered: boolean("gs1_registered").default(false),
  
  // FASE 1: EU Compliance (ESPR 2025)
  repairabilityIndex: integer("repairability_index"), // 1-10 scale
  durabilityScore: integer("durability_score"), // 1-10 scale
  careSymbols: jsonb("care_symbols").$type<Array<{
    symbol: string;
    code: string;
    temperature?: number;
    allowed?: boolean;
    method?: string;
    description: string;
  }>>().default([]),
  dppUrl: text("dpp_url"), // Digital Product Passport URL
  qrCodeData: text("qr_code_data"), // QR code data/path
  carbonFootprintDetailed: jsonb("carbon_footprint_detailed").$type<{
    totalKg?: number;
    materialPhase?: number;
    productionPhase?: number;
    transportPhase?: number;
    usePhase?: number;
    endOfLifePhase?: number;
    calculationMethod?: string;
    calculationDate?: string;
  }>().default({}),
  
  // FASE 2: Milieu Impact (ESPR 2026)
  waterFootprintLiters: integer("water_footprint_liters"), // Total water usage in liters
  waterFootprintBreakdown: jsonb("water_footprint_breakdown").$type<{
    fiber?: number;
    production?: number;
    dyeing?: number;
    washingEstimated?: number;
  }>().default({}),
  energyConsumptionKwh: text("energy_consumption_kwh"), // Using text to support decimals
  renewableEnergyPercentage: integer("renewable_energy_percentage"), // 0-100
  microplasticSheddingEstimated: integer("microplastic_shedding_estimated"), // fibers per wash
  fiberSheddingTestResults: jsonb("fiber_shedding_test_results").$type<{
    testMethod?: string;
    testDate?: string;
    fibersPerWash?: number;
    labName?: string;
    reportUrl?: string;
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

// GS1 Partners table for inventory synchronization
export const gs1Partners = pgTable("gs1_partners", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  gln: varchar("gln", { length: 13 }).notNull().unique(), // Global Location Number
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("disconnected"), // 'connected', 'disconnected', 'error'
  syncEnabled: boolean("sync_enabled").default(true),
  lastSync: timestamp("last_sync"),
  apiKey: varchar("api_key", { length: 255 }),
  certificate: text("certificate"), // GDSN certificate
  settings: jsonb("settings").$type<{
    syncInterval?: number;
    syncTypes?: string[];
    autoRetry?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GS1 Sync Events table for tracking synchronization activities
export const gs1SyncEvents = pgTable("gs1_sync_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  partnerId: varchar("partner_id", { length: 36 }).references(() => gs1Partners.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'inventory_update', 'product_master', 'trade_item'
  status: varchar("status", { length: 20 }).notNull(), // 'success', 'failed', 'pending'
  details: text("details"),
  recordsProcessed: integer("records_processed"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").$type<{
    productCount?: number;
    updateType?: string;
    sourceSystem?: string;
  }>().default({}),
});

// GS1 Product Mappings table for tracking GS1 identifiers
export const gs1ProductMappings = pgTable("gs1_product_mappings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  gtin: varchar("gtin", { length: 14 }).notNull(),
  gln: varchar("gln", { length: 13 }).notNull(), // Partner GLN
  externalId: varchar("external_id", { length: 255 }), // Partner's internal ID
  lastSynced: timestamp("last_synced"),
  syncStatus: varchar("sync_status", { length: 20 }).default("pending"), // 'synced', 'pending', 'error'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for GS1 tables
// Official GS1 Nederland snapshots are isolated from the legacy partner-sync tables.
export const gs1NlRecords = pgTable("gs1_nl_records", {
  id: serial("id").primaryKey(),
  gtin: varchar("gtin", { length: 14 }).notNull(),
  environment: text("environment").$type<GS1Environment>().notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  registryId: integer("registry_id").references(() => gtinRegistry.id, { onDelete: "set null" }),
  basicData: jsonb("basic_data").$type<GS1Data>(),
  basicDraft: jsonb("basic_draft").$type<GS1Data>(),
  digitalLinkData: jsonb("digital_link_data").$type<GS1Data>(),
  digitalLinkDraft: jsonb("digital_link_draft").$type<GS1Data>(),
  externalReference: text("external_reference"),
  registrationStatus: text("registration_status").notNull().default("unverified"),
  syncState: text("sync_state").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  lastError: text("last_error"),
  syncedAt: timestamp("synced_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, table => [uniqueIndex("gs1_nl_records_gtin_environment").on(table.gtin, table.environment)]);

export const gs1NlJobs = pgTable("gs1_nl_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  environment: text("environment").$type<GS1Environment>().notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  registryId: integer("registry_id").references(() => gtinRegistry.id, { onDelete: "set null" }),
  invocationId: text("invocation_id"),
  status: text("status").notNull(),
  request: jsonb("request").$type<GS1Data>().notNull(),
  result: jsonb("result").$type<GS1Data>(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gs1PartnersRelations = relations(gs1Partners, ({ many }) => ({
  syncEvents: many(gs1SyncEvents),
}));

export const gs1SyncEventsRelations = relations(gs1SyncEvents, ({ one }) => ({
  partner: one(gs1Partners, {
    fields: [gs1SyncEvents.partnerId],
    references: [gs1Partners.id],
  }),
}));

export const gs1ProductMappingsRelations = relations(gs1ProductMappings, ({ one }) => ({
  product: one(products, {
    fields: [gs1ProductMappings.productId],
    references: [products.id],
  }),
}));

// GTIN Registry table for comprehensive product registration (Manager/Admin only)
export const gtinRegistry = pgTable("gtin_registry", {
  id: serial("id").primaryKey(),
  
  // Basic Product Identification
  gtin: varchar("gtin", { length: 14 }).notNull().unique(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  brandName: varchar("brand_name", { length: 255 }),
  modelNumber: varchar("model_number", { length: 100 }),
  productCategory: varchar("product_category", { length: 100 }),
  productDescription: text("product_description"),
  
  // DPP Specific Fields
  uniqueProductId: varchar("unique_product_id", { length: 500 }), // URI format
  batchNumber: varchar("batch_number", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  countryOfOrigin: varchar("country_of_origin", { length: 2 }), // ISO 3166-1 alpha-2
  productionDate: timestamp("production_date"),
  
  // Economic Operator & Facility
  economicOperatorId: varchar("economic_operator_id", { length: 255 }), // GLN or URI
  productionFacilityId: varchar("production_facility_id", { length: 255 }), // GLN or URI
  registrationId: varchar("registration_id", { length: 255 }), // DPP system registration
  
  // Product Physical Properties
  productWeight: integer("product_weight"), // in grams
  productDimensions: jsonb("product_dimensions"), // {length, width, height, unit}
  productSize: varchar("product_size", { length: 50 }),
  productColor: varchar("product_color", { length: 100 }),
  
  // Material Composition (JSON structure for flexibility)
  fiberComposition: jsonb("fiber_composition"), // Array of {fiber_code, percentage}
  recycledContent: jsonb("recycled_content"), // {fiber, percentage, type: pre/post-consumer}
  materialOrigins: jsonb("material_origins"), // {material, country_code}
  materialCertifications: jsonb("material_certifications"), // Array of certifications
  
  // Production & Supply Chain
  productionCountry: varchar("production_country", { length: 2 }), // ISO 3166-1 alpha-2
  productionFacilities: jsonb("production_facilities"), // Array of facilities with process steps
  productionProcesses: text("production_processes"),
  supplierInformation: jsonb("supplier_information"), // Tier information
  
  // Sustainability & Compliance
  sustainabilityData: jsonb("sustainability_data"), // Environmental metrics
  chemicalCompliance: jsonb("chemical_compliance"), // REACH compliance, restricted substances
  socialCompliance: jsonb("social_compliance"), // Fair trade, labor standards
  circularityData: jsonb("circularity_data"), // Recyclability, repair instructions
  
  // Care & End of Life
  careInstructions: text("care_instructions"),
  careSymbols: jsonb("care_symbols"), // Washing symbols data
  endOfLifeInstructions: text("end_of_life_instructions"),
  
  // Regulatory & Market
  intendedMarkets: jsonb("intended_markets"), // Array of country codes
  regulatoryCompliance: jsonb("regulatory_compliance"), // Various compliance data
  
  // Metadata
  registeredBy: integer("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stories table for user-generated content
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorId: varchar("author_id", { length: 50 }).notNull(),
  photos: jsonb("photos").default([]),
  tags: jsonb("tags").default([]),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  views: integer("views").default(0),
  isPublic: boolean("is_public").default(true),
  productId: integer("product_id"),
  status: varchar("status", { length: 20 }).default("approved"), // 'pending', 'approved', 'rejected'
  moderatedBy: varchar("moderated_by", { length: 50 }),
  moderationNotes: text("moderation_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storiesRelations = relations(stories, ({ one }) => ({
  product: one(products, {
    fields: [stories.productId],
    references: [products.id],
  }),
}));

export const gtinRegistryRelations = relations(gtinRegistry, ({ one }) => ({
  registeredBy: one(users, {
    fields: [gtinRegistry.registeredBy],
    references: [users.id],
  }),
}));

export const insertProductSchema = createInsertSchema(products, {
  additionalPhotos: z.array(z.string()).nullable().optional(),
  sourceGtins: z.array(z.string()).nullable().optional(),
  materialProperties: z.object({
    composition: z.string().optional(),
    weight: z.string().optional(),
    durability: z.string().optional(),
    recyclability: z.string().optional(),
    certifications: z.array(z.string()).optional(),
  }).nullable().optional(),
  careSymbols: z.array(z.object({
    symbol: z.string(),
    code: z.string(),
    temperature: z.number().optional(),
    allowed: z.boolean().optional(),
    method: z.string().optional(),
    description: z.string(),
  })).nullable().optional(),
  carbonFootprintDetailed: z.object({
    totalKg: z.number().optional(),
    materialPhase: z.number().optional(),
    productionPhase: z.number().optional(),
    transportPhase: z.number().optional(),
    usePhase: z.number().optional(),
    endOfLifePhase: z.number().optional(),
    calculationMethod: z.string().optional(),
    calculationDate: z.string().optional(),
  }).nullable().optional(),
  waterFootprintBreakdown: z.object({
    fiber: z.number().optional(),
    production: z.number().optional(),
    dyeing: z.number().optional(),
    washingEstimated: z.number().optional(),
  }).nullable().optional(),
  fiberSheddingTestResults: z.object({
    testMethod: z.string().optional(),
    testDate: z.string().optional(),
    fibersPerWash: z.number().optional(),
    labName: z.string().optional(),
    reportUrl: z.string().optional(),
  }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // GTIN is optional - will be auto-generated if not provided
  gtin: z.string().optional(),
  // Name and type have defaults if not provided
  name: z.string().default("Nieuw Product"),
  type: z.string().default("product"),
  status: z.string().default("beschikbaar"),
  // All numeric environmental fields: empty = null, 0 = valid, any number = valid
  repairabilityIndex: z.preprocess(parseOptionalInteger, z.number().int().nullable().optional()),
  durabilityScore: z.preprocess(parseOptionalInteger, z.number().int().nullable().optional()),
  waterFootprintLiters: z.preprocess(parseOptionalInteger, z.number().int().nullable().optional()),
  renewableEnergyPercentage: z.preprocess(parseOptionalInteger, z.number().int().nullable().optional()),
  microplasticSheddingEstimated: z.preprocess(parseOptionalInteger, z.number().int().nullable().optional()),
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

export const insertNotificationSchema = createInsertSchema(notifications, {
  metadata: z.object({
    action: z.string().optional(),
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
    changedBy: z.string().optional(),
  }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  likes: true,
  comments: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGtinRegistrySchema = createInsertSchema(gtinRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
export type InsertGtinRegistry = z.infer<typeof insertGtinRegistrySchema>;
export type GtinRegistry = typeof gtinRegistry.$inferSelect;

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
