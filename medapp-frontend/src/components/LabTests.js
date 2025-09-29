import React from "react";
import { useNavigate } from "react-router-dom";
import "./LabTests.css";

const LabTests = () => {
  const navigate = useNavigate();
  
  const categories = [
    {
      name: "General Health",
      image: "/images/GeneralHealth.png",
      description: "Basic health checkups and screenings"
    },
    {
      name: "Thyroid & Hormones",
      image: "/images/Thyroid&Hormones.png",
      description: "Thyroid function and hormone tests"
    },
    {
      name: "Diabetes & Blood Sugar",
      image: "/images/Diabetes&BloodSugar.png",
      description: "Blood sugar and diabetes monitoring"
    },
    {
      name: "Cardiac Health",
      image: "/images/CardiacHealth.png",
      description: "Heart health and cardiovascular tests"
    },
    {
      name: "Vitamins & Deficiencies",
      image: "/images/vitamins.jpg",
      description: "Vitamin levels and deficiency tests"
    },
    {
      name: "Liver & Kidney",
      image: "/images/liver-kidney.jpg",
      description: "Liver and kidney function tests"
    },
    {
      name: "Infectious Diseases",
      image: "/images/infectious.jpg",
      description: "Disease detection and screening"
    },
    {
      name: "Women's Health",
      image: "/images/womens-health.jpg",
      description: "Specialized tests for women"
    }
  ];

  const handleCategoryClick = (categoryName) => {
    console.log(`Navigate to ${categoryName} tests`);
    navigate(`/lab-tests/${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="lab-tests-container">
      {/* Header with underline */}
      <div className="header-section">
        <h2 className="page-title">Lab Tests</h2>
        <div className="title-underline"></div>
      </div>

      {/* Categories Grid */}
      <div className="categories-grid">
        {categories.map((category, index) => (
          <div
            key={index}
            className="category-card"
            onClick={() => handleCategoryClick(category.name)}
          >
            <div className="category-image-container">
              <img
                src={category.image}
                alt={category.name}
                className="category-image"
                onError={(e) => {
                  e.target.src = '/images/placeholder.jpg';
                }}
              />
              <div className="category-overlay">
                <h3 className="category-title">{category.name}</h3>
                <p className="category-description">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LabTests;