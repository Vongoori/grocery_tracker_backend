import express from "express";

import {
  getProductsInReview,
  createNewProduct,
  UpdateProduct,
  getReviewProductById,
  createProductFromBarcode
  
} from "../controller/product.controller.js";

const router = express.Router();

router.get("/product/get-review-products", getProductsInReview);
router.post("/product/create-new-product", createProductFromBarcode);
router.post("/product/create-new-product-by-review-id/:id", createNewProduct);
router.put("/product/edit/:id", UpdateProduct);
router.get("/product/get-product/:id", getReviewProductById);


export default router;