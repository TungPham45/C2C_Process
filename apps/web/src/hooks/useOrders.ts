import { useState, useCallback } from 'react';
import { ORDER_API_URL } from '../config/api';

const API_BASE = ORDER_API_URL;

export const useOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBuyerOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const userStr = localStorage.getItem('c2c_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = localStorage.getItem('c2c_user_id') || user?.id;
      if (!token) throw new Error('Unauthorized Session');

      const res = await fetch(`${API_BASE}/buyer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch buyer orders');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellerOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      if (!token) throw new Error('Unauthorized Session');

      // Lấy shopId trực tiếp từ context API để tránh localStorage bị stale/thiếu id
      let shopId = localStorage.getItem('c2c_shop_id');
      if (!shopId) {
        const userStr = localStorage.getItem('c2c_user');
        const user = userStr ? JSON.parse(userStr) : null;
        shopId = user?.shop?.id ? String(user.shop.id) : null;
      }

      // Nếu vẫn không có shopId, gọi API seller/context để lấy
      if (!shopId || shopId === 'undefined' || shopId === 'null') {
        const ctxRes = await fetch('/api/products/seller/context', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          shopId = ctxData?.shop?.id ? String(ctxData.shop.id) : null;
          // Lưu lại cho lần sau
          if (shopId) {
            const userStr = localStorage.getItem('c2c_user');
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                user.shop = { ...user.shop, ...ctxData.shop };
                localStorage.setItem('c2c_user', JSON.stringify(user));
              } catch (e) {}
            }
          }
        }
      }

      if (!shopId || shopId === 'undefined') {
        setOrders([]);
        return;
      }

      const res = await fetch(`${API_BASE}/seller?shopId=${shopId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch seller orders');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderDetail = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch order details');
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = async (id: number, status: string, trackingInfo?: { tracking_number: string; carrier_name: string }) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, ...trackingInfo })
      });
      if (!res.ok) throw new Error('Failed to update order status');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: any) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      const json = await res.json();
      // Bắt lỗi từ backend (400 - hết hàng, 404 - không tìm thấy,...)
      if (!res.ok) {
        const msg = json?.message || 'Đặt hàng thất bại. Vui lòng thử lại.';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      return json;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckoutVouchers = async (checkoutData: any) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/checkout-vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(checkoutData)
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.message || 'Failed to load checkout vouchers.';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      return json;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { orders, loading, error, fetchBuyerOrders, fetchSellerOrders, fetchOrderDetail, updateOrderStatus, createOrder, fetchCheckoutVouchers };
};
