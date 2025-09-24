// scripts/addImageColumnBack.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

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

async function addImageColumnBack() {
  try {
    console.log("➕ Adding image_url column back to medicines table...");

    // Check if column already exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'medicines' AND column_name = 'image_url'
    `);

    if (columnCheck.rows.length > 0) {
      console.log("⚠️  Column 'image_url' already exists.");
      
      // Set all existing values to NULL
      console.log("🔄 Setting all image_url values to NULL...");
      const updateResult = await pool.query(`
        UPDATE medicines SET image_url = NULL
      `);
      console.log(`✅ Set ${updateResult.rowCount} records to NULL`);
      
    } else {
      // Add the column
      console.log("➕ Adding new image_url column...");
      await pool.query(`
        ALTER TABLE medicines 
        ADD COLUMN image_url TEXT DEFAULT NULL
      `);
      console.log("✅ Successfully added image_url column");
    }

    // Verify the column exists and check values
    const verifyColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'medicines' 
      ORDER BY ordinal_position
    `);

    console.log("\n🏗️  Current medicines table columns:");
    verifyColumns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check image_url values
    const imageCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(image_url) as with_images,
        COUNT(*) - COUNT(image_url) as null_images
      FROM medicines
    `);
    
    const stats = imageCheck.rows[0];
    console.log(`\n📊 Image URL Statistics:`);
    console.log(`   Total medicines: ${stats.total}`);
    console.log(`   With image_url: ${stats.with_images}`);
    console.log(`   NULL image_url: ${stats.null_images}`);

    console.log("\n🎉 Column added successfully! Your server should work now.");

  } catch (error) {
    console.error("❌ Failed to add column:", error.message);
    console.error("Full error:", error);
  } finally {
    await pool.end();
  }
}

addImageColumnBack();