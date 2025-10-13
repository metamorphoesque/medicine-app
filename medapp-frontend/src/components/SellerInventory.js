import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SellerInventory.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SellerInventory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ price: '', stock: '' });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/');
      return;
    }
    fetchInventory();
  }, [user, navigate, searchTerm]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/inventory?limit=50${searchParam}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
        setPagination(data.pagination || {});
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setEditForm({
      price: item.price,
      stock: item.stock
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ price: '', stock: '' });
  };

  const handleSaveEdit = async (itemId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/inventory/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price: parseFloat(editForm.price),
            stock: parseInt(editForm.stock)
          })
        }
      );

      if (response.ok) {
        setEditingItem(null);
        fetchInventory(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update item');
      }
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleDelete = async (itemId, medicineName) => {
    if (!window.confirm(`Are you sure you want to remove "${medicineName}" from your inventory?`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/inventory/${itemId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchInventory(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  return (
    <div className="seller-inventory">
      <div className="inventory-header">
        <h1>My Inventory</h1>
        <button 
          className="add-medicine-btn"
          onClick={() => navigate('/seller/inventory/add')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Medicine
        </button>
      </div>

      <div className="inventory-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search your inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="inventory-search"
          />
        </div>
        <div className="inventory-stats-mini">
          <span>Total Items: {pagination.totalItems || 0}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory...</p>
        </div>
      ) : inventory.length > 0 ? (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className={item.stock === 0 ? 'out-of-stock-row' : ''}>
                  <td>
                    <div className="medicine-info">
                      <strong>{item.name}</strong>
                      {item.generic && <small>{item.generic}</small>}
                    </div>
                  </td>
                  <td>{item.category_name || 'N/A'}</td>
                  <td>{item.manufacturer_name || 'N/A'}</td>
                  <td>
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="edit-input"
                      />
                    ) : (
                      `$${parseFloat(item.price).toFixed(2)}`
                    )}
                  </td>
                  <td>
                    {editingItem === item.id ? (
                      <input
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        className="edit-input"
                      />
                    ) : (
                      `${item.stock} units`
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${
                      item.stock === 0 ? 'out-of-stock' :
                      item.stock < 10 ? 'low-stock' : 'in-stock'
                    }`}>
                      {item.stock === 0 ? 'Out of Stock' :
                       item.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {editingItem === item.id ? (
                        <>
                          <button 
                            className="btn-save"
                            onClick={() => handleSaveEdit(item.id)}
                            title="Save"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={handleCancelEdit}
                            title="Cancel"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(item.id, item.name)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <h3>No Inventory Items</h3>
          <p>Start building your inventory by adding medicines</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/seller/inventory/add')}
          >
            Add Your First Medicine
          </button>
        </div>
      )}
    </div>
  );
};

export default SellerInventory;