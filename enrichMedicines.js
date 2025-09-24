// scripts/enrichMedicines.js
const axios = require("axios");

/**
 * Enrich medicines in the database using RxNav, DailyMed, and OpenFDA APIs.
 * @param {Pool} pool - pg Pool instance passed from server.js
 * @returns {Promise<number>} count of medicines updated
 */
async function enrichMedicines(pool) {
  const { rows: medicines } = await pool.query("SELECT * FROM medicines");
  let updatedCount = 0;

  for (const med of medicines) {
    console.log(`🔍 Enriching: ${med.name}`);

    let generic = med.generic || null;
    let dosage = med.dosage || null;
    let symptoms = med.symptoms || null;
    let purpose = med.purpose || null;
    let warnings = med.warnings || null;
    let rxnavCode = med.rxnav_code || null;
    let dailymedSetid = med.dailymed_setid || null;

    try {
      // --- RxNav ---
      try {
        const rxnavRes = await axios.get(
          `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(med.name)}`
        );
        const concepts =
          rxnavRes.data?.drugGroup?.conceptGroup?.flatMap((g) => g.conceptProperties || []) || [];
        if (concepts.length > 0) {
          rxnavCode = concepts[0].rxcui || rxnavCode;
        }
      } catch (err) {
        console.warn(`⚠️ RxNav failed for ${med.name}:`, err.message);
      }

      // --- DailyMed ---
      try {
        const dailymedRes = await axios.get(
          `https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name=${encodeURIComponent(med.name)}`
        );
        const data = dailymedRes.data?.data || [];
        if (data.length > 0) {
          dailymedSetid = data[0].setid || dailymedSetid;
        }
      } catch (err) {
        console.warn(`⚠️ DailyMed failed for ${med.name}:`, err.message);
      }

      // --- OpenFDA ---
      try {
        const fdaRes = await axios.get(
          `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(med.name)}"&limit=1`
        );
        const drug = fdaRes.data?.results?.[0];
        if (drug) {
          generic = drug.openfda?.generic_name?.[0] || generic;
          dosage = drug.dosage_and_administration?.[0] || dosage;
          symptoms = drug.indications_and_usage?.[0] || symptoms;
          purpose = drug.purpose?.[0] || purpose;
          warnings = drug.warnings?.[0] || warnings;
        }
      } catch (err) {
        console.warn(`⚠️ OpenFDA failed for ${med.name}:`, err.message);
      }

      // --- Save to DB ---
      await pool.query(
        `UPDATE medicines
         SET generic = $1, dosage = $2, symptoms = $3,
             purpose = $4, warnings = $5,
             rxnav_code = $6, dailymed_setid = $7, last_synced = NOW()
         WHERE id = $8`,
        [generic, dosage, symptoms, purpose, warnings, rxnavCode, dailymedSetid, med.id]
      );

      updatedCount++;
      console.log(`✅ Updated: ${med.name}`);
    } catch (err) {
      console.error(`❌ Failed to enrich ${med.name}:`, err.message);
    }
  }

  return updatedCount;
}

module.exports = { enrichMedicines };
