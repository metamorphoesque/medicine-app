import fs from "fs";
import path from "path";
import csv from "csv-parser";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const csvFilePath = path.join(process.cwd(), "scripts", "data", "healthcare_facilities.csv");

// Map row to facility type using keywords in name + columns
function getFacilityType(row) {
  const name = (row.Hospital_Name || row.Location || "").toLowerCase();
  const cat = (row.Hospital_Category || "").toLowerCase();
  const medSys = (row.Discipline_System_of_Medicine || "").toLowerCase();
  const spec = (row.Specialties || "").toLowerCase();
  const doctorCat = (row.Doctor_Category || "").toLowerCase();

  // Keyword-based mapping from name
  if (name.includes("hospital")) return "Hospital";
  if (name.includes("clinic")) return "Clinic";
  if (name.includes("nursing") || name.includes("home") || name.includes("care")) return "Nursing Home";
  if (name.includes("medical") || name.includes("medicals") || name.includes("pharmacy")) return "Pharmacy";
  if (name.includes("ayurveda") || medSys.includes("ayurveda") || spec.includes("ayurvedic")) return "Ayurvedic";
  if (spec.includes("physiotherapy")) return "Physiotherapy";
  if (doctorCat) return "Doctor";

  // Fallback to Hospital_Category column if no name keyword matched
  if (cat.includes("hospital")) return "Hospital";
  if (cat.includes("clinic")) return "Clinic";
  if (cat.includes("pharmacy")) return "Pharmacy";

  return "Other";
}

const facilities = [];
const facilityTypeCounts = { Hospital: 0, Clinic: 0, "Nursing Home": 0, Pharmacy: 0, Ayurvedic: 0, Physiotherapy: 0, Doctor: 0, Other: 0 };

// Read CSV
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on("data", (row) => {
    try {
      // Parse coordinates
      let latitude = null;
      let longitude = null;
      if (row.Location_Coordinates) {
        const coords = row.Location_Coordinates.split(",").map(c => parseFloat(c.trim()));
        if (coords.length === 2) {
          [latitude, longitude] = coords;
        }
      }

      const facilityType = getFacilityType(row);
      facilityTypeCounts[facilityType] = (facilityTypeCounts[facilityType] || 0) + 1;

      // Use Telephone or Mobile_Number
      const phone = row.Telephone || row.Mobile_Number || null;

      facilities.push({
        name: row.Hospital_Name || row.Location || "Unnamed Facility",
        address: row.Address_Original_First_Line || null,
        latitude,
        longitude,
        phone,
        website: row.Website || null,
        facility_type: facilityType,
        doctor_category: row.Discipline_System_of_Medicine || null,
        state: row.State || null,
        district: row.District || null,
        pincode: row.Pincode || null,
      });
    } catch (err) {
      console.error("Error parsing row:", err);
    }
  })
  .on("end", async () => {
    console.log(`✅ Parsed ${facilities.length} facilities from CSV.`);
    console.log("Facility counts before insert:", facilityTypeCounts);

    let insertedCount = 0;

    for (const f of facilities) {
      try {
        await pool.query(
          `INSERT INTO healthcare_facilities
          (name, address, latitude, longitude, phone, website, facility_type, doctor_category, state, district, pincode)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (name, address) DO NOTHING;`,
          [
            f.name,
            f.address,
            f.latitude,
            f.longitude,
            f.phone,
            f.website,
            f.facility_type,
            f.doctor_category,
            f.state,
            f.district,
            f.pincode,
          ]
        );
        insertedCount++;
      } catch (err) {
        console.error("Insert failed for:", f.name, err.message);
      }
    }

    console.log(`🎉 Seeding complete! Total inserted: ${insertedCount}`);
    console.log("Facility counts by type:", facilityTypeCounts);

    await pool.end();
  });
