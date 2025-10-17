import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './MedicineDetailsPage.css';
import { WishlistContext } from './Wishlist';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MedicineDetailsPage = () => {
  const { medicineId } = useParams();
  const { addToWishlist } = useContext(WishlistContext);
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [similarMedicines, setSimilarMedicines] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedSections, setExpandedSections] = useState({ symptoms: false, description: false });
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch medicine details
  const fetchMedicineDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching medicine details for ID:', medicineId);
      const response = await fetch(`${API_BASE}/api/medicines/${medicineId}`);
      if (!response.ok) throw new Error('Medicine not found');
      const data = await response.json();
      console.log('Medicine data:', data);
      setMedicine(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching medicine details:', err);
      setError(err.message || 'Failed to fetch medicine details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sellers offering this medicine
  const fetchSellers = async () => {
    try {
      console.log('Fetching sellers for medicine ID:', medicineId);
      const response = await fetch(`${API_BASE}/api/seller-medicines?medicine_id=${medicineId}`);
      console.log('Sellers response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sellers');
      }
      
      const data = await response.json();
      console.log('Sellers data received:', data);
      console.log('Number of sellers:', data.length);
      
      setSellers(data);
      
      // Auto-select the cheapest seller
      if (data.length > 0) {
        const cheapestSeller = data.reduce((prev, current) => 
          (parseFloat(prev.price) < parseFloat(current.price)) ? prev : current
        );
        console.log('Cheapest seller selected:', cheapestSeller);
        setSelectedSeller(cheapestSeller);
      } else {
        console.log('No sellers found for this medicine');
      }
    } catch (err) {
      console.error('Error fetching sellers:', err);
      // If no sellers, show a message but don't error out
      setSellers([]);
    }
  };

  // Fetch similar medicines
  const fetchSimilarMedicines = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/medicines/${medicineId}/similar`);
      if (!response.ok) throw new Error('Failed to fetch similar medicines');
      const data = await response.json();
      setSimilarMedicines(data);
    } catch (err) {
      console.error('Error fetching similar medicines:', err);
    }
  };

  useEffect(() => {
    if (medicineId) {
      fetchMedicineDetails();
      fetchSellers();
      fetchSimilarMedicines();
    }
  }, [medicineId]);

  // Placeholder color for missing images
  const getPlaceholderColor = (name) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!isLoggedIn()) {
      alert('Please log in to add items to cart');
      navigate('/signup');
      return;
    }

    if (!selectedSeller) {
      alert('This medicine is currently not available from any seller. Please check back later.');
      return;
    }

    setAddingToCart(true);

    try {
      const response = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          seller_id: selectedSeller.seller_id,
          medicine_id: medicineId,
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      alert('Added to cart successfully!');
      navigate('/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = () => {
    if (!isLoggedIn()) {
      alert('Please log in to add items to wishlist');
      navigate('/signup');
      return;
    }
    
    addToWishlist(medicine);
    navigate('/wishlist');
  };

  const nextSlide = () => setCurrentSlide(prev => (prev === similarMedicines.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? similarMedicines.length - 1 : prev - 1));
  const handleSimilarMedicineClick = (id) => {
    navigate(`/medicines/${id}`);
    window.scrollTo(0, 0);
  };

  const truncateText = (text, section) => {
    if (!text) return '';
    const limit = 150;
    if (text.length <= limit || expandedSections[section]) return text;
    return text.slice(0, limit) + '...';
  };

  const toggleExpand = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));

  if (loading) return (
    <div className="medicine-details-page">
      <div className="loading-container">
        <div className="loading-spinner"><div className="spinner"></div></div>
        <p>Loading medicine details...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="medicine-details-page">
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary">Go Back</button>
      </div>
    </div>
  );

  if (!medicine) return (
    <div className="medicine-details-page">
      <div className="error-container">
        <p>Medicine not found</p>
      </div>
    </div>
  );

  return (
    <div className="medicine-details-page">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-btn">← Back to medicines</button>

        <div className="medicine-card">
          <div className="medicine-image-top">
            {medicine.image_url ? (
              <img src={medicine.image_url} alt={medicine.name} className="medicine-img" />
            ) : (
              <div className="medicine-placeholder" style={{ backgroundColor: getPlaceholderColor(medicine.name) }}>
                {medicine.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="medicine-header">
            <h1 className="medicine-name-primary">{medicine.name}</h1>
            {medicine.manufacturer_name && <p className="medicine-manufacturer">Manufacturer: {medicine.manufacturer_name}</p>}
          </div>

          <div className="medicine-layout">
            <div className="medicine-info">
              {medicine.symptoms && (
                <div>
                  <h3 className="section-title">Symptoms</h3>
                  <p className="section-content">
                    {truncateText(medicine.symptoms, 'symptoms')}
                    {medicine.symptoms.length > 150 && (
                      <span className="see-more" onClick={() => toggleExpand('symptoms')}>
                        {expandedSections.symptoms ? ' See Less' : '...See More'}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {medicine.description && (
                <div>
                  <h3 className="section-title">Description</h3>
                  <p className="section-content">
                    {truncateText(medicine.description, 'description')}
                    {medicine.description.length > 150 && (
                      <span className="see-more" onClick={() => toggleExpand('description')}>
                        {expandedSections.description ? ' See Less' : '...See More'}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {medicine.composition && (
                <div>
                  <h3 className="section-title">Composition</h3>
                  <p className="section-content">{medicine.composition}</p>
                </div>
              )}

              {medicine.generic && (
                <div>
                  <h3 className="section-title">Generic Name</h3>
                  <p className="section-content">{medicine.generic}</p>
                </div>
              )}

              {medicine.doctor_rating && (
                <div>
                  <h3 className="section-title">Doctor Rating</h3>
                  <div className="rating-container">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`star ${i < medicine.doctor_rating ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                    <span className="rating-text">({medicine.doctor_rating}/5)</span>
                  </div>
                </div>
              )}

              {/* Seller Selection Section */}
              {sellers.length > 0 ? (
                <div>
                  <h3 className="section-title">Available From ({sellers.length} seller{sellers.length > 1 ? 's' : ''})</h3>
                  <div className="sellers-list">
                    {sellers.map((seller) => (
                      <div 
                        key={seller.id} 
                        className={`seller-option ${selectedSeller?.id === seller.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSeller(seller)}
                      >
                        <div className="seller-info">
                          <div className="seller-name">{seller.seller_name || seller.business_name || 'Unknown Seller'}</div>
                          <div className="seller-price">${parseFloat(seller.price).toFixed(2)}</div>
                        </div>
                        {seller.stock !== undefined && seller.stock !== null && (
                          <div className="seller-stock">
                            {seller.stock > 0 ? (
                              <span className="in-stock">In Stock ({seller.stock})</span>
                            ) : (
                              <span className="out-of-stock">Out of Stock</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-sellers-notice">
                  <p>⚠️ Currently not available from any sellers</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                    This medicine is in our catalog but no sellers have it in stock yet.
                  </p>
                </div>
              )}
            </div>

            <div className="medicine-actions-right">
              {selectedSeller && (
                <div className="price-section">
                  <p className="price-label">Price</p>
                  <p className="price">${parseFloat(selectedSeller.price).toFixed(2)}</p>
                  <p className="seller-badge">from {selectedSeller.seller_name || selectedSeller.business_name || 'seller'}</p>
                </div>
              )}

              <div className="action-buttons">
                <button 
                  onClick={handleAddToCart} 
                  className="btn btn-cart"
                  disabled={addingToCart || !selectedSeller || (selectedSeller.stock !== undefined && selectedSeller.stock === 0)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96
                           0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1
                           0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>

                <button onClick={handleAddToWishlist} className="btn btn-wishlist">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  Add to Wishlist
                </button>
              </div>

              {medicine.category_name && (
                <div className="category-section">
                  <span className="category-tag">{medicine.category_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {similarMedicines.length > 0 && (
          <div className="similar-medicines-section">
            <h2 className="similar-title">SIMILAR DOCTOR'S RECOMMENDATION</h2>

            <div className="slideshow-container">
              {similarMedicines.length > 1 && (
                <>
                  <button onClick={prevSlide} className="nav-btn prev-btn">❮</button>
                  <button onClick={nextSlide} className="nav-btn next-btn">❯</button>
                </>
              )}

              <div className="slideshow">
                <div className="slides-container" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                  {similarMedicines.map(similarMed => (
                    <div key={similarMed.id} className="slide">
                      <div className="similar-medicine-card" onClick={() => handleSimilarMedicineClick(similarMed.id)}>
                        <div className="similar-medicine-content">
                          <div className="similar-medicine-image">
                            {similarMed.image_url ? (
                              <img src={similarMed.image_url} alt={similarMed.name} className="similar-img" />
                            ) : (
                              <div className="similar-placeholder" style={{ backgroundColor: getPlaceholderColor(similarMed.name) }}>
                                {similarMed.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="similar-medicine-info">
                            <h3 className="similar-name">{similarMed.name}</h3>
                            {similarMed.manufacturer_name && <p className="similar-manufacturer">By: {similarMed.manufacturer_name}</p>}
                            {similarMed.doctor_rating && (
                              <div className="similar-rating">
                                <div className="stars">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`star small ${i < similarMed.doctor_rating ? 'filled' : ''}`}>★</span>
                                  ))}
                                </div>
                                <span className="rating-text small">({similarMed.doctor_rating}/5)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {similarMedicines.length > 1 && (
                <div className="slide-indicators">
                  {similarMedicines.map((_, index) => (
                    <button key={index} onClick={() => setCurrentSlide(index)} className={`indicator ${index === currentSlide ? 'active' : ''}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicineDetailsPage;