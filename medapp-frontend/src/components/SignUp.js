import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SignUp.css';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SignUp = ({ onLoginSuccess }) => {
  const [currentView, setCurrentView] = useState('initial');
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Lock body scroll when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [buyerForm, setBuyerForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: ''
  });

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

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleClose = () => {
    navigate(-1);
  };

  const handleShowInitial = () => {
    setCurrentView('initial');
    setError('');
    setSuccess('');
  };

  const handleCreateAccount = () => {
    setCurrentView('selectRole');
    setError('');
    setSuccess('');
  };

  const handleShowLogin = () => {
    setCurrentView('login');
    setError('');
    setSuccess('');
  };

  const handleRoleNext = () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    setError('');
    setCurrentView(selectedRole === 'buyer' ? 'buyerSignup' : 'sellerSignup');
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setSellerForm({...sellerForm, [fieldName]: file});
    setError('');
  };

  const handleBuyerSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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

    if (buyerForm.dateOfBirth) {
      const today = new Date();
      const birth = new Date(buyerForm.dateOfBirth);
      let age = today.getFullYear() - birth.getFullYear();
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

      setSuccess('✓ Registration successful! You can now log in.');
      setBuyerForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: ''
      });

      setLoginForm({ email: buyerForm.email, password: '' });

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

  const handleSellerSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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

      setTimeout(() => {
        navigate('/');
      }, 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      authLogin(data.user);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }

      setSuccess('✓ Login successful! Redirecting...');
      
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
          /* ADJUST BACKGROUND TRANSPARENCY HERE: 
             Change the rgba values below (0.15, 0.20, 0.25) to control transparency
             Lower values (e.g., 0.05, 0.10, 0.15) = MORE transparent
             Higher values (e.g., 0.30, 0.40, 0.50) = LESS transparent */
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.15),
              rgba(255, 255, 255, 0.20),
              rgba(255, 255, 255, 0.25)
            ),
            url(${process.env.PUBLIC_URL}/images/Background1.png)
          `
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={handleClose}>×</button>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {currentView === 'initial' && (
          <div className="initial-view">
            <h1 className="signup-heading">Join Today</h1>
            <div className="heading-underline"></div>
            
            <button className="action-btn primary-btn" onClick={handleCreateAccount}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Create an Account
            </button>

            <button className="action-btn primary-btn" onClick={handleShowLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Log In
            </button>
            
            <div className="divider">
              <span>OR</span>
            </div>

            <button className="action-btn primary-btn google-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <button className="action-btn primary-btn apple-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Sign in with Apple
            </button>
          </div>
        )}

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
                  <svg className="radio-icon-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
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
                  <svg className="radio-icon-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
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