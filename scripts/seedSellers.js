// scripts/seedSellers.js
import pool from "../db.js"; // 👈 must match your db.js export

const regions = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"
];

function randomPhone() {
  return "9" + Math.floor(100000000 + Math.random() * 900000000);
}

async function seedSellers() {
  let queries = [];

  for (let i = 1; i <= 100; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const name = `Pharmacy ${i}`;
    const address = `Shop #${i}, ${region}`;
    const phone = randomPhone();
  }

  await Promise.all(queries);
  console.log("✅ 100 Sellers seeded");
  process.exit(0);
}

seedSellers().catch(err => console.error(err));
