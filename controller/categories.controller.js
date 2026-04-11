import {
    fetchCategories,
  fetchCategoriesById,
  fetchChildCategories,
  fetchCategoryByName,
    searchCategories

} from "../services/categories.service.js";

export const getAllCategories = async (req, res) => {
  console.log("req received: getAllCategories: " );
  res.json(await fetchCategories());
};

export const getCategoryById = async (req, res) => {
  try {
    const result = await fetchCategoriesById(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to start processing" });
  }
};

export const getCategoryByName = async (req, res) => {
  console.log("req received: getCategoryByName: " + req.params.name);
  res.json(await fetchCategoryByName(req.params.name));
};

export const getChildCategoriesList = async (req, res) => {
  console.log("req received: getReceiptById: " + req.params.id);
  res.json(await fetchChildCategories(req.params.id));
};

export const searchCategoriesByName = async (req, res) => {
  console.log("req received: getAllCategories: "+ req.params.name);
  res.json(await searchCategories(req.params.name));
};
