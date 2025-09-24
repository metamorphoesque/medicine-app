// db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables
const { Pool } = pkg;

// Create a Postgres connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Export the pool for use in other modules
export default pool;


