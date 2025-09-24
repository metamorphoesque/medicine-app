// routes/reminders.js
import express from "express";

export default function remindersRoutes(pool) {
  const router = express.Router();

  // Create a new reminder
  router.post("/", async (req, res) => {
    try {
      const { user_id, medicine_name, reminder_time, times_per_day, fillups } = req.body;

      const result = await pool.query(
        `INSERT INTO reminders 
         (user_id, medicine_name, reminder_time, times_per_day, fillups, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [user_id, medicine_name, reminder_time, times_per_day, fillups]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("❌ Insert failed:", err);
      res.status(500).json({ error: "Insert failed", details: err.message });
    }
  });

  // Get reminders for a user
  router.get("/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        "SELECT * FROM reminders WHERE user_id = $1 ORDER BY reminder_time ASC",
        [userId]
      );

      res.json({ reminders: result.rows });
    } catch (err) {
      console.error("❌ Fetch failed:", err);
      res.status(500).json({ error: "Fetch failed", details: err.message });
    }
  });

  // Update a reminder
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { times_per_day, fillups } = req.body;

      const result = await pool.query(
        `UPDATE reminders 
         SET times_per_day=$1, fillups=$2, updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [times_per_day, fillups, id]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("❌ Update failed:", err);
      res.status(500).json({ error: "Update failed", details: err.message });
    }
  });

  // Delete a reminder
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM reminders WHERE id=$1", [id]);
      res.json({ message: "Reminder deleted" });
    } catch (err) {
      console.error("❌ Delete failed:", err);
      res.status(500).json({ error: "Delete failed", details: err.message });
    }
  });

  return router;
}
