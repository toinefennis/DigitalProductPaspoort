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
import { generateAndSaveQRCode, generateProductDPPUrl } from "./qrcode-generator";
import { MYSQL_PRODUCT_UPSERT, mysqlProductValues } from "./mysql-product-export";
import { registerNotificationRoutes } from "./notification-routes";
import { registerGS1NLRoutes } from "./gs1-nl-routes";
import { GS1NLClient } from "./gs1-nl-client";
import { GS1NLRepository } from "./gs1-nl-repository";
import { registerLegacyGS1Routes } from "./gs1-legacy-routes";
import { registerLoginRoute } from "./auth-login-routes";
import { PasswordResetRepository } from "./password-reset-repository";
import { registerPasswordResetRoutes, registerResetSessionGuard } from "./password-reset-routes";
import { resetEmailConfigured, sendPasswordResetEmail } from "./password-reset-email";

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

// Role helper functions — superadmin has all admin rights
function isAdmin(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}
function isManagerOrAbove(role: string | undefined): boolean {
  return role === 'manager' || isAdmin(role);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.set("trust proxy", 1);
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

  const passwordResetRepository = new PasswordResetRepository();
  registerResetSessionGuard(app, passwordResetRepository);
  registerPasswordResetRoutes(app, passwordResetRepository, {
    configured: resetEmailConfigured,
    send: sendPasswordResetEmail,
  });

  // Serve uploaded files
  registerNotificationRoutes(app, storage);
  const gs1NL = new GS1NLClient();
  registerGS1NLRoutes(app, gs1NL, new GS1NLRepository(gs1NL.environment));
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
      if (!isManagerOrAbove(sessionUser.role)) {
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
      // Generate internal GTIN if not provided
      let gtin = req.body.gtin;
      if (!gtin || gtin.trim() === '') {
        // Generate unique internal GTIN starting with 200 (internal use prefix)
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        gtin = `200${timestamp}${random}`.slice(0, 13);
      }

      const productData = {
        ...req.body,
        gtin,
        sourceGtins: req.body.sourceGtins ? JSON.parse(req.body.sourceGtins) : [],
        materialProperties: req.body.materialProperties ? JSON.parse(req.body.materialProperties) : {},
        careSymbols: req.body.careSymbols ? JSON.parse(req.body.careSymbols) : [],
        carbonFootprintDetailed: req.body.carbonFootprintDetailed ? JSON.parse(req.body.carbonFootprintDetailed) : {},
        waterFootprintBreakdown: req.body.waterFootprintBreakdown ? JSON.parse(req.body.waterFootprintBreakdown) : {},
        fiberSheddingTestResults: req.body.fiberSheddingTestResults ? JSON.parse(req.body.fiberSheddingTestResults) : {},
        photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
        // Parse numeric fields for ESPR compliance
        // Empty string = null (not set), 0 = valid value
        repairabilityIndex: req.body.repairabilityIndex !== '' && req.body.repairabilityIndex !== undefined ? parseInt(req.body.repairabilityIndex) : null,
        durabilityScore: req.body.durabilityScore !== '' && req.body.durabilityScore !== undefined ? parseInt(req.body.durabilityScore) : null,
        waterFootprintLiters: req.body.waterFootprintLiters !== '' && req.body.waterFootprintLiters !== undefined ? parseInt(req.body.waterFootprintLiters) : null,
        energyConsumptionKwh: req.body.energyConsumptionKwh !== '' ? req.body.energyConsumptionKwh : null,
        renewableEnergyPercentage: req.body.renewableEnergyPercentage !== '' && req.body.renewableEnergyPercentage !== undefined ? parseInt(req.body.renewableEnergyPercentage) : null,
        microplasticSheddingEstimated: req.body.microplasticSheddingEstimated !== '' && req.body.microplasticSheddingEstimated !== undefined ? parseInt(req.body.microplasticSheddingEstimated) : null,
      };

      const validatedProduct = insertProductSchema.parse(productData);
      
      // Ensure gtin is set (should always be set due to auto-generation above)
      const productGtin = validatedProduct.gtin || gtin;
      
      // Check if GTIN already exists
      const existingProduct = await storage.getProductByGtin(productGtin);
      if (existingProduct) {
        return res.status(400).json({ message: "Product with this GTIN already exists" });
      }

      // Create product with the guaranteed gtin
      const productToCreate = {
        ...validatedProduct,
        gtin: productGtin
      };
      const product = await storage.createProduct(productToCreate as any);
      
      // Generate QR code and DPP URL for the new product
      try {
        const { qrCodeData, dppUrl } = await generateAndSaveQRCode(product.gtin);
        await storage.updateProduct(product.id, {
          qrCodeData,
          dppUrl
        });
        product.qrCodeData = qrCodeData;
        product.dppUrl = dppUrl;
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
        // Continue anyway - QR code is not critical for product creation
      }
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error details:", JSON.stringify(error.errors, null, 2));
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

      // Parse JSON fields if they are strings
      const updateData = { ...req.body };
      if (updateData.materialProperties && typeof updateData.materialProperties === 'string') {
        updateData.materialProperties = JSON.parse(updateData.materialProperties);
      }
      if (updateData.careSymbols && typeof updateData.careSymbols === 'string') {
        updateData.careSymbols = JSON.parse(updateData.careSymbols);
      }
      if (updateData.carbonFootprintDetailed && typeof updateData.carbonFootprintDetailed === 'string') {
        updateData.carbonFootprintDetailed = JSON.parse(updateData.carbonFootprintDetailed);
      }

      // Parse numeric ESPR fields
      if (updateData.repairabilityIndex !== undefined) {
        updateData.repairabilityIndex = updateData.repairabilityIndex ? parseInt(updateData.repairabilityIndex) : null;
      }
      if (updateData.durabilityScore !== undefined) {
        updateData.durabilityScore = updateData.durabilityScore ? parseInt(updateData.durabilityScore) : null;
      }
      if (updateData.waterFootprintLiters !== undefined) {
        updateData.waterFootprintLiters = updateData.waterFootprintLiters ? parseInt(updateData.waterFootprintLiters) : null;
      }
      if (updateData.renewableEnergyPercentage !== undefined) {
        updateData.renewableEnergyPercentage = updateData.renewableEnergyPercentage ? parseInt(updateData.renewableEnergyPercentage) : null;
      }
      if (updateData.microplasticSheddingEstimated !== undefined) {
        updateData.microplasticSheddingEstimated = updateData.microplasticSheddingEstimated ? parseInt(updateData.microplasticSheddingEstimated) : null;
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

      // Get all events to properly track loan statuses
      const allEvents = await storage.getRecentEvents(1000);
      
      // Find all loan events (including those without complete borrower info)
      const loanEvents = allEvents.filter(event => 
        event.eventType === "uitleen"
      );
      
      console.log(`Found ${loanEvents.length} loan events`);
      
      // Filter out loans that have been returned
      const activeLoanEvents = loanEvents.filter(loanEvent => {
        // Check if there's a return event for this product after the loan date
        const returnEvent = allEvents.find(event => 
          event.productId === loanEvent.productId &&
          event.eventType === "retour" &&
          new Date(event.createdAt || 0) > new Date(loanEvent.createdAt || 0)
        );
        
        console.log(`Loan ${loanEvent.id} for product ${loanEvent.productId}: ${returnEvent ? 'returned' : 'active'}`);
        
        // If no return event found, loan is still active
        return !returnEvent;
      });
      
      console.log(`Found ${activeLoanEvents.length} active loan events`);
      
      // Filter based on user role - regular users only see their own loans
      let filteredLoans = activeLoanEvents;
      if (!isManagerOrAbove(sessionUser.role)) {
        filteredLoans = activeLoanEvents.filter(event => event.borrowerEmail === sessionUser.email);
        console.log(`User ${sessionUser.email} has ${filteredLoans.length} active loans`);
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
      if (!isManagerOrAbove(sessionUser.role)) {
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

  // Preserve legacy endpoints; load their service only after administrator authorization.
  registerLegacyGS1Routes(app, async () => (await import("./gs1-service")).gs1Service);

  // Authentication endpoints
  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;
      
      // Validate required fields
      if (!email || !username || !password) {
        return res.status(400).json({ message: "Email, gebruikersnaam en wachtwoord zijn verplicht" });
      }

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Gebruikersnaam is al in gebruik" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "E-mailadres is al in gebruik" });
      }

      // Create new user (password will be hashed in storage layer)
      const newUser = await storage.createUser({
        email,
        username,
        password, // Should be hashed in production
        firstName: firstName || null,
        lastName: lastName || null,
        role: "user", // Default role for new registrations
        isActive: true,
      });

      res.status(201).json({ 
        message: "Registratie succesvol",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registratie mislukt" });
    }
  });

  registerLoginRoute(app, storage);

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
      if (!sessionUser || !isAdmin(sessionUser.role)) {
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



  // Stories endpoints
  app.get("/api/stories", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      
      const stories = await storage.getAllStories();
      
      // Filter by approval status for regular users
      let filteredStories = stories;
      if (!sessionUser || (!isManagerOrAbove(sessionUser.role))) {
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
      const userIsAdmin = isAdmin(sessionUser.role);
      const isManager = sessionUser.role === 'manager';
      const canEdit = isAuthor || userIsAdmin || isManager;
      
      console.log("Permission check:", { 
        isAuthor, 
        isAdmin: userIsAdmin, 
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

      if (!isManagerOrAbove(sessionUser.role)) {
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

  // Link story to product
  app.patch("/api/stories/:id/link-product", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const { productId } = req.body;
      
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Check if user has permission to edit stories
      const story = await storage.getAllStories().then(stories => 
        stories.find(s => s.id === storyId)
      );
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      const isAuthor = story.authorId === String(sessionUser.id);
      const userIsAdmin = isAdmin(sessionUser.role);
      const isManager = sessionUser.role === 'manager';
      const canEdit = isAuthor || userIsAdmin || isManager;
      
      if (!canEdit) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      const updatedStory = await storage.linkStoryToProduct(storyId, productId);
      
      // Create an event in product history when story is linked
      if (productId) {
        await storage.createEvent({
          productId: productId,
          eventType: "verhaal_gekoppeld",
          description: `Verhaal "${story.title}" (ID: ${storyId}, auteur: ${story.authorName}) gekoppeld aan product`,
        });
      }
      
      res.json(updatedStory);
    } catch (error) {
      console.error("Error linking story to product:", error);
      res.status(500).json({ message: "Failed to link story to product" });
    }
  });

  app.delete("/api/stories/:id", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isManagerOrAbove(sessionUser.role)) {
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
      if (!isManagerOrAbove(sessionUser.role)) {
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

      if (!isManagerOrAbove(sessionUser.role)) {
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

      if (!isManagerOrAbove(sessionUser.role)) {
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

      if (!isManagerOrAbove(sessionUser.role)) {
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

      if (!isManagerOrAbove(sessionUser.role)) {
        return res.status(403).json({ message: "Access denied. Manager or Admin role required." });
      }

      await storage.deleteGtinRegistry(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting GTIN registry:", error);
      res.status(500).json({ message: "Failed to delete GTIN registry" });
    }
  });

  // MySQL Export API - Export products to external MySQL database
  app.post("/api/export/mysql", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isAdmin(sessionUser.role)) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const mysql = await import('mysql2/promise');
      
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

      // Create products table if not exists
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INT PRIMARY KEY,
          gtin VARCHAR(255) UNIQUE,
          name VARCHAR(255),
          type VARCHAR(100),
          status VARCHAR(100),
          location VARCHAR(255),
          description TEXT,
          photo_url VARCHAR(500),
          owner_id INT,
          materials TEXT,
          source_gtins TEXT,
          repair_history TEXT,
          sustainability_score DECIMAL(5,2),
          repairability_index INT,
          durability_score INT,
          care_symbols TEXT,
          carbon_footprint DECIMAL(10,2),
          carbon_footprint_breakdown TEXT,
          water_footprint_liters INT,
          energy_consumption_kwh DECIMAL(10,2),
          renewable_energy_percentage INT,
          microplastic_shedding_estimated INT,
          created_at DATETIME,
          updated_at DATETIME
        )
      `);

      // Get all products from PostgreSQL
      const products = await storage.getAllProducts();

      let exported = 0;
      let errors: string[] = [];

      for (const product of products) {
        try {
          const productEvents = await storage.getEventsByProductId(product.id);
          await connection.execute(MYSQL_PRODUCT_UPSERT, mysqlProductValues(product, productEvents));
          exported++;
        } catch (err: any) {
          errors.push(`Product ${product.gtin}: ${err.message}`);
        }
      }

      await connection.end();

      res.json({
        success: true,
        message: `Export voltooid: ${exported} van ${products.length} producten geëxporteerd`,
        exported,
        total: products.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error exporting to MySQL:", error);
      res.status(500).json({ 
        success: false,
        message: "MySQL export mislukt: " + error.message 
      });
    }
  });

  // Test MySQL connection
  app.get("/api/export/mysql/test", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const mysql = await import('mysql2/promise');
      
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });

      await connection.ping();
      await connection.end();

      res.json({ success: true, message: "MySQL verbinding succesvol" });
    } catch (error: any) {
      console.error("MySQL connection test failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "MySQL verbinding mislukt: " + error.message 
      });
    }
  });

  // FTP Upload - Deploy DPP presentation page to gwcirculair.nl
  app.post("/api/deploy/ftp", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isAdmin(sessionUser.role)) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const ftp = require('basic-ftp');
      const client = new ftp.Client();
      client.ftp.verbose = true;

      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false,
      });

      // Upload the PHP files to the dpp folder
      const templatesDir = path.join(process.cwd(), 'server', 'ftp-templates');
      
      // Ensure dpp directory exists
      try {
        await client.ensureDir('/dpp');
      } catch (e) {
        // Directory might already exist
      }

      // Upload all files from ftp-templates
      await client.uploadFromDir(templatesDir, '/dpp');

      await client.close();

      res.json({ 
        success: true, 
        message: "DPP presentatie pagina gedeployed naar gwcirculair.nl/dpp/",
        url: "https://gwcirculair.nl/dpp/"
      });
    } catch (error: any) {
      console.error("FTP deploy failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "FTP deploy mislukt: " + error.message 
      });
    }
  });

  // Test FTP connection
  app.get("/api/deploy/ftp/test", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const ftp = require('basic-ftp');
      const client = new ftp.Client();

      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false,
      });

      await client.close();

      res.json({ success: true, message: "FTP verbinding succesvol" });
    } catch (error: any) {
      console.error("FTP connection test failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "FTP verbinding mislukt: " + error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
