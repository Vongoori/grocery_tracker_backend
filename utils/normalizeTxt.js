

export function basicNormalize(name) {
  return name
    .toLowerCase()
    .replace(/[0-9]+(ml|l|g|kg)/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function normalize(text) {
  return text?.toLowerCase().replace(/\s+/g, " ").trim();
}