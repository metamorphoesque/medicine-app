// scripts/sources/govCsv.js
import fs from "fs";
import csvParser from "csv-parser";

export async function seedFromGovCSV(pool) {
  console.log("\n📑 Fetching from Gov CSV files…");
  let insertedCount = 0;

  // Example: CSV path (replace with real state data file paths)
  const csvFiles = [
    "./data/up_hospitals.csv",
    "./data/maharashtra_hospitals.csv",
  ];

  for (const file of csvFiles) {
    if (!fs.existsSync(file)) {
      console.log(`⚠️ CSV not found: ${file}`);
      continue;
    }

    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(file)
        .pipe(csvParser())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    for (const hosp of rows) {
      const facility = {
        facility_id: `govcsv_${hosp.ID || hosp.Name}_${file}`,
        name: hosp.Name || hosp.HospitalName,
        address: hosp.Address || `${hosp.District}, ${hosp.State}`,
        phone: hosp.Phone || null,
        website: null,
        opening_hours: null,
        doctor_category: hosp.Speciality || null,
        latitude: hosp.Latitude || null,
        longitude: hosp.Longitude || null,
        rating: null,
        facility_type: hosp.Type || "Hospital",
        source: "gov_csv",
        raw_data: JSON.stringify(hosp),
      };

      const insertQuery = `
        INSERT INTO healthcare_facilities
        (facility_id, name, address, phone, website, opening_hours, doctor_category, latitude, longitude, rating, facility_type, source, raw_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (facility_id) DO NOTHING
      `;
      const result = await pool.query(insertQuery, Object.values(facility));
      if (result.rowCount > 0) insertedCount++;
    }
  }

  console.log(`✅ ${insertedCount} facilities inserted from Gov CSVs`);
  return insertedCount;
}
