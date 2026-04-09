// utils/extractItems.js
import dotenv from "dotenv";
dotenv.config();

// import OpenAI from "openai";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const openaiClient = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// // Initialize Gemini client
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// export async function extractItemsFromText(rawOcrText) {
//   const prompt = `
// Extract grocery items and prices from this raw OCR text. 
// Return a JSON object with the following structure:
// {
//   "store_details": { "name": string, "address": string, "phone": string },
//   "items": [{ "item": string, "price": number }],
//   "summary": { "item_count": number, "total_due": number }
// }

// OCR Text:
// ${rawOcrText}
// `;

//   try {
//     // --- Try OpenAI first ---
//     const completion = await openaiClient.chat.completions.create({
//       model: "gpt-4.1-mini",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0
//     });

//     const content = completion.choices[0].message.content;
//     return JSON.parse(content);

//   } catch (err) {
//     // --- If Rate Limit, fallback to Gemini ---
//     if (err?.code === "RateLimitError" || err?.status === 429) {
//       console.warn("OpenAI rate limit hit, switching to Gemini...");

//       try {
//         const model = genAI.getGenerativeModel({ 
//         model: "gemini-2.5-flash",//"gemini-3-flash-preview", // Or "gemini-2.5-flash" for the stable 2.x line
//         generationConfig: { responseMimeType: "application/json" }
//         });

//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         const geminiData = JSON.parse(await response.text());

//         console.log("Gemini Result:", JSON.stringify(geminiData, null, 2));
//         return geminiData;

//       } catch (geminiErr) {
//         console.error("Gemini fallback failed:", geminiErr);
//         throw geminiErr;
//       }
//     }

//     // For other errors, throw
//     throw err;
//   }
// }

import ollama from 'ollama';
import fs from 'fs';

// export async function extractFromReceipt(imagePath) {
//   try {

//     const imageBase64 = fs.readFileSync(imagePath, {
//       encoding: 'base64',
//     });

//     const response = await ollama.chat({
//       model: 'qwen3-vl:8b',
//       messages: [
//         {
//           role: 'user',
//           content: `Extract grocery receipt data into JSON.

// Return JSON with:
// store: name, address, postcode  
// items: item_name, qty, unit, unit_price, total  
// summary: item_count, total_due, dateTime  

// Rules:
// - Merge multi-line items
// - Apply discounts to item total
// - Qty: "2 X" = count, weights = kg/l
// - Ignore payment lines

// Return ONLY JSON.
//           `,
//           images: [imageBase64],
//         }
//       ],
//       format: 'json',

//       // 🔥 PERFORMANCE SETTINGS
//       // options: {
//       //   num_predict: 600,
//       //   temperature: 0,
//       //   top_p: 0.9,
//       //   num_ctx: 4096,
//       //   repeat_penalty: 1.1
//       // }
//     });

//     console.log(response);

//     // const data = JSON.parse(response.message.content);
//     return response
//     // return data;

//   } catch (error) {
//     console.error("Qwen Vision extraction failed:", error);
//     throw error;
//   }
// }



