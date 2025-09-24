import dotenv from "dotenv";
import pkg from "pg";
import { categoryKeywords } from "./categoryKeywords.js";

dotenv.config({ path: ".env" });
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log("🌱 Seeding categories...");

// Create subcategory rows from categoryKeywords
const categories = Object.keys(categoryKeywords).map((slug) => ({
  name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  slug,
}));

// Ensure fallback categories
categories.push(
  { name: "Uncategorized", slug: "uncategorized" },
  { name: "Other", slug: "other" }
);

async function seedCategories() {
  try {
    console.log("🧹 Clearing categories table...");
    await pool.query("TRUNCATE TABLE categories RESTART IDENTITY CASCADE;");

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug]
      );
      console.log(`✅ Inserted category: ${cat.name}`);
    }

    console.log("🎉 Category seeding complete!");
  } catch (err) {
    console.error("❌ Error seeding categories:", err.message);
  } finally {
    await pool.end();
  }
}

seedCategories();
