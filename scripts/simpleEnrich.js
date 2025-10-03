// scripts/simpleEnrich.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import axios from "axios";
import { categoryKeywords } from "./categoryKeywords.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

console.log("🟢 Enhanced enrichment script starting...");

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

// Enhanced classification using your categoryKeywords.js
function classifyMedicine(med) {
  const text = `${med.name || ""} ${med.generic || ""} ${med.description || ""} ${med.symptoms || ""} ${med.composition || ""} ${med.route || ""}`.toLowerCase();
  
  let bestCategory = null;
  let bestScore = 0;
  
  // Score each category based on keyword matches
  for (const [slug, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    
    for (const keyword of keywords) {
      // Escape special regex characters
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundaries for more accurate matching
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
      
      if (regex.test(text)) {
        // Weight multi-word keywords higher (more specific)
        const wordCount = keyword.split(' ').length;
        score += wordCount;
        
        // Bonus points if found in name or generic (more important fields)
        const nameText = `${med.name || ""} ${med.generic || ""}`.toLowerCase();
        if (regex.test(nameText)) {
          score += 2;
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = slug;
    }
  }
  
  // Require at least score of 1 for classification
  if (bestScore >= 1 && categoryCache[bestCategory]) {
    return { category: categoryCache[bestCategory], score: bestScore };
  }
  
  // Fallback to uncategorized
  return { 
    category: categoryCache["uncategorized"] || categoryCache["other"] || { id: 1, name: "uncategorized" },
    score: 0
  };
}

// Simplified image fetching
async function getEnhancedImage(medicineName, genericName = null) {
  console.log(`🖼️  Fetching image for: ${medicineName}`);
  
  const names = [medicineName];
  if (genericName && genericName !== medicineName) {
    names.push(genericName);
  }
  
  for (const name of names) {
    // Clean the name
    const cleanName = name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!cleanName) continue;
    
    // Try RxNav RxImage API
    try {
      const url = `https://rxnav.nlm.nih.gov/REST/rximage?name=${encodeURIComponent(cleanName)}`;
      const response = await axios.get(url, { 
        timeout: 8000,
        headers: { 'User-Agent': 'MedicineApp/1.0' }
      });
      
      if (response.data && typeof response.data === 'string') {
        const imageMatch = response.data.match(/<imageUrl>(.*?)<\/imageUrl>/);
        if (imageMatch && imageMatch[1] && 
            !imageMatch[1].includes('No image') && 
            !imageMatch[1].includes('not available')) {
          console.log(`✅ Found image: ${imageMatch[1]}`);
          return imageMatch[1];
        }
      }
    } catch (err) {
      // Silently continue to next attempt
    }
  }
  
  console.log(`❌ No image found for ${medicineName}`);
  return null;
}

async function enrichMedicine(med) {
  console.log(`\n📦 Processing: ${med.name} (ID: ${med.id})`);
  
  try {
    // 1. Classify medicine
    console.log("🏷️  Classifying...");
    const classification = classifyMedicine(med);
    const category = classification.category;
    console.log(`📂 Category: ${category.name} (ID: ${category.id}, Score: ${classification.score})`);
    
    // 2. Get image if missing (only for medicines likely to have images)
    let image_url = med.image_url;
    if (!image_url && med.generic && classification.score > 0) {
      // Only try fetching images for classified medicines with generic names
      image_url = await getEnhancedImage(med.name, med.generic);
    }
    
    // 3. Set symptoms from description if missing
    let symptoms = med.symptoms;
    if (!symptoms && med.description) {
      // Extract first 250 chars as symptoms
      symptoms = med.description.substring(0, 250).trim();
      if (med.description.length > 250) symptoms += "...";
    }
    
    // 4. Check if we need to update
    const categoryChanged = category.id !== med.category;
    const imageChanged = image_url && image_url !== med.image_url;
    const symptomsChanged = symptoms && symptoms !== med.symptoms;
    
    const hasChanges = categoryChanged || imageChanged || symptomsChanged;
    
    if (hasChanges) {
      console.log("💾 Updating database...");
      
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (categoryChanged) {
        updates.push(`category = $${paramIndex++}`);
        values.push(category.id);
        console.log(`   • Category: ${med.category} → ${category.id}`);
      }
      
      if (imageChanged) {
        updates.push(`image_url = $${paramIndex++}`);
        values.push(image_url);
        console.log(`   • Image: Added`);
      }
      
      if (symptomsChanged) {
        updates.push(`symptoms = $${paramIndex++}`);
        values.push(symptoms);
        console.log(`   • Symptoms: Added from description`);
      }
      
      updates.push(`last_synced = NOW()`);
      values.push(med.id);
      
      await pool.query(
        `UPDATE medicines SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
      
      console.log(`✅ Updated: ${med.name} → ${category.name}`);
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
    console.log("🚀 Starting enhanced enrichment...");
    
    await loadCategories();
    
    console.log("\n🔍 Getting medicines to enrich...");
    const { rows: medicines } = await pool.query(`
      SELECT 
        id, name, generic, description, image_url, 
        category, symptoms, composition, route
      FROM medicines 
      WHERE 
        category = 1 
        OR category IS NULL 
        OR image_url IS NULL 
        OR symptoms IS NULL
      ORDER BY 
        CASE WHEN category = 1 OR category IS NULL THEN 0 ELSE 1 END,
        CASE WHEN image_url IS NULL THEN 0 ELSE 1 END,
        id
      LIMIT 50
    `);
    
    console.log(`📊 Found ${medicines.length} medicines to process\n`);
    
    if (medicines.length === 0) {
      console.log("✨ No medicines need enrichment!");
      return;
    }
    
    let successCount = 0;
    let categorizedCount = 0;
    let imagesAddedCount = 0;
    let symptomsAddedCount = 0;
    
    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      console.log(`\n[${'='.repeat(60)}]`);
      console.log(`[${i + 1}/${medicines.length}]`);
      
      const beforeCategory = med.category;
      const beforeImage = med.image_url;
      const beforeSymptoms = med.symptoms;
      
      const success = await enrichMedicine(med);
      
      if (success) {
        successCount++;
        
        // Track what changed
        const classification = classifyMedicine(med);
        if (classification.category.id !== beforeCategory) categorizedCount++;
        if (!beforeImage && classification.score > 0) {
          // We attempted image fetch for this one
        }
      }
      
      // Small delay between requests (only if fetching images)
      if (i < medicines.length - 1 && !med.image_url && med.generic) {
        console.log("⏳ Waiting 1.5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Enrichment Complete!`);
    console.log(`   • Total processed: ${medicines.length}`);
    console.log(`   • Successfully updated: ${successCount}`);
    console.log(`   • Newly categorized: ${categorizedCount}`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (err) {
    console.error("❌ Main error:", err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    console.log("🔚 Connection closed");
  }
}

main();