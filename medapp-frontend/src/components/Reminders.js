// src/components/Reminders.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Reminders.css";

function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const userId = 1; // replace with logged-in user

  useEffect(() => {
    axios
      .get(`http://localhost:5000/reminders/${userId}`)
      .then((res) => setReminders(res.data.reminders || []))
      .catch((err) => console.error(err));
  }, []);

  const handleInputChange = async (id, field, value) => {
    const updatedReminder = reminders.find((rem) => rem.id === id);
    if (!updatedReminder) return;

    const newData = { ...updatedReminder, [field]: Number(value) };

    try {
      const res = await axios.put(`http://localhost:5000/reminders/${id}`, {
        times_per_day: newData.times_per_day,
        fillups: newData.fillups,
      });
      setReminders((prev) =>
        prev.map((rem) => (rem.id === id ? res.data : rem))
      );
    } catch (err) {
      console.error("❌ Update failed", err);
    }
  };

  const terminatePrescription = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/reminders/${id}`);
      setReminders((prev) => prev.filter((rem) => rem.id !== id));
    } catch (err) {
      console.error("❌ Delete failed", err);
    }
  };

  useEffect(() => {
    const lowStock = reminders
      .filter((rem) => rem.fillups !== undefined && rem.fillups <= 2)
      .map((rem) => `${rem.medicine_name} is running low!`);
    setNotifications(lowStock);
  }, [reminders]);

  return (
    <div className="page-container">
      <div className="sidebar">
        <h2>MedCare</h2>
        <Link to="/register">Registration</Link>
        <Link to="/login">Login</Link>
        <Link to="/medicines">Medicines</Link>
        <Link to="/reminders" className="active">Reminders</Link>
      </div>

      <div className="main-content">
        <div className="header">
          <input type="text" className="search-bar" placeholder="Search reminders..." />
          <button className="logout-button">Logout</button>
        </div>

        <h2>Your Medicine Reminders</h2>

        {notifications.length > 0 && (
          <div className="notifications">
            {notifications.map((note, idx) => (
              <div key={idx} className="notification">{note}</div>
            ))}
          </div>
        )}

        <ul className="reminder-list">
          {reminders.length === 0 ? (
            <p>No medicines in your reminder list.</p>
          ) : (
            reminders.map((rem) => (
              <li key={rem.id} className="reminder-item">
                <div className="reminder-details">
                  <strong>{rem.medicine_name}</strong>
                  <p>
                    Reminder Time:{" "}
                    {new Date(rem.reminder_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="reminder-actions">
                  <label>
                    Times/day:
                    <input
                      type="number"
                      min="1"
                      value={rem.times_per_day || ""}
                      onChange={(e) =>
                        handleInputChange(rem.id, "times_per_day", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Fillups:
                    <input
                      type="number"
                      min="0"
                      value={rem.fillups || ""}
                      onChange={(e) =>
                        handleInputChange(rem.id, "fillups", e.target.value)
                      }
                    />
                  </label>
                  <button
                    className="terminate-button"
                    onClick={() => terminatePrescription(rem.id)}
                  >
                    Terminate
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default Reminders;
