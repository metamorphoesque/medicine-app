import React, { createContext, useState, useContext } from "react";

// create context
export const WishlistContext = createContext();

// provider component
export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);

  const addToWishlist = (medicine) => {
    setWishlist((prev) => {
      if (prev.find((item) => item.id === medicine.id)) return prev;
      return [...prev, medicine];
    });
  };

  const removeFromWishlist = (id) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

// the actual Wishlist page
function Wishlist() {
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);

  return (
    <div className="wishlist-page">
      <h2>Your Wishlist</h2>
      {wishlist.length === 0 ? (
        <p>No medicines added yet.</p>
      ) : (
        wishlist.map((item) => (
          <div key={item.id} className="wishlist-item">
            <h3>{item.name}</h3>
            <button onClick={() => removeFromWishlist(item.id)}>Remove</button>
          </div>
        ))
      )}
    </div>
  );
}

export default Wishlist;
