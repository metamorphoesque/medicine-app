import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MedicinePage.css';

const MedicinePage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    manufacturer: '',
    priceRange: [0, 500],
    rating: 0,
  });

  const fetchMedicines = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/medicines/category/${encodeURIComponent(categoryName)}?page=${page}&limit=20&sortBy=rating`
      );

      setMedicines(response.data.medicines);
      setFilteredMedicines(response.data.medicines);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError(err.response?.data?.error || 'Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryName) {
      fetchMedicines(1);
      setCurrentPage(1);
    }
  }, [categoryName]);

  // Search + filter effect
  useEffect(() => {
    let results = medicines;

    if (searchTerm.trim() !== '') {
      results = results.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (medicine.generic && medicine.generic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (medicine.manufacturer_name && medicine.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Manufacturer filter
    if (filters.manufacturer.trim() !== '') {
      results = results.filter(m =>
        m.manufacturer_name &&
        m.manufacturer_name.toLowerCase().includes(filters.manufacturer.toLowerCase())
      );
    }

    // Price filter
    results = results.filter(m => {
      if (!m.price) return true;
      return m.price >= filters.priceRange[0] && m.price <= filters.priceRange[1];
    });

    // Rating filter (if available in your db)
    if (filters.rating > 0) {
      results = results.filter(m => (m.rating || 0) >= filters.rating);
    }

    setFilteredMedicines(results);
  }, [searchTerm, filters, medicines]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchMedicines(page);
  };

  const handleViewDetails = (medicineId) => {
    navigate(`/medicine/${medicineId}`);
    console.log('View details for medicine:', medicineId);
  };

  const handleAddToCart = (medicineId) => {
    console.log('Add to cart:', medicineId);
  };

  // Generate a color based on medicine name for consistent placeholder colors
  const getPlaceholderColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="medicine-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          Loading medicines...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="medicine-page">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => fetchMedicines(currentPage)}>Retry</button>
        </div>
      </div>
    );
  }

  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;

    const pages = [];
    const totalPages = pagination.totalPages;
    const current = pagination.currentPage;

    pages.push(
      <button
        key="prev"
        className="pagination-btn"
        disabled={current === 1}
        onClick={() => handlePageChange(current - 1)}
      >
        Previous
      </button>
    );

    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`pagination-btn ${i === current ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    pages.push(
      <button
        key="next"
        className="pagination-btn"
        disabled={current === totalPages}
        onClick={() => handlePageChange(current + 1)}
      >
        Next
      </button>
    );

    return pages;
  };

  return (
    <div className="medicine-page">
      <div className="page-header">
        <h1 className="page-title">{decodeURIComponent(categoryName)}</h1>
      </div>

      <div className="medicine-layout">
        {/* Left: Medicines */}
        <div className="medicine-content">
          <div className="search-filter-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search medicines by name, generic, or manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💊</div>
              <h2>No medicines found</h2>
              <p>
                {searchTerm
                  ? `No medicines match your search "${searchTerm}"`
                  : "No medicines available in this category"}
              </p>
            </div>
          ) : (
            <div className="medicine-grid">
              {filteredMedicines.map((medicine) => (
                <div key={medicine.id} className="medicine-card">
                  {medicine.category_name && (
                    <div className="medicine-category">{medicine.category_name}</div>
                  )}

                  {/* Updated image section - no more image_url dependency */}
                  <div className="medicine-img-container">
                    <div 
                      className="medicine-img-placeholder"
                      style={{ 
                        backgroundColor: getPlaceholderColor(medicine.name),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        minHeight: '120px'
                      }}
                    >
                      {medicine.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="medicine-info">
                    <h3 className="medicine-name">{medicine.name}</h3>
                  
                    {medicine.manufacturer_name && (
                      <p className="medicine-manufacturer">
                        By: {medicine.manufacturer_name}
                      </p>
                    )}
                    {medicine.price && (
                      <p className="medicine-price-display">
                        ${parseFloat(medicine.price).toFixed(2)}
                      </p>
                    )}
                    {medicine.doctor_rating && (
                      <div className="medicine-rating">
                        <span className="rating-stars">
                          {'★'.repeat(medicine.doctor_rating)}{'☆'.repeat(5 - medicine.doctor_rating)}
                        </span>
                        <span className="rating-text">({medicine.doctor_rating}/5)</span>
                      </div>
                    )}

                    <div className="medicine-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(medicine.id)}
                      >
                        View Details
                      </button>
                      <button
                        className="action-btn add-cart-btn"
                        onClick={() => handleAddToCart(medicine.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          style={{ marginRight: '6px' }}
                        >
                          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 
                          2 2 2-.9 2-2-.9-2-2-2zM1 
                          2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 
                          0 1.1.9 2 2 2h12v-2H7.42c-.14 
                          0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 
                          0 1.41-.41 1.75-1.03L21.7 
                          4H5.21l-.94-2H1zm16 16c-1.1 
                          0-2 .9-2 2s.9 2 2 2 2-.9 
                          2-2-.9-2-2-2z" />
                        </svg>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && !searchTerm && (
            <div className="pagination">{renderPagination()}</div>
          )}
        </div>

        {/* Right: Filter panel */}
        <div className="filter-panel">
          <h3>Filter</h3>

          <div className="filter-group">
            <label>Manufacturer</label>
            <input
              type="text"
              placeholder="Enter manufacturer"
              value={filters.manufacturer}
              onChange={(e) =>
                setFilters({ ...filters, manufacturer: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange[0]}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  priceRange: [Number(e.target.value), filters.priceRange[1]],
                })
              }
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange[1]}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  priceRange: [filters.priceRange[0], Number(e.target.value)],
                })
              }
            />
          </div>

          <div className="filter-group">
            <label>Minimum Rating</label>
            <select
              value={filters.rating}
              onChange={(e) =>
                setFilters({ ...filters, rating: Number(e.target.value) })
              }
            >
              <option value={0}>All</option>
              <option value={1}>1★ & up</option>
              <option value={2}>2★ & up</option>
              <option value={3}>3★ & up</option>
              <option value={4}>4★ & up</option>
              <option value={5}>5★ only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="floating-buttons">
        <button className="fab wishlist-fab" onClick={() => navigate('/wishlist')}>
          ❤
        </button>
        <button className="fab cart-fab" onClick={() => navigate('/cart')}>
          🛒
        </button>
        <button className="fab reminders-fab" onClick={() => navigate('/reminders')}>
          ⏰
        </button>
      </div>
    </div>
  );
};

export default MedicinePage;