export async function extractFromReceipt(imagePath) {
  try {
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    const response = await ollama.chat({
      model: 'qwen3-vl:4b-instruct', // or 'qwen3-vl:8b-instruct'
      messages: [
        {
          role: 'user',
          content: `Extract grocery receipt data into JSON. 
            Schema:
            {
              "store": { "storeName": "", "address": "", "postcode": "", "city":"" },
              "items": [{ "itemName": "", "qty": 0.0, "unit": "count/kg/l/other", "price": 0.0, "category":"" }],
              "summary": { "totalAmount": 0.0, "dateTime": "", "totalDiscount":0.0, totalItemCount:0 }
            }

            Rules:
            - store name can be found at the top, check the logos or names like Tesco, lidl, Morrison etc. if some of the data missing in the receipt like address or postcode leave it as empty fields "".
            - Merge multi-line items if an item spread in to multiple lines
            - Unit is "count" for "2 X", "g/kg/ml/l" for weights, "other" for pints/packs.
            - based on the item decide a product category from below category list. Always must return the **exact Level 3(L3) category name** only (no extra text).
                You have access to the following grocery categories: all the categories has classified into 3 levels L1, L2 and L3

                Categories:
                  Fresh Food:
                    - Dairy & Eggs: Milk, Butter & Margarine, Cheese, Yogurt, Cream, Eggs
                    - Fruit & Vegetables: Fresh Fruits, Fresh Vegetables, Herbs, Salad & Prepared Veg, Organic Produce
                    - Meat & Poultry: Fresh Chicken, Fresh Beef, Fresh Lamb, Pork, Turkey, Mince & Diced Meat
                    - Fish & Seafood: Fresh Fish, Smoked Fish, Shellfish, Ready-to-Cook Fish

                  Frozen Food:
                    - Frozen Vegetables: Mixed Veg, Peas, Corn, Spinach, Stir-Fry Mix
                    - Frozen Fruits: Berries, Mango, Tropical Mix, Cherries
                    - Frozen Meat: Chicken Portions, Beef, Lamb, Sausages
                    - Frozen Fish: Fish Fillets, Shellfish, Breaded Fish
                    - Frozen Ready Meals: Ready Meals, Pizza, Burgers, Asian Meals
                    - Ice Cream & Desserts: Ice Cream, Sorbet, Frozen Yogurt, Frozen Puddings

                  Food Cupboard:
                    - Bakery: Bread, Rolls & Buns, Wraps & Pittas, Croissants & Pastries, Cakes
                    - Pasta/Rice/Grains: Pasta, Rice, Noodles, Couscous & Quinoa
                    - Canned & Jarred Food: Tinned Vegetables, Tinned Fruit, Beans & Pulses, Soups, Tomatoes & Sauces
                    - Snacks & Confectionery: Biscuits, Crisps & Snacks, Chocolate, Sweets
                    - Breakfast: Cereals, Porridge, Granola, Breakfast Bars
                    - Cooking Ingredients: Flour, Sugar, Baking Ingredients, Oils & Vinegars, Spices & Seasonings, Stock Cubes
                    - Spreads & Condiments: Jam, Honey, Peanut Butter, Sauces (Ketchup, Mayo), Pickles & Chutneys

                  Drinks:
                    - Non-Alcoholic: Water, Soft Drinks, Juice, Squash, Tea, Coffee, Plant-Based Drinks (Oat, Soy, Almond)
                    - Alcoholic: Beer, Wine, Spirits, Cider

                  Ready Meals & Convenience:
                    - Chilled Ready Meals: Ready Meals, Lasagne, Curries, Pasta Meals
                    - Meal Kits: Meal Kits
                    - Sandwiches & Wraps: Sandwiches, Wraps, Rolls
                    - Chilled Pizzas: Pizza Margherita, Pizza Pepperoni, Pizza Vegetarian

                  Household:
                    - Cleaning: Surface Cleaners, Dishwashing, Laundry, Bleach & Disinfectants
                    - Paper & Disposable: Toilet Paper, Kitchen Towels, Tissues, Foil & Cling Film, Bin Bags

                  Health & Beauty:
                    - Personal Care: Shower Gel, Soap, Shampoo & Conditioner, Deodorant, Oral Care
                    - Health: Vitamins & Supplements, First Aid, OTC Medicines

                  Baby & Kids:
                    - Baby Food: Ready-to-Eat Baby Food, Pouches, Jars
                    - Formula Milk: Infant Formula, Follow-on Formula
                    - Nappies: Disposable Nappies, Cloth Nappies
                    - Baby Wipes: Standard Wipes, Sensitive Wipes, Fragrance-Free Wipes

                  Pet Supplies:
                    - Dog Food: Dry Dog Food, Wet Dog Food, Dog Treats
                    - Cat Food: Dry Cat Food, Wet Cat Food, Cat Treats
                    - Pet Treats: Dog Treats, Cat Treats, Small Animal Treats
                    - Pet Care: Litter, Grooming, Bedding, Toys

                  World Foods:
                    - Indian: Curry Pastes, Spices, Ready Meals, Snacks
                    - Chinese: Sauces, Noodles, Rice, Ready Meals
                    - Italian: Pasta, Sauces, Olive Oil, Ready Meals
                    - Mexican: Tortillas, Salsa, Beans, Ready Meals
                    - Middle Eastern: Couscous, Hummus, Pita, Spices

                  Special Diets:
                    - Gluten-Free: Gluten-Free Bread, Gluten-Free Pasta, Gluten-Free Snacks
                    - Vegan: Vegan Dairy Alternatives, Vegan Ready Meals, Vegan Snacks
                    - Vegetarian: Vegetarian Meals, Vegetarian Snacks
                    - Dairy-Free: Dairy-Free Milk, Dairy-Free Yogurt, Dairy-Free Cheese
                    - Low Sugar / Keto: Low Sugar Snacks, Keto Meals, Sweeteners
                Example Inputs & Outputs:
                - Input: "Co-op Blue Milk" → Output: "Milk"
                - Input: "Tesco Organic Eggs" → Output: "Eggs"
                - Input: "Frozen Pepperoni Pizza" → Output: "Pizza Pepperoni"
                - Input: "Coca Cola 500ml" → Output: "Soft Drinks"
            - if possible normalize the item names by removing brand name and quantity like 4PT, 400G, 2L etc
            - if date time is found convert it to ISO 8601 String format
            - if the receipt shows -£0.10 or name it as discount/savings, consider it as discount
            - Return ONLY the JSON object.
          `,
          images: [imageBase64],
        }
      ],
      format: 'json',
     options: {
      num_predict: 1600,        // Enough for structured JSON, avoids long rambling
      repeat_penalty: 1.2,     // 1.5 can be too aggressive and break valid repetition (like item lists)
      temperature: 0.1,        // Slightly above 0 to prevent stuck/degenerate outputs
      num_ctx: 4096,           // Safer for receipts (handles long OCR text without truncation)
    }
    });
    console.log(response);
    // 🧠 SMART PARSING: Check content first, then fall back to thinking
    let rawJson = response.message.content || response.message.thinking;

    if (!rawJson || rawJson === "{}") {
      throw new Error("Model returned empty content and thinking fields.");
    }

    // Clean any potential markdown wrapping if the model ignored 'format: json'
    const cleanJson = rawJson.replace(/```json|```/g, "").trim();
    console.log("cleaned json: " + cleanJson);
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Extraction failed:", error);
    throw error;
  }
}

