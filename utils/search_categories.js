// const Fuse = require("fuse.js");
import Fuse from "fuse.js";
/**
 * search_categories
 * @param {string} query - product name (e.g. "Co-op Blue Milk")
 * @param {Array} categories - [{ id, name }]
 * @param {number} limit - number of results
 */
function search_categories(query, categories, limit = 5) {
  const normalizedQuery = query.toLowerCase();
  // console.log("categories inside search:", categories?.length, categories?.[0]);
  // -----------------------------
  // 1. Keyword Matching (fast)
  // -----------------------------
  const keywordMatches = categories.filter(cat => {
    const name = cat.name.toLowerCase();
    return normalizedQuery.includes(name) || name.includes(normalizedQuery);
  });

  if (keywordMatches.length >= limit) {
    return keywordMatches.slice(0, limit);
  }

  // -----------------------------
  // 2. Fuzzy Search (Fuse.js)
  // -----------------------------
  const fuse = new Fuse(categories, {
    keys: ["name"],
    threshold: 0.5, // lower = stricter
  });

  const fuzzyResults = fuse.search(query);

  const fuzzyMatches = fuzzyResults.map(r => r.item);

  // -----------------------------
  // 3. Merge + Dedupe
  // -----------------------------
  const combined = [...keywordMatches, ...fuzzyMatches];

  const unique = [];
  const seen = new Set();

  for (const cat of combined) {
    if (!seen.has(cat.id)) {
      seen.add(cat.id);
      unique.push(cat);
    }
  }

  return unique.slice(0, limit);
}

/**
 * Multi-query category search
 * @param {string[]} queries
 * @param {Array} categories
 * @param {number} perQueryLimit
 * @param {number} finalLimit
 */
export async function search_categories_multi(
  queries,
  categories,
  perQueryLimit = 4,
  finalLimit = 8
) {
  let combined = [];

  // Run search for each query
  for (const query of queries) {
    const results = search_categories(query, categories.rows, perQueryLimit);
    combined.push(...results);
  }
  console.log("result: " + JSON.stringify(combined, null, 2));
  // console.log("result: " + combined);
  // Deduplicate
  const unique = [];
  const seen = new Set();

  for (const cat of combined) {
    if (!seen.has(cat.id)) {
      seen.add(cat.id);
      unique.push(cat);
    }
  }
  // console.log("final result categories: " + JSON.stringify(unique.slice(0, finalLimit), null, 2));
  return unique.slice(0, finalLimit);
}

