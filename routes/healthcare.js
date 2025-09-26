// routes/healthcare.js
import express from "express";
const router = express.Router();

// Healthcare routes module
export default function createHealthcareRoutes(pool) {
  
  // Get all healthcare facilities with optional type filtering
  router.get("/", async (req, res) => {
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

  // Get nearby healthcare facilities
  router.get("/nearby", async (req, res) => {
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

  // Get healthcare facilities by state
  router.get("/byState", async (req, res) => {
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

  // Debug endpoint for healthcare data
  router.get("/debug", async (req, res) => {
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

  return router;}