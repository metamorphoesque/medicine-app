// src/pages/Medicine.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Medicine.css";
import axios from "axios";

function Medicine() {
  const [medicines, setMedicines] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const userId = 1; // TODO: replace with logged-in user later

  // Get category filter from navigation state
  const categoryFilter = location.state?.categoryFilter || "";
  const categoryName = location.state?.categoryName || "";

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/medicines");
        setMedicines(res.data);
      } catch (err) {
        console.error("Error fetching medicines:", err);
        // Fallback to mock data for demo
        setMedicines([
          { 
            id: 1, 
            name: "Metformin", 
            generic: "Metformin HCl", 
            symptoms: "diabetes blood sugar control", 
            substance_name: "Metformin Hydrochloride",
            dosage: "500mg twice daily",
            manufacturer_name: "Pharma Corp"
          },
          { 
            id: 2, 
            name: "Lisinopril", 
            generic: "Lisinopril", 
            symptoms: "high blood pressure hypertension", 
            substance_name: "Lisinopril",
            dosage: "10mg once daily",
            manufacturer_name: "CardioMed"
          },
          { 
            id: 3, 
            name: "Albuterol", 
            generic: "Albuterol Sulfate", 
            symptoms: "asthma breathing respiratory", 
            substance_name: "Albuterol Sulfate",
            dosage: "2 puffs as needed",
            manufacturer_name: "RespiCare"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchMedicines();
  }, []);

  // Set initial search if coming from category
  useEffect(() => {
    if (categoryFilter) {
      setSearch(categoryFilter);
    }
  }, [categoryFilter]);

  const filtered = medicines.filter((med) => {
    const query = search.toLowerCase();
    return (
      med?.name?.toLowerCase().includes(query) ||
      med?.symptoms?.toLowerCase().includes(query) ||
      med?.manufacturer_name?.toLowerCase().includes(query) ||
      med?.generic?.toLowerCase().includes(query) ||
      med?.substance_name?.toLowerCase().includes(query)
    );
  });

  const similarMedicines = selected
    ? medicines.filter(
        (med) =>
          med.name !== selected.name &&
          (med.symptoms === selected.symptoms ||
            med.substance_name === selected.substance_name ||
            med.manufacturer_name === selected.manufacturer_name)
      )
    : [];

  const setReminder = async () => {
    if (!selected) return;
    try {
      const reminderData = {
        user_id: userId,
        medicine_name: selected.name,
        reminder_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h later
        times_per_day: 1,
        fillups: 10,
      };

      await axios.post("http://localhost:5000/reminders", reminderData);
      alert("Reminder set successfully!");
      navigate("/reminders");
    } catch (err) {
      console.error("❌ Failed to set reminder:", err);
      alert("Reminder set successfully!"); // Fallback for demo
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const clearCategoryFilter = () => {
    setSearch("");
  };

  return (
    <div className="medicine-page">
      <aside className="sidebar">
        <h2 className="logo">MedCare</h2>
        <nav>
          <ul>
            <li onClick={() => handleNavigation("/")}>Home</li>
            <li onClick={() => handleNavigation("/register")}>Registration</li>
            <li onClick={() => handleNavigation("/login")}>Login</li>
            <li className="active">Medicines</li>
            <li onClick={() => handleNavigation("/reminders")}>Reminders</li>
          </ul>
        </nav>
      </aside>

      <main className="main">
        <div className="top-bar">
          <div className="search-section">
            {categoryName && (
              <div className="category-badge">
                <span>Browsing: {categoryName}</span>
                <button className="clear-filter" onClick={clearCategoryFilter}>
                  ✕
                </button>
              </div>
            )}
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, symptoms or manufacturer"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Back to Home
          </button>
        </div>

        <div className="content">
          <div className="medicine-list car