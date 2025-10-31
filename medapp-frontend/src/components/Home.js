import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Home = () => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [topDoctorsMedicines, setTopDoctorsMedicines] = useState([]);
  const [popularMedicines, setPopularMedicines] = useState([]);
  const [loadingTopDoctors, setLoadingTopDoctors] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);

  const scrollRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const navigate = useNavigate();

  const banners = [
    { id: 1, title: "Free Delivery", subtitle: "On orders above $50", bgColor: "#088663ff" },
    { id: 2, title: "24/7 Support", subtitle: "Expert consultation", bgColor: "#088663ff" },
    { id: 3, title: "Special Offer", subtitle: "Up to 30% off", bgColor: "#088663ff" },
    { id: 4, title: "Premium Care", subtitle: "Quality guaranteed", bgColor: "#088663ff" },
  ];

  const categories = [
    { id: 1, name: "Heart & Blood Pressure Care", slug: "heart-blood-pressure-care", image: `${process.env.PUBLIC_URL}/images/heart-care.png` },
    { id: 2, name: "Diabetes Care", slug: "diabetes-care", image: `${process.env.PUBLIC_URL}/images/diabetes-care.png` },
    { id: 3, name: "Respiratory Care", slug: "respiratory-care", image: `${process.env.PUBLIC_URL}/images/respiratory-care.png` },
    { id: 4, name: "Mental & Neurological Care", slug: "mental-neurological-care", image: `${process.env.PUBLIC_URL}/images/neurology-care.png` },
    { id: 5, name: "Digestive Care", slug: "digestive-care", image: `${process.env.PUBLIC_URL}/images/digestive-care.png` },
    { id: 6, name: "Allergy Care", slug: "allergy-care", image: `${process.env.PUBLIC_URL}/images/allergy-care.png` },
    { id: 7, name: "Dental Care", slug: "dental-care", image: `${process.env.PUBLIC_URL}/images/dental-care.png` },
    { id: 8, name: "Eye Care", slug: "eye-care", image: `${process.env.PUBLIC_URL}/images/eye-care.png` },
    { id: 9, name: "Ear Care", slug: "ear-care", image: `${process.env.PUBLIC_URL}/images/ear-care.png` },
    { id: 10, name: "Skin & Dermatology Care", slug: "dermal-care", image: `${process.env.PUBLIC_URL}/images/skin-care.png` },
    { id: 11, name: "Baby Care", slug: "baby-care", image: `${process.env.PUBLIC_URL}/images/baby-care.png` },
  ];

  // Fetch Top Doctors Preference medicines (sorted by doctor_rating)
  useEffect(() => {
    fetchTopDoctorsMedicines();
    fetchPopularMedicines();
  }, []);

  const fetchTopDoctorsMedicines = async () => {
    try {
      setLoadingTopDoctors(true);
      const response = await fetch(`${API_BASE}/api/medicines/top-doctors?limit=8`);
      if (!response.ok) throw new Error('Failed to fetch top doctors medicines');
      const data = await response.json();
      setTopDoctorsMedicines(data.medicines || []);
    } catch (error) {
      console.error('Error fetching top doctors medicines:', error);
      setTopDoctorsMedicines([]);
    } finally {
      setLoadingTopDoctors(false);
    }
  };

  const fetchPopularMedicines = async () => {
    try {
      setLoadingPopular(true);
      const response = await fetch(`${API_BASE}/api/medicines/popular?limit=8`);
      if (!response.ok) throw new Error('Failed to fetch popular medicines');
      const data = await response.json();
      setPopularMedicines(data.medicines || []);
    } catch (error) {
      console.error('Error fetching popular medicines:', error);
      setPopularMedicines([]);
    } finally {
      setLoadingPopular(false);
    }
  };

  const handleCategoryClick = (category) => {
    setActiveCategory(category.id);
    navigate(`/medicines/category/${category.slug}`);
  };

  const handleImageError = (e) => {
    e.target.style.display = "none";
    e.target.nextSibling.style.display = "flex";
  };

  const handleBannerScroll = (direction) => {
    const scrollAmount = direction === 'left' ? -300 : 300;
    if (bannerScrollRef.current) bannerScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleMedicineClick = (medicineId) => {
    navigate(`/medicines/${medicineId}`);
  };

  const handleSeeMoreTopDoctors = () => {
    navigate('/medicines', { state: { sortBy: 'doctor_rating' } });
  };

  const handleSeeMorePopular = () => {
    navigate('/medicines', { state: { sortBy: 'popular' } });
  };

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 6);

  return (
    <div className="home-page">
      {/* Banners */}
      <div className="banners-container">
        <span className="banner-arrow left" onClick={() => handleBannerScroll('left')}>‹</span>
        <div className="banners-scroll" ref={bannerScrollRef}>
          {banners.map((banner) => (
            <div key={banner.id} className="banner-item" style={{ backgroundColor: banner.bgColor }}>
              <div className="banner-content">
                <h3>{banner.title}</h3>
                <p>{banner.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
        <span className="banner-arrow right" onClick={() => handleBannerScroll('right')}>›</span>
      </div>

      {/* Search By Category Section */}
      <div className="new-section-wrapper">
        <h2 className="new-section-title">Search By Category</h2>
        <div className="new-section-underline"></div>
        <div className={`new-section-container ${showAllCategories ? 'expanded' : ''}`}>
          <div className={`categories-grid ${showAllCategories ? 'grid-view' : 'flex-view'}`}>
            {displayedCategories.map((category) => (
              <div key={category.id} className="new-item">
                <button
                  className={`new-item-button ${activeCategory === category.id ? "active" : ""}`}
                  onClick={() => handleCategoryClick(category)}
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="new-item-image"
                    onError={handleImageError}
                  />
                  <div className="new-item-placeholder" style={{ display: "none" }}>
                    {category.name.split(" ")[0]}
                  </div>
                </button>
                <div className="new-item-label">{category.name}</div>
              </div>
            ))}
          </div>
          <button className="new-see-more-btn" onClick={() => setShowAllCategories(!showAllCategories)}>
            {showAllCategories ? "Show Less" : "See More"}
          </button>
        </div>
      </div>

      {/* Top Doctors Preference Section */}
      <div className="new-section-wrapper">
        <h2 className="new-section-title">Top Doctors Preference</h2>
        <div className="new-section-underline"></div>
        <div className="new-section-container">
          {loadingTopDoctors ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading top doctors preferences...</p>
            </div>
          ) : topDoctorsMedicines.length > 0 ? (
            <>
              <div className="medicines-grid">
                {topDoctorsMedicines.map((medicine) => (
                  <div 
                    key={medicine.id} 
                    className="medicine-card"
                    onClick={() => handleMedicineClick(medicine.id)}
                  >
                    <div className="medicine-image-container">
                      {medicine.image_url ? (
                        <img 
                          src={medicine.image_url} 
                          alt={medicine.name}
                          className="medicine-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="medicine-placeholder" style={{ display: medicine.image_url ? 'none' : 'flex' }}>
                        {medicine.name.charAt(0)}
                      </div>
                    </div>
                    <div className="medicine-info">
                      <h3 className="medicine-name">{medicine.name}</h3>
                      <p className="medicine-generic">{medicine.generic || medicine.manufacturer_name || 'Generic Medicine'}</p>
                      {medicine.doctor_rating && medicine.doctor_rating > 0 && (
                        <div className="medicine-rating">
                          ⭐ {Number(medicine.doctor_rating).toFixed(1)} (Doctors)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="new-see-more-btn" onClick={handleSeeMoreTopDoctors}>
                See More
              </button>
            </>
          ) : (
            <div className="no-results">
              <p>No medicines available at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Popularly Preferred Section */}
      <div className="new-section-wrapper">
        <h2 className="new-section-title">Popularly Preferred</h2>
        <div className="new-section-underline"></div>
        <div className="new-section-container">
          {loadingPopular ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading popular medicines...</p>
            </div>
          ) : popularMedicines.length > 0 ? (
            <>
              <div className="medicines-grid">
                {popularMedicines.map((medicine) => (
                  <div 
                    key={medicine.id} 
                    className="medicine-card"
                    onClick={() => handleMedicineClick(medicine.id)}
                  >
                    <div className="medicine-image-container">
                      {medicine.image_url ? (
                        <img 
                          src={medicine.image_url} 
                          alt={medicine.name}
                          className="medicine-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="medicine-placeholder" style={{ display: medicine.image_url ? 'none' : 'flex' }}>
                        {medicine.name.charAt(0)}
                      </div>
                    </div>
                    <div className="medicine-info">
                      <h3 className="medicine-name">{medicine.name}</h3>
                      <p className="medicine-generic">{medicine.generic || medicine.manufacturer_name || 'Generic Medicine'}</p>
                      {medicine.patient_rating && medicine.patient_rating > 0 && (
                        <div className="medicine-rating">
                          ⭐ {Number(medicine.patient_rating).toFixed(1)} (Patients)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="new-see-more-btn" onClick={handleSeeMorePopular}>
                See More
              </button>
            </>
          ) : (
            <div className="no-results">
              <p>No medicines available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;