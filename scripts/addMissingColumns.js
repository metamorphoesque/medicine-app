// scripts/addMissingColumns.js
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

async function addMissingColumns() {
  try {
    console.log("🟢 Adding missing columns to medicines table...");

    // Check current columns
    console.log("🔍 Checking current columns...");
    const currentColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'medicines'
      ORDER BY ordinal_position
    `);
    
    const columnNames = currentColumns.rows.map(row => row.column_name);
    console.log("📋 Current columns:", columnNames);

    // Add missing columns
    const columnsToAdd = [
      { name: 'symptoms', type: 'TEXT', description: 'Medicine symptoms/indications' },
      { name: 'image_url', type: 'TEXT', description: 'Medicine image URL' },
      { name: 'price', type: 'DECIMAL(10,2)', description: 'Medicine price' }
    ];

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name} (${column.type})`);
        
        await pool.query(`
          ALTER TABLE medicines 
          ADD COLUMN ${column.name} ${column.type}
        `);
        
        console.log(`✅ Added ${column.name} column`);
      } else {
        console.log(`⏭️  Column ${column.name} already exists`);
      }
    }

    // Verify the additions
    console.log("\n🔍 Verifying updated table structure...");
    const updatedColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'medicines' 
      ORDER BY ordinal_position
    `);
    
    console.log("🏗️  Updated medicines table columns:");
    updatedColumns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Update any existing records to have default values if needed
    console.log("\n🔄 Setting default values for new columns...");
    
    const updateResults = await pool.query(`
      UPDATE medicines 
      SET 
        symptoms = COALESCE(symptoms, description),
        image_url = COALESCE(image_url, NULL),
        price = COALESCE(price, 0.00)
      WHERE symptoms IS NULL OR image_url IS NULL OR price IS NULL
    `);
    
    console.log(`✅ Updated ${updateResults.rowCount} records with default values`);

    console.log("\n🎉 Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Full error:", error);
  } finally {
    await pool.end();
  }
}

addMissingColumns();