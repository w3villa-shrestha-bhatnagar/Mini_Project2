import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const getCartStorageKey = (user) => {
  if (!user) return 'auramart_cart_guest';
  const userId = user.id || user._id || user.email;
  return `auramart_cart_user_${encodeURIComponent(String(userId))}`;
};

const readCartItems = (storageKey) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const cartStorageKey = getCartStorageKey(user);
  const [cartState, setCartState] = useState(() => ({
    storageKey: cartStorageKey,
    items: readCartItems(cartStorageKey)
  }));
  const [lastAddedProduct, setLastAddedProduct] = useState(null);
  const [cartAddVersion, setCartAddVersion] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const items = cartState.storageKey === cartStorageKey ? cartState.items : [];

  useEffect(() => {
    if (cartState.storageKey !== cartStorageKey) {
      setCartState({ storageKey: cartStorageKey, items: readCartItems(cartStorageKey) });
      setIsCartOpen(false);
      setLastAddedProduct(null);
      setCartAddVersion(version => version + 1);
    }
  }, [cartState.storageKey, cartStorageKey]);

  useEffect(() => {
    if (cartState.storageKey === cartStorageKey) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartState.items));
    }
  }, [cartState, cartStorageKey]);

  useEffect(() => {
    localStorage.removeItem('auramart_cart');
  }, []);

  const setItems = (updateItems) => {
    setCartState(current => {
      const currentItems = current.storageKey === cartStorageKey
        ? current.items
        : readCartItems(cartStorageKey);
      const nextItems = typeof updateItems === 'function'
        ? updateItems(currentItems)
        : updateItems;
      return { storageKey: cartStorageKey, items: nextItems };
    });
  };

  useEffect(() => {
    const handleLogout = () => {
      setIsCartOpen(false);
      setLastAddedProduct(null);
    };

    window.addEventListener('auramart:logout', handleLogout);
    return () => window.removeEventListener('auramart:logout', handleLogout);
  }, []);

  const addToCart = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setLastAddedProduct(product.title);
    setCartAddVersion(version => version + 1);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setItems(prev => prev.filter(i => i.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setItems(prev => {
      return prev.map(i => {
        if (i.id === productId) {
          const newQty = i.quantity + delta;
          return { ...i, quantity: Math.max(1, newQty) };
        }
        return i;
      });
    });
  };

  const clearLastAddedProduct = () => setLastAddedProduct(null);

  // Calculate discount based on user subscription plan
  const plan = user?.subscription?.plan || 'free';
  const discountPercent = plan === 'gold' ? 25 : plan === 'silver' ? 10 : 0;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const shippingFee = (plan === 'gold' || plan === 'silver' || subtotal === 0) ? 0 : 499;
  const total = Math.max(0, subtotal - discountAmount + shippingFee);

  return (
    <CartContext.Provider value={{
      items,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      subtotal,
      discountPercent,
      discountAmount,
      shippingFee,
      total,
      totalCount: items.reduce((sum, i) => sum + i.quantity, 0),
      lastAddedProduct,
      cartAddVersion,
      clearLastAddedProduct
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
