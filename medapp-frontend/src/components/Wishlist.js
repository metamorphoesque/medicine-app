import React, { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Wishlist.css';

// Create Wishlist Context
const WishlistContext = createContext();

// Wishlist Provider Component
export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);

  // Initialize wishlist data in memory
  useEffect(() => {
    if (!window.wishlistData) {
      window.wishlistData = [];
    }
    setWishlistItems(window.wishlistData);
  }, []);

  // Sync wishlist to memory whenever it changes
  useEffect(() => {
    window.wishlistData = wishlistItems;
  }, [wishlistItems]);

  const addToWishlist = (item) => {
    setWishlistItems(prevItems => {
      const existingItem = prevItems.find(wishlistItem => wishlistItem.id === item.id);
      if (!existingItem) {
        return [...prevItems, item];
      }
      return prevItems;
    });
  };

  const removeFromWishlist = (itemId) => {
    setWishlistItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const isInWishlist = (itemId) => {
    return wishlistItems.some(item => item.id === itemId);
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlistItems, 
      addToWishlist, 
      removeFromWishlist,
      isInWishlist 
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

// Custom hook to use wishlist context
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

// Export context for backward compatibility
export { WishlistContext };

// Wishlist Page Component
const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);

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

  // Remove item from wishlist
  const handleRemove = (itemId) => {
    removeFromWishlist(itemId);
  };

  // Move to cart
  const handleMoveToCart = (item) => {
    // Get existing cart
    const savedCart = window.cartData || [];
    
    // Check if item already exists in cart
    const existingItemIndex = savedCart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex > -1) {
      // Increment quantity if item exists
      savedCart[existingItemIndex].quantity = (savedCart[existingItemIndex].quantity || 1) + 1;
    } else {
      // Add new item with quantity 1
      savedCart.push({ ...item, quantity: 1 });
    }
    
    window.cartData = savedCart;
    
    // Remove from wishlist
    handleRemove(item.id);
    
    // Show success message (optional)
    alert('Item moved to cart!');
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      {/* Header */}
      <div className="wishlist-header">
        <h1 className="wishlist-title">Wishlist</h1>
        <div className="wishlist-title-underline"></div>
      </div>

      {/* Wishlist Container */}
      <div className="wishlist-container">
        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist">
            <svg className="empty-wishlist-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h2>Your wishlist is empty</h2>
            <p>Add items you love to your wishlist</p>
            <button 
              className="continue-shopping-btn"
              onClick={() => navigate('/medicines')}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="wishlist-items">
            {wishlistItems.map((item) => (
              <div key={item.id} className="wishlist-item">
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
                    <p className="item-price">${parseFloat(item.price).toFixed(2)}</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="item-right">
                  <div className="item-actions">
                    <button 
                      className="cart-btn"
                      onClick={() => handleMoveToCart(item)}
                    >
                      <svg className="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                      Move to Cart
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
        )}
      </div>
    </div>
  );
};

// Standalone function to add items to wishlist (for backward compatibility)
export const addToWishlist = (item) => {
  const wishlist = window.wishlistData || [];
  
  // Check if item already exists
  const existingItem = wishlist.find(wishlistItem => wishlistItem.id === item.id);
  
  if (!existingItem) {
    // Add new item
    wishlist.push(item);
    window.wishlistData = wishlist;
    return wishlist;
  }
  
  return wishlist;
};

export default Wishlist;