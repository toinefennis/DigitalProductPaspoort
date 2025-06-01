import { 
  products, 
  events, 
  users, 
  notifications, 
  type Product, 
  type InsertProduct, 
  type Event, 
  type InsertEvent, 
  type User,
  type InsertUser,
  type Notification,
  type InsertNotification,
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

  async updateUserRole(userId: number, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
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
}

export const storage = new DatabaseStorage();
