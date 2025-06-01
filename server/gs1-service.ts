import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { gs1Partners, gs1SyncEvents, gs1ProductMappings, products, events } from '@shared/schema';
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
    try {
      // Test connection to GS1 sandbox endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(partner.endpoint + '/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${partner.apiKey || 'sandbox-key'}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('GS1 connection test failed:', error);
      return false;
    }
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
    try {
      // Step 1: Fetch product data from GS1 sandbox
      const productData = await this.fetchGS1ProductData(partner);
      
      // Step 2: Fetch inventory updates from GS1 sandbox
      const inventoryData = await this.fetchGS1InventoryData(partner);
      
      // Step 3: Process and update local database
      const recordsProcessed = await this.processGS1Data(partner, productData, inventoryData);
      
      // Step 4: Send local updates back to partner (if any)
      await this.sendLocalUpdatestoGS1(partner);
      
      return {
        recordsProcessed,
        details: `Successfully synchronized ${recordsProcessed} products with ${partner.name} via GS1 sandbox`,
      };
    } catch (error) {
      console.error('GS1 sync error:', error);
      throw new Error(`GS1 sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchGS1ProductData(partner: any) {
    // Fetch product master data from GS1 GDSN sandbox
    const response = await fetch(`${partner.endpoint}/gdsn/trade-items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partner.apiKey}`,
        'GLN': partner.gln,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product data: ${response.statusText}`);
    }

    return await response.json();
  }

  private async fetchGS1InventoryData(partner: any) {
    // Fetch inventory updates from GS1 EPCIS sandbox
    const response = await fetch(`${partner.endpoint}/epcis/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${partner.apiKey}`,
        'GLN': partner.gln,
      },
      // Add query parameters for inventory events
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory data: ${response.statusText}`);
    }

    return await response.json();
  }

  private async processGS1Data(partner: any, productData: any, inventoryData: any): Promise<number> {
    let recordsProcessed = 0;

    // Process product master data
    if (productData?.tradeItems) {
      for (const tradeItem of productData.tradeItems) {
        await this.updateLocalProduct(tradeItem, partner.gln);
        recordsProcessed++;
      }
    }

    // Process inventory events
    if (inventoryData?.events) {
      for (const event of inventoryData.events) {
        await this.updateLocalInventory(event, partner.gln);
        recordsProcessed++;
      }
    }

    return recordsProcessed;
  }

  private async updateLocalProduct(tradeItem: any, partnerGln: string) {
    // Update local product database with GS1 trade item data
    const { gtin, productName, brand, description } = tradeItem;
    
    // Check if product exists locally
    const existingProduct = await db.select().from(products).where(eq(products.gtin, gtin));
    
    if (existingProduct.length > 0) {
      // Update existing product
      await db.update(products)
        .set({
          name: productName,
          brand: brand,
          description: description,
          updatedAt: new Date(),
        })
        .where(eq(products.gtin, gtin));
    } else {
      // Create new product
      await db.insert(products).values({
        gtin: gtin,
        name: productName,
        type: 'trade_item',
        brand: brand,
        description: description,
        status: 'beschikbaar',
      });
    }

    // Update GS1 mapping
    await this.updateGS1Mapping(gtin, partnerGln);
  }

  private async updateLocalInventory(event: any, partnerGln: string) {
    // Process EPCIS inventory events
    const { epcList, eventType, eventTime, readPoint } = event;
    
    for (const epc of epcList || []) {
      // Extract GTIN from EPC
      const gtin = this.extractGTINFromEPC(epc);
      
      if (gtin) {
        // Find local product
        const [product] = await db.select().from(products).where(eq(products.gtin, gtin));
        
        if (product) {
          // Update product status based on event type
          const status = this.mapEPCISEventToStatus(eventType);
          
          await db.update(products)
            .set({ status, updatedAt: new Date() })
            .where(eq(products.id, product.id));
          
          // Create event log
          await db.insert(events).values({
            productId: product.id,
            eventType: eventType,
            description: `GS1 ${eventType} event from ${partnerGln}`,
          });
        }
      }
    }
  }

  private async sendLocalUpdatestoGS1(partner: any) {
    // Send local product updates back to GS1 partner
    // This would include any local changes that need to be shared
    try {
      const localUpdates = await this.getLocalUpdatesForPartner(partner.gln);
      
      if (localUpdates.length > 0) {
        await fetch(`${partner.endpoint}/gdsn/trade-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${partner.apiKey}`,
            'GLN': partner.gln,
          },
          body: JSON.stringify({ tradeItems: localUpdates }),
        });
      }
    } catch (error) {
      console.warn('Failed to send local updates to GS1:', error);
      // Non-critical error, don't fail the entire sync
    }
  }

  private async updateGS1Mapping(gtin: string, partnerGln: string) {
    // Update or create GS1 product mapping
    const [product] = await db.select().from(products).where(eq(products.gtin, gtin));
    
    if (product) {
      await db.insert(gs1ProductMappings).values({
        productId: product.id,
        gtin: gtin,
        gln: partnerGln,
        lastSynced: new Date(),
        syncStatus: 'synced',
      }).onConflictDoUpdate({
        target: [gs1ProductMappings.productId, gs1ProductMappings.gln],
        set: {
          lastSynced: new Date(),
          syncStatus: 'synced',
          updatedAt: new Date(),
        },
      });
    }
  }

  private extractGTINFromEPC(epc: string): string | null {
    // Extract GTIN from EPC (Electronic Product Code)
    // EPC format: urn:epc:id:sgtin:company.item.serial
    const match = epc.match(/sgtin:(\d+)\.(\d+)\./);
    if (match) {
      const company = match[1];
      const item = match[2];
      // Convert to GTIN-14 format
      return company + item.padStart(5, '0') + '0'; // Simplified conversion
    }
    return null;
  }

  private mapEPCISEventToStatus(eventType: string): string {
    switch (eventType) {
      case 'ObjectEvent': return 'beschikbaar';
      case 'AggregationEvent': return 'verpakt';
      case 'TransformationEvent': return 'verwerkt';
      case 'TransactionEvent': return 'verkocht';
      default: return 'onbekend';
    }
  }

  private async getLocalUpdatesForPartner(partnerGln: string) {
    // Get local product updates that need to be sent to this partner
    // For now, return empty array
    return [];
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