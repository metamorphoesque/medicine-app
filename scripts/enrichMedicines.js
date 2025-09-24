// scripts/enrichMedicines.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import axios from "axios";

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

console.log("🟢 enrichMedicines.js is running...");
console.log("DB user:", process.env.DB_USER, "password loaded?", !!process.env.DB_PASSWORD);

// --- Category lookup cache ---
let categoryCache = {}; // slug → { id, name }

async function loadCategories() {
  try {
    console.log("🔍 Executing categories query...");
    const res = await pool.query("SELECT id, slug, name FROM categories");
    console.log(`📊 Found ${res.rows.length} categories in database`);
    
    categoryCache = {};
    for (const row of res.rows) {
      categoryCache[row.slug] = { id: row.id, name: row.name };
    }
    console.log(`📂 Loaded ${Object.keys(categoryCache).length} categories into cache`);
    
    // Show first few categories for debugging
    const firstFew = Object.keys(categoryCache).slice(0, 5);
    console.log(`🏷️  Sample categories: ${firstFew.join(', ')}`);
    
    if (!categoryCache["uncategorized"]) {
      console.warn("⚠️  Warning: No 'uncategorized' category found!");
    }
  } catch (err) {
    console.error("❌ Error in loadCategories:", err.message);
    throw err;
  }
}

// --- Enhanced Smart classifier ---
function classifyMedicine(med) {
  const text = `${med.name || ""} ${med.generic || ""} ${med.composition || ""} ${med.description || ""} ${med.symptoms || ""}`.toLowerCase();
  
  // Cardiovascular
  if (text.match(/atenolol|metoprolol|propranolol|bisoprolol|carvedilol|nebivolol/)) 
    return categoryCache["beta-blockers"];
  if (text.match(/enalapril|lisinopril|captopril|ramipril|quinapril/)) 
    return categoryCache["ace-inhibitors"];
  if (text.match(/losartan|valsartan|candesartan|irbesartan|telmisartan/)) 
    return categoryCache["arbs"];
  if (text.match(/amlodipine|nifedipine|verapamil|diltiazem|felodipine/)) 
    return categoryCache["calcium-channel-blockers"];
  if (text.match(/furosemide|hydrochlorothiazide|chlorthalidone|spironolactone|amiloride/)) 
    return categoryCache["diuretics"];
  if (text.match(/warfarin|heparin|apixaban|rivaroxaban|dabigatran|clopidogrel|aspirin.*cardio/)) 
    return categoryCache["anticoagulants"];
  if (text.match(/atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin|cholesterol/)) 
    return categoryCache["statins"];

  // Diabetes
  if (text.match(/metformin|glipizide|glyburide|glimepiride|pioglitazone|diabetes|blood sugar|glucose/)) 
    return categoryCache["antidiabetics"];
  if (text.match(/insulin|lantus|humalog|novolog|levemir/)) 
    return categoryCache["insulin"];

  // Mental Health & Neurology
  if (text.match(/fluoxetine|sertraline|paroxetine|citalopram|escitalopram|prozac|zoloft|lexapro|depression/)) 
    return categoryCache["ssri-antidepressants"];
  if (text.match(/venlafaxine|duloxetine|desvenlafaxine|effexor|cymbalta/)) 
    return categoryCache["snri-antidepressants"];
  if (text.match(/diazepam|lorazepam|alprazolam|clonazepam|temazepam|valium|xanax|ativan|anxiety/)) 
    return categoryCache["benzodiazepines"];
  if (text.match(/zolpidem|eszopiclone|zaleplon|ambien|lunesta|sleep|insomnia/)) 
    return categoryCache["sleep-aids"];

  // Respiratory
  if (text.match(/albuterol|salbutamol|salmeterol|formoterol|asthma|bronchitis|copd|bronchodilator/)) 
    return categoryCache["bronchodilators"];
  if (text.match(/cetirizine|loratadine|fexofenadine|diphenhydramine|chlorpheniramine|allergy|antihistamine/)) 
    return categoryCache["antihistamines"];
  if (text.match(/dextromethorphan|guaifenesin|pseudoephedrine|phenylephrine|cough|cold|congestion/)) 
    return categoryCache["cough-cold"];

  // Digestive
  if (text.match(/omeprazole|esomeprazole|lansoprazole|pantoprazole|rabeprazole|acid reflux|heartburn|gerd/)) 
    return categoryCache["proton-pump-inhibitors"];
  if (text.match(/loperamide|bismuth subsalicylate|imodium|diarrhea/)) 
    return categoryCache["antidiarrheals"];

  // Pain Relief
  if (text.match(/ibuprofen|naproxen|diclofenac|celecoxib|meloxicam|aspirin|acetaminophen|paracetamol|pain|arthritis|inflammation/)) 
    return categoryCache["nsaids"];

  // Skincare
  if (text.match(/benzoyl peroxide|salicylic acid|adapalene|tretinoin|acne|pimple|blemish/)) 
    return categoryCache["otc-acne"];
  if (text.match(/hydrocortisone|betamethasone|triamcinolone|eczema|dermatitis|rash/)) 
    return categoryCache["topical-steroids"];

  // Default fallback
  return categoryCache["uncategorized"] || { id: 1, name: "uncategorized" };
}

