import app from "./app.js";
const PORT = process.env.PORT || 5050;
console.log("port: ", PORT);
// const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Connected to PostgreSQL`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


// // ``OCR ROUTE
// app.post("/api/ocr", upload.single("image"), async (req, res) => {
//   try {
//     const imagePath = req.file.path;
//     const imageUrl = `/uploads/${req.file.filename}`;
//     const userId = "b12c0d9e-8e6e-4d47-aafa-2746aad5df87";

//     const imageHash = generateImageHash(imagePath);
//     // 🔍 Check duplicate
//     const existing = await pool.query(
//       `SELECT id, status FROM receipts WHERE image_hash = $1 LIMIT 1`,
//       [imageHash]
//     );

//     if (existing.rows.length > 0) {
//       console.log("⚠️ Duplicate receipt detected");

//       return res.json({
//         message: "Duplicate receipt found",
//         receiptId: existing.rows[0].id,
//         status: existing.rows[0].status,
//       });

//     }
//     else {
//       // ✅ Step 1: Create receipt immediately with processing status
//       const receiptResult = await pool.query(
//         `INSERT INTO receipts 
//         (user_id, receipt_date, total_amount, image_url, status, image_hash)
//         VALUES ($1, NOW(), $2, $3, $4, $5)
//         RETURNING id`,
//         [
//           userId,
//           0,//temporary
//           imageUrl,
//           "processing",
//           imageHash // ✅ IMPORTANT
//         ]
//       );

//       const receiptId = receiptResult.rows[0].id;

//       // ✅ Step 2: Respond immediately
//       res.json({
//         message: "Processing started",
//         receiptId,
//         status: "processing"
//       });

//       // ✅ Step 3: Run background job (DON'T await)
//       processReceiptInBackground(receiptId, imagePath, imageUrl);
//     }
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       error: "Failed to start processing"
//     });
//   }
// });



// function generateImageHash(imagePath) {
//   const fileBuffer = fs.readFileSync(imagePath);
//   return crypto
//     .createHash("sha256")
//     .update(fileBuffer)
//     .digest("hex");
// }

// app.get("/receipts", async (req, res) => {
//   try {

//     const result = await pool.query(`
//       SELECT
//         r.id,
//         r.receipt_date,
//         r.total_amount,
//         r.image_url,
//         r.status,      
//         s.name AS store_name
//       FROM receipts r
//       LEFT JOIN stores s
//       ON r.store_id = s.id
//       ORDER BY r.receipt_date DESC
//     `);

//     res.json(result.rows);

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to fetch receipts" });
//   }
// });

// app.get("/receipt/status/:id", async (req, res) => {
//   const { id } = req.params;

//   const result = await pool.query(
//     `SELECT id, status
//      FROM receipts
//      WHERE id = $1`,
//     [id]
//   );

//   if (result.rows.length === 0) {
//     return res.status(404).json({ error: "Not found" });
//   }

//   res.json(result.rows[0]);
// });

// app.get("/receipt/:id", async (req, res) => {
//   try {

//     const receiptId = req.params.id;

//     const receiptResult = await pool.query(`
//       SELECT
//         r.id,
//         r.receipt_date,
//         r.total_amount,
//         r.currency,
//         r.image_url,
//         s.name AS store_name,
//         s.address,
//         s.city
//       FROM receipts r
//       LEFT JOIN stores s
//       ON r.store_id = s.id
//       WHERE r.id = $1
//     `, [receiptId]);

//     const itemsResult = await pool.query(`
//       SELECT
//         id,
//         product_name,
//         quantity,
//         price,
//         category
//       FROM receipt_items
//       WHERE receipt_id = $1
//       ORDER BY created_at
//     `, [receiptId]);

//     res.json({
//       receipt: receiptResult.rows[0],
//       items: itemsResult.rows
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to fetch receipt details" });
//   }
// });

// //add missing item to receipt
// app.post("/receipts/:receiptId/additems", async (req, res) => {

//   try {

//     const receiptId = req.params.receiptId;
//     const { product_name, quantity, price, category } = req.body;

//     const result = await pool.query(
//       `INSERT INTO receipt_items
//        (receipt_id, product_name, quantity, price, category)
//        VALUES ($1,$2,$3,$4,$5)
//        RETURNING *`,
//       [receiptId, product_name, quantity, price, category]
//     );

//     res.json({
//       message: "Item added",
//       item: result.rows[0]
//     });

//   } catch (error) {

//     console.error(error);
//     res.status(500).json({ error: "Failed to add item" });

//   }

// });
// //Update receipt item
// app.put("/receipt-items/:id", async (req, res) => {
//   try {

//     const itemId = req.params.id;
//     const { product_name, quantity, price, category } = req.body;

//     const result = await pool.query(
//       `UPDATE receipt_items
//        SET product_name = $1,
//            quantity = $2,
//            price = $3,
//            category = $4
//        WHERE id = $5
//        RETURNING *`,
//       [product_name, quantity, price, category, itemId]
//     );

//     res.json({
//       message: "Item updated",
//       item: result.rows[0]
//     });

//   } catch (error) {

//     console.error(error);
//     res.status(500).json({ error: "Failed to update item" });

//   }
// });

// //Delete receipt item
// app.delete("/receipt-items/:id", async (req, res) => {
//   try {

//     const itemId = req.params.id;

//     await pool.query(
//       `DELETE FROM receipt_items
//        WHERE id = $1`,
//       [itemId]
//     );

//     res.json({
//       message: "Item deleted"
//     });

//   } catch (error) {

//     console.error(error);
//     res.status(500).json({ error: "Failed to delete item" });

//   }
// });


// //Retry receipt processing
// app.post("/receipt/retry/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 🔍 Get receipt
//     const result = await pool.query(
//       `SELECT id, image_url, status, retry_count
//        FROM receipts
//        WHERE id = $1`,
//       [id]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Receipt not found" });
//     }

//     const receipt = result.rows[0];

//     // ⚠️ Optional safety check
//     if (receipt.status === "processing") {
//       return res.status(400).json({
//         error: "Receipt is already processing"
//       });
//     }

//     // 🚫 Limit retries (optional but recommended)
//     if (receipt.retry_count >= 10) {
//       return res.status(400).json({
//         error: "Retry limit reached"
//       });
//     }

//     // ✅ Reset status to processing
//     await pool.query(
//       `UPDATE receipts
//        SET status = 'processing',
//            retry_count = retry_count + 1,
//            last_retry_at = NOW()
//        WHERE id = $1`,
//       [id]
//     );

//     // ⚙️ Trigger background processing
//     const imagePath = `.${receipt.image_url}`;

//     processReceiptInBackground(id, imagePath, receipt.image_url);

//     // ⚡ Respond immediately
//     res.json({
//       message: "Retry started",
//       receiptId: id,
//       status: "processing"
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       error: "Failed to retry receipt"
//     });
//   }
// });




















