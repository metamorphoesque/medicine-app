import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

// Phone SVG Icon Component
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const Home = () => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("Current Location");
  const [selectedHealthcareType, setSelectedHealthcareType] = useState(null);
  const [healthcareResults, setHealthcareResults] = useState([]);
  const [loadingHealthcare, setLoadingHealthcare] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showHealthcareResults, setShowHealthcareResults] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const scrollRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const healthcareScrollRef = useRef(null);
  const locationRef = useRef(null);
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

  const healthcareTypes = [
    { id: "hospital", name: "Hospitals", image: `${process.env.PUBLIC_URL}/images/hospital.png` },
    { id: "clinic", name: "Clinics", image: `${process.env.PUBLIC_URL}/images/clinic.png` },
    { id: "pharmacy", name: "Pharmacy", image: `${process.env.PUBLIC_URL}/images/pharmacy.png` },
    { id: "nursing", name: "Nursing Homes", image: `${process.env.PUBLIC_URL}/images/nursing.png` },
    { id: "doctor", name: "Other Services", image: `${process.env.PUBLIC_URL}/images/doctor.png` }
  ];

  const locationOptions = [
    { id: "current", name: "Current Location", coordinates: null, state: null },
    { id: "andhra_pradesh", name: "Andhra Pradesh", coordinates: null, state: "Andhra Pradesh" },
    { id: "andaman_nicobar", name: "Andaman and Nicobar Islands", coordinates: null, state: "Andaman and Nicobar Islands" }
  ]; 

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (category) => {
    setActiveCategory(category.id);
    navigate(`/medicines/category/${category.slug}`);
  };

  const handleImageError = (e) => {
    e.target.style.display = "none";
    e.target.nextSibling.style.display = "flex";
  };

  const getCurrentLocation = () => {
    setLoadingHealthcare(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(location);
          setSelectedLocation("Current Location");
          if (selectedHealthcareType) searchHealthcare(location, selectedHealthcareType);
          setLoadingHealthcare(false);
        },
        (error) => {
          console.error("Location error:", error);
          setLoadingHealthcare(false);
        }
      );
    } else {
      setLoadingHealthcare(false);
    }
  };

  const searchHealthcare = async (location, type) => {
    try {
      setLoadingHealthcare(true);
      const response = await fetch(
        `http://localhost:5000/api/healthcare/nearby?lat=${location.lat}&lng=${location.lng}&type=${type}&radius=50`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setHealthcareResults(data.slice(0, 4) || []);
      setShowHealthcareResults(true);
    } catch (error) {
      console.error("Error fetching healthcare facilities:", error);
      setHealthcareResults([]);
      setShowHealthcareResults(true);
    } finally {
      setLoadingHealthcare(false);
    }
  };

  const searchHealthcareByState = async (state, type) => {
    try {
      setLoadingHealthcare(true);
      const url = `http://localhost:5000/api/healthcare/byState?state=${encodeURIComponent(state)}&type=${type}&limit=4`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHealthcareResults(data.results || []);
      setShowHealthcareResults(true);
    } catch (error) {
      console.error("Error fetching healthcare by state:", error);
      setHealthcareResults([]);
      setShowHealthcareResults(true);
    } finally {
      setLoadingHealthcare(false);
    }
  };

  const handleHealthcareTypeClick = async (type) => {
    setSelectedHealthcareType(type);
    if (!userLocation && selectedLocation === "Current Location") {
      getCurrentLocation();
      return;
    }
    if (selectedLocation === "Current Location") {
      await searchHealthcare(userLocation, type);
    } else {
      const loc = locationOptions.find(loc => loc.name === selectedLocation);
      if (loc?.state) await searchHealthcareByState(loc.state, type);
    }
  };

  const handleLocationDropdownClick = () => setShowLocationDropdown(!showLocationDropdown);

  const handleLocationSelect = (location) => {
    setShowLocationDropdown(false);
    setSelectedLocation(location.name);

    if (location.id === "current") getCurrentLocation();
    else if (selectedHealthcareType) searchHealthcareByState(location.state, selectedHealthcareType);
  };

const handleBookAppointment = (facility) => {
  navigate('/facility-details', { state: { facility } });
};

  const handleSeeMore = () => {
    navigate('/book-appointment', { 
      state: { 
        searchParams: { 
          state: selectedLocation !== "Current Location" ? selectedLocation : null,
          location: userLocation,
          type: selectedHealthcareType 
        } 
      } 
    });
  };

  const handleBannerScroll = (direction) => {
    const scrollAmount = direction === 'left' ? -300 : 300;
    if (bannerScrollRef.current) bannerScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

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

      {/* Location */}
      <div className="location-container" ref={locationRef}>
        <div className={`location-filter ${showLocationDropdown ? 'open' : ''}`} onClick={handleLocationDropdownClick}>
          <svg className="location-icon" viewBox="0 0 24 24" fill="#0b6835">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span>{selectedLocation}</span>
          <svg className="dropdown-icon" viewBox="0 0 24 24" fill="#0b6835">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>

        {showLocationDropdown && (
          <div className="location-dropdown">
            {locationOptions.map((location) => (
              <div
                key={location.id}
                className={`dropdown-item ${location.id === 'current' ? 'current-location' : ''}`}
                onClick={() => handleLocationSelect(location)}
              >
                {location.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Search By Category</h2>
          <div className="section-underline"></div>
        </div>
        <div className="section-content">
          <div className="items-scroll" ref={scrollRef}>
            <div className="items-row">
              {categories.map((category) => (
                <div key={category.id} className="item">
                  <button
                    className={`item-button ${activeCategory === category.id ? "active" : ""}`}
                    onClick={() => handleCategoryClick(category)}
                  >
                    <img
                      src={category.image}
                      alt={category.name}
                      className="item-image"
                      onError={handleImageError}
                    />
                    <div className="item-placeholder" style={{ display: "none" }}>
                      {category.name.split(" ")[0]}
                    </div>
                  </button>
                  <div className="item-label">{category.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Healthcare Section */}
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Search Available Healthcare Nearby</h2>
          <div className="section-underline"></div>
        </div>
        <div className="section-content">
          <div className="items-scroll" ref={healthcareScrollRef}>
            <div className="items-row">
              {healthcareTypes.map((type) => (
                <div key={type.id} className="item">
                  <button
                    className={`item-button ${selectedHealthcareType === type.id ? "active" : ""}`}
                    onClick={() => handleHealthcareTypeClick(type.id)}
                    disabled={loadingHealthcare}
                  >
                    <img
                      src={type.image}
                      alt={type.name}
                      className="item-image"
                      onError={handleImageError}
                    />
                    <div className="item-placeholder" style={{ display: "none" }}>
                      {type.name.split(" ")[0]}
                    </div>
                  </button>
                  <div className="item-label">{type.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Healthcare Results */}
      {showHealthcareResults && (
        <div className="healthcare-results">
          {loadingHealthcare ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Finding nearby healthcare facilities...</p>
            </div>
          ) : healthcareResults.length > 0 ? (
            <div className="facilities-container">
              <div className="facilities-list">
                {healthcareResults.map((facility, index) => (
                  <div key={facility.id || index} className="facility-card">
                    <div className="facility-info">
                      <div className="facility-header">
                        <h3 className="facility-name">{facility.name}</h3>
                        <div className="facility-type">{facility.type}</div>
                      </div>
                      <div className="facility-details">
                        <p className="facility-address">{facility.address}</p>
                        <div className="facility-meta">
                          {facility.rating > 0 && <span className="facility-rating">⭐ {facility.rating}</span>}
                          <span className="facility-distance">📍 {facility.distance}</span>
                        </div>
                      </div>
                    </div>
                    <div className="facility-actions">
                      <button className="book-appointment-btn" onClick={() => handleBookAppointment(facility)}>
                        Book Appointment
                      </button>
                      {facility.phone && (
                        <button className="call-btn" onClick={() => window.open(`tel:${facility.phone}`)}>
                          <PhoneIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="see-more-container">
                <button className="see-more-btn" onClick={handleSeeMore}>
                  See More
                </button>
              </div>
            </div>
          ) : (
            <div className="no-results">
              <h3>No healthcare facilities found</h3>
              <p>Try selecting a different type or check your location settings.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
