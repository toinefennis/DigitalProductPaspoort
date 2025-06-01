import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertEventSchema, insertUserSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  const httpServer = createServer(app);
  return httpServer;
}
