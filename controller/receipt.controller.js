import {
  startReceiptProcessing,
  fetchReceipts,
  fetchReceiptDetails,
  fetchReceiptStatus,
  retryReceiptProcessing,
  addReceiptItem,
  updateReceiptItem,
  deleteReceiptItem
} from "../services/receipt.service.js";

export const uploadReceipt = async (req, res) => {
  try {
    const result = await startReceiptProcessing(req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to start processing" });
  }
};

export const getReceipts = async (req, res) => {
  res.json(await fetchReceipts());
};

export const getReceiptById = async (req, res) => {
  console.log("req received: getReceiptById: " + req.params.id);
  res.json(await fetchReceiptDetails(req.params.id));
};

export const getReceiptStatus = async (req, res) => {
  res.json(await fetchReceiptStatus(req.params.id));
};

export const retryReceipt = async (req, res) => {
    // const { id } = req.params;
  res.json(await retryReceiptProcessing(req.params.id));
};

export const addItem = async (req, res) => {
  res.json(await addReceiptItem(req.params.receiptId, req.body));
};

export const updateItem = async (req, res) => {
  res.json(await updateReceiptItem(req.params.id, req.body));
};

export const deleteItem = async (req, res) => {
  res.json(await deleteReceiptItem(req.params.id));
};