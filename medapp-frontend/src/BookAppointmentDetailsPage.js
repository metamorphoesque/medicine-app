import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./BookAppointmentDetailsPage.css";

// Phone SVG Icon Component
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const BookAppointmentDetailsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [facility, setFacility] = useState(null);
  const [similarFacilities, setSimilarFacilities] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [isOpen, setIsOpen] = useState(null);
  const [openingStatus, setOpeningStatus] = useState("");

  useEffect(() => {
    // Get facility data from navigation state
    const facilityData = location.state?.facility;
    if (facilityData) {
      setFacility(facilityData);
      checkOpeningStatus(facilityData);
      loadSimilarFacilities(facilityData);
    } else {
      // If no facility data, redirect back
      navigate('/');
    }
  }, [location.state, navigate]);

  const checkOpeningStatus = (facilityData) => {
    if (!facilityData.opening_hours) {
      setOpeningStatus("Contact for hours");
      setIsOpen(null);
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Simple parsing - you can make this more sophisticated
    const hours = facilityData.opening_hours.toLowerCase();
    
    if (hours.includes("24") || hours.includes("24/7")) {
      setIsOpen(true);
      setOpeningStatus("Open 24/7");
      return;
    }

    // Basic time parsing (assumes format like "9:00 AM - 6:00 PM")
    const timeMatch = hours.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?\s*-\s*(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    
    if (timeMatch) {
      let [, startHour, startMin = "00", startPeriod = "", endHour, endMin = "00", endPeriod = ""] = timeMatch;
      
      // Convert to 24-hour format
      startHour = parseInt(startHour);
      endHour = parseInt(endHour);
      
      if (startPeriod.toLowerCase() === "pm" && startHour !== 12) startHour += 12;
      if (endPeriod.toLowerCase() === "pm" && endHour !== 12) endHour += 12;
      if (startPeriod.toLowerCase() === "am" && startHour === 12) startHour = 0;
      if (endPeriod.toLowerCase() === "am" && endHour === 12) endHour = 0;

      const currentTime = currentHour + (now.getMinutes() / 60);
      const isCurrentlyOpen = currentTime >= startHour && currentTime <= endHour;
      
      setIsOpen(isCurrentlyOpen);
      setOpeningStatus(isCurrentlyOpen ? "Open Now" : "Closed");
    } else {
      setOpeningStatus(facilityData.opening_hours);
      setIsOpen(null);
    }
  };

  const loadSimilarFacilities = async (facilityData) => {
    setLoadingSimilar(true);
    try {
      const type = facilityData.type || facilityData.facility_type || "hospital";
      const state = facilityData.state || "Andhra Pradesh";
      
      const response = await fetch(
        `http://localhost:5000/api/healthcare/byState?state=${state}&type=${type}&limit=6`
      );
      
      if (response.ok) {
        const data = await response.json();
        const results = data.results || data;
        // Filter out the current facility and limit to 4 results
        const filtered = results.filter(f => f.id !== facilityData.id).slice(0, 4);
        setSimilarFacilities(filtered);
      }
    } catch (error) {
      console.error("Error loading similar facilities:", error);
    }
    setLoadingSimilar(false);
  };

  const handleBookAppointment = () => {
    // You can implement actual appointment booking logic here
    alert(`Booking appointment at ${facility.name}`);
  };

  const handleCall = () => {
    if (facility.phone) {
      window.open(`tel:${facility.phone}`, "_self");
    } else {
      alert("Phone number not available for this facility");
    }
  };

  const handleSimilarFacilityClick = (similarFacility) => {
    // Navigate to the same page but with different facility data
    navigate('/facility-details', { 
      state: { facility: similarFacility },
      replace: true 
    });
  };

  const getDefaultImage = () => {
    const type = facility?.type || facility?.facility_type || "hospital";
    return `/images/${type.toLowerCase()}.png`;
  };

  if (!facility) {
    return (
      <div className="details-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading facility details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="details-page">
      <div className="details-container">
        {/* Main Facility Card */}
        <div className="facility-details-card">
          {/* Image Section */}
          <div className="facility-image-section">
            <img 
              src={facility.image_url || getDefaultImage()}
              alt={facility.name}
              className="facility-main-image"
              onError={(e) => {
                e.target.src = getDefaultImage();
              }}
            />
          </div>

          {/* Content Section */}
          <div className="facility-content-section">
            {/* Left Side - Details */}
            <div className="facility-left-details">
              <h1 className="facility-main-name">{facility.name}</h1>
              <div className="facility-detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{facility.type || facility.facility_type}</span>
              </div>
              <div className="facility-detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{facility.address}</span>
              </div>
              {facility.phone && (
                <div className="facility-detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{facility.phone}</span>
                </div>
              )}
            </div>

            {/* Right Side - Opening Times */}
            <div className="facility-right-details">
              <div className="opening-times-section">
                <h3>Opening Times</h3>
                <div className="opening-hours">
                  {facility.opening_hours || "Contact for hours"}
                </div>
                <div className={`opening-status ${isOpen === true ? 'open' : isOpen === false ? 'closed' : 'unknown'}`}>
                  {openingStatus}
                </div>
                {facility.rating && facility.rating > 0 && (
                  <div className="facility-main-rating">
                    ⭐ {facility.rating}/5
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="facility-action-buttons">
            <button 
              className="main-book-btn"
              onClick={handleBookAppointment}
            >
              Book Appointment
            </button>
            <button 
              className="main-call-btn"
              onClick={handleCall}
            >
              <PhoneIcon />
              Call
            </button>
          </div>
        </div>

        {/* Similar Facilities Section */}
        <div className="similar-section">
          <div className="similar-header">
            <h2>Similar Nearby Facilities</h2>
            <div className="similar-underline"></div>
          </div>

          {loadingSimilar ? (
            <div className="similar-loading">
              <div className="loading-spinner"></div>
              <p>Loading similar facilities...</p>
            </div>
          ) : similarFacilities.length > 0 ? (
            <div className="similar-facilities-grid">
              {similarFacilities.map((similarFacility) => (
                <div 
                  key={similarFacility.id} 
                  className="similar-facility-card"
                  onClick={() => handleSimilarFacilityClick(similarFacility)}
                >
                  <div className="similar-facility-image">
                    <img 
                      src={similarFacility.image_url || `/images/${(similarFacility.type || similarFacility.facility_type || 'hospital').toLowerCase()}.png`}
                      alt={similarFacility.name}
                      onError={(e) => {
                        e.target.src = `/images/${(similarFacility.type || similarFacility.facility_type || 'hospital').toLowerCase()}.png`;
                      }}
                    />
                  </div>
                  <div className="similar-facility-info">
                    <h4 className="similar-facility-name">{similarFacility.name}</h4>
                    <p className="similar-facility-type">{similarFacility.type || similarFacility.facility_type}</p>
                    <div className="similar-facility-meta">
                      {similarFacility.rating > 0 && (
                        <span className="similar-rating">⭐ {similarFacility.rating}</span>
                      )}
                      {similarFacility.distance && (
                        <span className="similar-distance">📍 {similarFacility.distance}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-similar">
              <p>No similar facilities found in this area.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookAppointmentDetailsPage;