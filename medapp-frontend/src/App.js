// src/App.js

import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./components/Home";
import BookAppointment from "./components/BookAppointment";
import LabTests from "./components/LabTests";
import LabTestsDetails from "./components/LabTestsDetails";
import Profile from "./components/Profile";
import MedicinePage from "./components/MedicinePage";
import MedicineDetailsPage from "./components/MedicineDetailsPage";
import BookAppointmentDetailsPage from './BookAppointmentDetailsPage';
import SignUp from "./components/SignUp";
import { WishlistProvider } from "./components/Wishlist";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Wishlist from "./components/Wishlist";
import Cart from './components/Cart';
import SellerDashboard from './components/SellerDashboard';
import SellerInventory from './components/SellerInventory';
import SellerAddInventory from './components/SellerAddInventory';
import "./App.css";

// Search component to handle navigation
function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/medicines/category/all?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Search medicines, categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="search-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#004d40">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}

// Floating Action Buttons component - now role-aware
function FloatingButtons() {
  const navigate = useNavigate();
  const { user, isSeller } = useAuth();

  // Seller FABs
  if (isSeller()) {
    return (
      <div className="floating-buttons">
        <div className="fab-container" onClick={() => navigate('/seller/inventory')} title="Add Medicine">
          <div className="fab-btn seller-fab">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <span className="fab-label">Add Medicine</span>
        </div>

        <div className="fab-container" onClick={() => navigate('/seller/orders')} title="Orders">
          <div className="fab-btn seller-fab">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.11 0-2 .89-2 2v14c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
          <span className="fab-label">Orders</span>
        </div>

        <div className="fab-container" onClick={() => navigate('/seller/dashboard')} title="Dashboard">
          <div className="fab-btn seller-fab">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </div>
          <span className="fab-label">Dashboard</span>
        </div>
      </div>
    );
  }

  // Buyer FABs (default)
  return (
    <div className="floating-buttons">
      <div className="fab-container" onClick={() => navigate('/cart')} title="Cart">
        <div className="fab-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <span className="fab-label">Cart</span>
      </div>

      <div className="fab-container" onClick={() => navigate('/wishlist')} title="Wishlist">
        <div className="fab-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <span className="fab-label">Wishlist</span>
      </div>

      <div className="fab-container" onClick={() => console.log('Navigate to reminders')} title="Reminders">
        <div className="fab-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
        <span className="fab-label">Reminders</span>
      </div>
    </div>
  );
}

// Footer component
function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <h2 className="footer-title">About</h2>
        <div className="footer-underline"></div>
        <p className="footer-text">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
      </div>
    </footer>
  );
}

// Main App Content (needs access to auth context)
function AppContent() {
  const { user, isLoggedIn, isSeller, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
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
      {/* Top green header with search and sign up button */}
      <header className="top-header">
        <SearchBar />
        {isLoggedIn() ? (
          <div className="user-menu">
            <span className="username">{user?.username}</span>
            <button onClick={handleLogout} className="auth-link-btn">
              LOG OUT
            </button>
          </div>
        ) : (
          <Link to="/signup" className="auth-link-btn">
            SIGN UP
          </Link>
        )}
      </header>

      {/* Navigation bar - changes based on role */}
      <nav className="nav-bar">
        <div className="nav-links">
          {isSeller() ? (
            <>
              <Link to="/seller/dashboard" className="nav-link">DASHBOARD</Link>
              <Link to="/seller/inventory" className="nav-link">MY INVENTORY</Link>
              <Link to="/seller/orders" className="nav-link">ORDERS</Link>
              <Link to="/seller/analytics" className="nav-link">ANALYTICS</Link>
              <Link to="/profile" className="nav-link">PROFILE</Link>
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">HOME</Link>
              <Link to="/book-appointment" className="nav-link">BOOK AN APPOINTMENT</Link>
              <Link to="/lab-tests" className="nav-link">LAB TESTS</Link>
              {isLoggedIn() ? (
                <Link to="/profile" className="nav-link">PROFILE</Link>
              ) : (
                <Link to="/signup" className="nav-link">SIGN IN / SIGN UP</Link>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Page content */}
      <div className="page-container">
       {/* Page content */}
<div className="page-container">
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Home />} />
    <Route path="/signup" element={<SignUp />} />
    
    {/* Buyer routes */}
    <Route path="/book-appointment" element={<BookAppointment />} />
    <Route path="/lab-tests" element={<LabTests />} />
    <Route path="/lab-tests/:category" element={<LabTestsDetails />} />
    <Route path="/cart" element={<Cart />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/medicines/category/:categoryName" element={<MedicinePage />} />
    <Route path="/medicines/:medicineId" element={<MedicineDetailsPage />} />
    <Route path="/facility-details" element={<BookAppointmentDetailsPage />} />
    <Route path="/wishlist" element={<Wishlist />} />
    
    {/* Seller routes */}
    <Route path="/seller/dashboard" element={<SellerDashboard />} />
    <Route path="/seller/inventory" element={<SellerInventory />} />
    <Route path="/seller/inventory/add" element={<SellerAddInventory />} />
    <Route path="/seller/orders" element={<div style={{padding: '40px', textAlign: 'center'}}>Orders Management - Coming Soon</div>} />
    <Route path="/seller/analytics" element={<div style={{padding: '40px', textAlign: 'center'}}>Analytics - Coming Soon</div>} />
  </Routes>
</div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Global Floating Action Buttons */}
      <FloatingButtons />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <Router>
          <AppContent />
        </Router>
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;