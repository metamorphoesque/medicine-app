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

  const handleSearch = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (searchTerm.trim()) newParams.set('search', searchTerm.trim());
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

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

  const clearSearch = () => {
    setSearchTerm('');
    const newParams = new URLSearchParams();
    newParams.set('page', '1');
    setSearchParams(newParams);
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
      <div className="medicine-page">
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
          {/* Search Section */}
          <div className="search-filter-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-container">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search medicines..."
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    onClick={clearSearch}
                    className="clear-search-btn"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              <button type="submit" className="search-btn">
                Search
              </button>
            </form>
          </div>

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
              <p>
                {searchTerm 
                  ? `No medicines match "${searchTerm}" in ${getCategoryDisplayName()}`
                  : `No medicines available in ${getCategoryDisplayName()}`
                }
              </p>
              {searchTerm && (
                <button onClick={clearSearch} className="clear-search-btn-large">
                  Clear Search
                </button>
              )}
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
                        {medicine.name.charAt(0).toUpperCase()}
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
                          {medicine.description.length > 80 
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
                        View Details
                      </button>
                      <button 
                        className="action-btn add-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add to cart functionality
                          console.log('Add to cart:', medicine.name);
                        }}
                      >
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
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Sidebar */}
        <div className="filter-sidebar">
          <div className="filter-panel">
            <h3>Filter Medicines</h3>
            
            <div className="filter-group">
              <label>Price Range</label>
              <select>
                <option>All Prices</option>
                <option>Under $10</option>
                <option>$10 - $50</option>
                <option>$50 - $100</option>
                <option>Over $100</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Manufacturer</label>
              <select>
                <option>All Manufacturers</option>
                <option>Brand A</option>
                <option>Brand B</option>
                <option>Brand C</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Rating</label>
              <select>
                <option>All Ratings</option>
                <option>4+ Stars</option>
                <option>3+ Stars</option>
                <option>2+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Availability</label>
              <select>
                <option>All</option>
                <option>In Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>

            <button className="apply-filters-btn">Apply Filters</button>
            <button className="clear-filters-btn">Clear All</button>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="floating-buttons">
        <button className="fab" onClick={() => window.scrollTo(0, 0)} title="Back to top">
          ↑
        </button>
      </div>
    </div>
  );
};

export default MedicinePage;
