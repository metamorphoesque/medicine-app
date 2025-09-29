// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./components/Home";
import BookAppointment from "./components/BookAppointment";
import LabTests from "./components/LabTests";
import LabTestsDetails from "./components/LabTestsDetails";
import Profile from "./components/Profile";
import MedicinePage from "./components/MedicinePage";
import MedicineDetailsPage from "./components/MedicineDetailsPage";
import BookAppointmentDetailsPage from './BookAppointmentDetailsPage';
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
              placeholder="Search medicines, categories..."
            />
            <button className="search-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#004d40">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>
          </div>
          <button className="auth-btn" onClick={handleAuthClick}>
            {isLoggedIn ? "LOG OUT" : "SIGN UP"}
          </button>
        </header>

        {/* Navigation bar */}
        <nav className="nav-bar">
          <div className="nav-links">
            <Link to="/" className="nav-link">HOME</Link>
            <Link to="/book-appointment" className="nav-link">BOOK AN APPOINTMENT</Link>
            <Link to="/lab-tests" className="nav-link">LAB TESTS</Link>
            {isLoggedIn ? (
              <Link to="/profile" className="nav-link">PROFILE</Link>
            ) : (
              <button className="nav-link login-nav-btn" onClick={handleAuthClick}>
                LOG IN
              </button>
            )}
          </div>
        </nav>

        {/* Page content */}
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book-appointment" element={<BookAppointment />} />
            <Route path="/lab-tests" element={<LabTests />} />
            <Route path="/lab-tests/:category" element={<LabTestsDetails />} />
            
            <Route path="/profile" element={<Profile />} />
            <Route path="/medicines/category/:categoryName" element={<MedicinePage />} />
            <Route path="/medicines/:medicineId" element={<MedicineDetailsPage />} />
            <Route path="/facility-details" element={<BookAppointmentDetailsPage />} />
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