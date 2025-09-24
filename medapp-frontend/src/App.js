import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./components/Home";
import BookAppointment from "./components/BookAppointment";
import LabTests from "./components/LabTests";
import Profile from "./components/Profile";
import MedicinePage from "./components/MedicinePage";
import MedicineDetailsPage from './components/MedicineDetailsPage';
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleAuthClick = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <Router>
      <div 
        className="app"
        style={{ 
          backgroundImage: 'url(/images/Background1.png)', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }}
      >
        {/* Top green header with search and login */}
        <header className="top-header">
          <div className="search-container">
            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search medicines, categories..."
            />
            <button className="clear-search">✕</button>
          </div>
          <button className="auth-btn" onClick={handleAuthClick}>
            {isLoggedIn ? "LOG OUT" : "LOG IN/OUT"}
          </button>
        </header>

        {/* Navigation bar */}
        <nav className="nav-bar">
          <div className="nav-links">
            <Link to="/" className="nav-link">HOME</Link>
            <Link to="/book-appointment" className="nav-link">BOOK AN APPOINTMENT</Link>
            <Link to="/lab-tests" className="nav-link">LAB TESTS</Link>
            <Link to="/profile" className="nav-link">PROFILE</Link>
          </div>
        </nav>

        {/* Page content */}
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book-appointment" element={<BookAppointment />} />
            <Route path="/lab-tests" element={<LabTests />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/medicines/category/:categoryName" element={<MedicinePage />} />
            <Route path="/medicine/:medicineId" element={<MedicineDetailsPage />} />
          </Routes>
        </div>

        {/* Floating Action Buttons (Global) */}
        <div className="floating-buttons">
          <button className="fab-btn">
            <svg width="20" height="20" fill="green"><circle cx="10" cy="10" r="9"/></svg>
            Cart
          </button>
          <button className="fab-btn">
            <svg width="20" height="20" fill="green"><rect x="3" y="3" width="14" height="14" rx="3"/></svg>
            Wishlist
          </button>
          <button className="fab-btn">
            <svg width="20" height="20" fill="green"><path d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z"/></svg>
            Reminders
          </button>
        </div>
      </div>
    </Router>
  );
}

export default App;
