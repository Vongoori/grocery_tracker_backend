import sharp from "sharp";
import fs from "fs";

export async function preprocessImage(inputPath) {

  const outputPath = inputPath + "_processed.png";

  await sharp(inputPath)
    .grayscale()        // remove colors
    .normalize()        // increase contrast
    .sharpen()          // sharpen text
    .threshold(150)     // convert to black & white
    .toFile(outputPath);

  return outputPath;
}