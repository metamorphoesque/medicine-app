// pages/MedicinePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';
import './MedicinePage.css';
import { categoryGroups } from "../services/categoryGroups";

const MedicinePage = () => {
  const { categoryName } = useParams(); // ✅ matches App.js route param
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Category name mapping for display
  const categoryDisplayNames = {
    'heart-blood-pressure-care': 'Heart & Blood Pressure Care',
    'diabetes-care': 'Diabetes Care',
    'respiratory-care': 'Respiratory Care',
    'mental-neurological-care': 'Mental & Neurological Care',
    'digestive-care': 'Digestive Care',
    'allergy-care': 'Allergy Care',
    'dental-care': 'Dental Care',
    'eye-care': 'Eye Care',
    'ear-care': 'Ear Care',
    'dermal-care': 'Skin & Dermatology Care',
    'baby-care': 'Baby Care'
  };

  const fetchMedicines = async (page = 1, search = '', categorySlug = '') => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching medicines with params:', { page, search, category: categorySlug });

      // Get the medicine subcategories for this category
      const subcategories = categoryGroups[categorySlug] || [];
      
      const response = await ApiService.getMedicines({
        page,
        limit: 20,
        search: search.trim(),
        category: categorySlug,
        subcategories: subcategories // Pass subcategories to the API
      });

      console.log('Medicine API Response:', response);

      if (response && response.medicines) {
        setMedicines(response.medicines);
        
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.totalItems);
        } else {
          setTotalPages(Math.ceil(response.medicines.length / 20));
          setTotalItems(response.medicines.length);
        }
      } else {
        setMedicines([]);
        setTotalPages(0);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError(`Failed to fetch medicines: ${err.message}`);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  // Main effect to fetch medicines when component mounts or parameters change
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    const currentPageFromUrl = parseInt(searchParams.get('page')) || 1;
    
    setSearchTerm(currentSearch);
    setCurrentPage(currentPageFromUrl);
    
    if (categoryName) {
      fetchMedicines(currentPageFromUrl, currentSearch, categoryName); // ✅ use categoryName
    }
  }, [categoryName, searchParams]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', newPage.toString());
      setSearchParams(newParams);
    }
  };

  const handleMedicineClick = (medicineId) => {
    navigate(`/medicines/${medicineId}`); // ✅ plural
  };

  const handleViewDetails = (medicineId, e) => {
    e.stopPropagation();
    navigate(`/medicines/${medicineId}`); // ✅ plural
  };

  const handleAddToCart = (medicine, e) => {
    e.stopPropagation();
    // Add to cart functionality - can store in localStorage or context
    console.log('Add to cart:', medicine.name);
    
    // Navigate to cart page
    navigate('/component/Cart');
  };

  const getCategoryDisplayName = () => {
    return categoryDisplayNames[categoryName] || 'All Medicines'; // ✅ use categoryName
  };

  const getRandomColor = () => {
    const colors = ['#0b6835', '#e74c3c', '#3498db', '#9b59b6', '#f39c12', '#1abc9c', '#34495e'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (loading) {
    return (
      <div className="medicine-page loading-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading medicines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="medicine-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <span onClick={() => navigate('/')} className="breadcrumb-link">Home</span>
          <span className="breadcrumb-separator"> / </span>
          <span className="breadcrumb-current">{getCategoryDisplayName()}</span>
        </div>
        
        <h1 className="page-title">{getCategoryDisplayName()}</h1>
        
        {totalItems > 0 && (
          <p className="page-subtitle">Found {totalItems} medicine{totalItems !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Medicine Layout */}
      <div className="medicine-layout">
        {/* Main Content */}
        <div className="medicine-content">
          {/* Error State */}
          {error && (
            <div className="error">
              <h2>Error Loading Medicines</h2>
              <p>{error}</p>
              <button onClick={() => fetchMedicines(currentPage, searchTerm, categoryName)}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!error && medicines.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-state-icon">💊</div>
              <h2>No medicines found</h2>
              <p>No medicines available in {getCategoryDisplayName()}</p>
            </div>
          )}

          {/* Medicine Grid */}
          {medicines.length > 0 && (
            <>
              <div className="medicine-grid">
                {medicines.map((medicine) => (
                  <div 
                    key={medicine.id} 
                    className="medicine-card"
                    onClick={() => handleMedicineClick(medicine.id)}
                  >
                    {/* Category Badge */}
                    {medicine.category_name && (
                      <div className="medicine-category">
                        {medicine.category_name}
                      </div>
                    )}

                    {/* Medicine Image */}
                    <div className="medicine-img-container">
                      {medicine.image_url ? (
                        <img 
                          src={medicine.image_url} 
                          alt={medicine.name}
                          className="medicine-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="medicine-img-placeholder" 
                        style={{ 
                          display: medicine.image_url ? 'none' : 'flex',
                          backgroundColor: getRandomColor()
                        }}
                      >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Medicine Info */}
                    <div className="medicine-info">
                      <h3 className="medicine-name">{medicine.name}</h3>
                      
                      {medicine.generic && medicine.generic !== medicine.name && (
                        <p className="medicine-generic">Generic: {medicine.generic}</p>
                      )}
                      
                      {medicine.manufacturer_name && medicine.manufacturer_name !== 'Unknown' && (
                        <p className="medicine-manufacturer">By {medicine.manufacturer_name}</p>
                      )}
                      
                      {medicine.composition && (
                        <p className="medicine-composition">
                          <strong>Composition:</strong> {medicine.composition.length > 50 
                            ? `${medicine.composition.substring(0, 50)}...` 
                            : medicine.composition
                          }
                        </p>
                      )}
                      
                      {medicine.description && (
                        <p className="medicine-description">
                          <strong>Description:</strong> {medicine.description.length > 80 
                            ? `${medicine.description.substring(0, 80)}...` 
                            : medicine.description
                          }
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="medicine-actions">
                      <button 
                        className="action-btn view-btn"
                        onClick={(e) => handleViewDetails(medicine.id, e)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        View Details
                      </button>
                      <button 
                        className="action-btn add-cart-btn"
                        onClick={(e) => handleAddToCart(medicine, e)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                    Previous
                  </button>
                  
                  <div className="pagination-info">
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  
                  <div className="pagination-pages">
                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                      const pageNum = Math.max(1, currentPage - 2) + index;
                      if (pageNum <= totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`pagination-btn ${pageNum === currentPage ? 'active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Sidebar */}
        <div className="filter-sidebar">
          <div className="filter-panel">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
              </svg>
              Filter Medicines
            </h3>
            
            <div className="filter-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Price Range
              </label>
              <select>
                <option>All Prices</option>
                <option>Under $10</option>
                <option>$10 - $50</option>
                <option>$50 - $100</option>
                <option>Over $100</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Manufacturer
              </label>
              <select>
                <option>All Manufacturers</option>
                <option>Brand A</option>
                <option>Brand B</option>
                <option>Brand C</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                Rating
              </label>
              <select>
                <option>All Ratings</option>
                <option>4+ Stars</option>
                <option>3+ Stars</option>
                <option>2+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                </svg>
                Availability
              </label>
              <select>
                <option>All</option>
                <option>In Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>

            <div className="filter-actions">
              <button className="apply-filters-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Apply Filters
              </button>
              <button className="clear-filters-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicinePage;