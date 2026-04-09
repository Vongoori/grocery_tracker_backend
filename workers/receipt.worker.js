import pool from "../db.js";
import fs from "fs";
import {extractFromReceipt, normalizeProductWithLLM} from "../utils/extractItems.js";
import {basicNormalize} from "../utils/normalizeTxt.js";
import {search_categories_multi} from "../utils/search_categories.js"
import{getCategoryId} from "../utils/getCategoryId.js"
//process receipt in background
export async function processReceiptInBackground(receiptId, imagePath, imageUrl) {
  try {
    console.log("Processing receipt:", receiptId);

    const extractedData = await extractFromReceipt(imagePath);

    const { store, items, summary } = extractedData;

    const totalAmount = summary.totalAmount;

    const storeName = store.storeName;
    const storeAddress = store.address;
    console.log("Raw Post code: " + store.postcode);
    let postcode = store.postcode ? store.postcode.trim() : null;
    // remove unwanted chars (optional but recommended)
    postcode = postcode ? postcode.replace(/[^A-Za-z0-9 ]/g, "") : null;
    // enforce max length rule
    if (postcode && postcode.length > 8) {
      postcode = null; // or "" if your DB allows empty string
    }
    console.log("filtered postcode: " + postcode);
    // 🔍 Check store (case-sensitive exact match)
    const existingStore = await pool.query(
      `SELECT id FROM stores 
       WHERE name = $1 AND address = $2
       LIMIT 1`,
      [storeName, storeAddress]
    );

    let storeId;

    if (existingStore.rows.length > 0) {
      storeId = existingStore.rows[0].id;
    } else {
      const storeResult = await pool.query(
        `INSERT INTO stores (name, address, postcode, city)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [storeName, storeAddress, postcode, store.city]
      );
      storeId = storeResult.rows[0].id;
    }
    const receiptDate = summary.dateTime && summary.dateTime.trim() !== ""
      ? summary.dateTime
      : null;

    // ✅ Update receipt with real data
    await pool.query(
      `UPDATE receipts
       SET store_id = $1,
           total_amount = $2,
           raw_ocr_json = $3,
           status = 'completed',
           receipt_date = $5::timestamp
       WHERE id = $4`,
      [storeId, totalAmount, extractedData, receiptId, receiptDate]
    );

    const categories = await pool.query(
      "SELECT id, name FROM categories WHERE level = 3"
    );
    // categories.rows.forEach(cat => {
    //   console.log(`ID: ${cat.id}, Name: ${cat.name}`);
    // });

    for (const item of items) {
      const { productId, reviewId, categoryId } = await getOrCreateProduct(item, receiptId, categories);
     

      await pool.query(
      `INSERT INTO receipt_items 
      (receipt_id, product_id, product_name, quantity, unit, price, review_id, category_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        receiptId,
        productId, // may be null
        item.itemName,
        item.qty,
        item.unit,
        item.price,
        reviewId, // may be null,
        categoryId
      ]
    );
    }
    

    console.log("✅ Completed receipt:", receiptId);

  } catch (error) {
    console.error("❌ Failed processing:", receiptId, error);

    await pool.query(
      `UPDATE receipts
     SET status = 'failed',
         retry_count = retry_count + 1,
         last_retry_at = NOW()
     WHERE id = $1`,
      [receiptId]
    );
  }
}

export async function sendToReviewQueue(item, enriched, receiptId, category_id) {
  const result = await pool.query(
    `INSERT INTO product_review_queue
    (receipt_id, raw_name, normalized_name, brand, category_id,
     unit_type, standard_unit, standard_quantity,
     confidence_score, status, source)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','llm')
    RETURNING id`,
    [
      receiptId,
      item.itemName,
      enriched.normalized_name,
      enriched.brand,
      category_id,
      enriched.unit_type,
      enriched.standard_unit,
      enriched.standard_quantity,
      enriched.confidence || 0
    ]
  );

  return result.rows[0].id;
}

async function getPotentialMatches(rawName) {
  // We use ::text to ensure Postgres knows exactly what type the parameter is
  const res = await pool.query(
    `SELECT id, normalized_name 
     FROM products 
     WHERE normalized_name % $1::text 
     OR normalized_name ILIKE $2::text
     ORDER BY similarity(normalized_name, $1::text) DESC
     LIMIT 5`, 
    [rawName, `%${rawName.split(' ')[0]}%`]
  );
  return res.rows;
}

async function getOrCreateProduct(item, receiptId, categories) {
  const rawName = item.itemName;
  const basicNormalized = basicNormalize(rawName);

  // ✅ 1. Quick alias / exact match
  const quickCheck = await pool.query(
    `SELECT product_id FROM product_aliases WHERE alias_name = $1
     UNION
     SELECT id FROM products WHERE normalized_name = $1
     LIMIT 1`,
    [basicNormalized]
  );

  if (quickCheck.rows.length > 0) {
    return quickCheck.rows[0].product_id || quickCheck.rows[0].id;
  }

  // ✅ 2. Get candidate matches
  const candidates = await getPotentialMatches(rawName);
  const queries = [
  rawName,
  item.category
];

  const categories_list = await search_categories_multi(queries, categories);
//  console.log("final Category matches: " + JSON.stringify(categories_list, null, 2));
  

  // ✅ 3. LLM call
  const enriched = await normalizeProductWithLLM(item, candidates, categories_list);
  console.log("name: " + JSON.stringify(enriched));
  const categoryId = getCategoryId(enriched.category, categories_list);
  let productId = null;
  let reviewId = null;

  // ✅ 4. Decision logic
  if (enriched.match_existing_id) {
    productId = enriched.match_existing_id;
  }

  else if (enriched.confidence >= 0.8) {
    // Try second lookup before insert
    const existing = await pool.query(
      `SELECT id FROM products WHERE normalized_name = $1 LIMIT 1`,
      [enriched.normalized_name]
    );

    if (existing.rows.length > 0) {
      productId = existing.rows[0].id;
    } else {
      const result = await pool.query(
        `INSERT INTO products
        (normalized_name, original_name, brand, category_id,
         unit_type, standard_unit, standard_quantity)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id`,
        [
          enriched.normalized_name,
          rawName,
          enriched.brand,
          categoryId,
          enriched.unit_type,
          enriched.standard_unit,
          enriched.standard_quantity
        ]
      );

      productId = result.rows[0].id;
    }
  }

  else {
    // 🔴 LOW CONFIDENCE → SEND TO REVIEW
    reviewId = await sendToReviewQueue(item, enriched, receiptId, categoryId);
  }

  // ✅ 5. Save alias ONLY if product is confirmed
  if (productId) {
    await pool.query(
      `INSERT INTO product_aliases (alias_name, product_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [basicNormalized, productId]
    );
  }

  return { productId, reviewId, categoryId};
}