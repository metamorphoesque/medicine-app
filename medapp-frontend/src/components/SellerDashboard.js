import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SellerDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SellerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentInventory, setRecentInventory] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/');
      return;
    }
    
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await fetch(`${API_BASE}/api/seller/${user.sellerId}/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent inventory (last 5 items)
      const inventoryResponse = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/inventory?limit=5`
      );
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setRecentInventory(inventoryData.inventory || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.businessName || user?.username}! 👋</h1>
          <p>Manage your inventory, orders, and track your business performance</p>
        </div>
        <div className="verification-badge verified">
          ✓ Active Seller
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon products">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0b6835" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon low-stock">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f57c00" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.lowStock}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>
        
        <div className="stat-card danger">
          <div className="stat-icon out-stock">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>{stats.outOfStock}</h3>
            <p>Out of Stock</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon revenue">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0b6835" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>${stats.revenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => navigate('/seller/inventory/add')}
          >
            <div className="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h3>Add New Medicine</h3>
            <p>Add products to your inventory</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/inventory')}
          >
            <div className="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <h3>Manage Inventory</h3>
            <p>Update stock and prices</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/orders')}
          >
            <div className="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <h3>View Orders</h3>
            <p>Manage customer orders</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/analytics')}
          >
            <div className="action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h3>View Analytics</h3>
            <p>Track your performance</p>
          </button>
        </div>
      </div>

      {/* Recent Inventory */}
      <div className="recent-inventory-section">
        <div className="section-header">
          <h2>Recent Inventory</h2>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/seller/inventory')}
          >
            View All →
          </button>
        </div>
        
        {recentInventory.length > 0 ? (
          <div className="inventory-table">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInventory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="medicine-cell">
                        <strong>{item.name}</strong>
                        {item.generic && <small>{item.generic}</small>}
                      </div>
                    </td>
                    <td>{item.category_name || 'Uncategorized'}</td>
                    <td>${parseFloat(item.price).toFixed(2)}</td>
                    <td>{item.stock} units</td>
                    <td>
                      <span className={`status-badge ${
                        item.stock === 0 ? 'out-of-stock' :
                        item.stock < 10 ? 'low-stock' : 'in-stock'
                      }`}>
                        {item.stock === 0 ? 'Out of Stock' :
                         item.stock < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>📦 No inventory items yet.</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/seller/inventory/add')}
            >
              Add Your First Medicine
            </button>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>Need Help?</h3>
        <p>Check out our seller guide or contact support for assistance.</p>
        <div className="help-links">
          <button className="help-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Seller Guide
          </button>
          <button className="help-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Contact Support
          </button>
          <button className="help-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            FAQs
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;