// export async function normalizeProductWithLLM(item) {
//   const response = await ollama.chat({
//     model: 'qwen3-vl:4b-instruct',
//     messages: [
//       {
//         role: 'user',
//         content: `
// Normalize this grocery product.

// Input:
// ${JSON.stringify(item)}

// Return JSON:
// {
//   "normalized_name": "",
//   "brand": "",
//   "category": "",
//   "unit_type": "weight|volume|count",
//   "standard_unit": "g|ml|count",
//   "standard_quantity": number
// }
// `
//       }
//     ],
//     format: 'json',
//     options: {
//       temperature: 0
//     }
//   });

//   return JSON.parse(response.message.content);
// }

export async function normalizeProductWithLLM(item, existingOptions, categories_list) {
  
   const optionsList = (existingOptions && existingOptions.length > 0) 
  ? existingOptions.map(o => `ID: ${o.id}, Name: ${o.normalized_name}`).join('\n') 
  : "No existing matches found.";
  
  const categoryListFormatted = (categories_list && categories_list.length > 0)
  ? categories_list.map(c => `- ${c.name}`).join('\n')
  : "- other";
  
  const response = await ollama.chat({
    model: 'qwen3-vl:4b-instruct',
    messages: [{
      role: 'user',
      content: `
        You are a grocery product normalization and matching expert.

        Your task is to process ONE grocery item and return a structured JSON response.

        --------------------------------
        INPUT DATA
        --------------------------------

        Item JSON:
        ${JSON.stringify(item, null, 2)}

        Item Name:
        "${item.itemName}"

        EXISTING PRODUCTS (try to match FIRST):
        ${optionsList}

        AVAILABLE CATEGORIES (choose EXACTLY ONE):
        ${categoryListFormatted}

        --------------------------------
        STEP-BY-STEP INSTRUCTIONS
        --------------------------------

        1. MATCH EXISTING PRODUCT (HIGHEST PRIORITY)
        - Compare the item with EXISTING PRODUCTS
        - Ignore brand, size, and quantity differences
        - Focus on core product type (e.g., milk, bread, eggs)
        - If a clear match exists → return match_existing_id
        - If NOT confident → DO NOT match

       2. NORMALIZE + EXTRACT PRODUCT DATA (MANDATORY) + USE item json and copy values if require
        - Create a clean normalized_name by removing brand, size, quantity, and packaging
          (e.g., "Tesco Whole Milk 2L" → "whole milk")
        - normalized_name MUST NOT be empty; if unsure, simplify original name

        - Extract brand ONLY if clearly present (e.g., "Tesco", "Co-op"), else ""

        - Use Item JSON (qty, unit, itemName) to determine:
          • unit_type → weight | volume | count  
          • standard_unit → g | ml | count  
          • standard_quantity → numeric base value  

        - Conversions:
          • kg → g (x1000), l → ml (x1000)
          • count remains unchanged

        - If unit missing:
          • infer from name if possible, else default to count = 1

        - STRICT:
          • normalized_name must NOT include brand or quantity  
          • ALWAYS fill unit_type, standard_unit, standard_quantity  
          • DO NOT leave fields empty or zero unless truly unknown

        4. SELECT CATEGORY (MANDATORY)
        - You MUST choose EXACTLY ONE category from AVAILABLE CATEGORIES
        - DO NOT invent new categories
        - DO NOT return empty category
        - Choose the closest logical category based on product type
        - If unsure → choose "other"

        5. CONFIDENCE SCORING
        - 0.9 → exact match or very clear product
        - 0.8 → strong match / high certainty
        - 0.6 → somewhat likely but not certain
        - 0.3 → weak guess
        - 0.0 → unknown or unclear item
        

        --------------------------------
        STRICT RULES
        --------------------------------

        - ALWAYS return valid JSON
        - NEVER return empty strings
        - normalized_name MUST NOT be empty
        - category MUST be from AVAILABLE CATEGORIES
        - If match_existing_id is set → still fill all other fields
        - If unsure → prefer low confidence instead of guessing
        - If normalized_name is clear and common → minimum confidence 0.7

        --------------------------------
        OUTPUT FORMAT (ONLY JSON)
        --------------------------------

        {
          "match_existing_id": "",
          "normalized_name": "",
          "brand": "",
          "category": "",
          "unit_type": "weight|volume|count",
          "standard_unit": "g|ml|count",
          "standard_quantity": 0,
          "confidence": 0.0
        }
        `
    }],
    format: 'json'
  });
  // console.log("LLM Response: " + response.message.content);
  return JSON.parse(response.message.content);
}
// export async function extractFromReceipt(ocrText) {
//   try {
//     const response = await ollama.chat({
//       model: 'qwen2.5:latest', // The model you downloaded in the GUI
//       messages: [
//         { 
//           role: 'user', 
//           content: `Act as a precise data extraction engine for grocery receipts. 
//           Input OCR Text: "${ocrText}"

