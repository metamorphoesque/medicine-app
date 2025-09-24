// checkPassword.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "medicineapp",
  password: "DauphinII",
  port: 5432,
});

async function checkPassword(email, plainPassword) {
  try {
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      console.log("User not found");
      return;
    }

    const hash = result.rows[0].password_hash;
    const match = await bcrypt.compare(plainPassword, hash);

    if (match) {
      console.log("✅ Password matches!");
    } else {
      console.log("❌ Password does NOT match.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

// Example usage
const emailToCheck = "arwa@example.com";
const passwordToCheck = "123456"; // Replace with the password you are trying
checkPassword(emailToCheck, passwordToCheck);
