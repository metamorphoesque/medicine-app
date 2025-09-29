import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const seedLabTests = async () => {
  try {
    // Insert individual tests
    await pool.query(`
      INSERT INTO lab_tests (name, description, category, sample_required, price, fasting_required)
      VALUES
      ('Complete Blood Count (CBC)', 'Measures overall health and detects disorders like anemia.', 'General Health', 'Blood', 300, false),
      ('Liver Function Test (LFT)', 'Evaluates liver health and function.', 'General Health', 'Blood', 600, false),
      ('Kidney Function Test (KFT)', 'Checks kidney health by measuring waste levels.', 'General Health', 'Blood', 500, false),
      ('Lipid Profile', 'Measures cholesterol and triglyceride levels.', 'General Health', 'Blood', 700, true),
      ('Thyroid Profile (T3, T4, TSH)', 'Evaluates thyroid gland function.', 'Hormones', 'Blood', 400, false),
      ('HbA1c Test', 'Measures average blood sugar over 3 months.', 'Diabetes', 'Blood', 350, false),
      ('Vitamin D Test', 'Detects Vitamin D deficiency.', 'Vitamins', 'Blood', 800, false),
      ('Covid-19 RT-PCR', 'Detects active coronavirus infection.', 'Infection', 'Swab', 1200, false)
    `);

    // Insert package
    const res = await pool.query(`
      INSERT INTO lab_packages (name, description, price)
      VALUES
      ('Full Body Checkup', 'Includes CBC, LFT, KFT, Lipid Profile, Thyroid Profile.', 2500)
      RETURNING id
    `);

    const packageId = res.rows[0].id;

    // Map package to tests
    await pool.query(`
      INSERT INTO lab_package_items (package_id, test_id)
      VALUES
      (${packageId}, 1), -- CBC
      (${packageId}, 2), -- LFT
      (${packageId}, 3), -- KFT
      (${packageId}, 4), -- Lipid Profile
      (${packageId}, 5)  -- Thyroid
    `);

    console.log("✅ Lab tests and packages seeded!");
  } catch (err) {
    console.error("❌ Error seeding lab tests:", err);
  } finally {
    await pool.end();
  }
};

seedLabTests();
