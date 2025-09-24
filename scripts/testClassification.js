// Test script to verify medicine classification logic
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Load categories into cache
let categoryCache = {};

async function loadCategories() {
  const res = await pool.query("SELECT id, slug FROM categories");
  categoryCache = {};
  for (const row of res.rows) {
    categoryCache[row.slug] = row.id;
  }
  console.log(`✅ Loaded ${res.rows.length} categories`);
}

// Simplified classification function for testing
function testClassifyMedicine(med) {
  const text = `${med.name || ""} ${med.generic || ""} ${med.substance_name || ""} ${med.description || ""}`.toLowerCase();
  
  console.log(`\n🔍 Testing: "${med.name}"`);
  console.log(`   Search text: "${text}"`);
  
  // Test specific patterns
  if (text.match(/naproxen/)) {
    console.log(`   → Should match NSAIDs: ${!!categoryCache["nsaids"]}`);
    return categoryCache["nsaids"];
  }
  
  if (text.match(/eye.drops|artificial.tears|lubricating.tears|redness.relief/)) {
    console.log(`   → Should match eye drops: ${!!categoryCache["eye-drops"]}`);
    return categoryCache["eye-drops"];
  }
  
  if (text.match(/deodorant|antiperspirant/)) {
    console.log(`   → Should match deodorants: ${!!categoryCache["deodorants"]}`);
    return categoryCache["deodorants"];
  }
  
  if (text.match(/cold|flu|cough/)) {
    console.log(`   → Should match cough-cold: ${!!categoryCache["cough-cold"]}`);
    return categoryCache["cough-cold"];
  }
  
  console.log(`   → No specific match, using fallback`);
  return categoryCache["other"] || Object.values(categoryCache)[0];
}

// Test cases based on your output
const testMedicines = [
  {
    name: "Naproxen",
    generic: "Naproxen",
    substance_name: "Naproxen",
    description: "Anti-inflammatory pain reliever"
  },
  {
    name: "Foster and Thrive Lubricating Tears Lubricant Eye Drops",
    generic: null,
    substance_name: "Polyethylene Glycol",
    description: "Lubricating eye drops for dry eyes"
  },
  {
    name: "Foster and Thrive Redness Relief Eye Drops",
    generic: null,
    substance_name: "Tetrahydrozoline",
    description: "Eye drops for redness relief"
  },
  {
    name: "Power Stick For Her Roll- On Antiperspirant Deodorant Powder Fresh",
    generic: null,
    substance_name: "Aluminum chlorohydrate",
    description: "Antiperspirant deodorant"
  },
  {
    name: "Daytime Cold and Flu",
    generic: null,
    substance_name: "Acetaminophen, Dextromethorphan",
    description: "Cold and flu relief"
  }
];

async function runTests() {
  try {
    await loadCategories();
    
    console.log("🧪 Testing medicine classification...\n");
    
    for (const med of testMedicines) {
      const categoryId = testClassifyMedicine(med);
      const categorySlug = Object.keys(categoryCache).find(key => categoryCache[key] === categoryId);
      console.log(`   ✅ Result: ${categorySlug} (ID: ${categoryId})`);
    }
    
    console.log("\n📋 Available categories that might be relevant:");
    const relevantCategories = [
      "nsaids", "eye-drops", "deodorants", "cough-cold", 
      "acetaminophen", "topical-medications", "other"
    ];
    
    relevantCategories.forEach(slug => {
      const exists = categoryCache[slug] ? "✅" : "❌";
      console.log(`   ${exists} ${slug}: ${categoryCache[slug] || "NOT FOUND"}`);
    });
    
  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    await pool.end();
  }
}

// Run the tests
runTests();