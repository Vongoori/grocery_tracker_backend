import pool from "../db.js";
import fs from "fs";
import crypto from "crypto";

export const fetchCategories = async () => {
  const result = await pool.query(`
    SELECT
      id,
      name,
      parent_id
    FROM categories 
  `);///WHERE parent_id IS NULL

  return result.rows;
};

export const fetchChildCategories = async (id) => {
  const result = await pool.query(`
    SELECT
      id,
      name,
      parent_id
    FROM categories WHERE parent_id = $1
  `,[id]);

  return result.rows;
};

export const fetchCategoriesById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, parent_id FROM categories WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error("Not found");
  }

  return result.rows[0];
};

export const fetchCategoryByName = async (name) => {
  const result = await pool.query(
    `SELECT id, name, parent_id FROM categories WHERE id = $1`,
    [name]
  );

  if (result.rows.length === 0) {
    throw new Error("Not found");
  }

  return result.rows[0];
};

export const searchCategories = async (name) => {
  if (!name || typeof name !== 'string') {
    return []; // Return empty array if name is invalid
  }

  // Use ILIKE for case-insensitive partial matching
  const result = await pool.query(`
    SELECT id, name, parent_id
    FROM categories
    WHERE name ILIKE '%' || $1 || '%'
  `, [name]);

  return result.rows;
};