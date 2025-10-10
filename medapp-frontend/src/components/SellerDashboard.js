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
          <div className="stat-icon products">📦</div>
          <div className="stat-content">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon low-stock">⚠️</div>
          <div className="stat-content">
            <h3>{stats.lowStock}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>
        
        <div className="stat-card danger">
          <div className="stat-icon out-stock">🚫</div>
          <div className="stat-content">
            <h3>{stats.outOfStock}</h3>
            <p>Out of Stock</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon revenue">💰</div>
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
            <div className="action-icon">➕</div>
            <h3>Add New Medicine</h3>
            <p>Add products to your inventory</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/inventory')}
          >
            <div className="action-icon">📊</div>
            <h3>Manage Inventory</h3>
            <p>Update stock and prices</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/orders')}
          >
            <div className="action-icon">📦</div>
            <h3>View Orders</h3>
            <p>Manage customer orders</p>
          </button>
          
          <button 
            className="action-card"
            onClick={() => navigate('/seller/analytics')}
          >
            <div className="action-icon">📈</div>
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
          <button className="help-link">📖 Seller Guide</button>
          <button className="help-link">💬 Contact Support</button>
          <button className="help-link">❓ FAQs</button>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;