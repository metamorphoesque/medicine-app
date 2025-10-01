import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BookAppointment.css";

const BookAppointment = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("Andhra Pradesh");
  const [pincode, setPincode] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [pincodeSearch, setPincodeSearch] = useState("");
  const [pincodeSuggestions, setPincodeSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const availableStates = [
    "Andhra Pradesh",
    "Andaman and Nicobar Islands",
  ];

  const healthcareTypes = [
    { id: "hospital", name: "Hospitals", image: "/images/hospital.png" },
    { id: "doctor", name: "Doctors", image: "/images/doctor.png" },
    { id: "pharmacy", name: "Pharmacy", image: "/images/pharmacy.png" },
    { id: "clinic", name: "Clinics", image: "/images/clinic.png" },
    { id: "dentist", name: "Dentist", image: "/images/dentist.png" },
    { id: "physiotherapy", name: "Physiotherapy", image: "/images/physiotherapy.png" },
  ];

  // Mock pincode data - you'll replace this with API call
  const mockPincodes = [
    { pincode: "500001", area: "Hyderabad, Telangana" },
    { pincode: "500002", area: "Secunderabad, Telangana" },
    { pincode: "500003", area: "Kachiguda, Telangana" },
    { pincode: "500004", area: "Sultan Bazar, Telangana" },
    { pincode: "500005", area: "Nampally, Telangana" },
    { pincode: "522001", area: "Guntur, Andhra Pradesh" },
    { pincode: "522002", area: "Guntur East, Andhra Pradesh" },
    { pincode: "522003", area: "Guntur West, Andhra Pradesh" },
    { pincode: "530001", area: "Visakhapatnam, Andhra Pradesh" },
    { pincode: "530002", area: "Waltair, Andhra Pradesh" },
  ];

  useEffect(() => {
    if (pincodeSearch.length >= 2) {
      const filtered = mockPincodes.filter(item => 
        item.pincode.startsWith(pincodeSearch) || 
        item.area.toLowerCase().includes(pincodeSearch.toLowerCase())
      );
      setPincodeSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setPincodeSuggestions([]);
      setShowSuggestions(false);
    }
  }, [pincodeSearch]);

  const handleTypeSelection = async (type) => {
    setSelectedType(type);
    setShowResults(false);
    setFacilities([]);

    if (!type || !selectedState) return;

    setLoading(true);

    try {
     let url = `http://localhost:5000/api/healthcare/byState?state=${selectedState}&type=${type}&limit=20`;
      
      // If pincode is provided, add it to the search
      if (pincode.trim()) {
        url += `&pincode=${pincode.trim()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      const facilitiesData = data.results || data;
      setFacilities(facilitiesData);
      setShowResults(true);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      setFacilities([]);
    }

    setLoading(false);
  };

  const handlePincodeInputChange = (e) => {
    const value = e.target.value;
    setPincodeSearch(value);
  };

  const handlePincodeSelect = (selectedPincode) => {
    setPincode(selectedPincode.pincode);
    setPincodeSearch(selectedPincode.pincode + " - " + selectedPincode.area);
    setShowSuggestions(false);
    
    // Trigger search if a type is already selected
    if (selectedType) {
      handleTypeSelection(selectedType);
    }
  };

const handleBookAppointment = (facility) => {
  navigate('/facility-details', { state: { facility } });
}; 
  const handleCall = (facility) => {
    if (facility.phone) {
      window.open(`tel:${facility.phone}`, "_self");
    } else {
      alert("Phone number not available for this facility");
    }
  };

  return (
    <div className="book-page">
      {/* Rectangle Container */}
      <div className="book-container">
        {/* Header */}
        <div className="header-section">
          <div className="header-left">
            <h1 className="page-title">Available Healthcare Nearby</h1>
            <div className="title-underline"></div>
          </div>
          <div className="header-right">
            <select
              className="state-dropdown"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              {availableStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            
            <div className="pincode-dropdown-container">
              <input
                type="text"
                className="pincode-input"
                placeholder="Search by pincode..."
                value={pincodeSearch}
                onChange={handlePincodeInputChange}
                onFocus={() => pincodeSearch.length >= 2 && setShowSuggestions(true)}
              />
              {showSuggestions && pincodeSuggestions.length > 0 && (
                <div className="pincode-suggestions">
                  {pincodeSuggestions.map((item, index) => (
                    <div
                      key={index}
                      className="pincode-suggestion-item"
                      onClick={() => handlePincodeSelect(item)}
                    >
                      <div className="suggestion-pincode">{item.pincode}</div>
                      <div className="suggestion-area">{item.area}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Healthcare Type Buttons */}
        <div className="healthcare-types-container">
          {healthcareTypes.map((type) => (
            <button
              key={type.id}
              className={`healthcare-type-btn ${
                selectedType === type.id ? "selected" : ""
              }`}
              onClick={() => handleTypeSelection(type.id)}
            >
              <div className="type-image-container">
                <img
                  src={type.image}
                  alt={type.name}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="fallback-icon" style={{ display: "none" }}>
                  {type.name.charAt(0)}
                </div>
              </div>
              <span className="type-label">{type.name}</span>
            </button>
          ))}
        </div>

        {/* Results Section */}
        <div className="results-section">
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>
                Finding {selectedType}s in {selectedState}
                {pincode && ` (Pincode: ${pincode})`}...
              </p>
            </div>
          )}

          {showResults && !loading && (
            <div className="facilities-dropdown">
              {facilities.length > 0 ? (
                facilities.map((facility) => (
                  <div key={facility.id} className="facility-tab">
                    <div className="facility-info">
                      <h3 className="facility-name">{facility.name}</h3>
                      <p className="facility-type">
                        {facility.facility_type || facility.type}
                      </p>
                      <p className="facility-hours">
                        {facility.opening_hours || "Contact for hours"}
                      </p>
                      {facility.address && (
                        <p className="facility-address">📍 {facility.address}</p>
                      )}
                      {facility.phone && (
                        <p className="facility-phone">📞 {facility.phone}</p>
                      )}
                      {facility.rating && facility.rating > 0 && (
                        <p className="facility-rating">
                          ⭐ {facility.rating}/5
                        </p>
                      )}
                      {facility.pincode && (
                        <p className="facility-pincode">
                          📮 Pincode: {facility.pincode}
                        </p>
                      )}
                    </div>

                    <div className="facility-actions">
                      <button
                        className="book-appointment-btn"
                        onClick={() => handleBookAppointment(facility)}
                      >
                        BOOK APPOINTMENT
                      </button>
                      <button
                        className="call-btn"
                        onClick={() => handleCall(facility)}
                      >
                        CALL
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  <h3>
                    No {selectedType}s found in {selectedState}
                    {pincode && ` with pincode ${pincode}`}
                  </h3>
                  <p>Try selecting a different healthcare type or location.</p>
                </div>
              )}
            </div>
          )}

          {!selectedType && !loading && (
            <div className="initial-message">
              <h3>Select a Healthcare Type</h3>
              <p>
                Choose from the options above to find healthcare facilities in{" "}
                {selectedState}
                {pincode && ` near pincode ${pincode}`}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Panel - Outside Rectangle */}
      <div className="floating-action-panel">
        <button className="action-btn cart-btn">🛒 Cart</button>
        <button className="action-btn wishlist-btn">❤️ Wishlist</button>
        <button className="action-btn reminders-btn">⏰ Reminders</button>
      </div>
    </div>
  );
};

export default BookAppointment;