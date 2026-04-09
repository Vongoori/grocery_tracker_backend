import db from "../db.js";

export const fetchReviewProducts = async () => {
  const result = await db.query(`
    SELECT 
      pr.*,
      ri.product_name,
      ri.price,
      ri.quantity
    FROM product_review_queue pr
    LEFT JOIN receipt_items ri 
      ON ri.review_id = pr.id
    WHERE pr.status = 'pending'
    ORDER BY pr.created_at DESC
  `);

  return result.rows;
};


export const fetchProductDetails = async (id) => {
  const result = await db.query(
    `
    SELECT 
      pr.*,
      ri.product_name,
      ri.price,
      ri.quantity
    FROM product_review_queue pr
    LEFT JOIN LATERAL (
      SELECT product_name, price, quantity
      FROM receipt_items
      WHERE review_id = pr.id
      ORDER BY id ASC
      LIMIT 1
    ) ri ON true
    WHERE pr.id = $1
      AND pr.status = 'pending'
    `,
    [id]
  );

  return result.rows[0] || null;
};

export const createProduct = async (reviewId, data) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get review item
    const [reviewRows] = await connection.query(
      "SELECT * FROM product_review_queue WHERE id = ?",
      [reviewId]
    );

    if (reviewRows.length === 0) {
      throw new Error("Review item not found");
    }

    const review = reviewRows[0];

    // 2. Merge priority: USER > REVIEW
    const finalProduct = {
      normalized_name: data.normalized_name || review.normalized_name,
      original_name: data.original_name || review.raw_name,
      brand: data.brand || review.brand,
      category_id: data.category_id || review.category_id,
      unit_type: data.unit_type || review.unit_type,
      standard_unit: data.standard_unit || review.standard_unit,
      standard_quantity: data.standard_quantity || review.standard_quantity,
      barcode: data.barcode || review.barcode,
      source: data.source || "review"
    };

    // 3. 🔥 Check if product already exists (by barcode OR normalized name)
    let productId;

    const [existing] = await connection.query(
      `SELECT id FROM products 
       WHERE barcode = ? OR normalized_name = ?`,
      [finalProduct.barcode, finalProduct.normalized_name]
    );

    if (existing.length > 0) {
      productId = existing[0].id;
    } else {
      // 4. Insert new product
      const [result] = await connection.query(
        `INSERT INTO products 
        (normalized_name, original_name, brand, category_id,
         unit_type, standard_unit, standard_quantity, barcode, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalProduct.normalized_name,
          finalProduct.original_name,
          finalProduct.brand,
          finalProduct.category_id,
          finalProduct.unit_type,
          finalProduct.standard_unit,
          finalProduct.standard_quantity,
          finalProduct.barcode,
          finalProduct.source
        ]
      );

      productId = result.insertId;
    }

    // 5. ✅ Create alias (VERY IMPORTANT)
    await connection.query(
      `INSERT IGNORE INTO product_aliases (alias_name, product_id)
       VALUES (?, ?)`,
      [review.raw_name, productId]
    );

    // 6. ✅ Update receipt_items
    await connection.query(
      `UPDATE receipt_items
       SET product_id = ?, review_id = NULL
       WHERE review_id = ?`,
      [productId, reviewId]
    );

    // 7. Mark review as approved
    await connection.query(
      `UPDATE product_review_queue 
       SET status = 'approved', updated_at = NOW()
       WHERE id = ?`,
      [reviewId]
    );

    await connection.commit();

    return {
      message: "Product processed successfully",
      productId
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const updateProduct = async (id, data) => {
  const fields = [];
  const values = [];

  if (data.normalized_name) {
    fields.push("normalized_name = ?");
    values.push(data.normalized_name);
  }

  if (data.brand) {
    fields.push("brand = ?");
    values.push(data.brand);
  }

  if (data.category_id) {
    fields.push("category_id = ?");
    values.push(data.category_id);
  }

  if (data.barcode) {
    fields.push("barcode = ?");
    values.push(data.barcode);
  }

  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(id);

  await db.query(
    `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  // Optional: add alias if new name provided
  if (data.alias_name) {
    await db.query(
      `INSERT IGNORE INTO product_aliases (alias_name, product_id)
       VALUES (?, ?)`,
      [data.alias_name, id]
    );
  }

  return { message: "Product updated successfully" };
};

export const rejectReviewProduct = async (reviewId) => {
  await db.query(
    `UPDATE product_review_queue 
     SET status = 'rejected', updated_at = NOW()
     WHERE id = ?`,
    [reviewId]
  );

  return { message: "Review item rejected" };
};

export const createProductDirect = async (data) => {
  // 1. Check duplicate
  const [existing] = await db.query(
    `SELECT id FROM products 
     WHERE barcode = ? OR normalized_name = ?`,
    [data.barcode, data.normalized_name]
  );

  if (existing.length > 0) {
    return {
      message: "Product already exists",
      productId: existing[0].id
    };
  }

  // 2. Insert product
  const [result] = await db.query(
    `INSERT INTO products
    (normalized_name, original_name, brand, category_id,
     unit_type, standard_unit, standard_quantity, barcode, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.normalized_name,
      data.original_name,
      data.brand,
      data.category_id,
      data.unit_type,
      data.standard_unit,
      data.standard_quantity,
      data.barcode,
      "barcode"
    ]
  );

  const productId = result.insertId;

  // 3. Create alias
  await db.query(
    `INSERT INTO product_aliases (alias_name, product_id)
     VALUES (?, ?)`,
    [data.original_name, productId]
  );

  return {
    message: "Product created successfully",
    productId
  };
};