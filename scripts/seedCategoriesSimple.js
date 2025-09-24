// scripts/seedCategories.js
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

// Define all categories + slugs (must match what seedMedicines.js looks for)
const categories = [
  // Antibiotics & Anti-infectives
  { name: "Penicillins", slug: "penicillins" },
  { name: "Cephalosporins", slug: "cephalosporins" },
  { name: "Macrolides", slug: "macrolides" },
  { name: "Tetracyclines", slug: "tetracyclines" },
  { name: "Fluoroquinolones", slug: "fluoroquinolones" },
  { name: "Glycopeptides", slug: "glycopeptides" },
  { name: "Antiprotozoals", slug: "antiprotozoals" },
  { name: "Antifungals", slug: "antifungals" },
  { name: "Antivirals", slug: "antivirals" },

  // Cardiovascular
  { name: "Calcium Channel Blockers", slug: "calcium-channel-blockers" },
  { name: "ACE Inhibitors", slug: "ace-inhibitors" },
  { name: "ARBs", slug: "arbs" },
  { name: "Beta Blockers", slug: "beta-blockers" },
  { name: "Diuretics", slug: "diuretics" },
  { name: "Statins", slug: "statins" },
  { name: "Anticoagulants", slug: "anticoagulants" },
  { name: "Antiplatelets", slug: "antiplatelets" },
  { name: "Antiarrhythmics", slug: "antiarrhythmics" },

  // Neurological & Psychiatric
  { name: "SSRI Antidepressants", slug: "ssri-antidepressants" },
  { name: "SNRI Antidepressants", slug: "snri-antidepressants" },
  { name: "Tricyclic Antidepressants", slug: "tricyclic-antidepressants" },
  { name: "Benzodiazepines", slug: "benzodiazepines" },
  { name: "Sleep Aids", slug: "sleep-aids" },
  { name: "Antipsychotics", slug: "antipsychotics" },
  { name: "Anticonvulsants", slug: "anticonvulsants" },
  { name: "Parkinson’s", slug: "parkinsons" },
  { name: "Dementia", slug: "dementia" },
  { name: "Migraine", slug: "migraine" },

  // Endocrine & Metabolic
  { name: "Antidiabetics", slug: "antidiabetics" },
  { name: "Insulin", slug: "insulin" },
  { name: "Thyroid", slug: "thyroid" },
  { name: "Corticosteroids", slug: "corticosteroids" },
  { name: "Hormones", slug: "hormones" },

  // Respiratory
  { name: "Bronchodilators", slug: "bronchodilators" },
  { name: "Inhaled Corticosteroids", slug: "inhaled-corticosteroids" },
  { name: "Leukotriene Modifiers", slug: "leukotriene-modifiers" },
  { name: "Antihistamines", slug: "antihistamines" },
  { name: "Cough & Cold", slug: "cough-cold" },

  // Gastrointestinal
  { name: "Proton Pump Inhibitors", slug: "proton-pump-inhibitors" },
  { name: "H2 Blockers", slug: "h2-blockers" },
  { name: "Antidiarrheals", slug: "antidiarrheals" },
  { name: "Laxatives", slug: "laxatives" },
  { name: "Antiemetics", slug: "antiemetics" },

  // Pain & Inflammation
  { name: "Opioid Analgesics", slug: "opioid-analgesics" },
  { name: "NSAIDs", slug: "nsaids" },
  { name: "Acetaminophen", slug: "acetaminophen" },
  { name: "Local Anesthetics", slug: "local-anesthetics" },

  // Genitourinary & Reproductive
  { name: "Erectile Dysfunction", slug: "erectile-dysfunction" },
  { name: "Prostate", slug: "prostate" },
  { name: "Contraceptives", slug: "contraceptives" },
  { name: "Urinary Tract", slug: "urinary-tract" },

  // Dermatological (Prescription)
  { name: "Prescription Acne", slug: "prescription-acne" },
  { name: "Topical Steroids", slug: "topical-steroids" },
  { name: "Topical Antibiotics", slug: "topical-antibiotics" },

  // OTC Vitamins & Supplements
  { name: "Vitamin A", slug: "vitamin-a" },
  { name: "Vitamin B", slug: "vitamin-b" },
  { name: "Vitamin C", slug: "vitamin-c" },
  { name: "Vitamin D", slug: "vitamin-d" },
  { name: "Vitamin E", slug: "vitamin-e" },
  { name: "Vitamin K", slug: "vitamin-k" },
  { name: "Multivitamins", slug: "multivitamins" },
  { name: "Minerals", slug: "minerals" },
  { name: "Omega-3", slug: "omega-3" },
  { name: "Probiotics", slug: "probiotics" },
  { name: "Protein Supplements", slug: "protein-supplements" },
  { name: "Sports Nutrition", slug: "sports-nutrition" },
  { name: "Herbal Supplements", slug: "herbal-supplements" },

  // OTC Personal Care
  { name: "Hair Care", slug: "hair-care" },
  { name: "Oral Care", slug: "oral-care" },
  { name: "Body Cleansers", slug: "body-cleansers" },
  { name: "Moisturizers", slug: "moisturizers" },
  { name: "Sun Protection", slug: "sun-protection" },
  { name: "Deodorants", slug: "deodorants" },

  // OTC Skin Care
  { name: "OTC Acne", slug: "otc-acne" },
  { name: "Anti-Aging", slug: "anti-aging" },
  { name: "Sensitive Skin", slug: "sensitive-skin" },
  { name: "Dry Skin Care", slug: "dry-skin-care" },

  // Wound Care
  { name: "Bandages", slug: "bandages" },
  { name: "Antiseptics", slug: "antiseptics" },
  { name: "Burn Care", slug: "burn-care" },
  { name: "Wound Healing", slug: "wound-healing" },

  // Baby & Child Care
  { name: "Diaper Care", slug: "diaper-care" },
  { name: "Baby Feeding", slug: "baby-feeding" },
  { name: "Baby Food", slug: "baby-food" },
  { name: "Baby Bath", slug: "baby-bath" },
  { name: "Baby Care", slug: "baby-care" },

  // Women's Health
  { name: "Feminine Care", slug: "feminine-care" },
  { name: "Pregnancy Care", slug: "pregnancy-care" },
  { name: "Menstrual Care", slug: "menstrual-care" },

  // Men’s Health
  { name: "Men's Health", slug: "mens-health" },
  { name: "Shaving", slug: "shaving" },
  { name: "Hair Growth", slug: "hair-growth" },

  // Eye & Ear Care
  { name: "Eye Drops", slug: "eye-drops" },
  { name: "Contact Care", slug: "contact-care" },
  { name: "Ear Care", slug: "ear-care" },

  // Digestive Health (OTC)
  { name: "Antacids", slug: "antacids" },
  { name: "Fiber Supplements", slug: "fiber-supplements" },
  { name: "Gas Relief", slug: "gas-relief" },

  // Sleep & Relaxation (OTC)
  { name: "Natural Sleep Aids", slug: "natural-sleep-aids" },
  { name: "Stress Relief", slug: "stress-relief" },

  // Medical Devices
  { name: "Thermometers", slug: "thermometers" },
  { name: "Blood Pressure Monitors", slug: "blood-pressure" },
  { name: "Diabetic Supplies", slug: "diabetic-supplies" },
  { name: "Mobility Aids", slug: "mobility-aids" },
  { name: "Compression Wear", slug: "compression-wear" },

  // Specialty / Dosage Form
  { name: "Injectables", slug: "injectables" },
  { name: "Inhalers", slug: "inhalers" },
  { name: "Suppositories", slug: "suppositories" },
  { name: "Patches", slug: "patches" },
  { name: "Prescription Eye Drops", slug: "prescription-eye-drops" },
  { name: "Prescription Ear Drops", slug: "prescription-ear-drops" },
  { name: "Topical Medications", slug: "topical-medications" },
  { name: "Oral Medications", slug: "oral-medications" },
  { name: "Liquid Medications", slug: "liquid-medications" },

  // Fallbacks
  { name: "Other", slug: "other" },
  { name: "Uncategorized", slug: "uncategorized" },
];

async function seedCategories() {
  console.log("🌱 Seeding categories...");

  for (const cat of categories) {
    try {
      await pool.query(
        `INSERT INTO categories (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug]
      );
      console.log(`✅ Inserted category: ${cat.name}`);
    } catch (err) {
      console.error(`❌ Error inserting category ${cat.name}:`, err.message);
    }
  }

  console.log("🌱 Category seeding complete!");
  await pool.end();
}

seedCategories();
