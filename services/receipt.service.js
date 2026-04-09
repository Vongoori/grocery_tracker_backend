import pool from "../db.js";
import fs from "fs";
import crypto from "crypto";
import { processReceiptInBackground } from "../workers/receipt.worker.js";

function generateImageHash(imagePath) {
  const fileBuffer = fs.readFileSync(imagePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export const startReceiptProcessing = async (req) => {
  const imagePath = req.file.path;
  const imageUrl = `/uploads/${req.file.filename}`;
  const userId = "b12c0d9e-8e6e-4d47-aafa-2746aad5df87";

  const imageHash = generateImageHash(imagePath);

  // 🔍 duplicate check
  const existing = await pool.query(
    `SELECT id, status FROM receipts WHERE image_hash = $1 LIMIT 1`,
    [imageHash]
  );

  if (existing.rows.length > 0) {
    return {
      message: "Duplicate receipt found",
      receiptId: existing.rows[0].id,
      status: existing.rows[0].status,
    };
  }

  // ✅ create receipt
  const result = await pool.query(
    `INSERT INTO receipts 
    (user_id, receipt_date, total_amount, image_url, status, image_hash)
    VALUES ($1, NOW(), $2, $3, $4, $5)
    RETURNING id`,
    [userId, 0, imageUrl, "processing", imageHash]
  );

  const receiptId = result.rows[0].id;

  // 🔥 async processing (background)
  processReceiptInBackground(receiptId, imagePath, imageUrl);

  return {
    message: "Processing started",
    receiptId,
    status: "processing",
  };
};


export const fetchReceipts = async () => {
  const result = await pool.query(`
    SELECT
      r.id,
      r.receipt_date,
      r.total_amount,
      r.image_url,
      r.status,
      s.name AS store_name
    FROM receipts r
    LEFT JOIN stores s ON r.store_id = s.id
    ORDER BY r.receipt_date DESC
  `);

  return result.rows;
};

export const fetchReceiptDetails = async (receiptId) => {
  try {
    const receiptResult = await pool.query(`
      SELECT
        r.id,
        r.receipt_date,
        r.total_amount,
        r.currency,
        r.image_url,
        s.name AS store_name,
        s.address,
        s.city
      FROM receipts r
      LEFT JOIN stores s ON r.store_id = s.id
      WHERE r.id = $1
    `, [receiptId]);

    if (receiptResult.rows.length === 0) {
      return null;
    }

    const itemsResult = await pool.query(`
      SELECT
        id,
        product_name,
        quantity,
        price,
        category,
        created_at
      FROM receipt_items
      WHERE receipt_id = $1
      ORDER BY created_at
    `, [receiptId]);

    console.log("found receipt data: "+receiptResult.rows[0].store_name);
    return {
      receipt: receiptResult.rows[0],
      items: itemsResult.rows,
    };

  } catch (error) {
    console.error("Error fetching receipt details:", error);
    throw error;
  }
};


export const fetchReceiptStatus = async (id) => {
  const result = await pool.query(
    `SELECT id, status FROM receipts WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Not found");
  }

  return result.rows[0];
};



export const retryReceiptProcessing = async (id) => {
  console.log("retry receipt id: " +id);
  const result = await pool.query(
    `SELECT id, image_url, status, retry_count, raw_ocr_json
     FROM receipts
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Receipt not found");
  }

  const receipt = result.rows[0];

  if (receipt.status === "processing") {
    throw new Error("Already processing");
  }

  if (receipt.retry_count >= 10) {
    throw new Error("Retry limit reached");
  }

  await pool.query(
    `UPDATE receipts
     SET status = 'processing',
         retry_count = retry_count + 1,
         last_retry_at = NOW()
     WHERE id = $1`,
    [id]
  );
//   if(result.raw_ocr_json)
  const imagePath = `.${receipt.image_url}`;

  processReceiptInBackground(id, imagePath, receipt.image_url);

  return {
    message: "Retry started",
    receiptId: id,
    status: "processing",
  };
};


export const addReceiptItem = async (receiptId, body) => {
  const { product_name, quantity, price, category } = body;

  const result = await pool.query(
    `INSERT INTO receipt_items
     (receipt_id, product_name, quantity, price, category)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [receiptId, product_name, quantity, price, category]
  );

  return {
    message: "Item added",
    item: result.rows[0],
  };
};

export const updateReceiptItem = async (id, body) => {
  const { product_name, quantity, price, category } = body;

  const result = await pool.query(
    `UPDATE receipt_items
     SET product_name = $1,
         quantity = $2,
         price = $3,
         category = $4
     WHERE id = $5
     RETURNING *`,
    [product_name, quantity, price, category, id]
  );

  return {
    message: "Item updated",
    item: result.rows[0],
  };
};


export const deleteReceiptItem = async (id) => {
  await pool.query(
    `DELETE FROM receipt_items WHERE id = $1`,
    [id]
  );

  return {
    message: "Item deleted",
  };
};