import express from "express";
import pool from "../db.js";
import { authMiddleware } from "./auth.js";

const router = express.Router();

// Add a deal (store must be authenticated)
router.post("/add-deal", authMiddleware, async (req, res) => {
  try {
    const { title, description, price, image_url, expiry_date } = req.body;
    console.log("Store ID from token:", req.store.id);
    const store_id = req.store.id; // from authMiddleware

    if (!title || !price) {
      return res.status(400).json({ error: "Title and price are required." });
    }

    const result = await pool.query(
      `INSERT INTO deals (store_id, title, description, price, image_url, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [store_id, title, description, price, image_url || null, expiry_date || null]
    );

    res.status(201).json({ message: "Deal added successfully.", deal: result.rows[0] });
  } catch (error) {
    console.error("Error adding deal:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all deals for the logged-in store
router.get("/my-deals", authMiddleware, async (req, res) => {
  try {
    const store_id = req.store.id;
    const result = await pool.query(
      `SELECT * FROM deals WHERE store_id = $1 ORDER BY created_at DESC`,
      [store_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching deals:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Search deals nearby for public users
router.get("/search", async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const searchRadius = radius ? parseFloat(radius) : 5; // default 5 km

    const result = await pool.query(
      `SELECT d.*, s.name, s.latitude, s.longitude,
         (6371 * acos(
            cos(radians($1)) * cos(radians(s.latitude)) *
            cos(radians(s.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(s.latitude))
         )) AS distance
       FROM deals d
       JOIN users s ON d.store_id = s.id
       WHERE (6371 * acos(
            cos(radians($1)) * cos(radians(s.latitude)) *
            cos(radians(s.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(s.latitude))
         )) < $3
       ORDER BY distance ASC`,
      [lat, lng, searchRadius]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;