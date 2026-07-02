import { useState, useCallback, useEffect } from 'react';
import { CART_API_URL } from '../config/api';

export interface CartItem {
  id: number;
  cart_id: number;
  shop_id: number;
  product_variant_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Bổ sung các field do Frontend mock (fetch từ product service)
  product?: any;
  variant?: any;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('c2c_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCartItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(CART_API_URL, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) return; // not logged in
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      setCartItems(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = async (shop_id: number, product_variant_id: number, quantity: number) => {
    try {
      const response = await fetch(CART_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ shop_id, product_variant_id, quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }

      // Re-fetch cart content
      await fetchCartItems();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateCartItem = async (itemId: number, quantity: number) => {
    try {
      const response = await fetch(`${CART_API_URL}/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cart item');
      }

      // Optimistic Update
      setCartItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)).filter((i) => i.quantity > 0)
      );

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      const response = await fetch(`${CART_API_URL}/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove cart item');
      }

      // Optimistic Update
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  return {
    cartItems,
    loading,
    error,
    fetchCartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
  };
};
