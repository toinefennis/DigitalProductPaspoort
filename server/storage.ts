import { 
  products, 
  events, 
  users, 
  notifications,
  stories,
  gtinRegistry,
  type Product, 
  type InsertProduct, 
  type Event, 
  type InsertEvent, 
  type User,
  type InsertUser,
  type Notification,
  type InsertNotification,
  type Story,
  type InsertStory,
  type GtinRegistry,
  type InsertGtinRegistry,
  type DashboardStats, 
  type ProductWithEvents 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and } from "drizzle-orm";

export interface IStorage {
  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductByGtin(gtin: string): Promise<Product | undefined>;
  getProductWithEvents(id: number): Promise<ProductWithEvents | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  getAllProducts(): Promise<Product[]>;
  
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEventsByProductId(productId: number): Promise<Event[]>;
  getRecentEvents(limit?: number): Promise<(Event & { product: Product })[]>;
  deleteEvent(eventId: number): Promise<void>;
  
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(userId: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(userId: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserRole(userId: number, role: string): Promise<User>;
  changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<DashboardStats>;
  
  // Story operations
  createStory(story: InsertStory): Promise<Story>;
  getAllStories(): Promise<Story[]>;
  updateStory(id: number, updates: Partial<InsertStory>): Promise<Story>;
  deleteStory(id: number): Promise<void>;
  moderateStory(id: number, status: string, moderatedBy: string, notes?: string): Promise<Story>;
  
  // GTIN Registry operations (Manager/Admin only)
  createGtinRegistry(gtinData: InsertGtinRegistry): Promise<GtinRegistry>;
  getGtinRegistry(id: number): Promise<GtinRegistry | undefined>;
  getGtinRegistryByGtin(gtin: string): Promise<GtinRegistry | undefined>;
  getAllGtinRegistry(): Promise<GtinRegistry[]>;
  updateGtinRegistry(id: number, updates: Partial<InsertGtinRegistry>): Promise<GtinRegistry>;
  deleteGtinRegistry(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByGtin(gtin: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.gtin, gtin));
    return product || undefined;
  }

  async getProductWithEvents(id: number): Promise<ProductWithEvents | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const productEvents = await this.getEventsByProductId(id);
    return {
      ...product,
      events: productEvents,
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values({
        gtin: product.gtin,
        name: product.name,
        type: product.type,
        description: product.description,
        brand: product.brand,
        material: product.material,
        photoUrl: product.photoUrl,
        additionalPhotos: product.additionalPhotos,
        sourceGtins: product.sourceGtins,
        status: product.status,
        collection: product.collection,
      })
      .returning();
    
    // Create initial creation event
    await this.createEvent({
      productId: newProduct.id,
      eventType: "creatie",
      description: "Product toegevoegd aan DPP systeem",
    });
    
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    
    return updatedProduct;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.updatedAt));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    
    // Update product status based on event type
    if (event.eventType === "uitleen") {
      await this.updateProduct(event.productId, { status: "uitgeleend" });
    } else if (event.eventType === "retour") {
      await this.updateProduct(event.productId, { status: "beschikbaar" });
    } else if (event.eventType === "reparatie") {
      await this.updateProduct(event.productId, { status: "beschikbaar" });
    }
    
    return newEvent;
  }

  async getEventsByProductId(productId: number): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.productId, productId))
      .orderBy(desc(events.createdAt));
  }

  async getRecentEvents(limit: number = 10): Promise<(Event & { product: Product })[]> {
    const results = await db
      .select()
      .from(events)
      .leftJoin(products, eq(events.productId, products.id))
      .orderBy(desc(events.createdAt))
      .limit(limit);
    
    return results.map(result => ({
      ...result.events,
      product: result.products!,
    }));
  }

  async deleteEvent(eventId: number): Promise<void> {
    await db.delete(events).where(eq(events.id, eventId));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return newNotification;
  }

  async getUserNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]> {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    
    if (unreadOnly) {
      query = query.where(eq(notifications.isRead, false));
    }
    
    return await query.orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // User operations
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserById(userId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || undefined;
  }

  async updateUser(userId: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async updateUserRole(userId: number, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    // In a real implementation, you would verify the current password and hash the new one
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    // For demo purposes, we'll accept any current password and just update
    await db
      .update(users)
      .set({ password: newPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const totalProductsResult = await db
      .select({ count: count() })
      .from(products);
    
    const totalRepairsResult = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.eventType, "reparatie"));
    
    const itemsOnLoanResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.status, "uitgeleend"));
    
    const remadeItemsResult = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.type, "remake"));
    
    return {
      totalProducts: totalProductsResult[0]?.count || 0,
      totalRepairs: totalRepairsResult[0]?.count || 0,
      itemsOnLoan: itemsOnLoanResult[0]?.count || 0,
      remadeItems: remadeItemsResult[0]?.count || 0,
    };
  }

  // Story operations
  async createStory(story: InsertStory): Promise<Story> {
    const [newStory] = await db
      .insert(stories)
      .values(story)
      .returning();
    return newStory;
  }

  async getAllStories(): Promise<Story[]> {
    return await db.select().from(stories).orderBy(desc(stories.createdAt));
  }

  async updateStory(id: number, updates: Partial<InsertStory>): Promise<Story> {
    const [updatedStory] = await db
      .update(stories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return updatedStory;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  async moderateStory(id: number, status: string, moderatedBy: string, notes?: string): Promise<Story> {
    const [moderatedStory] = await db
      .update(stories)
      .set({
        status,
        moderatedBy,
        moderationNotes: notes,
        updatedAt: new Date()
      })
      .where(eq(stories.id, id))
      .returning();
    return moderatedStory;
  }

  // GTIN Registry operations (Manager/Admin only)
  async createGtinRegistry(gtinData: InsertGtinRegistry): Promise<GtinRegistry> {
    const [newGtinRegistry] = await db
      .insert(gtinRegistry)
      .values(gtinData)
      .returning();
    return newGtinRegistry;
  }

  async getGtinRegistry(id: number): Promise<GtinRegistry | undefined> {
    const [registry] = await db.select().from(gtinRegistry).where(eq(gtinRegistry.id, id));
    return registry;
  }

  async getGtinRegistryByGtin(gtin: string): Promise<GtinRegistry | undefined> {
    const [registry] = await db.select().from(gtinRegistry).where(eq(gtinRegistry.gtin, gtin));
    return registry;
  }

  async getAllGtinRegistry(): Promise<GtinRegistry[]> {
    return await db.select().from(gtinRegistry).orderBy(desc(gtinRegistry.createdAt));
  }

  async updateGtinRegistry(id: number, updates: Partial<InsertGtinRegistry>): Promise<GtinRegistry> {
    const [updatedRegistry] = await db
      .update(gtinRegistry)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gtinRegistry.id, id))
      .returning();
    return updatedRegistry;
  }

  async deleteGtinRegistry(id: number): Promise<void> {
    await db.delete(gtinRegistry).where(eq(gtinRegistry.id, id));
  }
}

export const storage = new DatabaseStorage();
