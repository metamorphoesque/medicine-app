// routes/healthcare.js
import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const router = express.Router();

// Configure your DB connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// GET /api/healthcare/byState?state=Andhra Pradesh&type=hospital&limit=20
router.get("/byState", async (req, res) => {
  const { state, type, limit } = req.query;

  if (!state || !type) {
    return res.status(400).json({ error: "state and type are required" });
  }

  const queryLimit = parseInt(limit) || 20;

  try {
    const result = await pool.query(
      `SELECT id, name, type, state, address, phone, rating, opening_hours
       FROM healthcare_facilities
       WHERE state = $1 AND type = $2
       LIMIT $3`,
      [state, type, queryLimit]
    );

    res.json({ results: result.rows });
  } catch (error) {
    console.error("Error fetching healthcare facilities by state:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
