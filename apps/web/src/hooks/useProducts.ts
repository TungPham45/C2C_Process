import { useState, useCallback } from 'react';
import { normalizeProductAssetUrls, PRODUCT_API_URL } from '../config/api';

// Centralize API fetches through the Next-Gen API Gateway
const API_BASE = PRODUCT_API_URL;

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShopProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      if (!token) throw new Error('Unauthorized Session');

      const res = await fetch(`${API_BASE}/seller`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch products from gateway');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data.map(normalizeProductAssetUrls) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = async (productData: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      if (!res.ok) throw new Error('Failed to create product');
      await fetchShopProducts(); // refresh list
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}`);
      if (!res.ok) throw new Error('Failed to fetch public products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data.map(normalizeProductAssetUrls) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductDetail = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product details');
      const data = await res.json();
      return normalizeProductAssetUrls(data);
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, fetchShopProducts, fetchPublicProducts, fetchProductDetail, createProduct, deleteProduct };
};
