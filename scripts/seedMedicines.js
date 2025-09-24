// scripts/seedMedicines.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import fetch from "node-fetch";
import { categoryKeywords } from "./categoryKeywords.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log("🟢 seedMedicines.js is running...");
console.log("DB user:", process.env.DB_USER, "password loaded?", !!process.env.DB_PASSWORD);

// --- Utility: Title case for names ---
function toProperCase(str) {
  return str ? str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : str;
}

// --- Classifier ---
function classifyMedicine(name, description = "") {
  const text = `${name} ${description}`.toLowerCase();

  let bestMatch = "uncategorized";
  let highestCount = 0;

  for (const [slug, keywords] of Object.entries(categoryKeywords)) {
    let count = 0;
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${keyword.toLowerCase()}\\b`, "i");
      if (pattern.test(text)) count++;
    }
    if (count > highestCount) {
      highestCount = count;
      bestMatch = slug;
    }
  }

  return highestCount > 0 ? bestMatch : "uncategorized";
}

// - API from OpenFDA -
async function fetchOpenFDAMedicines(limit = 100, skip = 0) {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:*&limit=${limit}&skip=${skip}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error(" OpenFDA fetch error:", err.message);
    return [];
  }
}

// --- Main Seeder ---
async function seedMedicines(batchSize = 100, maxBatches = 5) {
  try {
    console.log(" Starting Seeding");


    const categoryRows = await pool.query("SELECT id, slug FROM categories");
    const categoryCache = Object.fromEntries(categoryRows.rows.map((r) => [r.slug, r.id]));
    if (!categoryCache["uncategorized"]) {
      console.error(" No 'uncategorized' category found. Run seedCategories.js first!");
      process.exit(1);
    }
   
    const existingCountRes = await pool.query("SELECT COUNT(*) FROM medicines");
    let skip = parseInt(existingCountRes.rows[0].count, 10) || 0;
    console.log(`📊 Medicines already in DB: ${skip}`);

    let inserted = 0;

    for (let batch = 0; batch < maxBatches; batch++) {
      console.log(`➡️ Fetching batch ${batch + 1}/${maxBatches} (skip=${skip})`);
      const medicines = await fetchOpenFDAMedicines(batchSize, skip);
      if (medicines.length === 0) {
        console.log(" No more medicines returned from API.");
        break;
      }

      for (const med of medicines) {
        const brandName = med.openfda?.brand_name?.[0] || "Unknown Medicine";
        const genericName = med.openfda?.generic_name?.[0] || brandName;
        const manufacturer = med.openfda?.manufacturer_name?.[0] || "Unknown Manufacturer";
        const description = Array.isArray(med.description)
          ? med.description.join(" ")
          : med.description || med.indications_and_usage?.join(" ") || "";
        const dosage = med.dosage_and_administration?.join(" ") || "N/A";
        const route = Array.isArray(med.openfda?.route) ? med.openfda.route[0] : "Oral";
        const composition = Array.isArray(med.openfda?.substance_name)
          ? med.openfda.substance_name.join(", ")
          : genericName;

        const categorySlug = classifyMedicine(brandName, description);
        const categoryId = categoryCache[categorySlug] || categoryCache["uncategorized"];

        const rating = Math.floor(Math.random() * 5) + 1;

        await pool.query(
          `INSERT INTO medicines 
          (name, generic, manufacturer_name, description, dosage, route, composition, category, doctor_rating, created_at, last_synced)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
          ON CONFLICT (name) DO NOTHING`,
          [
            toProperCase(brandName),
            toProperCase(genericName),
            toProperCase(manufacturer),
            description,
            dosage,
            route,
            composition,
            categoryId,
            rating,
          ]
        );

        console.log(`✅ Inserted: ${brandName} (${genericName}) → ${categorySlug}`);
        inserted++;
      }

      skip += batchSize;
    }

    console.log(`🎉 Seeding complete. Inserted ${inserted} new medicines.`);
    await pool.end();
  } catch (err) {
    console.error("❌ Error seeding medicines:", err);
    await pool.end();
    process.exit(1);
  }
}

// --- Run directly ---
seedMedicines(100, 10)
  .then(() => {
    console.log("🎉 Seeding script finished!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed error:", err);
    process.exit(1);
  });
