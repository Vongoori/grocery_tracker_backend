import {
  fetchReviewProducts,
  fetchProductDetails,
  createProduct,
  updateProduct,
  rejectReviewProduct,
  createProductDirect
} from "../services/product.service.js";

export const createNewProduct = async (req, res) => {
  res.json(await createProduct(req.params.receiptId, req.body));
};
export const createProductFromBarcode = async (req, res) => {
  res.json(await createProductDirect(req.body));
};

export const getProductsInReview = async (req, res) => {
  res.json(await fetchReviewProducts());
};

export const getReviewProductById = async (req, res) => {
  res.json(await fetchProductDetails(req.params.id));
};

export const UpdateProduct = async (req, res) => {
  res.json(await updateProduct(req.params.id, req.body));
};