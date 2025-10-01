import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage on component mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading cart:', error);
      setLoading(false);
    }
  };

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  // Generate placeholder color
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

  // Remove item from cart
  const handleRemove = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // Move to wishlist
  const handleMoveToWishlist = (item) => {
    // Get existing wishlist
    const savedWishlist = localStorage.getItem('wishlist');
    const wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
    
    // Add to wishlist if not already there
    if (!wishlist.find(w => w.id === item.id)) {
      wishlist.push(item);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    
    // Remove from cart
    handleRemove(item.id);
  };

  // Calculate totals
  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const gst = subtotal * 0.18; // 18% GST
  const deliveryCharges = subtotal > 50 ? 0 : 5; // Free delivery over $50
  const total = subtotal + gst + deliveryCharges;

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

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
      {/* Header */}
      <div className="cart-header">
        <h1 className="cart-title">Cart</h1>
        <div className="cart-title-underline"></div>
      </div>

      {/* Cart Container */}
      <div className="cart-container">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h2>Your cart is empty</h2>
            <p>Add items to get started</p>
            <button 
              className="continue-shopping-btn"
              onClick={() => navigate('/medicines')}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  {/* Left: Image and Details */}
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
                        <p className="item-manufacturer">
                          By: {item.manufacturer_name}
                        </p>
                      )}
                      
                      {/* Quantity Controls */}
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="qty-display">{item.quantity || 1}</span>
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price and Actions */}
                  <div className="item-right">
                    <p className="item-price">
                      ${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
                    </p>
                    
                    <div className="item-actions">
                      <button 
                        className="wishlist-btn"
                        onClick={() => handleMoveToWishlist(item)}
                      >
                        <svg className="heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        Move to Wishlist
                      </button>
                      
                      <button 
                        className="remove-btn"
                        onClick={() => handleRemove(item.id)}
                      >
                        <svg className="cross-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="price-summary">
              <div className="summary-line"></div>
              
              <div className="summary-row">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">GST (18%):</span>
                <span className="summary-value">${gst.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span className="summary-label">Delivery Charges:</span>
                <span className="summary-value">
                  {deliveryCharges === 0 ? 'FREE' : `$${deliveryCharges.toFixed(2)}`}
                </span>
              </div>
              
              <div className="summary-total">
                <span className="total-label">Total:</span>
                <span className="total-value">${total.toFixed(2)}</span>
              </div>

              <button className="checkout-btn">
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Export function to add items to cart (to be used from other pages)
export const addToCart = (item) => {
  const savedCart = localStorage.getItem('cart');
  const cart = savedCart ? JSON.parse(savedCart) : [];
  
  // Check if item already exists
  const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
  
  if (existingItemIndex > -1) {
    // Increment quantity if item exists
    cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
  } else {
    // Add new item with quantity 1
    cart.push({ ...item, quantity: 1 });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  return cart;
};

export default Cart;