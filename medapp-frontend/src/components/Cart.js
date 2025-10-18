import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PrescriptionUpload from './PrescriptionUpload';
import './Cart.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState({});
  const [selectedPrescriptionItem, setSelectedPrescriptionItem] = useState(null);
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);

  // Load cart from database
  useEffect(() => {
    if (user && user.id) {
      fetchCartFromDB();
      fetchPrescriptions();
    } else {
      loadCartFromSession();
    }
  }, [user]);

  const fetchCartFromDB = async () => {
    try {
      setLoading(true);
      console.log('Fetching cart for user:', user.id);
      
      const response = await fetch(`${API_BASE}/api/cart/${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      
      const data = await response.json();
      console.log('Cart data from DB:', data);
      
      // Enrich cart items with full medicine details including prescription_required
      const enrichedItems = await Promise.all(
        data.map(async (item) => {
          try {
            const medResponse = await fetch(`${API_BASE}/api/medicines/${item.medicine_id}`);
            if (medResponse.ok) {
              const medicine = await medResponse.json();
              console.log(`Medicine ${medicine.name} requires prescription:`, medicine.prescription_required);
              
              return {
                ...item,
                id: item.id,
                medicine_id: item.medicine_id,
                name: item.medicine_name || medicine.name,
                price: item.price,
                quantity: item.quantity,
                image_url: item.image_url || medicine.image_url,
                manufacturer_name: item.manufacturer_name || medicine.manufacturer_name,
                prescription_required: medicine.prescription_required === true, // Ensure boolean
                seller_id: item.seller_id,
                seller_name: item.seller_name
              };
            }
            return {
              ...item,
              prescription_required: false // Fallback if fetch fails
            };
          } catch (err) {
            console.error(`Error fetching medicine details for ${item.medicine_id}:`, err);
            return {
              ...item,
              prescription_required: false
            };
          }
        })
      );
      
      console.log('Enriched cart items:', enrichedItems);
      setCartItems(enrichedItems);
      
    } catch (error) {
      console.error('Error loading cart from DB:', error);
      loadCartFromSession();
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromSession = () => {
    try {
      const savedCart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      setCartItems(savedCart);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cart:', error);
      setLoading(false);
    }
  };

  // Save cart to sessionStorage whenever it changes (for guest users)
  useEffect(() => {
    if (!loading && !user) {
      sessionStorage.setItem('cart', JSON.stringify(cartItems));
    }
  }, [cartItems, loading, user]);

  // Fetch user prescriptions
  const fetchPrescriptions = async () => {
    try {
      console.log('Fetching prescriptions for user:', user.id);
      const response = await fetch(`${API_BASE}/api/prescriptions/user/${user.id}?valid_only=true`);
      if (response.ok) {
        const data = await response.json();
        console.log('Prescriptions fetched:', data);
        setPrescriptions(data);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

  // Helper: check if medicine requires prescription
  const needsPrescription = (item) => {
    return item.prescription_required === true;
  };

  // Validate cart before checkout
  const validateCartForCheckout = () => {
    const itemsNeedingPrescription = cartItems.filter(
      (item) => needsPrescription(item) && !selectedPrescription[item.medicine_id]
    );
    
    console.log('Items needing prescription:', itemsNeedingPrescription);
    console.log('Selected prescriptions:', selectedPrescription);
    
    setCheckoutBlocked(itemsNeedingPrescription.length > 0);
    return itemsNeedingPrescription.length === 0;
  };

  // Update validation whenever cart or prescriptions change
  useEffect(() => {
    validateCartForCheckout();
  }, [cartItems, selectedPrescription]);

  // Handle prescription upload success
  const handlePrescriptionUploadSuccess = (prescription) => {
    console.log('Prescription uploaded successfully:', prescription);
    
    // Add to prescriptions list
    setPrescriptions([...prescriptions, prescription]);
    
    // Automatically assign to the item that triggered the upload
    if (selectedPrescriptionItem) {
      setSelectedPrescription({
        ...selectedPrescription,
        [selectedPrescriptionItem]: prescription.id
      });
    }
    
    setShowPrescriptionUpload(false);
    setSelectedPrescriptionItem(null);
    alert('Prescription uploaded successfully!');
    
    // Re-fetch prescriptions to ensure we have the latest
    fetchPrescriptions();
  };

  // Select existing prescription for an item
  const handleSelectExistingPrescription = (medicineId, prescriptionId) => {
    if (!prescriptionId) {
      // User selected "Choose a prescription..."
      const newSelected = { ...selectedPrescription };
      delete newSelected[medicineId];
      setSelectedPrescription(newSelected);
      return;
    }
    
    setSelectedPrescription({
      ...selectedPrescription,
      [medicineId]: parseInt(prescriptionId)
    });
  };

  // Checkout handler
  const handleCheckout = () => {
    if (!user || !user.id) {
      alert('Please log in to checkout');
      navigate('/signup');
      return;
    }

    if (!validateCartForCheckout()) {
      alert('Please submit prescriptions for all required medicines before proceeding to checkout.');
      return;
    }
    
    console.log('Proceeding to checkout with prescriptions:', selectedPrescription);
    
    navigate('/checkout', { 
      state: { 
        cartItems, 
        prescriptions: selectedPrescription 
      } 
    });
  };

  // Remove item from cart
  const handleRemove = async (itemId, medicineId) => {
    if (user && user.id) {
      try {
        const response = await fetch(`${API_BASE}/api/cart/${itemId}`, { 
          method: 'DELETE' 
        });
        if (!response.ok) {
          throw new Error('Failed to remove item');
        }
      } catch (err) {
        console.error('Error removing from cart:', err);
        alert('Failed to remove item from cart');
        return;
      }
    }
    
    setCartItems(cartItems.filter((item) => item.id !== itemId));
    
    // Remove associated prescription selection
    const newSelectedPrescriptions = { ...selectedPrescription };
    delete newSelectedPrescriptions[medicineId];
    setSelectedPrescription(newSelectedPrescriptions);
  };

  // Move to wishlist
  const handleMoveToWishlist = async (item) => {
    // Add to wishlist (session storage for now)
    const savedWishlist = JSON.parse(sessionStorage.getItem('wishlist') || '[]');
    if (!savedWishlist.find((w) => w.medicine_id === item.medicine_id)) {
      savedWishlist.push(item);
      sessionStorage.setItem('wishlist', JSON.stringify(savedWishlist));
    }
    
    // Remove from cart
    await handleRemove(item.id, item.medicine_id);
    alert('Moved to wishlist successfully!');
  };

  // Update item quantity
  const updateQuantity = async (itemId, medicineId, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Update locally
    setCartItems(
      cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
    
    // Update in database if user is logged in
    if (user && user.id) {
      try {
        // Note: You'll need to add an endpoint to update cart quantity
        // For now, we'll just update locally
        console.log('Quantity updated locally. Add API endpoint to persist.');
      } catch (err) {
        console.error('Error updating quantity:', err);
      }
    }
  };

  // Placeholder color generator
  const getPlaceholderColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return sum + price * quantity;
  }, 0);
  const gst = subtotal * 0.18;
  const deliveryCharges = subtotal > 50 ? 0 : 5;
  const total = subtotal + gst + deliveryCharges;

  // Count items requiring prescriptions
  const itemsRequiringRx = cartItems.filter(item => needsPrescription(item));
  const itemsWithRxUploaded = itemsRequiringRx.filter(item => selectedPrescription[item.medicine_id]);

  if (loading) {
    return (
      <div className="cart-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {showPrescriptionUpload && (
        <PrescriptionUpload
          userId={user?.id}
          onUploadSuccess={handlePrescriptionUploadSuccess}
          onClose={() => {
            setShowPrescriptionUpload(false);
            setSelectedPrescriptionItem(null);
          }}
        />
      )}

      <div className="cart-header">
        <h1 className="cart-title">Shopping Cart</h1>
        <div className="cart-title-underline"></div>
        {itemsRequiringRx.length > 0 && (
          <div className="rx-summary">
            <span className="rx-icon">⚕️</span>
            <span>
              {itemsWithRxUploaded.length} of {itemsRequiringRx.length} prescriptions uploaded
            </span>
          </div>
        )}
      </div>

      <div className="cart-container">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <h2>Your cart is empty</h2>
            <p>Add items to get started</p>
            <button className="continue-shopping-btn" onClick={() => navigate('/medicines/category/all')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className={`cart-item ${needsPrescription(item) ? 'requires-rx' : ''}`}>
                  <div className="item-left">
                    <div className="item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        <div
                          className="item-placeholder"
                          style={{ backgroundColor: getPlaceholderColor(item.name) }}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      {item.manufacturer_name && (
                        <p className="item-manufacturer">By: {item.manufacturer_name}</p>
                      )}
                      {item.seller_name && (
                        <p className="item-seller">Sold by: {item.seller_name}</p>
                      )}

                      <div className="quantity-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(item.id, item.medicine_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="qty-display">{item.quantity || 1}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(item.id, item.medicine_id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="item-right">
                    <p className="item-price">
                      ${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
                    </p>
                    <p className="item-price-unit">
                      ${parseFloat(item.price).toFixed(2)} each
                    </p>

                    <div className="item-actions">
                      <button className="wishlist-btn" onClick={() => handleMoveToWishlist(item)}>
                        <svg className="heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        Move to Wishlist
                      </button>

                      <button className="remove-btn" onClick={() => handleRemove(item.id, item.medicine_id)}>
                        <svg className="cross-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>

                  {needsPrescription(item) && (
                    <div className="prescription-requirement">
                      <div className="prescription-header">
                        <span className="rx-badge">⚕️ Prescription Required</span>
                        {selectedPrescription[item.medicine_id] ? (
                          <span className="rx-uploaded">✓ Prescription Uploaded</span>
                        ) : (
                          <span className="rx-pending">⚠️ Upload Required</span>
                        )}
                      </div>

                      {!selectedPrescription[item.medicine_id] && prescriptions.length > 0 && (
                        <div className="prescription-options">
                          <label className="prescription-label">Select existing prescription:</label>
                          <select 
                            className="prescription-select"
                            onChange={(e) => handleSelectExistingPrescription(item.medicine_id, e.target.value)}
                            value={selectedPrescription[item.medicine_id] || ''}
                          >
                            <option value="">Choose a prescription...</option>
                            {prescriptions.map((rx) => (
                              <option key={rx.id} value={rx.id}>
                                {rx.doctor_name || 'Prescription'} - Issued: {new Date(rx.issue_date).toLocaleDateString()}
                                {rx.expiry_date && ` (Expires: ${new Date(rx.expiry_date).toLocaleDateString()})`}
                              </option>
                            ))}
                          </select>
                          <button
                            className="upload-rx-btn-secondary"
                            onClick={() => {
                              setSelectedPrescriptionItem(item.medicine_id);
                              setShowPrescriptionUpload(true);
                            }}
                          >
                            Or Upload New Prescription
                          </button>
                        </div>
                      )}

                      {!selectedPrescription[item.medicine_id] && prescriptions.length === 0 && (
                        <button
                          className="upload-rx-btn"
                          onClick={() => {
                            setSelectedPrescriptionItem(item.medicine_id);
                            setShowPrescriptionUpload(true);
                          }}
                        >
                          📄 Upload Prescription
                        </button>
                      )}

                      {selectedPrescription[item.medicine_id] && (
                        <div className="prescription-actions">
                          <button
                            className="change-rx-btn"
                            onClick={() => {
                              const newSelectedPrescriptions = { ...selectedPrescription };
                              delete newSelectedPrescriptions[item.medicine_id];
                              setSelectedPrescription(newSelectedPrescriptions);
                            }}
                          >
                            Change Prescription
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="price-summary">
              <h3 className="summary-title">Order Summary</h3>
              <div className="summary-line"></div>
              
              <div className="summary-row">
                <span className="summary-label">Subtotal ({cartItems.length} items):</span>
                <span className="summary-value">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">GST (18%):</span>
                <span className="summary-value">${gst.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">Delivery Charges:</span>
                <span className="summary-value">
                  {deliveryCharges === 0 ? (
                    <span className="free-delivery">FREE</span>
                  ) : (
                    `$${deliveryCharges.toFixed(2)}`
                  )}
                </span>
              </div>
              
              {subtotal < 50 && subtotal > 0 && (
                <div className="delivery-note">
                  Add ${(50 - subtotal).toFixed(2)} more for free delivery!
                </div>
              )}
              
              <div className="summary-line"></div>
              
              <div className="summary-total">
                <span className="total-label">Total Amount:</span>
                <span className="total-value">${total.toFixed(2)}</span>
              </div>
              
              {checkoutBlocked && (
                <div className="checkout-warning">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <strong>Prescription Required</strong>
                    <p>Please upload prescriptions for all required medicines before checkout.</p>
                  </div>
                </div>
              )}
              
              <button 
                className={`checkout-btn ${checkoutBlocked ? 'disabled' : ''}`}
                onClick={handleCheckout}
                disabled={checkoutBlocked}
              >
                {checkoutBlocked ? (
                  <>
                    <span>🔒</span> Upload Prescriptions to Continue
                  </>
                ) : (
                  <>
                    <span>→</span> Proceed to Checkout
                  </>
                )}
              </button>
              
              <button 
                className="continue-shopping-link"
                onClick={() => navigate('/medicines/category/all')}
              >
                ← Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const addToCart = (item) => {
  const savedCart = JSON.parse(sessionStorage.getItem('cart') || '[]');
  const existingItemIndex = savedCart.findIndex((cartItem) => cartItem.id === item.id);

  if (existingItemIndex > -1) {
    savedCart[existingItemIndex].quantity = (savedCart[existingItemIndex].quantity || 1) + 1;
  } else {
    savedCart.push({ ...item, quantity: 1 });
  }

  sessionStorage.setItem('cart', JSON.stringify(savedCart));
  return savedCart;
};

export default Cart;
