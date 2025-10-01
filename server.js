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

// ------------SIMILAR MEDICINE-------------

app.get("/api/medicines/:id/similar", async (req, res) => {
  try {
    const medicineId = req.params.id;
    
    // First, get the current medicine's details
    const medicineResult = await pool.query(`
      SELECT symptoms, composition, generic, category
      FROM medicines
      WHERE id = $1
    `, [medicineId]);

    if (!medicineResult.rows.length) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    const currentMedicine = medicineResult.rows[0];
    
    // Build a query to find similar medicines based on symptoms, composition, or generic name
    let query = `
      SELECT m.*, COALESCE(m.manufacturer_name, m.generic, 'Unknown') as manufacturer_name,
             c.name as category_name, c.slug as category_slug
      FROM medicines m
      LEFT JOIN categories c ON m.category = c.id
      WHERE m.id != $1
    `;
    const params = [medicineId];
    const conditions = [];

    // Add similarity conditions
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

    // If we have any conditions, add them with OR
    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }

    // Order by doctor rating and limit results
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
    const { state, type, limit = 20, pincode } = req.query;
    
    console.log('=== Healthcare Search Request ===');
    console.log('State:', state);
    console.log('Type:', type);
    console.log('Pincode:', pincode);
    console.log('Limit:', limit);

    const queryLimit = Math.min(parseInt(limit) || 20, 100);

    let query = `
      SELECT id, name, facility_type as type, state, address, phone, 
             latitude, longitude, rating, opening_hours, doctor_category, pincode
      FROM healthcare_facilities
      WHERE 1=1
    `;
    const params = [];

    // Add state filter (only if provided)
    if (state && state.trim() !== '') {
      params.push(state.trim());
      query += ` AND LOWER(state) = LOWER($${params.length})`;
    }

    // Add pincode filter (only if provided)
    if (pincode && pincode.trim() !== '') {
      params.push(pincode.trim());
      query += ` AND pincode = $${params.length}`;
    }

    // Add type filter (only if provided and not 'all')
    if (type && type !== "all" && type.trim() !== '') {
      params.push(type.trim());
      query += ` AND (LOWER(facility_type) = LOWER($${params.length}) OR LOWER(doctor_category) = LOWER($${params.length}))`;
    }

    query += ` ORDER BY rating DESC NULLS LAST, name ASC LIMIT $${params.length + 1}`;
    params.push(queryLimit);

    console.log('=== SQL Query ===');
    console.log('Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);

    console.log('=== Query Results ===');
    console.log('Found records:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Sample result:', result.rows[0]);
    } else {
      // If no results, let's check what's in the database
      const debugQuery = `
        SELECT DISTINCT state, facility_type, COUNT(*) as count
        FROM healthcare_facilities
        GROUP BY state, facility_type
        ORDER BY state, facility_type
      `;
      const debugResult = await pool.query(debugQuery);
      console.log('Available data in database:', debugResult.rows);
    }

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
// fetch  similar medicines endpoint here
// Alias without /api prefix for backward compatibility
app.get("/healthcare/byState", async (req, res) => {
  req.url = '/api' + req.url;
  return app._router.handle(req, res);
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
// ---------------------- USER PROFILE ENDPOINTS ----------------------
// Add these endpoints to your existing server.js file

// Get user profile
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
    
    // Format the response to match frontend expectations
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

// Update user profile
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

    // Validate age if date of birth is provided
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

    // Validate phone number (Indian format)
    if (phoneNumber && (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber))) {
      return res.status(400).json({ error: "Please enter a valid 10-digit phone number" });
    }

    // Validate pincode (Indian format)
    if (pincode && (pincode.length !== 6 || !/^\d{6}$/.test(pincode))) {
      return res.status(400).json({ error: "Please enter a valid 6-digit pincode" });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(fullName);
      paramCount++;
    }
    
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount}`);
      values.push(gender);
      paramCount++;
    }
    
    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }
    
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(phoneNumber);
      paramCount++;
    }
    
    if (dateOfBirth !== undefined) {
      updates.push(`date_of_birth = $${paramCount}`);
      values.push(dateOfBirth);
      paramCount++;
    }
    
    if (pincode !== undefined) {
      updates.push(`pincode = $${paramCount}`);
      values.push(pincode);
      paramCount++;
    }
    
    if (bloodGroup !== undefined) {
      updates.push(`blood_group = $${paramCount}`);
      values.push(bloodGroup);
      paramCount++;
    }
    
    if (conditions !== undefined) {
      updates.push(`conditions = $${paramCount}`);
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

    // Add updated_at timestamp
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
    
    // Format the response to match frontend expectations
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

// Upload profile image endpoint (optional - for handling file uploads)
app.post("/api/user/profile/:userId/image", async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrl } = req.body; // This would be the uploaded image URL
    
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

// Add this endpoint to your server.js file

// ---------------------- LAB TESTS ----------------------
app.get("/api/lab-tests", async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `SELECT * FROM lab_tests WHERE 1=1`;
    const params = [];
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ` ORDER BY name ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lab tests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get lab packages
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