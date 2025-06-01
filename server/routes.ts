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
    fileSize: 5 * 1024 * 1024, // 5MB
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

  // Recent activities
  app.get("/api/dashboard/activities", async (req, res) => {
    try {
      const activities = await storage.getRecentEvents(10);
      res.json(activities);
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
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Parse materialProperties if it exists
      const updateData = { ...req.body };
      if (updateData.materialProperties && typeof updateData.materialProperties === 'string') {
        updateData.materialProperties = JSON.parse(updateData.materialProperties);
      }

      const updatedProduct = await storage.updateProduct(productId, updateData);
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

  // Get active loans for loan overview
  app.get("/api/loans/active", async (req, res) => {
    try {
      const activeLoans = await storage.getRecentEvents(100);
      const loanEvents = activeLoans.filter(event => event.eventType === "uitleen");
      res.json(loanEvents);
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

  const httpServer = createServer(app);
  return httpServer;
}