//           ### Logic Rules:
//           1. **Multi-line Items**: If an item description is split across two lines, merge them into a single string (e.g., "BANANAS LOOSE\n0.7 KG @ 0.9/ KG" becomes "BANANAS LOOSE 0.7 KG @ 0.9/ KG").
//           2. **Discounts**: Identify discounts (often labeled 'SAVING', 'DISC', or starting with '-'). 
//             - DO NOT list discounts as separate items.
//             - Subtract the discount from the relevant item's price to provide the **net price** paid for that line.
//           3. **Quantity Logic**: If a line shows "3 @ 1.00" or "3 X 1.00", the price in the JSON should be the total for that line (3.00) and quantity will be 3.
//           4. **Data Cleaning**: Remove OCR noise (| , _ , §). Convert prices to Numbers.

//           ### Schema:
//           {
//             "store_details": { "name": "string", "address": "string", "postcode": "string" },
//             "items": [
//               { "item": "Merged Item Name", "price": 0.00, "quantity":0 }
//             ],
//             "summary": { 
//               "item_count": 0, 
//               "total_due": 0.00, 
//               "datetime": "ISO-8601 or string" 
//             }
//           }`
//         }
//       ],
//       format: 'json', // Ensures the output is a clean JSON object
//     });

//     const data = JSON.parse(response.message.content);
//     console.log(data);
//     return data;
//   } catch (error) {
//     console.error("Local extraction failed:", error);
//   }
// }