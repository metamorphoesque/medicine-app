import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import { categoryKeywords } from "./categories.js";

const app = express();
const PORT = 5000;

// ---------------------- MIDDLEWARE ----------------------
app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.query);
  next();
});

// ---------------------- DATABASE ----------------------
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "medicineapp",
  password: "DauphinII",
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) console.error("DB connection error:", err.stack);
  else {
    console.log("Connected to PostgreSQL database");
    release();
  }
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
app.post("/api/register", async (req, res) => {
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

app.post("/api/login", async (req, res) => {
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
    
    console.log('Fetching medicines with params:', { search, page, limit, category: categorySlug });
    
    let query = `
      SELECT m.*, COALESCE(m.manufacturer_name,m.generic,'Unknown') as manufacturer_name,
      c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE 1=1
    `;
    let params = [];

    // Handle category-based filtering
    if (categorySlug && categorySlug !== 'all' && categorySlug !== '') {
      console.log('Filtering by category:', categorySlug);
      const keywords = getKeywordsForCategory(categorySlug);
      console.log('Category keywords:', keywords);
      
      if (keywords.length > 0) {
        const categorySearch = buildCategorySearchQuery(keywords);
        query += categorySearch.query;
        params = [...params, ...categorySearch.params];
      }
    }

    // Handle text search
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

    console.log('Final query:', query);
    console.log('Query params:', params);

    const medicinesResult = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE 1=1
    `;
    let countParams = [];

    // Apply same filters for count
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

    console.log(`Found ${medicinesResult.rows.length} medicines, total: ${total}`);

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
      SELECT sm.*, m.name as medicine_name, s.name as seller_name
      FROM seller_medicines sm
      JOIN medicines m ON sm.medicine_id = m.id
      JOIN sellers s ON sm.seller_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (seller_id) {
      params.push(seller_id);
      query += ` AND sm.seller_id = $${params.length}`;
    }

    if (medicine_id) {
      params.push(medicine_id);
      query += ` AND sm.medicine_id = $${params.length}`;
    }

    query += ` ORDER BY sm.price ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
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

    query += ` HAVING distance_km <= $${params.length + 1} ORDER BY distance_km ASC LIMIT 50`;
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
    const { state, type, limit = 20 } = req.query;
    
    if (!state) {
      return res.status(400).json({ error: "State parameter is required" });
    }

    const queryLimit = Math.min(parseInt(limit) || 20, 100);

    let query = `
      SELECT id, name, facility_type as type, state, address, phone, 
             latitude, longitude, rating, opening_hours, doctor_category
      FROM healthcare_facilities
      WHERE LOWER(state) = LOWER($1)
    `;
    const params = [state];

    if (type && type !== "all") {
      query += ` AND (LOWER(facility_type) = LOWER($2) OR LOWER(doctor_category) = LOWER($2))`;
      params.push(type);
    }

    query += ` ORDER BY rating DESC NULLS LAST, name ASC LIMIT $${params.length + 1}`;
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
      state: state,
      type: type || 'all'
    });

  } catch (error) {
    console.error("Error in healthcare byState:", error);
    res.status(500).json({ error: "Internal server error" });
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
}


);

// ---------------------- ROOT ----------------------
app.get("/", (req, res) => {
  res.json({ 
    message: "Medicine App Server is running!",
    endpoints: {
      auth: ["/api/register", "/api/login"],
      medicines: ["/api/medicines", "/api/medicines/:id"],
      categories: ["/api/categories", "/api/category-buttons"],
      sellers: ["/api/sellers", "/api/seller-medicines"],
      cart: ["/api/cart", "/api/cart/:userId"],
      healthcare: ["/api/healthcare", "/api/healthcare/nearby", "/api/healthcare/byState"]
    }
  });
});

// ---------------------- ERROR HANDLER ----------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------- START SERVER ----------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET /api/category-buttons - Get category buttons for frontend`);
  console.log(`  GET /api/medicines?category=heart-blood-pressure-care - Get medicines by category`);
  console.log(`  GET /api/healthcare/byState?state=California&type=hospital - Get healthcare facilities`);
});