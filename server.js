import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const app = express();
const PORT = 5000;

// ---------------------- MIDDLEWARE ----------------------
app.use(bodyParser.json());
app.use(cors());

// ---------------------- DATABASE ----------------------
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "medicineapp",
  password: "DauphinII", // ⚠️ move to .env in production
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) console.error("DB connection error:", err.stack);
  else {
    console.log("Connected to PostgreSQL database");
    release();
  }
});

// ---------------------- USER AUTH ----------------------
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (exists.rows.length) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email",
      [username, email, hash]
    );
    res.status(201).json({ message: "User registered", userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (!result.rows.length) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({ message: "Login successful", userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- CATEGORIES ----------------------
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.slug, COUNT(m.id) AS medicine_count
      FROM categories c
      LEFT JOIN medicines m ON m.category = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- MEDICINES ----------------------
app.post("/medicines", async (req, res) => {
  try {
    const { name, composition, description, manufacturer_name, image_url, generic, category } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    const catId =
      category ||
      (await pool.query("SELECT id FROM categories WHERE slug='uncategorized'")).rows[0]?.id ||
      1;

    const result = await pool.query(
      `INSERT INTO medicines 
       (name,generic,manufacturer_name,description,composition,image_url,category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        name,
        generic || null,
        manufacturer_name || null,
        description || null,
        composition || null,
        image_url || null,
        catId,
      ]
    );

    res.status(201).json({ message: "Medicine added", medicine: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/medicines", async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let params = [];
    let conditions = [];
    let paramIndex = 1;

    let query = `
      SELECT m.*, 
             COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name,
             c.name as category_name, 
             c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
    `;

    if (search) {
      conditions.push(`(
        m.name ILIKE $${paramIndex} OR 
        m.generic ILIKE $${paramIndex} OR 
        m.composition ILIKE $${paramIndex} OR
        m.description ILIKE $${paramIndex} OR 
        m.symptoms ILIKE $${paramIndex} OR 
        m.manufacturer_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY m.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

app.get("/medicines/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT m.*, COALESCE(m.manufacturer_name,m.generic,'Unknown') as manufacturer_name,
      c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE m.id=$1
    `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- CATEGORY KEYWORDS ----------------------
const categoryKeywords = {
  "beta-blockers": ["atenolol", "metoprolol", "bisoprolol", "hypertension"],
  "ace-inhibitors": ["enalapril", "lisinopril", "captopril", "hypertension"],
  "statins": ["atorvastatin", "simvastatin", "rosuvastatin", "cholesterol"],
  // ... keep your full mapping
};

const frontendCategoryMapping = {
  "heart-blood-pressure-care": ["beta-blockers", "ace-inhibitors", "statins"],
  "diabetes-care": ["antidiabetics", "insulin"],
  // ... keep your full mapping
};

// ---------------------- MEDICINES BY CATEGORY ----------------------
app.get("/medicines/category/:categorySlug", async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { page = 1, limit = 20, sortBy = "name" } = req.query;
    const offset = (page - 1) * limit;

    const keywordCategories = frontendCategoryMapping[categorySlug];
    if (!keywordCategories) {
      return res.status(404).json({ error: "Category not found" });
    }

    const allKeywords = [];
    keywordCategories.forEach((categoryKey) => {
      if (categoryKeywords[categoryKey]) {
        allKeywords.push(...categoryKeywords[categoryKey]);
      }
    });

    if (allKeywords.length === 0) {
      return res.json({
        medicines: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0 },
      });
    }

    const searchConditions = allKeywords
      .map(
        (_, index) =>
          `(m.name ILIKE $${index + 1} OR m.generic ILIKE $${index + 1} OR m.composition ILIKE $${index + 1} OR m.description ILIKE $${index + 1} OR m.symptoms ILIKE $${index + 1} OR m.manufacturer_name ILIKE $${index + 1})`
      )
      .join(" OR ");

    const keywordParams = allKeywords.map((k) => `%${k}%`);

    // Count
    const countQuery = `
      SELECT COUNT(DISTINCT m.id) as total 
      FROM medicines m 
      WHERE ${searchConditions}
    `;
    const countResult = await pool.query(countQuery, keywordParams);
    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    // Sorting
    let orderBy = "m.name ASC";
    if (sortBy === "rating") orderBy = "COALESCE(m.rating, 0) DESC, m.name ASC";
    else if (sortBy === "price") orderBy = "COALESCE(m.price, 0) ASC, m.name ASC";

    // Medicines query
    const medicinesQuery = `
      SELECT DISTINCT ON (m.id)
             m.*, 
             COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name,
             c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE ${searchConditions}
      ORDER BY m.id, ${orderBy}
      LIMIT $${keywordParams.length + 1} OFFSET $${keywordParams.length + 2}
    `;

    const medicinesResult = await pool.query(medicinesQuery, [...keywordParams, limit, offset]);

    res.json({
      medicines: medicinesResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      category: { name: categorySlug.replace(/-/g, " "), slug: categorySlug },
    });
  } catch (err) {
    console.error("Error in medicines/category endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- ROOT ----------------------
app.get("/", (req, res) => {
  res.send("Medicine App Server is running!");
});

// ---------------------- START SERVER ----------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
