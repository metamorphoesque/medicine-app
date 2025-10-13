import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SellerAddInventory.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SellerAddInventory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [formData, setFormData] = useState({ price: '', stock: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'seller') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Handle search from URL parameter (when coming from global search)
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
      searchMedicines(searchFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchMedicines(searchTerm);
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchMedicines = async (term = searchTerm) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/search-medicines?search=${encodeURIComponent(term)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.medicines || []);
      }
    } catch (err) {
      console.error('Error searching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setSearchResults([]);
  };

  const handleAddToInventory = async (e) => {
    e.preventDefault();
    
    if (!selectedMedicine) {
      alert('Please select a medicine first');
      return;
    }

    if (!formData.price || !formData.stock) {
      alert('Please enter both price and stock');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(
        `${API_BASE}/api/seller/${user.sellerId}/inventory`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicine_id: selectedMedicine.id,
            price: parseFloat(formData.price),
            stock: parseInt(formData.stock)
          })
        }
      );

      if (response.ok) {
        alert('Medicine added to inventory successfully!');
        navigate('/seller/inventory');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add medicine');
      }
    } catch (err) {
      console.error('Error adding to inventory:', err);
      alert('Failed to add medicine');
    } finally {
      setAdding(false);
    }
  };

  const getPlaceholderColor = (name) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="seller-add-inventory">
      <div className="add-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/seller/inventory')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Inventory
        </button>
        <h1>Add Medicine to Inventory</h1>
      </div>

      <div className="add-container">
        {!selectedMedicine ? (
          <div className="search-section">
            <h2>Search for a Medicine</h2>
            <div className="search-box-large">
              <input
                type="text"
                placeholder="Search by medicine name, generic name, or composition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="medicine-search-input"
                autoFocus
              />
              {loading && <div className="search-loading">Searching...</div>}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((medicine) => (
                  <div 
                    key={medicine.id} 
                    className="medicine-result-card"
                    onClick={() => handleSelectMedicine(medicine)}
                  >
                    {/* Category Badge */}
                    {medicine.category_name && (
                      <div className="category-badge">
                        {medicine.category_name}
                      </div>
                    )}

                    {/* Medicine Image */}
                    <div className="medicine-image-container">
                      {medicine.image_url ? (
                        <img 
                          src={medicine.image_url} 
                          alt={medicine.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="placeholder-image" 
                        style={{ 
                          display: medicine.image_url ? 'none' : 'flex',
                          backgroundColor: getPlaceholderColor(medicine.name)
                        }}
                      >
                        {medicine.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Medicine Info */}
                    <div className="medicine-result-info">
                      <h3>{medicine.name}</h3>
                      {medicine.generic && <p className="generic-name">Generic: {medicine.generic}</p>}
                      {medicine.manufacturer_name && (
                        <p className="manufacturer">By {medicine.manufacturer_name}</p>
                      )}
                    </div>

                    {/* Select Icon */}
                    <div className="select-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
              <div className="no-results">
                <p>No medicines found matching "{searchTerm}"</p>
                <small>Try a different search term or check if it's already in your inventory</small>
              </div>
            )}
          </div>
        ) : (
          <div className="selected-medicine-section">
            <div className="selected-medicine-card">
              <button 
                className="change-medicine-btn"
                onClick={() => {
                  setSelectedMedicine(null);
                  setFormData({ price: '', stock: '' });
                }}
              >
                Change Medicine
              </button>

              <div className="medicine-display">
                <div className="medicine-image-large">
                  {selectedMedicine.image_url ? (
                    <img src={selectedMedicine.image_url} alt={selectedMedicine.name} />
                  ) : (
                    <div 
                      className="placeholder-large"
                      style={{ backgroundColor: getPlaceholderColor(selectedMedicine.name) }}
                    >
                      {selectedMedicine.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="medicine-details">
                  <h2>{selectedMedicine.name}</h2>
                  {selectedMedicine.generic && (
                    <p className="generic-name">Generic: {selectedMedicine.generic}</p>
                  )}
                  {selectedMedicine.manufacturer_name && (
                    <p className="manufacturer">Manufacturer: {selectedMedicine.manufacturer_name}</p>
                  )}
                  {selectedMedicine.category_name && (
                    <span className="category-badge">{selectedMedicine.category_name}</span>
                  )}
                </div>
              </div>

              <form className="inventory-form" onSubmit={handleAddToInventory}>
                <h3>Set Your Price and Stock</h3>
                
                <div className="form-group">
                  <label htmlFor="price">Your Price (USD) *</label>
                  <input
                    type="number"
                    id="price"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="form-input-large"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="stock">Stock Quantity *</label>
                  <input
                    type="number"
                    id="stock"
                    min="0"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                    className="form-input-large"
                  />
                </div>

                <button 
                  type="submit" 
                  className="submit-btn-large"
                  disabled={adding}
                >
                  {adding ? 'Adding...' : 'Add to My Inventory'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAddInventory;