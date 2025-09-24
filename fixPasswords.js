const bcrypt = require("bcrypt");
const { Pool } = require("pg");

// Update this with your actual DB connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "medicineapp",
  password: "DauphinII",
  port: 5432,
});

async function fixPasswords() {
  try {
    const res = await pool.query("SELECT id, password_hash FROM users");
    for (const user of res.rows) {
      // only hash if not already hashed (optional)
      if (!user.password_hash.startsWith("$2b$")) {
        const hashed = await bcrypt.hash(user.password_hash, 10);
        await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hashed, user.id]);
        console.log(`Password fixed for user id ${user.id}`);
      }
    }
    console.log("All passwords fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixPasswords();
