import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Checkout.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const { cartItems = [], prescriptions = {} } = location.state || {};
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [editMode, setEditMode] = useState({
    contact: false,
    address: false
  });
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    pincode: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/signup');
      return;
    }
    
    if (!cartItems || cartItems.length === 0) {
      navigate('/cart');
      return;
    }
    
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/user/profile/${user.id}`);
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        setFormData({
          fullName: profile.fullName || user.username || '',
          phoneNumber: profile.phoneNumber || '',
          address: profile.address || '',
          pincode: profile.pincode || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const toggleEditMode = (section) => {
    setEditMode({ ...editMode, [section]: !editMode[section] });
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);
    const gst = subtotal * 0.18;
    const deliveryCharges = subtotal > 50 ? 0 : 5;
    const total = subtotal + gst + deliveryCharges;
    
    return { subtotal, gst, deliveryCharges, total };
  };

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.trim() === '') {
      alert('Please enter your full name');
      return false;
    }
    
    if (!formData.phoneNumber || !/^\d{10}$/.test(formData.phoneNumber)) {
      alert('Please enter a valid 10-digit phone number');
      return false;
    }
    
    if (!formData.address || formData.address.trim() === '') {
      alert('Please enter your delivery address');
      return false;
    }
    
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      alert('Please enter a valid 6-digit pincode');
      return false;
    }
    
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    
    setPlacing(true);
    
    try {
      // Group items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.seller_id;
        if (!acc[sellerId]) {
          acc[sellerId] = {
            seller_id: sellerId,
            seller_name: item.seller_name,
            items: []
          };
        }
        acc[sellerId].items.push({
          medicine_id: item.medicine_id,
          seller_medicine_id: item.id,
          prescription_id: prescriptions[item.medicine_id] || null,
          quantity: item.quantity,
          price_per_unit: parseFloat(item.price),
          total_price: parseFloat(item.price) * parseInt(item.quantity)
        });
        return acc;
      }, {});

      // Create orders for each seller
      const orderPromises = Object.values(itemsBySeller).map(async (sellerOrder) => {
        const orderTotal = sellerOrder.items.reduce((sum, item) => sum + item.total_price, 0);
        
        const response = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyer_id: user.id,
            seller_id: sellerOrder.seller_id,
            items: sellerOrder.items,
            shipping_address: `${formData.fullName}\n${formData.address}\n${formData.pincode}\nPhone: ${formData.phoneNumber}`,
            total_amount: orderTotal
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create order');
        }

        return response.json();
      });

      await Promise.all(orderPromises);

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'order-success-notification';
      notification.textContent = 'Order placed!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
        navigate('/orders');
      }, 2000);

    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order: ' + err.message);
    } finally {
      setPlacing(false);
    }
  };

  const handleAbandonOrder = () => {
    if (window.confirm('Are you sure you want to abandon this order? Your cart will be preserved.')) {
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  const { subtotal, gst, deliveryCharges, total } = calculateTotals();

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        {/* Contact Information */}
        <div className="checkout-section">
          <div className="section-header">
            <h2>Contact Information</h2>
            <button className="edit-btn" onClick={() => toggleEditMode('contact')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          
          {editMode.contact ? (
            <div className="edit-section">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="10-digit phone number"
                  maxLength="10"
                  className="form-input"
                />
              </div>
              <button className="save-btn" onClick={() => toggleEditMode('contact')}>
                Save
              </button>
            </div>
          ) : (
            <div className="info-display">
              <p><strong>Name:</strong> {formData.fullName || 'Not provided'}</p>
              <p><strong>Phone:</strong> {formData.phoneNumber || 'Not provided'}</p>
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="checkout-section">
          <div className="section-header">
            <h2>Delivery Address</h2>
            <button className="edit-btn" onClick={() => toggleEditMode('address')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          
          {editMode.address ? (
            <div className="edit-section">
              <div className="form-group">
                <label>Address *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your complete address"
                  rows="3"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  className="form-input"
                />
              </div>
              <button className="save-btn" onClick={() => toggleEditMode('address')}>
                Save
              </button>
            </div>
          ) : (
            <div className="info-display">
              <p><strong>Address:</strong> {formData.address || 'Not provided'}</p>
              <p><strong>Pincode:</strong> {formData.pincode || 'Not provided'}</p>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="checkout-section">
          <h2>Order Summary</h2>
          <div className="order-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="order-item-row">
                <div className="item-info">
                  <strong>{item.name}</strong>
                  {item.prescription_required && (
                    <span className="rx-badge-small">⚕️ Rx</span>
                  )}
                </div>
                <div className="item-quantity">Qty: {item.quantity}</div>
                <div className="item-price">${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Prescriptions */}
        {Object.keys(prescriptions).length > 0 && (
          <div className="checkout-section">
            <h2>Attached Prescriptions</h2>
            <div className="prescription-list">
              <p className="prescription-count">
                ✓ {Object.keys(prescriptions).length} prescription(s) attached
              </p>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="checkout-section price-section">
          <h2>Payment Summary</h2>
          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>GST (18%):</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Delivery Charges:</span>
              <span>{deliveryCharges === 0 ? 'FREE' : `$${deliveryCharges.toFixed(2)}`}</span>
            </div>
            <div className="price-row total-row">
              <strong>Total Amount:</strong>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="checkout-actions">
          <button 
            className="abandon-order-btn"
            onClick={handleAbandonOrder}
            disabled={placing}
          >
            ABANDON ORDER
          </button>
          <button 
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? 'PLACING ORDER...' : 'PLACE ORDER'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;