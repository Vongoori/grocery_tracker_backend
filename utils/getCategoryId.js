export function getCategoryId(categoryName, categories_list) {
  if (!categoryName) return null;

  const match = categories_list.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );

  return match ? match.id : null;
}