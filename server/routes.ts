import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertEventSchema, insertUserSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import sharp from "sharp";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'demo-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Load material care data
  const materialCareData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server', 'material-care-data.json'), 'utf8'));

  // Get material care instructions
  app.get("/api/materials", async (req, res) => {
    try {
      res.json(materialCareData);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  // Get care instructions for specific material
  app.get("/api/materials/:material/care", async (req, res) => {
    try {
      const materialName = decodeURIComponent(req.params.material);
      const material = materialCareData.find((m: any) => 
        m.Materiaal.toLowerCase() === materialName.toLowerCase()
      );
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      res.json(material["gs1:careInstructions"]);
    } catch (error) {
      console.error("Error fetching care instructions:", error);
      res.status(500).json({ message: "Failed to fetch care instructions" });
    }
  });

  // CO2 Material Data API
  app.get('/api/materials/co2', (req, res) => {
    try {
      const co2MaterialData = require('./co2-material-data.json');
      res.json(co2MaterialData);
    } catch (error) {
      console.error("Error loading CO2 material data:", error);
      res.status(500).json({ message: "Failed to load CO2 data" });
    }
  });

  app.post('/api/materials/co2/calculate', async (req, res) => {
    const { fiberComposition, productWeight } = req.body;
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      const url = await import('url');
      const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
      const co2MaterialData = JSON.parse(fs.readFileSync(path.join(__dirname, 'co2-material-data.json'), 'utf8'));
      let composition;
      
      if (typeof fiberComposition === 'string') {
        composition = JSON.parse(fiberComposition);
      } else {
        composition = fiberComposition;
      }
      
      let totalCO2 = 0;
      let calculatedComponents: any[] = [];
      
      if (Array.isArray(composition)) {
        composition.forEach((component: any) => {
          if (component.vezels && Array.isArray(component.vezels)) {
            component.vezels.forEach((fiber: any) => {
              const materialData = co2MaterialData.find((item: any) => {
                const materialName = item.Materiaal.toLowerCase();
                const fiberName = (fiber.naam || fiber.code || '').toLowerCase();
                return materialName.includes(fiberName) || 
                       (fiber.code && materialName.includes(fiber.code.toLowerCase()));
              });
              
              if (materialData && materialData.CO2_kg_per_kg && fiber.percentage) {
                const fiberWeight = (productWeight || 1) * (fiber.percentage / 100);
                const fiberCO2 = fiberWeight * materialData.CO2_kg_per_kg;
                totalCO2 += fiberCO2;
                
                calculatedComponents.push({
                  component: component.component,
                  fiber: fiber.naam || fiber.code,
                  percentage: fiber.percentage,
                  co2_factor: materialData.CO2_kg_per_kg,
                  weight_kg: Math.round(fiberWeight * 1000) / 1000,
                  co2_kg: Math.round(fiberCO2 * 1000) / 1000
                });
              }
            });
          }
        });
      }
      
      res.json({
        total_co2_kg: Math.round(totalCO2 * 1000) / 1000,
        product_weight_kg: productWeight || 1,
        co2_per_kg: Math.round((totalCO2 / (productWeight || 1)) * 1000) / 1000,
        components: calculatedComponents,
        calculation_date: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error calculating CO2:", error);
      res.status(400).json({ 
        message: 'Fout bij CO2 berekening', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Photo upload endpoint with compression
  app.post("/api/upload/photo", upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      const originalPath = req.file.path;
      const compressedFilename = `compressed-${req.file.filename}`;
      const compressedPath = path.join(uploadDir, compressedFilename);

      // Compress image to max 2MB
      let quality = 85;
      let compressedSize = 0;
      const maxSize = 2 * 1024 * 1024; // 2MB

      do {
        await sharp(originalPath)
          .resize(1920, 1920, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: quality,
            progressive: true 
          })
          .toFile(compressedPath);

        const stats = fs.statSync(compressedPath);
        compressedSize = stats.size;
        
        if (compressedSize > maxSize && quality > 20) {
          quality -= 10;
          fs.unlinkSync(compressedPath); // Remove the previous attempt
        }
      } while (compressedSize > maxSize && quality > 20);

      // Remove original file
      fs.unlinkSync(originalPath);

      const photoUrl = `/uploads/${compressedFilename}`;
      console.log(`Photo compressed from ${req.file.size} to ${compressedSize} bytes (${Math.round(compressedSize / 1024)}KB)`);
      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Recent activities - Filter by user role  
  app.get("/api/dashboard/activities", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const activities = await storage.getRecentEvents(10);
      
      // Filter based on user role - regular users only see their own activities
      let filteredActivities = activities;
      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        filteredActivities = activities.filter(event => 
          !event.borrowerEmail || event.borrowerEmail === sessionUser.email
        );
      }
      
      res.json(filteredActivities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get product by ID with events
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProductWithEvents(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get product by GTIN
  app.get("/api/products/gtin/:gtin", async (req, res) => {
    try {
      const gtin = req.params.gtin;
      const product = await storage.getProductByGtin(gtin);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const productWithEvents = await storage.getProductWithEvents(product.id);
      res.json(productWithEvents);
    } catch (error) {
      console.error("Error fetching product by GTIN:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Create new product
  app.post("/api/products", upload.single("photo"), async (req, res) => {
    try {
      const productData = {
        ...req.body,
        sourceGtins: req.body.sourceGtins ? JSON.parse(req.body.sourceGtins) : [],
        photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
      };

      const validatedProduct = insertProductSchema.parse(productData);
      
      // Check if GTIN already exists
      const existingProduct = await storage.getProductByGtin(validatedProduct.gtin);
      if (existingProduct) {
        return res.status(400).json({ message: "Product with this GTIN already exists" });
      }

      const product = await storage.createProduct(validatedProduct);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update product
  app.patch("/api/products/:id", async (req, res) => {
    try {
      console.log("Update product request:", req.body);
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Parse materialProperties if it exists
      const updateData = { ...req.body };
      if (updateData.materialProperties && typeof updateData.materialProperties === 'string') {
        updateData.materialProperties = JSON.parse(updateData.materialProperties);
      }

      // Handle photo URL
      if (updateData.photo) {
        updateData.photoUrl = updateData.photo;
        delete updateData.photo;
      }

      console.log("Processed update data:", updateData);
      const updatedProduct = await storage.updateProduct(productId, updateData);
      console.log("Update successful:", updatedProduct.id);
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Create new event
  app.post("/api/events", upload.single("photo"), async (req, res) => {
    try {
      const eventData = {
        ...req.body,
        productId: parseInt(req.body.productId),
        photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
        expectedReturn: req.body.expectedReturn ? new Date(req.body.expectedReturn) : null,
      };

      // Calculate expected return date for loan events if not provided
      if (eventData.eventType === "uitleen" && !eventData.expectedReturn && req.body.loanDurationWeeks) {
        const loanDurationWeeks = parseInt(req.body.loanDurationWeeks) || 3;
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + (loanDurationWeeks * 7));
        eventData.expectedReturn = expectedReturn;
      }

      const validatedEvent = insertEventSchema.parse(eventData);
      
      // Verify product exists
      const product = await storage.getProduct(validatedEvent.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const event = await storage.createEvent(validatedEvent);

      // Create notification for loan events - temporarily disabled until notification system is fixed
      // if (validatedEvent.eventType === "uitleen" && validatedEvent.borrowerName) {
      //   await storage.createNotification({
      //     userId: 1, // Default admin user
      //     type: "loan_created",
      //     title: "Nieuwe uitleen",
      //     message: `Product "${product.name}" is uitgeleend aan ${validatedEvent.borrowerName}`,
      //     productId: product.id,
      //   });
      // }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Validate GTIN endpoint for checking if a code is available
  app.get("/api/validate-gtin/:gtin", async (req, res) => {
    try {
      const gtin = req.params.gtin;
      const existingProduct = await storage.getProductByGtin(gtin);
      
      res.json({
        available: !existingProduct,
        exists: !!existingProduct,
      });
    } catch (error) {
      console.error("Error validating GTIN:", error);
      res.status(500).json({ message: "Failed to validate GTIN" });
    }
  });

  // Get active loans for loan overview - Filter by user role
  app.get("/api/loans/active", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get all recent events to analyze loan status
      const allEvents = await storage.getRecentEvents(500);
      const loanEvents = allEvents.filter(event => event.eventType === "uitleen");
      
      // Filter out loans that have been returned
      const activeLoanEvents = loanEvents.filter(loanEvent => {
        // Check if there's a return event for this product after the loan date
        const returnEvent = allEvents.find(event => 
          event.productId === loanEvent.productId &&
          event.eventType === "retour" &&
          new Date(event.createdAt) > new Date(loanEvent.createdAt)
        );
        
        // If no return event found, loan is still active
        return !returnEvent;
      });
      
      // Filter based on user role - regular users only see their own loans
      let filteredLoans = activeLoanEvents;
      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        filteredLoans = activeLoanEvents.filter(event => event.borrowerEmail === sessionUser.email);
      }
      
      res.json(filteredLoans);
    } catch (error) {
      console.error("Error fetching active loans:", error);
      res.status(500).json({ message: "Failed to fetch active loans" });
    }
  });

  // Export data endpoints - Only admin and manager can export data
  app.get("/api/export/:type", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if user has permission to export data
      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions. Only administrators and managers can export data." });
      }

      const { type } = req.params;
      const { format = "csv" } = req.query;
      
      let data: any[] = [];
      let filename = "";
      
      switch (type) {
        case "products":
          data = await storage.getAllProducts();
          filename = "products";
          break;
        case "events":
          data = await storage.getRecentEvents(1000);
          filename = "events";
          break;
        case "loans":
          const allEvents = await storage.getRecentEvents(1000);
          data = allEvents.filter(event => event.eventType === "uitleen");
          filename = "active_loans";
          break;
        case "users":
          data = await storage.getAllUsers();
          filename = "users";
          break;
        case "full":
          const products = await storage.getAllProducts();
          const events = await storage.getRecentEvents(1000);
          const users = await storage.getAllUsers();
          data = [
            { table: "products", data: products },
            { table: "events", data: events },
            { table: "users", data: users }
          ];
          filename = "full_database";
          break;
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }

      if (format === "json") {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
      } else if (format === "csv") {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const csvData = data.map(row => 
            Object.values(row).map(value => 
              typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
            ).join(',')
          ).join('\n');
          res.send(`${headers}\n${csvData}`);
        } else {
          res.send('No data available');
        }
      } else if (format === "excel") {
        const XLSX = await import('xlsx');
        
        // Helper functions for GS1 mapping
        const mapEventTypeToBusinessStep = (eventType: string): string => {
          switch (eventType) {
            case 'aangemaakt': return 'commissioning';
            case 'reparatie': return 'repairing';
            case 'hergebruik': return 'reusing';
            case 'uitlening': return 'departing';
            case 'retournering': return 'arriving';
            case 'recycling': return 'disposing';
            default: return 'other';
          }
        };

        const mapEventTypeToDisposition = (eventType: string): string => {
          switch (eventType) {
            case 'aangemaakt': return 'active';
            case 'reparatie': return 'in_progress';
            case 'hergebruik': return 'active';
            case 'uitlening': return 'in_transit';
            case 'retournering': return 'active';
            case 'recycling': return 'disposed';
            default: return 'unknown';
          }
        };

        // Create workbook for GS1-compliant export
        const wb = XLSX.default.utils.book_new();
        
        if (type === "products" || type === "full") {
          const products = type === "products" ? data : (data.find((d: any) => d.table === "products")?.data || []);
          
          // GS1 Product Information Sheet
          const gs1ProductData = products.map((p: any) => ({
            'GTIN': p.gtin || '',
            'Product Name': p.name || '',
            'Brand Name': p.brand || '',
            'Product Description': p.description || '',
            'Product Type': p.type || '',
            'Net Content': '', // Could be added to schema
            'Country of Origin': 'NL', // Default to Netherlands
            'Target Market': 'NL',
            'Product Status': p.status || '',
            'Created Date': p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
            'Last Modified': p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
            'Packaging Level': 'Consumer Unit',
            'Is Trade Item': 'true',
            'GLN of Information Provider': process.env.GS1_SANDBOX_GLN || '8720796166279'
          }));
          
          const ws1 = XLSX.default.utils.json_to_sheet(gs1ProductData);
          
          // Set column widths
          ws1['!cols'] = [
            { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 15 },
            { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 20 }
          ];
          
          XLSX.default.utils.book_append_sheet(wb, ws1, 'GS1 Product Information');
        }
        
        if (type === "events" || type === "full") {
          const events = type === "events" ? data : (data.find((d: any) => d.table === "events")?.data || []);
          
          // EPCIS Events Sheet
          const eventsData = events.map((e: any) => ({
            'Event ID': e.id,
            'GTIN': e.product?.gtin || '',
            'Product Name': e.product?.name || '',
            'Event Type': e.eventType,
            'Event Description': e.description || '',
            'Event Date': e.createdAt ? new Date(e.createdAt).toISOString() : '',
            'Location GLN': process.env.GS1_SANDBOX_GLN || '8720796166279',
            'Business Step': mapEventTypeToBusinessStep(e.eventType),
            'Disposition': mapEventTypeToDisposition(e.eventType),
            'Read Point': 'GWC Groningen',
            'Business Location': 'GWC Repair Cafe'
          }));
          
          const ws2 = XLSX.default.utils.json_to_sheet(eventsData);
          ws2['!cols'] = [
            { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 40 },
            { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }
          ];
          
          XLSX.default.utils.book_append_sheet(wb, ws2, 'EPCIS Events');
        }
        
        if (type === "users" || type === "full") {
          const users = type === "users" ? data : (data.find((d: any) => d.table === "users")?.data || []);
          
          // Users sheet
          const usersData = users.map((u: any) => ({
            'User ID': u.id,
            'Username': u.username || '',
            'Email': u.email || '',
            'Role': u.role || '',
            'Full Name': u.fullName || '',
            'Phone': u.phone || '',
            'Created Date': u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : ''
          }));
          
          const ws3 = XLSX.default.utils.json_to_sheet(usersData);
          ws3['!cols'] = [
            { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }
          ];
          
          XLSX.default.utils.book_append_sheet(wb, ws3, 'Users');
        }
        
        // Generate Excel buffer
        const excelBuffer = XLSX.default.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="GS1-DPP-${filename}-${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(excelBuffer);
      } else {
        return res.status(400).json({ message: "Unsupported format. Use json, csv, or excel" });
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // GS1 Sync API endpoints - Admin only
  app.get("/api/gs1/partners", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins can manage GS1 integrations
      if (sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions. Only administrators can manage GS1 integrations." });
      }

      const { gs1Service } = await import("./gs1-service");
      const partners = await gs1Service.getAllPartners();
      res.json(partners);
    } catch (error) {
      console.error("Error fetching GS1 partners:", error);
      res.status(500).json({ message: "Failed to fetch GS1 partners" });
    }
  });

  app.post("/api/gs1/partners", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions. Only administrators can manage GS1 integrations." });
      }

      const { gs1Service } = await import("./gs1-service");
      const partner = await gs1Service.addPartner(req.body);
      res.status(201).json(partner);
    } catch (error) {
      console.error("Error adding GS1 partner:", error);
      res.status(500).json({ message: "Failed to add GS1 partner" });
    }
  });

  app.patch("/api/gs1/partners/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions. Only administrators can manage GS1 integrations." });
      }

      const { gs1Service } = await import("./gs1-service");
      const partner = await gs1Service.updatePartner(req.params.id, req.body);
      res.json(partner);
    } catch (error) {
      console.error("Error updating GS1 partner:", error);
      res.status(500).json({ message: "Failed to update GS1 partner" });
    }
  });

  app.post("/api/gs1/sync", async (req, res) => {
    try {
      const { gs1Service } = await import("./gs1-service");
      const { partnerId } = req.body;
      const eventId = await gs1Service.syncPartner(partnerId);
      res.json({ eventId, message: "Sync started successfully" });
    } catch (error) {
      console.error("Error starting GS1 sync:", error);
      res.status(500).json({ message: "Failed to start sync" });
    }
  });

  app.get("/api/gs1/sync-events", async (req, res) => {
    try {
      const { gs1Service } = await import("./gs1-service");
      const events = await gs1Service.getSyncEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching sync events:", error);
      res.status(500).json({ message: "Failed to fetch sync events" });
    }
  });

  app.get("/api/gs1/sync-status", async (req, res) => {
    try {
      const { gs1Service } = await import("./gs1-service");
      const status = gs1Service.getSyncStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching sync status:", error);
      res.status(500).json({ message: "Failed to fetch sync status" });
    }
  });

  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Demo authentication - in production use proper authentication
      const demoUsers = [
        { id: 1, username: "admin", password: "admin123", role: "admin", fullName: "Admin Gebruiker", email: "admin@gwc.nl" },
        { id: 2, username: "manager", password: "manager123", role: "manager", fullName: "Manager Gebruiker", email: "manager@gwc.nl" },
        { id: 3, username: "user", password: "user123", role: "user", fullName: "Normale Gebruiker", email: "user@gwc.nl" }
      ];
      
      const user = demoUsers.find(u => u.username === username && u.password === password);
      
      if (!user) {
        return res.status(401).json({ message: "Onjuiste gebruikersnaam of wachtwoord" });
      }
      
      // Set user in session
      (req as any).session.user = user;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logout successful" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // User profile endpoints
  app.get("/api/users/me", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      res.json(sessionUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.patch("/api/users/update-profile", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { fullName, email, phone } = req.body;
      
      // Update session user data
      (req as any).session.user = {
        ...sessionUser,
        fullName,
        email,
        phone
      };
      
      res.json((req as any).session.user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/users/change-password", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Simple password validation for demo
      if (currentPassword !== sessionUser.password) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update password in session
      (req as any).session.user.password = newPassword;
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Events endpoints
  app.delete("/api/events/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser || sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Loans endpoints
  app.get("/api/loans/active", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get all events with products where eventType is 'uitleen'
      const events = await storage.getRecentEvents(100); // Get more events to filter
      
      // Filter for loan events only
      const loanEvents = events.filter(event => 
        event.eventType === "uitleen" && 
        event.borrowerName && 
        event.borrowerEmail
      );

      // Filter based on user role
      let filteredLoanEvents = loanEvents;
      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        filteredLoanEvents = loanEvents.filter(event => 
          event.borrowerEmail === sessionUser.email
        );
      }
      
      res.json(filteredLoanEvents);
    } catch (error) {
      console.error("Error fetching active loans:", error);
      res.status(500).json({ message: "Failed to fetch active loans" });
    }
  });

  // Stories endpoints
  app.get("/api/stories", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      
      const stories = await storage.getAllStories();
      
      // Filter by approval status for regular users
      let filteredStories = stories;
      if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'manager')) {
        filteredStories = stories.filter(story => story.status === 'approved');
      }
      
      res.json(filteredStories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post("/api/stories", upload.array('photos', 5), async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { title, content, tags, isPublic, productId } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }
      
      // Process tags from string to array
      const processedTags = typeof tags === 'string' 
        ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : Array.isArray(tags) ? tags : [];

      // Handle photo uploads
      const uploadedFiles = req.files as Express.Multer.File[];
      const photoUrls = uploadedFiles ? uploadedFiles.map(file => `/uploads/${file.filename}`) : [];

      const storyData = {
        title: title.trim(),
        content: content.trim(),
        authorName: sessionUser.fullName || sessionUser.username,
        authorId: sessionUser.id.toString(),
        photos: photoUrls,
        tags: processedTags,
        isPublic: isPublic === 'true' || isPublic === true,
        productId: productId ? parseInt(productId) : null,
        status: "approved", // Auto-approve for MVP
      };

      const newStory = await storage.createStory(storyData);
      res.status(201).json(newStory);
    } catch (error) {
      console.error("Error creating story:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  // Story update endpoint (for author editing)
  app.patch("/api/stories/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      const { title, content, tags, isPublic } = req.body;

      console.log("Update story request:", { id, title, content, tags, isPublic, userId: sessionUser.id });

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Get the story to check ownership
      const stories = await storage.getAllStories();
      const story = stories.find(s => s.id === parseInt(id));
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      console.log("Found story:", { storyId: story.id, authorId: story.authorId, userId: sessionUser.id });

      // Check if user is the author or has moderation privileges
      const isAuthor = story.authorId === sessionUser.id.toString();
      const isAdmin = sessionUser.role === 'admin';
      const isManager = sessionUser.role === 'manager';
      const canEdit = isAuthor || isAdmin || isManager;
      
      console.log("Permission check:", { 
        isAuthor, 
        isAdmin, 
        isManager, 
        canEdit,
        storyAuthorId: story.authorId,
        sessionUserId: sessionUser.id,
        sessionUserRole: sessionUser.role 
      });

      if (!canEdit) {
        console.log("Permission denied:", { authorId: story.authorId, userId: sessionUser.id, role: sessionUser.role });
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Process tags
      const processedTags = typeof tags === 'string' 
        ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : Array.isArray(tags) ? tags : [];

      const updates = {
        title: title.trim(),
        content: content.trim(),
        tags: processedTags,
        isPublic: isPublic === true || isPublic === 'true',
      };

      console.log("Calling storage.updateStory with:", updates);
      
      try {
        const updatedStory = await storage.updateStory(parseInt(id), updates);
        console.log("Storage update successful:", updatedStory);
        res.json(updatedStory);
      } catch (storageError) {
        console.error("Storage error details:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ message: "Failed to update story" });
    }
  });

  // Story moderation endpoints (admin/manager only)
  app.patch("/api/stories/:id/moderate", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      const { status, moderationNotes } = req.body;

      const updatedStory = await storage.moderateStory(
        parseInt(id), 
        status, 
        sessionUser.username, 
        moderationNotes
      );

      res.json(updatedStory);
    } catch (error) {
      console.error("Error moderating story:", error);
      res.status(500).json({ message: "Failed to moderate story" });
    }
  });

  app.delete("/api/stories/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'admin' && sessionUser.role !== 'manager') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { id } = req.params;
      await storage.deleteStory(parseInt(id));
      res.json({ message: "Story deleted successfully" });
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ message: "Failed to delete story" });
    }
  });

  // GTIN Registry routes (Manager/Admin only)
  app.get("/api/gtin-registry", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if user is manager or admin
      if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      const registries = await storage.getAllGtinRegistry();
      res.json(registries);
    } catch (error) {
      console.error("Error fetching GTIN registries:", error);
      res.status(500).json({ message: "Failed to fetch GTIN registries" });
    }
  });

  app.get("/api/gtin-registry/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      const registry = await storage.getGtinRegistry(parseInt(req.params.id));
      if (!registry) {
        return res.status(404).json({ message: "GTIN registry not found" });
      }
      res.json(registry);
    } catch (error) {
      console.error("Error fetching GTIN registry:", error);
      res.status(500).json({ message: "Failed to fetch GTIN registry" });
    }
  });

  app.post("/api/gtin-registry", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      const registryData = { ...req.body, registeredBy: sessionUser.id };
      const newRegistry = await storage.createGtinRegistry(registryData);
      res.status(201).json(newRegistry);
    } catch (error) {
      console.error("Error creating GTIN registry:", error);
      res.status(500).json({ message: "Failed to create GTIN registry" });
    }
  });

  app.patch("/api/gtin-registry/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      const updatedRegistry = await storage.updateGtinRegistry(parseInt(req.params.id), req.body);
      res.json(updatedRegistry);
    } catch (error) {
      console.error("Error updating GTIN registry:", error);
      res.status(500).json({ message: "Failed to update GTIN registry" });
    }
  });

  app.delete("/api/gtin-registry/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (sessionUser.role !== 'manager' && sessionUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      await storage.deleteGtinRegistry(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting GTIN registry:", error);
      res.status(500).json({ message: "Failed to delete GTIN registry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
