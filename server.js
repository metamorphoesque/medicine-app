import dotenv from 'dotenv';
dotenv.config(); 

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import pkg from "pg";
import { categoryKeywords } from "./categories.js";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------- ENHANCED CORS CONFIGURATION ----------------------

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL 
].filter(Boolean); 

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); 
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ---------------------- MIDDLEWARE ----------------------
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.query);
  next();
});

// ---------------------- DATABASE CONFIGURATION ----------------------

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export default pool;

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error(" DB connection error:", err.stack);
    console.error("Check your .env file and database credentials");
  } else {
    console.log(" Connected to PostgreSQL database");
    console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`Database: ${process.env.DB_NAME || 'from DATABASE_URL'}`);
    release();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
  });
});

// ---------------------- HELPER FUNCTIONS ----------------------
const categoryMapping = {
  "heart-blood-pressure": ["beta-blockers", "ace-inhibitors", "arbs", "diuretics", "statins", "anticoagulants", "antiarrhythmics", "calcium-channel-blockers"],
  "heart-blood-pressure-care": ["beta-blockers", "ace-inhibitors", "arbs", "diuretics", "statins", "anticoagulants", "antiarrhythmics", "calcium-channel-blockers"],
  "diabetes-care": ["antidiabetics", "insulin", "diabetic-supplies"],
  "respiratory-care": ["bronchodilators", "inhaled-corticosteroids", "antihistamines", "leukotriene-modifiers", "cough-cold"],
  "mental-health": ["ssri-antidepressants", "snri-antidepressants", "tricyclic-antidepressants", "benzodiazepines", "antipsychotics", "sleep-aids"],
  "mental-neurological-care": ["ssri-antidepressants", "snri-antidepressants", "tricyclic-antidepressants", "benzodiazepines", "antipsychotics", "anticonvulsants", "migraine", "sleep-aids"],
  "digestive-health": ["proton-pump-inhibitors", "h2-blockers", "laxatives", "antidiarrheals", "antiemetics", "gas-relief"],
  "digestive-care": ["proton-pump-inhibitors", "h2-blockers", "laxatives", "antidiarrheals", "antiemetics", "gas-relief"],
  "allergy-care": ["antihistamines", "leukotriene-modifiers", "inhaled-corticosteroids"],
  "dental-care": ["dental-care"],
  "eye-care": ["eye-drops", "contact-care"],
  "eye-ear-care": ["eye-drops", "contact-care", "ear-care"],
  "ear-care": ["ear-care"],
  "skin-care": ["otc-acne", "prescription-acne", "topical-steroids", "anti-aging", "spf-sunscreen", "cleansers", "toners", "exfoliants", "hydration", "sensitive-skin", "dry-skin-care"],
  "dermal-care": ["otc-acne", "prescription-acne", "topical-steroids", "anti-aging", "spf-sunscreen", "cleansers", "toners", "exfoliants", "hydration", "sensitive-skin", "dry-skin-care"],
  "baby-care": ["baby-care"],
  "pain-relief": ["nsaids", "opioid-analgesics", "acetaminophen", "local-anesthetics"],
  "bone-joint-care": ["osteoporosis", "joint-muscle"],
  "womens-health": ["feminine-care", "pregnancy-care", "menstrual-care"],
  "mens-health": ["mens-health"],
  "vitamins-supplements": ["vitamin-a", "vitamin-b", "vitamin-c", "vitamin-d", "vitamin-e", "vitamin-k", "multivitamins", "minerals", "omega-3", "probiotics", "protein-supplements", "sports-nutrition", "herbal-supplements"],
  "personal-hygiene": ["deodorants", "Sanitizer"],
  "medical-devices": ["thermometers", "blood-pressure", "diabetic-supplies", "mobility-aids", "compression-wear"]
};

function getKeywordsForCategory(categorySlug) {
  const subcategories = categoryMapping[categorySlug] || [];
  let allKeywords = [];
  
  subcategories.forEach(subcat => {
    if (categoryKeywords[subcat]) {
      allKeywords = [...allKeywords, ...categoryKeywords[subcat]];
    }
  });
  
  return allKeywords;
}

function buildCategorySearchQuery(keywords) {
  if (!keywords.length) return { query: "", params: [] };
  
  const conditions = keywords.map((_, index) => 
    `(m.name ILIKE $${index + 1} OR m.generic ILIKE $${index + 1} OR m.composition ILIKE $${index + 1} OR m.description ILIKE $${index + 1} OR m.symptoms ILIKE $${index + 1} OR m.manufacturer_name ILIKE $${index + 1})`
  );
  
  return {
    query: ` AND (${conditions.join(" OR ")})`,
    params: keywords.map(keyword => `%${keyword}%`)
  };
}

