import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { gs1Partners, gs1SyncEvents, gs1ProductMappings, products } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

interface GS1Product {
  gtin: string;
  name: string;
  brand: string;
  description: string;
  netContent: string;
  countryOfOrigin: string;
  targetMarket: string[];
  lastModified: string;
}

interface InventoryUpdate {
  gtin: string;
  location: string;
  quantity: number;
  status: 'available' | 'out_of_stock' | 'discontinued';
  lastUpdated: string;
}

export class GS1SyncService {
  private static instance: GS1SyncService;
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): GS1SyncService {
    if (!GS1SyncService.instance) {
      GS1SyncService.instance = new GS1SyncService();
    }
    return GS1SyncService.instance;
  }

  async startAutoSync(intervalMinutes: number = 15) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncAllPartners();
    }, intervalMinutes * 60 * 1000);

    console.log(`GS1 Auto-sync started with ${intervalMinutes} minute interval`);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('GS1 Auto-sync stopped');
    }
  }

  isAutoSyncRunning(): boolean {
    return this.syncInterval !== null;
  }

  async getAllPartners() {
    return await db.select().from(gs1Partners).orderBy(desc(gs1Partners.createdAt));
  }

  async getPartner(id: string) {
    const [partner] = await db.select().from(gs1Partners).where(eq(gs1Partners.id, id));
    return partner;
  }

  async addPartner(partnerData: {
    name: string;
    gln: string;
    endpoint: string;
    apiKey?: string;
    certificate?: string;
  }) {
    const partnerId = uuidv4();
    
    const [partner] = await db.insert(gs1Partners).values({
      id: partnerId,
      ...partnerData,
      status: 'disconnected',
    }).returning();

    // Test connection
    await this.testConnection(partnerId);
    
    return partner;
  }

  async updatePartner(id: string, updates: Partial<typeof gs1Partners.$inferInsert>) {
    const [partner] = await db
      .update(gs1Partners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gs1Partners.id, id))
      .returning();
    
    return partner;
  }

  async deletePartner(id: string) {
    await db.delete(gs1Partners).where(eq(gs1Partners.id, id));
  }

  async testConnection(partnerId: string): Promise<boolean> {
    const partner = await this.getPartner(partnerId);
    if (!partner) return false;

    try {
      // For real implementation, this would test the actual GS1 endpoint
      // For now, we'll simulate a connection test
      const isConnected = await this.simulateConnectionTest(partner);
      
      await this.updatePartner(partnerId, {
        status: isConnected ? 'connected' : 'error',
        lastSync: new Date(),
      });

      return isConnected;
    } catch (error) {
      console.error(`Connection test failed for partner ${partner.name}:`, error);
      await this.updatePartner(partnerId, { status: 'error' });
      return false;
    }
  }

  private async simulateConnectionTest(partner: any): Promise<boolean> {
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, randomly succeed/fail
    // In real implementation, this would make actual HTTP requests to GS1 endpoints
    return Math.random() > 0.2; // 80% success rate for demo
  }

  async syncPartner(partnerId: string): Promise<string> {
    const partner = await this.getPartner(partnerId);
    if (!partner || !partner.syncEnabled) {
      throw new Error('Partner not found or sync disabled');
    }

    const eventId = uuidv4();
    
    // Create sync event record
    await db.insert(gs1SyncEvents).values({
      id: eventId,
      partnerId,
      type: 'inventory_update',
      status: 'pending',
      startedAt: new Date(),
      details: `Starting sync with ${partner.name}`,
    });

    try {
      this.isRunning = true;
      
      // Simulate sync process
      const result = await this.performSync(partner);
      
      // Update sync event with results
      await db.update(gs1SyncEvents)
        .set({
          status: 'success',
          completedAt: new Date(),
          recordsProcessed: result.recordsProcessed,
          details: result.details,
        })
        .where(eq(gs1SyncEvents.id, eventId));

      // Update partner last sync time
      await this.updatePartner(partnerId, {
        lastSync: new Date(),
        status: 'connected',
      });

      console.log(`Sync completed for partner ${partner.name}: ${result.recordsProcessed} records processed`);
      
    } catch (error) {
      console.error(`Sync failed for partner ${partner.name}:`, error);
      
      await db.update(gs1SyncEvents)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          details: 'Sync failed due to error',
        })
        .where(eq(gs1SyncEvents.id, eventId));

      await this.updatePartner(partnerId, { status: 'error' });
      throw error;
    } finally {
      this.isRunning = false;
    }

    return eventId;
  }

  private async performSync(partner: any): Promise<{ recordsProcessed: number; details: string }> {
    // Simulate sync process with GS1 partner
    const delay = 2000 + Math.random() * 3000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    // In real implementation, this would:
    // 1. Connect to partner's GS1 GDSN endpoint
    // 2. Retrieve product master data and inventory updates
    // 3. Process and update local database
    // 4. Send any local updates back to partner
    
    const recordsProcessed = Math.floor(Math.random() * 100) + 10; // 10-110 records
    
    // Simulate updating some products
    await this.simulateProductUpdates(partner.gln, recordsProcessed);
    
    return {
      recordsProcessed,
      details: `Successfully synchronized ${recordsProcessed} products with ${partner.name}`,
    };
  }

  private async simulateProductUpdates(partnerGln: string, count: number) {
    // In real implementation, this would update actual product data from GS1 feeds
    // For now, we'll just log the simulation
    console.log(`Simulating ${count} product updates from partner GLN: ${partnerGln}`);
  }

  async syncAllPartners() {
    const partners = await db.select().from(gs1Partners).where(eq(gs1Partners.syncEnabled, true));
    
    const syncPromises = partners.map(partner => 
      this.syncPartner(partner.id).catch(error => 
        console.error(`Failed to sync partner ${partner.name}:`, error)
      )
    );

    await Promise.all(syncPromises);
  }

  async getSyncEvents(limit: number = 50) {
    const events = await db
      .select({
        id: gs1SyncEvents.id,
        partnerId: gs1SyncEvents.partnerId,
        partnerName: gs1Partners.name,
        type: gs1SyncEvents.type,
        status: gs1SyncEvents.status,
        details: gs1SyncEvents.details,
        recordsProcessed: gs1SyncEvents.recordsProcessed,
        timestamp: gs1SyncEvents.startedAt,
      })
      .from(gs1SyncEvents)
      .leftJoin(gs1Partners, eq(gs1SyncEvents.partnerId, gs1Partners.id))
      .orderBy(desc(gs1SyncEvents.startedAt))
      .limit(limit);

    return events;
  }

  getSyncStatus() {
    return {
      isRunning: this.isRunning,
      autoSyncEnabled: this.syncInterval !== null,
    };
  }
}

export const gs1Service = GS1SyncService.getInstance();