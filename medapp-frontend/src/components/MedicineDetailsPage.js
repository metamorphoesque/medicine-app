import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MedicineDetailsPage.css';

const MedicineDetailsPage = () => {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const [medicine, setMedicine] = useState(null);
  const [similarMedicines, setSimilarMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch medicine details
  const fetchMedicineDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/medicines/${medicineId}/details`);
      
      if (!response.ok) {
        throw new Error('Medicine not found');
      }
      
      const data = await response.json();
      setMedicine(data);
      
      // Set similar medicines sorted by doctor rating
      if (data.similar_medicines) {
        const sortedSimilar = data.similar_medicines.sort((a, b) => 
          (b.doctor_rating || 0) - (a.doctor_rating || 0)
        );
        setSimilarMedicines(sortedSimilar);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching medicine details:', err);
      setError(err.message || 'Failed to fetch medicine details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (medicineId) {
      fetchMedicineDetails();
    }
  }, [medicineId]);

  // Generate placeholder color
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

  // Handle add to cart
  const handleAddToCart = () => {
    console.log('Adding to cart:', medicine.id);
    // Add your cart logic here
  };

  // Handle add to wishlist
  const handleAddToWishlist = () => {
    console.log('Adding to wishlist:', medicine.id);
    // Add your wishlist logic here
  };

  // Slideshow navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === similarMedicines.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? similarMedicines.length - 1 : prev - 1
    );
  };

  // Navigate to similar medicine details
  const handleSimilarMedicineClick = (id) => {
    navigate(`/medicine/${id}`);
  };

  if (loading) {
    return (
      <div className="medicine-details-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p>Loading medicine details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="medicine-details-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="medicine-details-page">
        <div className="error-container">
          <p>Medicine not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="medicine-details-page">
      <div className="container">
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back to medicines
        </button>

        {/* Main Medicine Card */}
        <div className="medicine-card">
          <div className="medicine-layout">
            {/* Left: Medicine Info */}
            <div className="medicine-info">
              {medicine.manufacturer_name && (
                <p className="info-item">
                  <span className="info-label">Manufacturer:</span> {medicine.manufacturer_name}
                </p>
              )}

              {medicine.generic && (
                <p className="info-item">
                  <span className="info-label">Generic:</span> {medicine.generic}
                </p>
              )}

              {medicine.description && (
                <div className="info-section">
                  <h3 className="section-title">Description:</h3>
                  <p className="section-content">{medicine.description}</p>
                </div>
              )}

              {medicine.symptoms && (
                <div className="info-section">
                  <h3 className="section-title">Symptoms:</h3>
                  <p className="section-content">{medicine.symptoms}</p>
                </div>
              )}

              {medicine.composition && (
                <div className="info-section">
                  <h3 className="section-title">Composition:</h3>
                  <p className="section-content">{medicine.composition}</p>
                </div>
              )}

              {medicine.doctor_rating && (
                <div className="rating-section">
                  <span className="info-label">Doctor Rating:</span>
                  <div className="rating-container">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`star ${i < medicine.doctor_rating ? 'filled' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="rating-text">({medicine.doctor_rating}/5)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Center: Medicine Image and Name */}
              
             <div className="medicine-center">
                <div className="medicine-image">
                {medicine.image_url ? (
                <img 
                src={medicine.image_url} 
                alt={medicine.name}
                className="medicine-img"
                        />
                        ) : (
                        <div 
                            className="medicine-placeholder"
                            style={{ backgroundColor: getPlaceholderColor(medicine.name) }}
                        >
                            {medicine.name.charAt(0).toUpperCase()}
                        </div>
                        )}
                    </div>
                    
                    {/* Medicine Name + Details under image */}
                    <div className="medicine-details-below">
                        <h1 className="medicine-name green-label">Name: {medicine.name}</h1>

                        {medicine.description && (
                        <p className="medicine-detail green-label">
                            Description: <span className="detail-text">{medicine.description}</span>
                        </p>
                        )}

                        {medicine.symptoms && (
                        <p className="medicine-detail green-label">
                            Symptoms: <span className="detail-text">{medicine.symptoms}</span>
                        </p>
                        )}

                        {medicine.manufacturer_name && (
                        <p className="medicine-detail green-label">
                            Manufacturer: <span className="detail-text">{medicine.manufacturer_name}</span>
                        </p>
                        )}

                        {medicine.composition && (
                        <p className="medicine-detail green-label">
                            Composition: <span className="detail-text">{medicine.composition}</span>
                        </p>
                        )}

                        {medicine.doctor_rating && (
                        <div className="rating-section">
                            <span className="info-label">Doctor Rating:</span>
                            <div className="rating-container">
                            <div className="stars">
                                {[...Array(5)].map((_, i) => (
                                <span
                                    key={i}
                                    className={`star ${i < medicine.doctor_rating ? "filled" : ""}`}
                                >
                                    ★
                                </span>
                                ))}
                            </div>
                            <span className="rating-text">({medicine.doctor_rating}/5)</span>
                            </div>
                        </div>
                        )}
                    </div>
                    </div>


            {/* Right: Price and Actions */}
            <div className="medicine-actions">
              {medicine.price && (
                <div className="price-section">
                  <p className="price">
                    ${parseFloat(medicine.price).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="action-buttons">
                <button onClick={handleAddToCart} className="btn btn-cart">
                  🛒 ADD TO CART
                </button>
                
                <button onClick={handleAddToWishlist} className="btn btn-wishlist">
                  ❤ WISHLIST
                </button>
              </div>

              {medicine.category_name && (
                <div className="category-section">
                  <span className="category-tag">
                    {medicine.category_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Similar Medicines Section */}
        {similarMedicines.length > 0 && (
          <div className="similar-medicines-section">
            <h2 className="similar-title">SIMILAR DOCTOR'S RECOMMENDATION</h2>
            
            <div className="slideshow-container">
              {/* Navigation Buttons */}
              {similarMedicines.length > 1 && (
                <>
                  <button onClick={prevSlide} className="nav-btn prev-btn">
                    ❮
                  </button>
                  
                  <button onClick={nextSlide} className="nav-btn next-btn">
                    ❯
                  </button>
                </>
              )}

              {/* Slideshow */}
              <div className="slideshow">
                <div 
                  className="slides-container"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {similarMedicines.map((similarMed) => (
                    <div key={similarMed.id} className="slide">
                      <div 
                        className="similar-medicine-card"
                        onClick={() => handleSimilarMedicineClick(similarMed.id)}
                      >
                        <div className="similar-medicine-content">
                          {/* Similar Medicine Image */}
                          <div className="similar-medicine-image">
                            {similarMed.image_url ? (
                              <img 
                                src={similarMed.image_url} 
                                alt={similarMed.name}
                                className="similar-img"
                              />
                            ) : (
                              <div 
                                className="similar-placeholder"
                                style={{ backgroundColor: getPlaceholderColor(similarMed.name) }}
                              >
                                {similarMed.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Medicine Info */}
                          <div className="similar-medicine-info">
                            <h3 className="similar-name">{similarMed.name}</h3>
                            
                            {similarMed.manufacturer_name && (
                              <p className="similar-manufacturer">
                                By: {similarMed.manufacturer_name}
                              </p>
                            )}

                            {similarMed.doctor_rating && (
                              <div className="similar-rating">
                                <div className="stars">
                                  {[...Array(5)].map((_, i) => (
                                    <span
                                      key={i}
                                      className={`star small ${i < similarMed.doctor_rating ? 'filled' : ''}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="rating-text small">
                                  ({similarMed.doctor_rating}/5)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          {similarMed.price && (
                            <div className="similar-price">
                              <p className="price small">
                                ${parseFloat(similarMed.price).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Indicators */}
              {similarMedicines.length > 1 && (
                <div className="slide-indicators">
                  {similarMedicines.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`indicator ${index === currentSlide ? 'active' : ''}`}
                    />
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