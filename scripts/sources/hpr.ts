// scripts/sources/hpr.js
import axios from "axios";

export async function seedFromHPR(pool) {
  console.log("\n👩‍⚕️ Fetching from Healthcare Professionals Registry (HPR)…");
  let insertedCount = 0;

  try {
    // Example HPR endpoint (replace with real one)
    const url = "https://api.abdm.gov.in/hpr/doctors"; 
    const { data } = await axios.get(url);

    for (const doc of data || []) {
      const facility = {
        facility_id: `hpr_${doc.id}`,
        name: `${doc.firstName} ${doc.lastName}`.trim(),
        address: doc.address || `${doc.district}, ${doc.state}`,
        phone: doc.mobile || null,
        website: null,
        opening_hours: null,
        doctor_category: doc.speciality || doc.profession,
        latitude: null, // HPR may not give lat/lng
        longitude: null,
        rating: null,
        facility_type: "Doctor",
        source: "hpr",
        raw_data: JSON.stringify(doc),
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

    console.log(`✅ ${insertedCount} professionals inserted from HPR`);
  } catch (err) {
    console.error("⚠️ HPR fetch failed:", err.message);
  }

  return insertedCount;
}
