// scripts/sources/hospitalsApi.js
import axios from "axios";

export async function seedFromHospitalsAPI(pool) {
  console.log("\n🏥 Fetching from HospitalsAPI (Gov dataset)…");
  let insertedCount = 0;

  try {
    // Example URL (replace with actual HospitalsAPI endpoint if available)
    const url = "https://hospitals-api.onrender.com/api/v1/hospitals";
    const { data } = await axios.get(url);

    for (const hosp of data || []) {
      const facility = {
        facility_id: `hospitalsapi_${hosp.id}`,
        name: hosp.name,
        address: hosp.address || `${hosp.district}, ${hosp.state}`,
        phone: hosp.phone || null,
        website: hosp.website || null,
        opening_hours: null,
        doctor_category: hosp.speciality || null,
        latitude: hosp.latitude || null,
        longitude: hosp.longitude || null,
        rating: null,
        facility_type: hosp.type || "Hospital",
        source: "hospitalsapi",
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

    console.log(`✅ ${insertedCount} facilities inserted from HospitalsAPI`);
  } catch (err) {
    console.error("⚠️ HospitalsAPI fetch failed:", err.message);
  }

  return insertedCount;
}
