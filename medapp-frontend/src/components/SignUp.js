import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SignUp.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SignUp = ({ onLoginSuccess }) => {
  const [currentView, setCurrentView] = useState('initial'); // initial, selectRole, buyerSignup, sellerSignup, login
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Form states for buyer
  const [buyerForm, setBuyerForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: ''
  });

  // Form states for seller
  const [sellerForm, setSellerForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    licenseNumber: '',
    businessRegNumber: '',
    gstin: '',
    phone: '',
    address: '',
    bankAccount: '',
    bankIFSC: '',
    licensePDF: null,
    businessCertPDF: null
  });

  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleClose = () => {
    navigate(-1);
  };

  // Show initial view
  const handleShowInitial = () => {
    setCurrentView('initial');
    setError('');
    setSuccess('');
  };

  // Show role selection
  const handleCreateAccount = () => {
    setCurrentView('selectRole');
    setError('');
    setSuccess('');
  };

  // Show login
  const handleShowLogin = () => {
    setCurrentView('login');
    setError('');
    setSuccess('');
  };

  // Handle role selection and proceed to signup
  const handleRoleNext = () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    setError('');
    setCurrentView(selectedRole === 'buyer' ? 'buyerSignup' : 'sellerSignup');
  };

  // Handle file uploads
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB');
      return;
    }
    setSellerForm({...sellerForm, [fieldName]: file});
    setError(''); // Clear error
  };

  // Handle buyer signup
  const handleBuyerSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (buyerForm.password !== buyerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (buyerForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Validate age
    if (buyerForm.dateOfBirth) {
      const today = new Date();
      const birth = new Date(buyerForm.dateOfBirth);
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        setError('You must be 18 or older to register');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/register/buyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: buyerForm.username,
          email: buyerForm.email,
          password: buyerForm.password,
          dateOfBirth: buyerForm.dateOfBirth
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success! Show message and switch to login
      setSuccess('✓ Registration successful! You can now log in.');
      setBuyerForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: ''
      });

      // Auto-fill email in login form
      setLoginForm({ email: buyerForm.email, password: '' });

      // Switch to login after 2 seconds
      setTimeout(() => {
        setCurrentView('login');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle seller signup
  const handleSellerSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (sellerForm.password !== sellerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (sellerForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!sellerForm.businessName || !sellerForm.licenseNumber) {
      setError('Business name and license number are required');
      setLoading(false);
      return;
    }

    // Note: File uploads removed for now since we don't have multer setup
    // You can add them later with proper file upload handling

    try {
      const response = await fetch(`${API_BASE}/api/register/seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sellerForm.username,
          email: sellerForm.email,
          password: sellerForm.password,
          businessName: sellerForm.businessName,
          licenseNumber: sellerForm.licenseNumber,
          businessRegNumber: sellerForm.businessRegNumber,
          gstin: sellerForm.gstin,
          phone: sellerForm.phone,
          address: sellerForm.address,
          bankAccount: sellerForm.bankAccount,
          bankIFSC: sellerForm.bankIFSC
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success! Show message
      setSuccess('✓ Seller registration successful! Your account is pending verification. You will be notified via email once approved (2-3 business days).');
      setSellerForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        licenseNumber: '',
        businessRegNumber: '',
        gstin: '',
        phone: '',
        address: '',
        bankAccount: '',
        bankIFSC: '',
        licensePDF: null,
        businessCertPDF: null
      });

      // Redirect to home after 4 seconds
      setTimeout(() => {
        navigate('/');
      }, 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === 'pending_verification') {
          setError('⚠️ Your seller account is pending verification. Please wait for admin approval.');
        } else {
          throw new Error(data.error || 'Login failed');
        }
        setLoading(false);
        return;
      }

      // Save user to auth context
      authLogin(data.user);
      
      // Call parent callback
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      setSuccess('✓ Login successful! Redirecting...');
      
      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'seller') {
          navigate('/seller/dashboard');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-overlay" onClick={handleClose}>
      <div 
        className="signup-container" 
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.85),
              rgba(255, 255, 255, 0.9),
              rgba(255, 255, 255, 0.95)
            ),
            url(${process.env.PUBLIC_URL}/images/Background1.png)
          `
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={handleClose}>×</button>

        {/* Error/Success Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Initial View - Choose action */}
        {currentView === 'initial' && (
          <div className="initial-view">
            <h1 className="signup-heading">Join Today</h1>
            <div className="heading-underline"></div>
            
            <button className="action-btn primary-btn" onClick={handleCreateAccount}>
              Create an Account
            </button>

            <button className="action-btn secondary-btn" onClick={handleShowLogin}>
              Log In
            </button>
            
            <div className="divider">
              <span>OR</span>
            </div>

            <button className="action-btn google-btn">
              <span>🔍</span> Sign in with Google
            </button>

            <button className="action-btn apple-btn">
              <span>🍎</span> Sign in with Apple
            </button>
          </div>
        )}

        {/* Role Selection View */}
        {currentView === 'selectRole' && (
          <div className="role-selection-view">
            <h1 className="signup-heading">I am signing up as —</h1>
            <div className="heading-underline"></div>
            
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="role"
                  value="buyer"
                  checked={selectedRole === 'buyer'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                />
                <span className="radio-label">
                  <span className="radio-icon">🛒</span>
                  <span className="radio-text">
                    <strong>Buyer</strong>
                    <small>Browse and purchase medicines</small>
                  </span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="role"
                  value="seller"
                  checked={selectedRole === 'seller'}
                  onChange={(e) => setSelectedRole(e.target.value)}
                />
                <span className="radio-label">
                  <span className="radio-icon">🏪</span>
                  <span className="radio-text">
                    <strong>Seller</strong>
                    <small>Sell medicines and manage inventory</small>
                  </span>
                </span>
              </label>
            </div>

            <button className="next-btn" onClick={handleRoleNext} disabled={!selectedRole}>
              Next →
            </button>
            <button className="back-btn-secondary" onClick={handleShowInitial}>
              ← Back
            </button>
          </div>
        )}

        {/* Buyer Signup Form */}
        {currentView === 'buyerSignup' && (
          <div className="form-view">
            <h2 className="form-title">Sign Up as Buyer</h2>
            <form className="auth-form" onSubmit={handleBuyerSignup}>
              <input
                type="text"
                placeholder="Username *"
                className="form-input"
                value={buyerForm.username}
                onChange={(e) => setBuyerForm({...buyerForm, username: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email *"
                className="form-input"
                value={buyerForm.email}
                onChange={(e) => setBuyerForm({...buyerForm, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password *"
                className="form-input"
                value={buyerForm.password}
                onChange={(e) => setBuyerForm({...buyerForm, password: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password *"
                className="form-input"
                value={buyerForm.confirmPassword}
                onChange={(e) => setBuyerForm({...buyerForm, confirmPassword: e.target.value})}
                required
              />
              <div className="input-group">
                <label className="input-label">Date of Birth *</label>
                <input
                  type="date"
                  className="form-input"
                  value={buyerForm.dateOfBirth}
                  onChange={(e) => setBuyerForm({...buyerForm, dateOfBirth: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </form>
            <button className="back-btn-secondary" onClick={() => setCurrentView('selectRole')}>
              ← Back
            </button>
          </div>
        )}

        {/* Seller Signup Form */}
        {currentView === 'sellerSignup' && (
          <div className="form-view seller-form">
            <h2 className="form-title">Sign Up as Seller</h2>
            <div className="verification-notice">
              ⚠️ Your account will be reviewed within 2-3 business days
            </div>
            <form className="auth-form scrollable-form" onSubmit={handleSellerSignup}>
              <input
                type="text"
                placeholder="Username *"
                className="form-input"
                value={sellerForm.username}
                onChange={(e) => setSellerForm({...sellerForm, username: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email *"
                className="form-input"
                value={sellerForm.email}
                onChange={(e) => setSellerForm({...sellerForm, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password *"
                className="form-input"
                value={sellerForm.password}
                onChange={(e) => setSellerForm({...sellerForm, password: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password *"
                className="form-input"
                value={sellerForm.confirmPassword}
                onChange={(e) => setSellerForm({...sellerForm, confirmPassword: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Business Name *"
                className="form-input"
                value={sellerForm.businessName}
                onChange={(e) => setSellerForm({...sellerForm, businessName: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Drug License Number *"
                className="form-input"
                value={sellerForm.licenseNumber}
                onChange={(e) => setSellerForm({...sellerForm, licenseNumber: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Business Registration Number"
                className="form-input"
                value={sellerForm.businessRegNumber}
                onChange={(e) => setSellerForm({...sellerForm, businessRegNumber: e.target.value})}
              />
              <input
                type="text"
                placeholder="GSTIN (Optional)"
                className="form-input"
                value={sellerForm.gstin}
                onChange={(e) => setSellerForm({...sellerForm, gstin: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="form-input"
                value={sellerForm.phone}
                onChange={(e) => setSellerForm({...sellerForm, phone: e.target.value})}
              />
              <textarea
                placeholder="Business Address"
                className="form-input"
                rows="3"
                value={sellerForm.address}
                onChange={(e) => setSellerForm({...sellerForm, address: e.target.value})}
              />
              <input
                type="text"
                placeholder="Bank Account Number"
                className="form-input"
                value={sellerForm.bankAccount}
                onChange={(e) => setSellerForm({...sellerForm, bankAccount: e.target.value})}
              />
              <input
                type="text"
                placeholder="Bank IFSC Code"
                className="form-input"
                value={sellerForm.bankIFSC}
                onChange={(e) => setSellerForm({...sellerForm, bankIFSC: e.target.value})}
              />

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </form>
            <button className="back-btn-secondary" onClick={() => setCurrentView('selectRole')}>
              ← Back
            </button>
          </div>
        )}

        {/* Login Form */}
        {currentView === 'login' && (
          <div className="form-view">
            <h2 className="form-title">Log In</h2>
            <form className="auth-form" onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                className="form-input"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="form-input"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </form>
            <div className="form-footer">
              <p>Don't have an account? <button className="link-btn" onClick={handleCreateAccount}>Sign Up</button></p>
            </div>
            <button className="back-btn-secondary" onClick={handleShowInitial}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;