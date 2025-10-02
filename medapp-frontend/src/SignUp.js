import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUp.css';

// Google Icon SVG
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Apple Icon SVG
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const SignUp = ({ onLoginSuccess }) => {
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignUp = () => {
    console.log('Sign up with Google');
    // Implement Google sign up logic here
  };

  const handleAppleSignUp = () => {
    console.log('Sign up with Apple');
    // Implement Apple sign up logic here
  };

  const handleCreateAccount = () => {
    setShowCreateAccount(true);
    setShowLogin(false);
  };

  const handleLogin = () => {
    setShowLogin(true);
    setShowCreateAccount(false);
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="signup-overlay" onClick={handleClose}>
      <div 
        className="signup-container" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(169, 189, 176, 0.9),
              rgba(11, 104, 53, 0.9),
              rgba(8, 75, 38, 0.9)
            ),
            url("/images/Background1.png")
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}
      >
        <button className="close-btn" onClick={handleClose}>×</button>
        
        <h1 className="signup-title">Join Today</h1>

        {!showCreateAccount && !showLogin && (
          <>
            <button className="signup-btn google-btn" onClick={handleGoogleSignUp}>
              <GoogleIcon />
              <span>Sign Up with Google</span>
            </button>

            <button className="signup-btn apple-btn" onClick={handleAppleSignUp}>
              <AppleIcon />
              <span>Sign Up with Apple</span>
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button className="signup-btn create-account-btn" onClick={handleCreateAccount}>
              Create an Account
            </button>

            <button className="signup-btn login-btn" onClick={handleLogin}>
              Log In
            </button>
          </>
        )}

        {showCreateAccount && (
          <div className="form-container">
            <h2 className="form-title">Create Account</h2>
            <form className="auth-form">
              <input type="text" placeholder="Full Name" className="form-input" required />
              <input type="email" placeholder="Email" className="form-input" required />
              <input type="password" placeholder="Password" className="form-input" required />
              <input type="password" placeholder="Confirm Password" className="form-input" required />
              <button type="submit" className="submit-btn">Sign Up</button>
            </form>
            <button className="back-btn" onClick={() => setShowCreateAccount(false)}>
              Back
            </button>
          </div>
        )}

        {showLogin && (
          <div className="form-container">
            <h2 className="form-title">Log In</h2>
            <form className="auth-form">
              <input type="email" placeholder="Email" className="form-input" required />
              <input type="password" placeholder="Password" className="form-input" required />
              <button type="submit" className="submit-btn">Log In</button>
            </form>
            <button className="back-btn" onClick={() => setShowLogin(false)}>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;