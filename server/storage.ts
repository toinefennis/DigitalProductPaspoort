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
