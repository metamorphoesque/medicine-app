// scripts/simpleEnrich.js
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

console.log("🟢 Simple enrichment script starting...");

// Category cache
let categoryCache = {};

async function loadCategories() {
  console.log("📂 Loading categories...");
  const res = await pool.query("SELECT id, slug, name FROM categories");
  categoryCache = {};
  for (const row of res.rows) {
    categoryCache[row.slug] = { id: row.id, name: row.name };
  }
  console.log(`✅ Loaded ${Object.keys(categoryCache).length} categories`);
}

// Enhanced classification with more rules
function classifyMedicine(med) {
  const text = `${med.name || ""} ${med.generic || ""} ${med.description || ""}`.toLowerCase();
  
  // Pain relief & NSAIDs
  if (text.match(/acetaminophen|tylenol|paracetamol/)) 
    return categoryCache["nsaids"] || categoryCache["other"];
  if (text.match(/ibuprofen|advil|motrin|brufen/)) 
    return categoryCache["nsaids"] || categoryCache["other"];
  if (text.match(/naproxen|aleve/)) 
    return categoryCache["nsaids"] || categoryCache["other"];
  if (text.match(/aspirin|acetylsalicylic/)) 
    return categoryCache["nsaids"] || categoryCache["other"];
  if (text.match(/diclofenac|voltaren/)) 
    return categoryCache["nsaids"] || categoryCache["other"];
    
  // Diabetes
  if (text.match(/metformin|glucophage/)) 
    return categoryCache["antidiabetics"] || categoryCache["other"];
  if (text.match(/glimepiride|amaryl|diabetes|blood.*sugar/)) 
    return categoryCache["antidiabetics"] || categoryCache["other"];
  if (text.match(/insulin|lantus|humalog/)) 
    return categoryCache["insulin"] || categoryCache["other"];
    
  // Cardiovascular
  if (text.match(/atenolol|metoprolol|propranolol|beta.*blocker/)) 
    return categoryCache["beta-blockers"] || categoryCache["other"];
  if (text.match(/lisinopril|enalapril|ace.*inhibitor/)) 
    return categoryCache["ace-inhibitors"] || categoryCache["other"];
  if (text.match(/amlodipine|nifedipine|calcium.*channel/)) 
    return categoryCache["calcium-channel-blockers"] || categoryCache["other"];
  if (text.match(/atorvastatin|simvastatin|statin|cholesterol/)) 
    return categoryCache["statins"] || categoryCache["other"];
    
  // Mental Health
  if (text.match(/fluoxetine|prozac|sertraline|zoloft|depression|ssri/)) 
    return categoryCache["ssri-antidepressants"] || categoryCache["other"];
  if (text.match(/diazepam|lorazepam|alprazolam|valium|xanax|anxiety/)) 
    return categoryCache["benzodiazepines"] || categoryCache["other"];
    
  // Respiratory
  if (text.match(/albuterol|salbutamol|ventolin|asthma|bronchodilator/)) 
    return categoryCache["bronchodilators"] || categoryCache["other"];
  if (text.match(/cetirizine|loratadine|zyrtec|claritin|allergy/)) 
    return categoryCache["antihistamines"] || categoryCache["other"];
    
  // Digestive
  if (text.match(/omeprazole|esomeprazole|prilosec|nexium|acid.*reflux|gerd/)) 
    return categoryCache["proton-pump-inhibitors"] || categoryCache["other"];
  if (text.match(/loperamide|imodium|diarrhea/)) 
    return categoryCache["antidiarrheals"] || categoryCache["other"];
    
  // Skin & Topical
  if (text.match(/hydrocortisone|betamethasone|steroid.*cream|eczema/)) 
    return categoryCache["topical-steroids"] || categoryCache["other"];
  if (text.match(/benzoyl.*peroxide|salicylic.*acid|acne|pimple/)) 
    return categoryCache["otc-acne"] || categoryCache["other"];
  if (text.match(/sunscreen|spf|sun.*protection/)) 
    return categoryCache["spf-sunscreen"] || categoryCache["other"];
    
  // Personal Care
  if (text.match(/sanitizer|alcohol.*hand|benzalkonium|disinfect/)) 
    return categoryCache["sanitizer"] || categoryCache["other"];
  if (text.match(/toothpaste|fluoride|dental|oral.*care/)) 
    return categoryCache["dental-care"] || categoryCache["other"];
  if (text.match(/deodorant|antiperspirant/)) 
    return categoryCache["deodorants"] || categoryCache["other"];
  if (text.match(/eye.*drops|artificial.*tears/)) 
    return categoryCache["eye-drops"] || categoryCache["other"];
    
  // Anti-itch & skin irritation
  if (text.match(/anti.*itch|calamine|itch|rash/)) 
    return categoryCache["sensitive-skin"] || categoryCache["other"];
    
  // Muscle relaxants
  if (text.match(/methocarbamol|cyclobenzaprine|muscle.*relax/)) 
    return categoryCache["other"]; // No specific category, use other
    
  // Antibiotics (general)
  if (text.match(/amoxicillin|penicillin|antibiotic|cephalexin/)) 
    return categoryCache["other"];
    
  // Antiseptic
  if (text.match(/betadine|iodine|antiseptic|wound.*care/)) 
    return categoryCache["other"];
  
  // Default
  return categoryCache["uncategorized"] || { id: 1, name: "uncategorized" };
}

