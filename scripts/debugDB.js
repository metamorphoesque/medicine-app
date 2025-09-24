// scripts/debugDB.js
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

async function debugDatabase() {
  try {
    console.log("🟢 Starting database debug...");
    console.log("DB Config:", {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: !!process.env.DB_PASSWORD
    });

    // Test connection
    console.log("\n1. Testing connection...");
    const timeTest = await pool.query("SELECT NOW() as current_time");
    console.log("✅ Connection successful:", timeTest.rows[0].current_time);

    // Check tables exist
    console.log("\n2. Checking tables...");
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("📋 Tables found:", tables.rows.map(r => r.table_name));

    // Check categories
    console.log("\n3. Checking categories...");
    const categoriesCount = await pool.query("SELECT COUNT(*) as count FROM categories");
    console.log(`📊 Categories count: ${categoriesCount.rows[0].count}`);
    
    const sampleCategories = await pool.query("SELECT id, name, slug FROM categories LIMIT 5");
    console.log("🏷️  Sample categories:");
    sampleCategories.rows.forEach(cat => {
      console.log(`   ${cat.id}: ${cat.name} (${cat.slug})`);
    });

    // Check medicines table structure
    console.log("\n4. Checking medicines table structure...");
    const medicinesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'medicines' 
      ORDER BY ordinal_position
    `);
    console.log("🏗️  Medicines table columns:");
    medicinesStructure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check medicines count
    console.log("\n5. Checking medicines data...");
    const medicinesCount = await pool.query("SELECT COUNT(*) as count FROM medicines");
    console.log(`📊 Medicines count: ${medicinesCount.rows[0].count}`);

    if (parseInt(medicinesCount.rows[0].count) > 0) {
      // Sample medicines
      const sampleMedicines = await pool.query(`
        SELECT id, name, generic, description, image_url, category 
        FROM medicines 
        LIMIT 3
      `);
      console.log("💊 Sample medicines:");
      sampleMedicines.rows.forEach(med => {
        console.log(`   ${med.id}: ${med.name} (generic: ${med.generic || 'null'}, category: ${med.category}, image: ${med.image_url ? 'yes' : 'no'})`);
      });

      // Check medicines needing enrichment
      console.log("\n6. Checking medicines needing enrichment...");
      const needEnrichment = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as no_image,
          COUNT(CASE WHEN description IS NULL OR description = '' THEN 1 END) as no_description,
          COUNT(CASE WHEN category = 1 THEN 1 END) as uncategorized,
          COUNT(CASE WHEN generic IS NULL OR generic = '' THEN 1 END) as no_generic
        FROM medicines
      `);
      
      const stats = needEnrichment.rows[0];
      console.log("📈 Enrichment needed:");
      console.log(`   Total medicines: ${stats.total}`);
      console.log(`   Missing images: ${stats.no_image}`);
      console.log(`   Missing descriptions: ${stats.no_description}`);
      console.log(`   Uncategorized: ${stats.uncategorized}`);
      console.log(`   Missing generic names: ${stats.no_generic}`);

      // Test the actual query from enrichMedicines
      console.log("\n7. Testing enrichment query...");
      const enrichQuery = await pool.query(`
        SELECT 
          id, name, generic, description, image_url, category,
          symptoms, composition, dosage
        FROM medicines 
        WHERE image_url IS NULL 
           OR image_url = ''
           OR category = 1
           OR description IS NULL
           OR description = ''
        ORDER BY id
        LIMIT 3
      `);
      
      console.log(`🔍 Query returned ${enrichQuery.rows.length} medicines for enrichment:`);
      enrichQuery.rows.forEach(med => {
        console.log(`   ${med.id}: ${med.name}`);
        console.log(`      - Image: ${med.image_url || 'missing'}`);
        console.log(`      - Description: ${med.description ? 'present' : 'missing'}`);
        console.log(`      - Category: ${med.category}`);
      });
    } else {
      console.log("⚠️  No medicines found! You need to run seedMedicines.js first.");
    }

  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    console.error("Full error:", error);
  } finally {
    await pool.end();
    console.log("\n🎉 Debug completed!");
  }
}

debugDatabase();