// ---------------------- USER AUTH ----------------------

app.post("/api/register/buyer", async (req, res) => {
  try {
    const { username, email, password, fullName, dateOfBirth } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (exists.rows.length) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if (dateOfBirth) {
      const today = new Date();
      const birth = new Date(dateOfBirth);
      const age = today.getFullYear() - birth.getFullYear();
      if (age < 18) {
        return res.status(400).json({ error: "You must be 18 or older to register" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
      
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, user_role, full_name, date_of_birth) 
       VALUES ($1, $2, $3, 'buyer', $4, $5) 
       RETURNING id, username, email, user_role`,
      [username, email, hash, fullName || null, dateOfBirth || null]
    );

    res.status(201).json({ 
      message: "Buyer registered successfully", 
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Buyer registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register/seller", async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      businessName, 
      licenseNumber,
      gstin,
      address,
      phone 
    } = req.body;
    
    if (!username || !email || !password || !businessName || !licenseNumber) {
      return res.status(400).json({ 
        error: "Username, email, password, business name, and license number are required" 
      });
    }

    const exists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (exists.rows.length) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const sellerResult = await client.query(
        `INSERT INTO sellers (name, business_name, license_number, gstin, address, phone, email, verification_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
         RETURNING id`,
        [businessName, businessName, licenseNumber, gstin || null, address || null, phone || null, email]
      );
      
      const sellerId = sellerResult.rows[0].id;
      
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, user_role, seller_id) 
         VALUES ($1, $2, $3, 'seller', $4) 
         RETURNING id, username, email, user_role, seller_id`,
        [username, email, hash, sellerId]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        message: "Seller registered successfully. Your account is pending verification.", 
        user: userResult.rows[0],
        sellerStatus: 'pending'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Seller registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query(`
      SELECT u.*, s.verification_status as seller_verification_status,
             s.business_name, s.id as seller_id_from_table
      FROM users u
      LEFT JOIN sellers s ON u.seller_id = s.id
      WHERE u.email = $1
    `, [email]);

    if (!result.rows.length) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = result.rows[0];
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({ 
      message: "Login successful", 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.user_role,
        sellerId: user.seller_id || user.seller_id_from_table,
        businessName: user.business_name,
        verificationStatus: user.seller_verification_status || 'pending'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/seller/status/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const result = await pool.query(`
      SELECT verification_status, business_name, license_number, created_at, verified_at
      FROM sellers
      WHERE id = $1
    `, [sellerId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Seller not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching seller status:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- SELLER INVENTORY MANAGEMENT ----------------------

app.get("/api/seller/:sellerId/inventory", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sm.id, sm.price, sm.stock, sm.created_at, sm.updated_at,
             m.id as medicine_id, m.name, m.generic, m.composition, 
             m.manufacturer_name, m.image_url, m.prescription_required,
             c.name as category_name
      FROM seller_medicines sm
      JOIN medicines m ON sm.medicine_id = m.id
      LEFT JOIN categories c ON m.category = c.id
      WHERE sm.seller_id = $1
    `;
    const params = [sellerId];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      query += ` AND (m.name ILIKE $${params.length} OR m.generic ILIKE $${params.length})`;
    }

    query += ` ORDER BY sm.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM seller_medicines sm
      JOIN medicines m ON sm.medicine_id = m.id
      WHERE sm.seller_id = $1
    `;
    const countParams = [sellerId];

    if (search && search.trim() !== '') {
      countParams.push(`%${search.trim()}%`);
      countQuery += ` AND (m.name ILIKE $${countParams.length} OR m.generic ILIKE $${countParams.length})`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      inventory: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error fetching seller inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/seller/:sellerId/inventory", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { medicine_id, price, stock } = req.body;

    if (!medicine_id || price === undefined || stock === undefined) {
      return res.status(400).json({ 
        error: "medicine_id, price, and stock are required" 
      });
    }

    const existing = await pool.query(
      "SELECT * FROM seller_medicines WHERE seller_id = $1 AND medicine_id = $2",
      [sellerId, medicine_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: "This medicine is already in your inventory" 
      });
    }

    const result = await pool.query(
      `INSERT INTO seller_medicines (seller_id, medicine_id, price, stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [sellerId, medicine_id, price, stock]
    );

    res.status(201).json({
      message: "Medicine added to inventory",
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding to inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/seller/:sellerId/inventory/:itemId", async (req, res) => {
  try {
    const { sellerId, itemId } = req.params;
    const { price, stock } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (price !== undefined) {
      updates.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }

    if (stock !== undefined) {
      updates.push(`stock = $${paramCount}`);
      values.push(stock);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sellerId, itemId);

    const query = `
      UPDATE seller_medicines 
      SET ${updates.join(', ')}
      WHERE seller_id = $${paramCount} AND id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json({
      message: "Inventory updated",
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/seller/:sellerId/inventory/:itemId", async (req, res) => {
  try {
    const { sellerId, itemId } = req.params;

    const result = await pool.query(
      "DELETE FROM seller_medicines WHERE seller_id = $1 AND id = $2 RETURNING *",
      [sellerId, itemId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json({ message: "Item removed from inventory" });
  } catch (err) {
    console.error('Error deleting from inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/seller/:sellerId/search-medicines", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!search || search.trim() === '') {
      return res.json({ medicines: [], pagination: { totalItems: 0 } });
    }

    const searchParam = `%${search.trim()}%`;
    
    const query = `
      SELECT m.*, c.name as category_name,
             COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE (m.name ILIKE $1 OR m.generic ILIKE $1 OR m.composition ILIKE $1)
      AND m.id NOT IN (
        SELECT medicine_id FROM seller_medicines WHERE seller_id = $2
      )
      ORDER BY m.name ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [searchParam, sellerId, parseInt(limit), offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM medicines m
      WHERE (m.name ILIKE $1 OR m.generic ILIKE $1 OR m.composition ILIKE $1)
      AND m.id NOT IN (
        SELECT medicine_id FROM seller_medicines WHERE seller_id = $2
      )
    `;

    const countResult = await pool.query(countQuery, [searchParam, sellerId]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      medicines: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error searching medicines:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/seller/:sellerId/stats", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const productsResult = await pool.query(
      "SELECT COUNT(*) as total FROM seller_medicines WHERE seller_id = $1",
      [sellerId]
    );

    const lowStockResult = await pool.query(
      "SELECT COUNT(*) as total FROM seller_medicines WHERE seller_id = $1 AND stock < 10",
      [sellerId]
    );

    const outOfStockResult = await pool.query(
      "SELECT COUNT(*) as total FROM seller_medicines WHERE seller_id = $1 AND stock = 0",
      [sellerId]
    );

    res.json({
      totalProducts: parseInt(productsResult.rows[0].total),
      lowStock: parseInt(lowStockResult.rows[0].total),
      outOfStock: parseInt(outOfStockResult.rows[0].total),
      totalOrders: 0,
      pendingOrders: 0,
      revenue: 0
    });
  } catch (err) {
    console.error('Error fetching seller stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- CATEGORIES ----------------------
app.get("/api/categories", async (req, res) => {
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

app.get("/api/category-buttons", async (req, res) => {
  try {
    const buttons = Object.keys(categoryMapping).map(slug => ({
      slug,
      name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & '),
      subcategories: categoryMapping[slug].length
    }));
    
    res.json(buttons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- MEDICINES ----------------------
app.post("/api/medicines", async (req, res) => {
  try {
    const { name, composition, description, manufacturer_name, image_url, generic, category } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    const catId = category || (await pool.query("SELECT id FROM categories WHERE slug='uncategorized'")).rows[0]?.id || 1;

    const result = await pool.query(
      `INSERT INTO medicines 
       (name,generic,manufacturer_name,description,composition,image_url,category)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, generic || null, manufacturer_name || null, description || null, composition || null, image_url || null, catId]
    );

    res.status(201).json({ message: "Medicine added", medicine: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines", async (req, res) => {
  try {
    const { search, page = 1, limit = 20, category: categorySlug } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT m.*, COALESCE(m.manufacturer_name,m.generic,'Unknown') as manufacturer_name,
      c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE 1=1
    `;
    let params = [];

    if (categorySlug && categorySlug !== 'all' && categorySlug !== '') {
      const keywords = getKeywordsForCategory(categorySlug);
      
      if (keywords.length > 0) {
        const categorySearch = buildCategorySearchQuery(keywords);
        query += categorySearch.query;
        params = [...params, ...categorySearch.params];
      }
    }

    if (search && search.trim() !== '') {
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam);
      query += ` AND (
        m.name ILIKE $${params.length} OR m.generic ILIKE $${params.length} OR 
        m.composition ILIKE $${params.length} OR m.description ILIKE $${params.length} OR 
        m.symptoms ILIKE $${params.length} OR m.manufacturer_name ILIKE $${params.length}
      )`;
    }

    query += ` ORDER BY m.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const medicinesResult = await pool.query(query, params);
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE 1=1
    `;
    let countParams = [];

    if (categorySlug && categorySlug !== 'all' && categorySlug !== '') {
      const keywords = getKeywordsForCategory(categorySlug);
      if (keywords.length > 0) {
        const categorySearch = buildCategorySearchQuery(keywords);
        countQuery += categorySearch.query;
        countParams = [...countParams, ...categorySearch.params];
      }
    }

    if (search && search.trim() !== '') {
      const searchParam = `%${search.trim()}%`;
      countParams.push(searchParam);
      countQuery += ` AND (
        m.name ILIKE $${countParams.length} OR m.generic ILIKE $${countParams.length} OR 
        m.composition ILIKE $${countParams.length} OR m.description ILIKE $${countParams.length} OR 
        m.symptoms ILIKE $${countParams.length} OR m.manufacturer_name ILIKE $${countParams.length}
      )`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({ 
      medicines: medicinesResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error in /api/medicines:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines/:id/similar", async (req, res) => {
  try {
    const medicineId = req.params.id;
    
    const medicineResult = await pool.query(`
      SELECT symptoms, composition, generic, category
      FROM medicines
      WHERE id = $1
    `, [medicineId]);

    if (!medicineResult.rows.length) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    const currentMedicine = medicineResult.rows[0];
    
    let query = `
      SELECT m.*, COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name,
             c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE m.id != $1
    `;
    const params = [medicineId];
    const conditions = [];

    if (currentMedicine.symptoms) {
      params.push(`%${currentMedicine.symptoms}%`);
      conditions.push(`m.symptoms ILIKE $${params.length}`);
    }

    if (currentMedicine.composition) {
      params.push(`%${currentMedicine.composition}%`);
      conditions.push(`m.composition ILIKE $${params.length}`);
    }

    if (currentMedicine.generic) {
      params.push(`%${currentMedicine.generic}%`);
      conditions.push(`m.generic ILIKE $${params.length}`);
    }

    if (currentMedicine.category) {
      params.push(currentMedicine.category);
      conditions.push(`m.category = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }

    query += ` ORDER BY m.doctor_rating DESC NULLS LAST, m.name ASC LIMIT 10`;

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching similar medicines:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/medicines/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, COALESCE(m.manufacturer_name,m.generic,'Unknown') as manufacturer_name,
      c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE m.id=$1
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- SELLERS ----------------------
app.post("/api/sellers", async (req, res) => {
  try {
    const { name, address, latitude, longitude, phone, email } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: "Name and address required" });
    }

    const result = await pool.query(
      `INSERT INTO sellers (name,address,latitude,longitude,phone,email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, address, latitude || null, longitude || null, phone || null, email || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sellers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sellers ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- SELLER MEDICINES ----------------------
app.post("/api/seller-medicines", async (req, res) => {
  try {
    const { seller_id, medicine_id, price, stock } = req.body;
    if (!seller_id || !medicine_id || price === undefined) {
      return res.status(400).json({ error: "seller_id, medicine_id, and price are required" });
    }

    const result = await pool.query(
      "INSERT INTO seller_medicines (seller_id, medicine_id, price, stock) VALUES ($1,$2,$3,$4) RETURNING *",
      [seller_id, medicine_id, price, stock || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/seller-medicines", async (req, res) => {
  try {
    const { seller_id, medicine_id } = req.query;

    let query = `
      SELECT 
        sm.id,
        sm.seller_id,
        sm.medicine_id,
        sm.price,
        sm.stock,
        sm.requires_prescription,
        sm.created_at,
        sm.updated_at,
        COALESCE(s.business_name, s.name) AS seller_name,
        s.business_name,
        m.name AS medicine_name
      FROM seller_medicines sm
      JOIN medicines m ON sm.medicine_id = m.id
      JOIN sellers s ON sm.seller_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (seller_id) {
      params.push(seller_id);
      query += ` AND sm.seller_id = ${params.length}`;
    }

    if (medicine_id) {
      params.push(medicine_id);
      query += ` AND sm.medicine_id = ${params.length}`;
    }

    query += ` ORDER BY sm.price ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching seller medicines:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PRESCRIPTIONS ----------------------

app.post("/api/prescriptions", async (req, res) => {
  try {
    const { 
      user_id, 
      doctor_name, 
      doctor_registration_number,
      issue_date,
      prescription_image_url,
      notes 
    } = req.body;

    if (!user_id || !prescription_image_url) {
      return res.status(400).json({ 
        error: "User ID and prescription image are required" 
      });
    }

    const issueDate = issue_date ? new Date(issue_date) : new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setDate(expiryDate.getDate() + 30);

    const result = await pool.query(
      `INSERT INTO prescriptions 
       (user_id, doctor_name, doctor_registration_number, issue_date, expiry_date, 
        prescription_image_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [user_id, doctor_name || null, doctor_registration_number || null, 
       issueDate, expiryDate, prescription_image_url, notes || null]
    );

    res.status(201).json({
      message: "Prescription uploaded successfully",
      prescription: result.rows[0]
    });
  } catch (err) {
    console.error('Error uploading prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/prescriptions/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { valid_only } = req.query;

    let query = `
      SELECT p.*, s.business_name as verified_by_name
      FROM prescriptions p
      LEFT JOIN sellers s ON p.verified_by = s.id
      WHERE p.user_id = $1
    `;

    if (valid_only === 'true') {
      query += ` AND p.expiry_date >= CURRENT_DATE`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/prescriptions/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, s.business_name as verified_by_name
       FROM prescriptions p
       LEFT JOIN sellers s ON p.verified_by = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/prescriptions/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { seller_id, status, notes } = req.body;

    if (!seller_id || !status) {
      return res.status(400).json({ error: "Seller ID and status required" });
    }

    const result = await pool.query(
      `UPDATE prescriptions 
       SET verification_status = $1, 
           verified_by = $2, 
           verified_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes)
       WHERE id = $4 
       RETURNING *`,
      [status, seller_id, notes, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Prescription not found" });
    }

    res.json({
      message: "Prescription verification updated",
      prescription: result.rows[0]
    });
  } catch (err) {
    console.error('Error verifying prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- ORDERS ----------------------

app.post("/api/orders", async (req, res) => {
  try {
    const { buyer_id, seller_id, items, shipping_address, total_amount } = req.body;

    if (!buyer_id || !seller_id || !items || !items.length) {
      return res.status(400).json({ 
        error: "Buyer ID, seller ID, and items are required" 
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const orderResult = await client.query(
        `INSERT INTO orders 
         (order_number, buyer_id, seller_id, total_amount, shipping_address)
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [orderNumber, buyer_id, seller_id, total_amount, shipping_address || null]
      );

      const orderId = orderResult.rows[0].id;

      let requiresPrescription = false;
      
      for (const item of items) {
        const medicineCheck = await client.query(
          'SELECT prescription_required FROM medicines WHERE id = $1',
          [item.medicine_id]
        );

        const needsRx = medicineCheck.rows[0]?.prescription_required || false;
        if (needsRx) requiresPrescription = true;

        await client.query(
          `INSERT INTO order_items 
           (order_id, medicine_id, seller_medicine_id, prescription_id, 
            quantity, price_per_unit, total_price, requires_prescription)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            orderId,
            item.medicine_id,
            item.seller_medicine_id,
            item.prescription_id || null,
            item.quantity,
            item.price_per_unit,
            item.total_price,
            needsRx
          ]
        );

        await client.query(
          `UPDATE seller_medicines 
           SET stock = stock - $1 
           WHERE id = $2 AND stock >= $1`,
          [item.quantity, item.seller_medicine_id]
        );
      }

      if (requiresPrescription) {
        await client.query(
          'UPDATE orders SET prescription_verified = FALSE WHERE id = $1',
          [orderId]
        );
      } else {
        await client.query(
          'UPDATE orders SET prescription_verified = TRUE WHERE id = $1',
          [orderId]
        );
      }

      await client.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND seller_id = $2',
        [buyer_id, seller_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: "Order created successfully",
        order: orderResult.rows[0]
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/buyer/:buyerId", async (req, res) => {
  try {
    const { buyerId } = req.params;

    const result = await pool.query(
      `SELECT o.*, s.business_name as seller_name,
              COUNT(oi.id) as item_count
       FROM orders o
       JOIN sellers s ON o.seller_id = s.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.buyer_id = $1
       GROUP BY o.id, s.business_name
       ORDER BY o.created_at DESC`,
      [buyerId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching buyer orders:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/seller/:sellerId", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT o.*, u.username as buyer_name, u.email as buyer_email,
             COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.seller_id = $1
    `;
    const params = [sellerId];

    if (status) {
      params.push(status);
      query += ` AND o.order_status = ${params.length}`;
    }

    query += ` GROUP BY o.id, u.username, u.email ORDER BY o.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching seller orders:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await pool.query(
      `SELECT o.*, 
              u.username as buyer_name, u.email as buyer_email, u.phone_number,
              s.business_name as seller_name, s.phone as seller_phone
       FROM orders o
       JOIN users u ON o.buyer_id = u.id
       JOIN sellers s ON o.seller_id = s.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await pool.query(
      `SELECT oi.*, 
              m.name as medicine_name, m.generic, m.image_url,
              p.prescription_image_url, p.verification_status as rx_status
       FROM order_items oi
       JOIN medicines m ON oi.medicine_id = m.id
       LEFT JOIN prescriptions p ON oi.prescription_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET order_status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, orderId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Order status updated",
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { buyer_id } = req.body;

    const orderCheck = await pool.query(
      "SELECT * FROM orders WHERE id = $1 AND buyer_id = $2",
      [orderId, buyer_id]
    );

    if (!orderCheck.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderCheck.rows[0];

    if (!['pending', 'confirmed'].includes(order.order_status)) {
      return res.status(400).json({ 
        error: "Order cannot be cancelled at this stage" 
      });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [orderId]
    );

    const items = await pool.query(
      `SELECT seller_medicine_id, quantity 
       FROM order_items 
       WHERE order_id = $1`,
      [orderId]
    );

    for (const item of items.rows) {
      await pool.query(
        `UPDATE seller_medicines 
         SET stock = stock + $1 
         WHERE id = $2`,
        [item.quantity, item.seller_medicine_id]
      );
    }

    res.json({
      message: "Order cancelled successfully",
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/seller/:sellerId/order-stats", async (req, res) => {
  try {
    const { sellerId } = req.params;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN order_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN order_status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN order_status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN order_status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END), 0) as delivered_revenue
      FROM orders
      WHERE seller_id = $1
    `, [sellerId]);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Error fetching order stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { tracking_number } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ error: "Tracking number is required" });
    }

    const result = await pool.query(
      `UPDATE orders 
       SET order_status = 'shipped', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [orderId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Tracking information added",
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding tracking:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/orders/:orderId/verify-prescription", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { verified } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET prescription_verified = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [verified, orderId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Prescription verification updated",
      order: result.rows[0]
    });
  } catch (err) {
    console.error('Error verifying prescription:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- CART ----------------------
app.post("/api/cart", async (req, res) => {
  try {
    const { user_id, seller_id, medicine_id, quantity } = req.body;
    if (!user_id || !seller_id || !medicine_id) {
      return res.status(400).json({ error: "user_id, seller_id, and medicine_id are required" });
    }

    const existing = await pool.query(
      "SELECT * FROM cart_items WHERE user_id=$1 AND seller_id=$2 AND medicine_id=$3",
      [user_id, seller_id, medicine_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        "UPDATE cart_items SET quantity = quantity + $1 WHERE user_id=$2 AND seller_id=$3 AND medicine_id=$4 RETURNING *",
        [quantity || 1, user_id, seller_id, medicine_id]
      );
    } else {
      result = await pool.query(
        "INSERT INTO cart_items (user_id,seller_id,medicine_id,quantity) VALUES ($1,$2,$3,$4) RETURNING *",
        [user_id, seller_id, medicine_id, quantity || 1]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cart/:userId", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ci.id, ci.quantity, ci.medicine_id, ci.seller_id,
             m.name AS medicine_name, s.name AS seller_name, sm.price,
             m.image_url, COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name,
             (ci.quantity * sm.price) as total_price
      FROM cart_items ci
      JOIN medicines m ON ci.medicine_id = m.id
      JOIN sellers s ON ci.seller_id = s.id
      JOIN seller_medicines sm ON ci.seller_id = sm.seller_id AND ci.medicine_id = sm.medicine_id
      WHERE ci.user_id = $1
      ORDER BY ci.id DESC
    `, [req.params.userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/cart/:itemId", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 RETURNING *",
      [req.params.itemId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    
    res.json({ message: "Item removed from cart" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- HEALTHCARE FACILITIES ----------------------
app.get("/api/healthcare", async (req, res) => {
  try {
    const { type } = req.query;
    let query = `SELECT * FROM healthcare_facilities WHERE 1=1`;
    const params = [];
    
    if (type && type !== "all") {
      query += ` AND (LOWER(facility_type) = LOWER($1) OR LOWER(doctor_category) = LOWER($1))`;
      params.push(type);
    }
    
    query += ` ORDER BY name ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Healthcare facilities error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/healthcare/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 50, type } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    let query = `
      SELECT *, 
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM healthcare_facilities
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `;
    const params = [parseFloat(lat), parseFloat(lng)];

    if (type && type !== "all") {
      query += ` AND (LOWER(facility_type) = LOWER($3) OR LOWER(doctor_category) = LOWER($3))`;
      params.push(type);
    }

    query += ` HAVING distance_km <= ${params.length + 1} ORDER BY distance_km ASC LIMIT 50`;
    params.push(parseFloat(radius));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Nearby healthcare error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/healthcare/byState", async (req, res) => {
  try {
    const { state, type, limit = 20, pincode } = req.query;

    const queryLimit = Math.min(parseInt(limit) || 20, 100);

    let query = `
      SELECT id, name, facility_type as type, state, address, phone, 
             latitude, longitude, rating, opening_hours, doctor_category, pincode
      FROM healthcare_facilities
      WHERE 1=1
    `;
    const params = [];

    if (state && state.trim() !== '') {
      params.push(state.trim());
      query += ` AND LOWER(state) = LOWER(${params.length})`;
    }

    if (pincode && pincode.trim() !== '') {
      params.push(pincode.trim());
      query += ` AND pincode = ${params.length}`;
    }

    if (type && type !== "all" && type.trim() !== '') {
      params.push(type.trim());
      query += ` AND (LOWER(facility_type) = LOWER(${params.length}) OR LOWER(doctor_category) = LOWER(${params.length}))`;
    }

    query += ` ORDER BY rating DESC NULLS LAST, name ASC LIMIT ${params.length + 1}`;
    params.push(queryLimit);

    const result = await pool.query(query, params);

    const formattedResults = result.rows.map(facility => ({
      ...facility,
      rating: facility.rating || 0,
      distance: 'N/A',
      open: true
    }));

    res.json({ 
      results: formattedResults,
      total: formattedResults.length,
      state: state || null,
      type: type || 'all',
      pincode: pincode || null
    });

  } catch (error) {
    console.error("Error in healthcare byState:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

app.get("/api/healthcare/debug", async (req, res) => {
  try {
    const totalCount = await pool.query("SELECT COUNT(*) as total_count FROM healthcare_facilities");
    const statesResult = await pool.query("SELECT DISTINCT state FROM healthcare_facilities WHERE state IS NOT NULL ORDER BY state");
    const typesResult = await pool.query("SELECT DISTINCT facility_type FROM healthcare_facilities WHERE facility_type IS NOT NULL ORDER BY facility_type");
    const doctorCategoriesResult = await pool.query("SELECT DISTINCT doctor_category FROM healthcare_facilities WHERE doctor_category IS NOT NULL ORDER BY doctor_category");
    const sampleResult = await pool.query("SELECT * FROM healthcare_facilities LIMIT 3");
    
    res.json({
      total_records: totalCount.rows[0].total_count,
      available_states: statesResult.rows.map(row => row.state),
      available_facility_types: typesResult.rows.map(row => row.facility_type),
      available_doctor_categories: doctorCategoriesResult.rows.map(row => row.doctor_category),
      sample_data: sampleResult.rows
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------- USER PROFILE ENDPOINTS ----------------------

app.get("/api/user/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      SELECT id, username, email, full_name, gender, address, phone_number, 
             date_of_birth, pincode, blood_group, conditions, allergies, 
             medication, profile_image, created_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name || '',
      gender: user.gender || '',
      address: user.address || '',
      phoneNumber: user.phone_number || '',
      dateOfBirth: user.date_of_birth || '',
      pincode: user.pincode || '',
      bloodGroup: user.blood_group || '',
      conditions: user.conditions || '',
      allergies: user.allergies || '',
      medication: user.medication || '',
      profileImage: user.profile_image || '',
      createdAt: user.created_at
    };

    res.json(formattedUser);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/user/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      fullName,
      gender,
      address,
      phoneNumber,
      dateOfBirth,
      pincode,
      bloodGroup,
      conditions,
      allergies,
      medication,
      profileImage
    } = req.body;

    if (dateOfBirth) {
      const today = new Date();
      const birth = new Date(dateOfBirth);
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      let actualAge = age;
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        actualAge = age - 1;
      }
      
      if (actualAge < 18) {
        return res.status(400).json({ error: "User must be 18 or older" });
      }
    }

    if (phoneNumber && (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber))) {
      return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
    }

    if (pincode && (pincode.length !== 6 || !/^\d{6}$/.test(pincode))) {
      return res.status(400).json({ error: "Please enter a valid 6-digit pincode" });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = ${paramCount}`);
      values.push(fullName);
      paramCount++;
    }
    
    if (gender !== undefined) {
      updates.push(`gender = ${paramCount}`);
      values.push(gender);
      paramCount++;
    }
    
    if (address !== undefined) {
      updates.push(`address = ${paramCount}`);
      values.push(address);
      paramCount++;
    }
    
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = ${paramCount}`);
      values.push(phoneNumber);
      paramCount++;
    }
    
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = ${paramCount}`);
      values.push(dateOfBirth);
      paramCount++;
    }
    
    if (pincode !== undefined) {
      updates.push(`pincode = ${paramCount}`);
      values.push(pincode);
      paramCount++;
    }
    
    if (bloodGroup !== undefined) {
      updates.push(`blood_group = ${paramCount}`);
      values.push(bloodGroup);
      paramCount++;
    }
    
    if (conditions !== undefined) {
      updates.push(`conditions = ${paramCount}`);
      values.push(conditions);
      paramCount++;
    }
    
    if (allergies !== undefined) {
      updates.push(`allergies = ${paramCount}`);
      values.push(allergies);
      paramCount++;
    }
    
    if (medication !== undefined) {
      updates.push(`medication = ${paramCount}`);
      values.push(medication);
      paramCount++;
    }
    
    if (profileImage !== undefined) {
      updates.push(`profile_image = ${paramCount}`);
      values.push(profileImage);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = ${paramCount} 
      RETURNING id, username, email, full_name, gender, address, phone_number, 
                date_of_birth, pincode, blood_group, conditions, allergies, 
                medication, profile_image, updated_at
    `;

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name || '',
      gender: user.gender || '',
      address: user.address || '',
      phoneNumber: user.phone_number || '',
      dateOfBirth: user.date_of_birth || '',
      pincode: user.pincode || '',
      bloodGroup: user.blood_group || '',
      conditions: user.conditions || '',
      allergies: user.allergies || '',
      medication: user.medication || '',
      profileImage: user.profile_image || '',
      updatedAt: user.updated_at
    };

    res.json({
      message: "Profile updated successfully",
      user: formattedUser
    });

  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/profile/:userId/image", async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrl } = req.body;
    
    const result = await pool.query(
      "UPDATE users SET profile_image = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING profile_image",
      [imageUrl, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile image updated successfully",
      profileImage: result.rows[0].profile_image
    });

  } catch (err) {
    console.error('Error updating profile image:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- LAB TESTS ----------------------
app.get("/api/lab-tests", async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `SELECT * FROM lab_tests WHERE 1=1`;
    const params = [];
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = ${params.length}`;
    }
    
    query += ` ORDER BY name ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lab tests:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/lab-packages", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, 
             array_agg(
               json_build_object(
                 'id', lt.id,
                 'name', lt.name,
                 'description', lt.description,
                 'price', lt.price
               )
             ) as included_tests
      FROM lab_packages lp
      LEFT JOIN lab_package_items lpi ON lp.id = lpi.package_id
      LEFT JOIN lab_tests lt ON lpi.test_id = lt.id
      GROUP BY lp.id, lp.name, lp.description, lp.price
      ORDER BY lp.name
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lab packages:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- ROOT ----------------------
app.get("/", (req, res) => {
  res.json({ 
    message: "Medicine App Server is running!",
    version: "1.0.0",
    status: "healthy",
    endpoints: {
      auth: ["/api/register/buyer", "/api/register/seller", "/api/login"],
      medicines: ["/api/medicines", "/api/medicines/:id", "/api/medicines/:id/similar"],
      categories: ["/api/categories", "/api/category-buttons"],
      sellers: ["/api/sellers", "/api/seller-medicines", "/api/seller/:sellerId/inventory"],
      cart: ["/api/cart", "/api/cart/:userId"],
      orders: ["/api/orders", "/api/orders/buyer/:buyerId", "/api/orders/seller/:sellerId"],
      prescriptions: ["/api/prescriptions", "/api/prescriptions/user/:userId"],
      healthcare: ["/api/healthcare", "/api/healthcare/nearby", "/api/healthcare/byState"],
      profile: ["/api/user/profile/:userId"],
      labs: ["/api/lab-tests", "/api/lab-packages"]
    }
  });
});

// Health check endpoint for monitoring
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ---------------------- ERROR HANDLER ----------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ---------------------- START SERVER ----------------------
app.listen(PORT, () => {
  console.log(`\n Server running on port ${PORT}`);
  console.log(` Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`\n Available endpoints:`);
  console.log(`   GET  / - API information`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/medicines - Get medicines`);
  console.log(`   GET  /api/categories - Get categories`);
  console.log(`   GET  /api/healthcare/byState - Get healthcare facilities`);
  console.log(`   POST /api/register/buyer - Register buyer`);
  console.log(`   POST /api/register/seller - Register seller`);
  console.log(`   POST /api/login - Login\n`);
});