// Enhanced image fetching with multiple sources and better name cleaning
async function getEnhancedImage(medicineName) {
  console.log(`🖼️  Fetching image for: ${medicineName}`);
  
  // Clean and normalize the medicine name
  const cleanName = medicineName
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .toLowerCase();
    
  const variations = [
    cleanName,
    cleanName.split(' ')[0], // First word only
    medicineName.trim() // Original name
  ];
  
  // Method 1: Try RxNav with different name variations
  for (const nameVar of variations) {
    try {
      const url = `https://rxnav.nlm.nih.gov/REST/rximage?name=${encodeURIComponent(nameVar)}`;
      console.log(`🔗 Trying RxNav: ${nameVar}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'MedicineApp/1.0' }
      });
      
      if (response.data && typeof response.data === 'string' && response.data.includes('<imageUrl>')) {
        const imageMatch = response.data.match(/<imageUrl>(.*?)<\/imageUrl>/);
        if (imageMatch && imageMatch[1] && !imageMatch[1].includes('No image')) {
          console.log(`✅ Found RxNav image: ${imageMatch[1]}`);
          return imageMatch[1];
        }
      }
    } catch (err) {
      console.log(`❌ RxNav failed for "${nameVar}": ${err.message}`);
    }
  }
  
  // Method 2: Try NIH RxImage API
  try {
    const url = `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?resolution=600&name=${encodeURIComponent(cleanName)}`;
    console.log(`🔗 Trying NIH RxImage: ${cleanName}`);
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'MedicineApp/1.0' }
    });
    
    if (response.data && response.data.nlmRxImages && response.data.nlmRxImages.length > 0) {
      const imageUrl = response.data.nlmRxImages[0].imageUrl;
      console.log(`✅ Found NIH image: ${imageUrl}`);
      return imageUrl;
    }
  } catch (err) {
    console.log(`❌ NIH RxImage failed: ${err.message}`);
  }
  
  // Method 3: Try OpenFDA for brand name lookup then image
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(medicineName)}"&limit=1`;
    console.log(`🔗 Trying OpenFDA: ${medicineName}`);
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: { 'User-Agent': 'MedicineApp/1.0' }
    });
    
    const drug = response.data?.results?.[0];
    if (drug && drug.openfda?.generic_name?.[0]) {
      const genericName = drug.openfda.generic_name[0];
      console.log(`🔗 Found generic via FDA: ${genericName}, trying RxNav again...`);
      
      // Try RxNav with the generic name
      const rxUrl = `https://rxnav.nlm.nih.gov/REST/rximage?name=${encodeURIComponent(genericName)}`;
      const rxResponse = await axios.get(rxUrl, { 
        timeout: 8000,
        headers: { 'User-Agent': 'MedicineApp/1.0' }
      });
      
      if (rxResponse.data && typeof rxResponse.data === 'string' && rxResponse.data.includes('<imageUrl>')) {
        const imageMatch = rxResponse.data.match(/<imageUrl>(.*?)<\/imageUrl>/);
        if (imageMatch && imageMatch[1]) {
          console.log(`✅ Found image via FDA->RxNav: ${imageMatch[1]}`);
          return imageMatch[1];
        }
      }
    }
  } catch (err) {
    console.log(`❌ OpenFDA approach failed: ${err.message}`);
  }
  
  console.log(`❌ No image found for ${medicineName}`);
  return null;
}

async function enrichMedicine(med) {
  console.log(`\n📦 Processing: ${med.name} (ID: ${med.id})`);
  
  try {
    // 1. Classify medicine
    console.log("🏷️  Classifying...");
    const category = classifyMedicine(med);
    console.log(`📂 Category: ${category.name} (${category.id})`);
    
    // 2. Get image (increased chance since classification is working)
    let image_url = med.image_url;
    if (!image_url && Math.random() < 0.5) { // 50% chance for testing
      image_url = await getEnhancedImage(med.name);
    }
    
    // 3. Set symptoms from description if missing
    let symptoms = med.symptoms || med.description || null;
    
    // 4. Update database
    const hasChanges = 
      category.id !== med.category ||
      image_url !== med.image_url ||
      symptoms !== med.symptoms;
    
    if (hasChanges) {
      console.log("💾 Updating database...");
      await pool.query(
        `UPDATE medicines 
         SET category = $1, image_url = $2, symptoms = $3, last_synced = NOW()
         WHERE id = $4`,
        [category.id, image_url, symptoms, med.id]
      );
      
      console.log(`✅ Updated: ${med.name} -> ${category.name}${image_url ? " (with image)" : ""}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed for: ${med.name}`);
      return false;
    }
    
  } catch (err) {
    console.error(`❌ Error processing ${med.name}: ${err.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log("🚀 Starting simple enrichment...");
    
    // Load categories
    await loadCategories();
    
    // Get medicines to process - focus on uncategorized first
    console.log("🔍 Getting medicines to enrich...");
    const { rows: medicines } = await pool.query(`
      SELECT id, name, generic, description, image_url, category, symptoms
      FROM medicines 
      WHERE category = 1 OR image_url IS NULL
      ORDER BY 
        CASE WHEN category = 1 THEN 0 ELSE 1 END,
        CASE WHEN image_url IS NULL THEN 0 ELSE 1 END,
        id
      LIMIT 25
    `);
    
    console.log(`📊 Found ${medicines.length} medicines to process`);
    
    if (medicines.length === 0) {
      console.log("✨ No medicines need enrichment!");
      return;
    }
    
    let successCount = 0;
    
    // Process each medicine
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      console.log(`\n[${i + 1}/${medicines.length}]`);
      
      const success = await enrichMedicine(med);
      if (success) successCount++;
      
      // Small delay between requests
      if (i < medicines.length - 1) {
        console.log("⏳ Waiting 2 seconds...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Completed! Successfully updated ${successCount}/${medicines.length} medicines`);
    
  } catch (err) {
    console.error("❌ Main error:", err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    console.log("🔚 Connection closed");
  }
}

// Run the script
main();