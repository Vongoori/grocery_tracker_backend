import express from "express";
import multer from "multer";

import {
  uploadReceipt,
  getReceipts,
  getReceiptById,
  getReceiptStatus,
  retryReceipt,
  addItem,
  updateItem,
  deleteItem
} from "../controller/receipt.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/ocr", upload.single("image"), uploadReceipt);

router.get("/receipts", getReceipts);
router.get("/receipts/:id", getReceiptById);
router.get("/receipts/status/:id", getReceiptStatus);

router.post("/receipts/retry/:id", retryReceipt);

router.post("/receipts/:receiptId/additems", addItem);
router.put("/receipt-items/:id", updateItem);
router.delete("/receipt-items/:id", deleteItem);

export default router;