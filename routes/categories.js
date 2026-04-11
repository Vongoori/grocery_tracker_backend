import express from "express";

import {
  getCategoryById,
  getChildCategoriesList,
  getCategoryByName,
  getAllCategories,
  searchCategoriesByName
} from "../controller/categories.controller.js";

const router = express.Router();

router.get("/categories/get-category-by-id/:id", getCategoryById);
router.get("/categories/get-child-categories/:id", getChildCategoriesList);
router.get("/categories/get-category-by-name/:name", getCategoryByName);
router.get("/categories/get-all-categories", getAllCategories);
router.get("/categories/search-categories/:name", searchCategoriesByName);


export default router;