// --- Enhanced image fetching with multiple sources ---
async function getImageUrl(medicine) {
  console.log(`🖼️  Searching for image: ${medicine.name}`);
  
  // Method 1: RxNav RxImage API
  try {
    const cleanName = medicine.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const rxImageUrl = `https://rxnav.nlm.nih.gov/REST/rximage?name=${encodeURIComponent(cleanName)}`;
    
    const rxImageRes = await axios.get(rxImageUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
      }
    });
    
    // Parse XML response (RxNav returns XML)
    const xmlData = rxImageRes.data;
    if (typeof xmlData === 'string' && xmlData.includes('<imageUrl>')) {
      const imageMatch = xmlData.match(/<imageUrl>(.*?)<\/imageUrl>/);
      if (imageMatch && imageMatch[1]) {
        console.log(`✅ Found RxNav image for ${medicine.name}`);
        return imageMatch[1];
      }
    }
  } catch (err) {
    console.log(`❌ RxNav image failed for ${medicine.name}: ${err.message}`);
  }

  // Method 2: Try with generic name if available
  if (medicine.generic && medicine.generic !== medicine.name) {
    try {
      const rxImageUrl = `https://rxnav.nlm.nih.gov/REST/rximage?name=${encodeURIComponent(medicine.generic)}`;
      
      const rxImageRes = await axios.get(rxImageUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
        }
      });
      
      const xmlData = rxImageRes.data;
      if (typeof xmlData === 'string' && xmlData.includes('<imageUrl>')) {
        const imageMatch = xmlData.match(/<imageUrl>(.*?)<\/imageUrl>/);
        if (imageMatch && imageMatch[1]) {
          console.log(`✅ Found RxNav generic image for ${medicine.name} (${medicine.generic})`);
          return imageMatch[1];
        }
      }
    } catch (err) {
      console.log(`❌ RxNav generic image failed for ${medicine.name}: ${err.message}`);
    }
  }

  // Method 3: DailyMed API (updated endpoint)
  try {
    const dailymedUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(medicine.name)}`;
    
    const dailymedRes = await axios.get(dailymedUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
      }
    });
    
    const data = dailymedRes.data?.data;
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        if (item.product_images && Array.isArray(item.product_images) && item.product_images.length > 0) {
          const imageUrl = item.product_images[0];
          console.log(`✅ Found DailyMed image for ${medicine.name}`);
          return imageUrl;
        }
      }
    }
  } catch (err) {
    console.log(`❌ DailyMed image failed for ${medicine.name}: ${err.message}`);
  }

  // Method 4: NIH Pill Image API
  try {
    const pillImageUrl = `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?resolution=600&name=${encodeURIComponent(medicine.name)}`;
    
    const pillRes = await axios.get(pillImageUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
      }
    });
    
    if (pillRes.data && pillRes.data.nlmRxImages && pillRes.data.nlmRxImages.length > 0) {
      const imageUrl = pillRes.data.nlmRxImages[0].imageUrl;
      console.log(`✅ Found NIH Pill image for ${medicine.name}`);
      return imageUrl;
    }
  } catch (err) {
    console.log(`❌ NIH Pill image failed for ${medicine.name}: ${err.message}`);
  }

  console.log(`❌ No image found for ${medicine.name}`);
  return null;
}

// --- Get additional drug information ---
async function getAdditionalInfo(medicine) {
  console.log(`📋 Enriching info for: ${medicine.name}`);
  
  let enrichedData = {
    generic: medicine.generic,
    description: medicine.description,
    symptoms: medicine.symptoms,
    composition: medicine.composition,
    dosage: medicine.dosage
  };

  // Method 1: OpenFDA API
  try {
    const searchTerms = [medicine.name, medicine.generic].filter(Boolean);
    
    for (const term of searchTerms) {
      try {
        const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(term)}"&limit=1`;
        
        const fdaRes = await axios.get(fdaUrl, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
          }
        });
        
        const drug = fdaRes.data?.results?.[0];
        if (drug) {
          enrichedData.generic = enrichedData.generic || drug.openfda?.generic_name?.[0];
          enrichedData.description = enrichedData.description || (Array.isArray(drug.indications_and_usage) ? drug.indications_and_usage.join(" ") : drug.indications_and_usage);
          enrichedData.symptoms = enrichedData.symptoms || enrichedData.description;
          enrichedData.composition = enrichedData.composition || (Array.isArray(drug.active_ingredient) ? drug.active_ingredient.join(", ") : drug.active_ingredient);
          enrichedData.dosage = enrichedData.dosage || (Array.isArray(drug.dosage_and_administration) ? drug.dosage_and_administration.join(" ") : drug.dosage_and_administration);
          
          console.log(`✅ Enhanced with OpenFDA data for ${medicine.name}`);
          break;
        }
      } catch (err) {
        console.log(`❌ OpenFDA failed for ${term}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`❌ OpenFDA enrichment failed for ${medicine.name}: ${err.message}`);
  }

  // Method 2: RxNav for generic name and related info
  if (!enrichedData.generic || enrichedData.generic === medicine.name) {
    try {
      const rxnavUrl = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(medicine.name)}`;
      
      const rxnavRes = await axios.get(rxnavUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'MedicineApp/1.0 (enrichment-script)'
        }
      });
      
      const drugGroup = rxnavRes.data?.drugGroup;
      if (drugGroup && drugGroup.conceptGroup) {
        for (const group of drugGroup.conceptGroup) {
          if (group.conceptProperties && group.conceptProperties.length > 0) {
            const concept = group.conceptProperties[0];
            if (concept.name && concept.name.toLowerCase() !== medicine.name.toLowerCase()) {
              enrichedData.generic = enrichedData.generic || concept.name;
              console.log(`✅ Found generic name via RxNav: ${concept.name}`);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.log(`❌ RxNav failed for ${medicine.name}: ${err.message}`);
    }
  }

  return enrichedData;
}

// --- Main enrichment function ---
export async function enrichMedicines(limit = 50) {
  try {
    console.log("🚀 Starting medicine enrichment...");
    
    // Test database connection first
    console.log("🔍 Testing database connection...");
    try {
      const testQuery = await pool.query("SELECT NOW()");
      console.log("✅ Database connection successful:", testQuery.rows[0].now);
    } catch (err) {
      console.error("❌ Database connection failed:", err.message);
      return;
    }

    // Load categories with error handling
    console.log("📂 Loading categories...");
    try {
      await loadCategories();
    } catch (err) {
      console.error("❌ Failed to load categories:", err.message);
      return;
    }

    // Check if medicines table exists and has data
    console.log("🔍 Checking medicines table...");
    try {
      const tableCheck = await pool.query("SELECT COUNT(*) as total FROM medicines");
      console.log(`📊 Total medicines in database: ${tableCheck.rows[0].total}`);
      
      if (parseInt(tableCheck.rows[0].total) === 0) {
        console.log("⚠️  No medicines found in database. Run seedMedicines.js first!");
        return;
      }

      // Check if required columns exist
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'medicines' AND column_name IN ('image_url', 'symptoms')
      `);
      
      const existingColumns = columnCheck.rows.map(row => row.column_name);
      const missingColumns = ['image_url', 'symptoms'].filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
        console.log("💡 Run the addMissingColumns.js script first to add required columns");
        return;
      }
      
    } catch (err) {
      console.error("❌ Error checking medicines table:", err.message);
      console.error("💡 Make sure the medicines table exists and you've run the seed script first");
      return;
    }

    // Get medicines that need enrichment with simpler query first
    console.log("🔍 Querying medicines that need enrichment...");
    let medicines;
    try {
      const simpleQuery = await pool.query(`
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
        LIMIT $1
      `, [limit]);
      
      medicines = simpleQuery.rows;
      console.log(`📊 Found ${medicines.length} medicines to enrich`);
      
      if (medicines.length === 0) {
        console.log("✨ All medicines are already enriched!");
        return;
      }
    } catch (err) {
      console.error("❌ Error querying medicines:", err.message);
      console.error("Full error:", err);
      return;
    }

    console.log(`📊 Found ${medicines.length} medicines to enrich`);

    let successCount = 0;
    let imageCount = 0;
    let infoCount = 0;

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      console.log(`\n📦 [${i + 1}/${medicines.length}] Processing: ${med.name} (ID: ${med.id})`);

      try {
        // For debugging, let's start with just getting additional info (skip images for now)
        console.log("📋 Getting additional info...");
        const enrichedData = await getAdditionalInfo(med);
        
        // Skip image fetching for now to test the basic flow
        let image_url = med.image_url;
        console.log(`🖼️  Current image_url: ${image_url || 'null'}`);
        
        // Only fetch image for first few medicines in debug mode
        if ((!image_url || image_url.trim() === '') && i < 3) {
          console.log("🖼️  Attempting to fetch image...");
          image_url = await getImageUrl({ ...med, ...enrichedData });
          if (image_url) {
            imageCount++;
            console.log(`✅ Found image: ${image_url}`);
          } else {
            console.log(`❌ No image found`);
          }
        }

        // Enhanced classification with new data
        console.log("🏷️  Classifying medicine...");
        const category = classifyMedicine({
          ...med,
          ...enrichedData
        });
        console.log(`📂 Category: ${category.name} (ID: ${category.id})`);

        // Check if we have new information
        const hasNewInfo = 
          enrichedData.generic !== med.generic ||
          enrichedData.description !== med.description ||
          enrichedData.symptoms !== med.symptoms ||
          enrichedData.composition !== med.composition ||
          enrichedData.dosage !== med.dosage ||
          image_url !== med.image_url ||
          category.id !== med.category;

        console.log(`📊 Has new info: ${hasNewInfo}`);

        if (hasNewInfo) {
          console.log("💾 Updating database...");
          // Update medicine in database
          await pool.query(
            `UPDATE medicines
             SET 
               generic = COALESCE($1, generic), 
               description = COALESCE($2, description), 
               symptoms = COALESCE($3, symptoms), 
               composition = COALESCE($4, composition), 
               dosage = COALESCE($5, dosage),
               image_url = COALESCE($6, image_url), 
               category = $7,
               last_synced = NOW()
             WHERE id = $8`,
            [
              enrichedData.generic, 
              enrichedData.description, 
              enrichedData.symptoms, 
              enrichedData.composition, 
              enrichedData.dosage,
              image_url, 
              category.id,
              med.id
            ]
          );

          successCount++;
          if (enrichedData.description && !med.description) infoCount++;
          
          console.log(`✅ Updated: ${med.name} -> ${category.name}${image_url ? " (with image)" : ""}`);
        } else {
          console.log(`⏭️  No new data for: ${med.name}`);
        }

      } catch (err) {
        console.error(`❌ Failed to enrich ${med.name}: ${err.message}`);
        console.error("Stack trace:", err.stack);
      }

      // Rate limiting - be nice to APIs
      if (i < medicines.length - 1) {
        console.log("⏳ Waiting 2 seconds...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for debugging
      }
      
      // Stop after first few for debugging
      if (i >= 2) {
        console.log("🛑 Stopping after 3 medicines for debugging");
        break;
      }
    }

    // Report statistics
    console.log("\n📈 Enrichment Summary:");
    console.log(`  • Processed: ${medicines.length} medicines`);
    console.log(`  • Updated: ${successCount} medicines`);
    console.log(`  • Images found: ${imageCount} new images`);
    console.log(`  • Info enhanced: ${infoCount} medicines`);

    const stats = await pool.query(`
      SELECT 
        c.name,
        COUNT(m.id) as count
      FROM categories c
      LEFT JOIN medicines m ON c.id = m.category
      GROUP BY c.id, c.name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log("\n🏷️  Top Categories:");
    stats.rows.forEach(row => {
      console.log(`  • ${row.name}: ${row.count} medicines`);
    });

    const imageStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as with_images
      FROM medicines
    `);
    
    console.log(`\n🖼️  Image Coverage: ${imageStats.rows[0].with_images}/${imageStats.rows[0].total} medicines (${Math.round((imageStats.rows[0].with_images / imageStats.rows[0].total) * 100)}%)`);

  } catch (err) {
    console.error("❌ Enrichment failed:", err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    console.log("\n🎉 Medicine enrichment completed!");
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  enrichMedicines(limit);
}