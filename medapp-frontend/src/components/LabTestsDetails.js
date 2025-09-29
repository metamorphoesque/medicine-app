// src/components/LabTestsDetails.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./LabTestsDetails.css";

const LabTestsDetails = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  // hooks - always at top level (moved here to avoid hook-order errors)
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("individual");

  // Format category name for display (defensive: handle undefined)
  const formatCategoryName = (categorySlug = "") => {
    // if user passes a slug like "thyroid-and-hormones", keep it readable
    // If category contains spaces already, this will still work.
    return String(categorySlug)
      .replace(/-/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();
  };

  useEffect(() => {
    fetchTestsAndPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Fetch tests and packages from backend, defensive parsing
  const fetchTestsAndPackages = async () => {
    try {
      setLoading(true);
      setError("");

      // fetch individual tests for this category
      const testsUrl = `http://localhost:5000/api/lab-tests${category ? `?category=${encodeURIComponent(category)}` : ""}`;
      const testsResponse = await fetch(testsUrl);
      if (!testsResponse.ok) {
        const txt = await testsResponse.text().catch(() => "Failed");
        throw new Error(`Tests request failed: ${testsResponse.status} ${txt}`);
      }
      const testsData = await testsResponse.json();
      // backend may return array or object; normalize to array
      const testsArray = Array.isArray(testsData) ? testsData : testsData.results || testsData.items || [];
      
      // fetch packages
      const packagesResponse = await fetch("http://localhost:5000/api/lab-packages");
      if (!packagesResponse.ok) {
        const txt = await packagesResponse.text().catch(() => "Failed");
        throw new Error(`Packages request failed: ${packagesResponse.status} ${txt}`);
      }
      const packagesData = await packagesResponse.json();
      const packagesArray = Array.isArray(packagesData) ? packagesData : packagesData.results || packagesData.items || [];

      setTests(testsArray);
      setPackages(packagesArray);
    } catch (err) {
      console.error("Error fetching lab tests/packages:", err);
      setError(typeof err === "string" ? err : err.message || "Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = (testId, testName) => {
    console.log(`Booking appointment for test: ${testName} (ID: ${testId})`);
    // navigate(`/book-lab-test/${testId}`); // enable if route exists
  };

  const handleBookPackage = (packageId, packageName) => {
    console.log(`Booking package: ${packageName} (ID: ${packageId})`);
    // navigate(`/book-lab-package/${packageId}`); // enable if route exists
  };

  const formatPrice = (price) => {
    // defensive: price may be string or null
    const p = Number(price) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(p);
  };

  // loading / error early returns (hooks already declared above)
  if (loading) {
    return (
      <div className="lab-tests-details-container">
        <div className="loading">Loading lab tests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lab-tests-details-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  // determine relevant packages for the category (fallback: show all)
  const relevantPackages = packages.filter((pkg) => {
    if (!category) return true;
    const cat = category.toLowerCase();
    // Simple heuristics: match words in package name or description
    const name = String(pkg.name || "").toLowerCase();
    const desc = String(pkg.description || "").toLowerCase();

    if (cat.includes("women")) return name.includes("women") || desc.includes("women");
    if (cat.includes("general")) return true; // show general packages
    if (cat.includes("thyroid") || cat.includes("hormone")) return name.includes("thyroid") || desc.includes("thyroid");
    if (cat.includes("infect") || cat.includes("dengue") || cat.includes("covid")) return name.includes("infect") || desc.includes("infect") || name.includes("covid") || desc.includes("covid");
    // fallback: include packages that mention the category string
    return name.includes(cat) || desc.includes(cat);
  });

  return (
    <div className="lab-tests-details-container">
      {/* Back Button */}
      <button className="back-button-top" onClick={() => navigate("/lab-tests")}>
        ← Back to Categories
      </button>

      <div className="main-layout">
        {/* LEFT: filters sidebar outside the centered container */}
        <aside className="filters-sidebar" aria-label="Lab filters">
          <h3 className="filters-title">Filters</h3>
          <div className="filter-options">
            <button
              className={`filter-btn ${activeFilter === "individual" ? "active" : ""}`}
              onClick={() => setActiveFilter("individual")}
              type="button"
            >
              Individual Tests
            </button>

            <button
              className={`filter-btn ${activeFilter === "packages" ? "active" : ""}`}
              onClick={() => setActiveFilter("packages")}
              type="button"
            >
              Packaged Tests
            </button>
          </div>
        </aside>

        {/* CENTER: main transparent container (CSS controls width ~55%) */}
        <main className="main-content-container" role="main">
          {/* Title left-aligned with underline (per your CSS) */}
          <div className="header-section">
            <h2 className="page-title">Lab Tests</h2>
            <div className="title-underline" />
            {/* optional small subtitle showing the category */}
            {category && (
              <div style={{ marginTop: "0.75rem", color: "#556b2f", fontWeight: 600 }}>
                {formatCategoryName(category)}
              </div>
            )}
          </div>

          {/* Individual Tests */}
          {activeFilter === "individual" && (
            <section className="tests-section" aria-label="Individual lab tests">
              <div className="tests-grid">
                {tests.length === 0 ? (
                  <div className="empty-state">
                    <h3>No tests available</h3>
                    <p>There are currently no individual tests for this category.</p>
                  </div>
                ) : (
                  tests.map((test) => (
                    <article key={test.id} className="test-card" aria-labelledby={`test-${test.id}`}>
                      <div className="test-card-content">
                        <div className="test-header">
                          <h4 id={`test-${test.id}`} className="test-name">{test.name}</h4>
                          <span className="test-price">{formatPrice(test.price)}</span>
                        </div>

                        <p className="test-description">{test.description || "No description available."}</p>

                        <div className="test-details">
                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Sample:</span>
                              <span className="detail-value">{test.sample_required || "N/A"}</span>
                            </div>

                            <div className="detail-item">
                              <span className="detail-label">Category:</span>
                              <span className="detail-value">{test.category || "General"}</span>
                            </div>
                          </div>

                          <div className="detail-row">
                            <div className="detail-item">
                              <span className="detail-label">Fasting:</span>
                              <span className={`detail-value ${test.fasting_required ? "fasting-required" : "no-fasting"}`}>
                                {test.fasting_required ? "Required" : "Not Required"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="test-card-overlay">
                        <button
                          className="book-appointment-btn"
                          onClick={() => handleBookAppointment(test.id, test.name)}
                          type="button"
                        >
                          Book Appointment
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Packages */}
          {activeFilter === "packages" && (
            <section className="packages-section" aria-label="Lab packages">
              <div className="packages-grid">
                {relevantPackages.length === 0 ? (
                  <div className="empty-state">
                    <h3>No packages available</h3>
                    <p>No lab packages match this category at the moment.</p>
                  </div>
                ) : (
                  relevantPackages.map((pkg) => (
                    <article key={pkg.id} className="package-card" aria-labelledby={`pkg-${pkg.id}`}>
                      <div className="package-card-content">
                        <div className="package-header">
                          <h4 id={`pkg-${pkg.id}`} className="package-name">{pkg.name}</h4>
                          <span className="package-price">{formatPrice(pkg.price)}</span>
                        </div>

                        <p className="package-description">{pkg.description || "No description available."}</p>

                        {pkg.included_tests && pkg.included_tests.length > 0 && (
                          <div className="included-tests">
                            <h5>Included Tests:</h5>
                            <ul>
                              {pkg.included_tests.map((t) => (
                                <li key={t.id}>{t.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="package-card-overlay">
                        <button
                          className="book-package-btn"
                          onClick={() => handleBookPackage(pkg.id, pkg.name)}
                          type="button"
                        >
                          Book Package
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default LabTestsDetails;
