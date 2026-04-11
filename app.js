import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";


import receiptRoutes from "./routes/receipts.js";
import productRoutes from "./routes/product.js";
import categoryRoutes from "./routes/categories.js"
dotenv.config();
const app = express();

// __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
const upload = multer({ dest: "uploads/" });
// debug logger
app.use((req, res, next) => {
  console.log("👉 Incoming request:", req.method, req.url);
  next();
});

// static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api", receiptRoutes);
app.use("/api", productRoutes);
app.use("/api", categoryRoutes);

export default app;