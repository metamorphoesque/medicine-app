// scripts/progressiveSeedMedicines.js
import dotenv from "dotenv";
import pkg from "pg";
import fetch from "node-fetch";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Track progress in database
async function getLastSyncProgress() {
  try {
    const result = await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_progress (
        id SERIAL PRIMARY KEY,
        script_name VARCHAR(100) UNIQUE,
        last_skip INTEGER DEFAULT 0,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_processed INTEGER DEFAULT 0
      )
    `);
    
    const progress = await pool.query(`
      SELECT last_skip, total_processed FROM sync_progress 
      WHERE script_name = 'seedMedicines'
    `);
    
    if (progress.rows.length === 0) {
      await pool.query(`
        INSERT INTO sync_progress (script_name, last_skip, total_processed) 
        VALUES ('seedMedicines', 0, 0)
      `);
      return { lastSkip: 0, totalProcessed: 0 };
    }
    
    return { 
      lastSkip: progress.rows[0].last_skip, 
      totalProcessed: progress.rows[0].total_processed 
    };
  } catch (error) {
    console.log("⚠️ Progress tracking not available, starting from 0");
    return { lastSkip: 0, totalProcessed: 0 };
  }
}

async function updateSyncProgress(newSkip, newTotal) {
  try {
    await pool.query(`
      UPDATE sync_progress 
      SET last_skip = $1, total_processed = $2, last_sync = CURRENT_TIMESTAMP 
      WHERE script_name = 'seedMedicines'
    `, [newSkip, newTotal]);
  } catch (error) {
    console.log("⚠️ Could not update progress");
  }
}

// Your existing category loading and classification functions here...
let categoryCache = {};

async function loadCategories() {
  console.log("📂 Loading categories from DB...");
  const res = await pool.query("SELECT id, slug FROM categories");
  categoryCache = {};
  for (const row of res.rows) {
    categoryCache[row.slug] = row.id;
  }
  console.log(`✅ Loaded ${res.rows.length} categories into cache`);
}

// Your existing classifyMedicine function here...
function classifyMedicine(med) {
  const text = `${med.name || ""} ${med.generic || ""} ${med.substance_name || ""} ${med.description || ""}`.toLowerCase();
  const dosageForm = (med.dosage_form || "").toLowerCase();
  const route = (med.route || "").toLowerCase();

  // [Include all your existing classification logic here]
  // For brevity, I'll just include the key parts:
  
  if (text.match(/ibuprofen|naproxen|diclofenac|celecoxib|nsaid|anti.inflammatory/)) return categoryCache["nsaids"];
  if (text.match(/eye.drops|artificial.tears|dry.eye|lubricating.tears|redness.relief/) && !text.includes("prescription")) return categoryCache["eye-drops"];
  
  // ... [all other classification logic] ...
  
  // Fallback
  return categoryCache["other"] || Object.values(categoryCache)[0] || null;
}

export async function seedMedicinesProgressive(batchSize = 1000) {
  console.log("🌱 Starting PROGRESSIVE medicine seeding from OpenFDA...");

  try {
    await loadCategories();
    
    if (Object.keys(categoryCache).length === 0) {
      throw new Error("No categories loaded! Please run seedCategoriesSimple.js first.");
    }

    // Get current progress
    const { lastSkip, totalProcessed } = await getLastSyncProgress();
    console.log(`📊 Resuming from skip=${lastSkip}, total processed so far: ${totalProcessed}`);

    const limit = 100;
    let skip = lastSkip;
    let batchProcessed = 0;
    let successCount = 0;
    let errorCount = 0;

    while (batchProcessed < batchSize) {
      console.log(`🔍 Fetching batch skip=${skip} limit=${limit}`);

      try {
        const response = await fetch(
          `https://api.fda.gov/drug/label.json?limit=${limit}&skip=${skip}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.log("🏁 Reached end of available data from OpenFDA");
            break;
          }
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
          console.log("🏁 No more results from OpenFDA");
          break;
        }

        console.log(`📦 Processing ${data.results.length} medicines...`);

        const medicines = data.results.map((result) => {
          const openfda = result.openfda || {};

          let name = "Unknown";
          if (openfda.brand_name && openfda.brand_name[0]) {
            name = openfda.brand_name[0];
          } else if (openfda.generic_name && openfda.generic_name[0]) {
            name = openfda.generic_name[0];
          } else if (openfda.substance_name && openfda.substance_name[0]) {
            name = openfda.substance_name[0];
          }

          return {
            name: name.replace(/\s+/g, ' ').trim(),
            description: result.description
              ? result.description.join(" ").substring(0, 1000)
              : result.indications_and_usage
              ? result.indications_and_usage.join(" ").substring(0, 1000)
              : null,
            generic: openfda.generic_name ? openfda.generic_name[0] : null,
            manufacturer_name: openfda.manufacturer_name ? openfda.manufacturer_name[0] : null,
            substance_name: openfda.substance_name ? openfda.substance_name.slice(0, 3).join(", ") : null,
            route: openfda.route ? openfda.route.slice(0, 3).join(", ") : null,
            dosage_form: openfda.dosage_form ? openfda.dosage_form[0] : null,
          };
        });

        for (const med of medicines) {
          try {
            const categoryId = classifyMedicine(med);
            
            if (!categoryId) {
              console.error(`❌ No category assigned for: ${med.name}`);
              errorCount++;
              continue;
            }

            const result = await pool.query(
              `INSERT INTO medicines 
                (name, description, generic, manufacturer_name, substance_name, route, dosage_form, category_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (name) DO UPDATE SET
                 description = EXCLUDED.description,
                 generic = EXCLUDED.generic,
                 manufacturer_name = EXCLUDED.manufacturer_name,
                 substance_name = EXCLUDED.substance_name,
                 route = EXCLUDED.route,
                 dosage_form = EXCLUDED.dosage_form,
                 category_id = EXCLUDED.category_id,
                 last_synced = CURRENT_TIMESTAMP
               RETURNING id, (xmax = 0) AS inserted`,
              [med.name, med.description, med.generic, med.manufacturer_name, 
               med.substance_name, med.route, med.dosage_form, categoryId]
            );

            const isNew = result.rows[0].inserted;
            const action = isNew ? "NEW" : "UPDATED";
            console.log(`   ${isNew ? '🆕' : '🔄'} ${action}: ${med.name}`);
            successCount++;

          } catch (err) {
            console.error(`   ❌ DB error for ${med.name}:`, err.message);
            errorCount++;
          }
        }

        batchProcessed += medicines.length;
        skip += limit;

        // Update progress after each API call
        await updateSyncProgress(skip, totalProcessed + batchProcessed);

        console.log(`📊 Batch progress: ${batchProcessed}/${batchSize} (${successCount} success, ${errorCount} errors)`);

        // Rate limiting
        await new Promise((res) => setTimeout(res, 300));

      } catch (apiError) {
        console.error(`❌ API error at skip=${skip}:`, apiError.message);
        // Try to continue with next batch
        skip += limit;
        await new Promise((res) => setTimeout(res, 1000)); // Longer delay on error
      }
    }

    console.log(`\n🎉 Progressive seeding completed!`);
    console.log(`   ✅ Successfully processed: ${successCount} medicines`);
    console.log(`   ❌ Errors: ${errorCount} medicines`);
    console.log(`   📈 Total in this batch: ${batchProcessed} medicines`);
    console.log(`   🎯 Overall total processed: ${totalProcessed + batchProcessed} medicines`);
    console.log(`   ⏭️  Next run will start from skip=${skip}`);

  } catch (err) {
    console.error("❌ Progressive seeding error:", err.message);
  } finally {
    await pool.end();
    console.log("🔒 DB connection closed.");
  }
}

// Command line options
const args = process.argv.slice(2);
const batchSize = args[0] ? parseInt(args[0]) : 1000;

// Run directly if executed as a script
if (process.argv[1].includes("progressiveSeedMedicines.js")) {
  console.log(`🎯 Running progressive seeding with batch size: ${batchSize}`);
  seedMedicinesProgressive(batchSize);
}

export { seedMedicinesProgressive };