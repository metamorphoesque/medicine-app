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
          ➕ Add Medicine
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
                          >
                            ✓
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={handleCancelEdit}
                          >
                            ✗
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn-edit"
                            onClick={() => handleEdit(item)}
                          >
                            ✎
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            🗑
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
          <div className="empty-icon">📦</div>
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