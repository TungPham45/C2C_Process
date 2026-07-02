import { useState, useCallback } from 'react';
import { PRODUCT_API_URL } from '../config/api';

const API_BASE = PRODUCT_API_URL;

export interface Review {
  id: number;
  user_id: number;
  user?: {
    id: number;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  product_id: number;
  shop_order_id: number;
  rating: number;
  comment: string | null;
  media_urls: string[] | null;
  seller_reply: string | null;
  replied_at: string | null;
  created_at: string;
  product?: { id: number; name: string; thumbnail_url: string };
}

export interface ReviewsData {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  avg_rating: number;
  rating_distribution: Record<number, number>;
}

export const useReviews = () => {
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductReviews = useCallback(async (productId: number, page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/${productId}/reviews?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data: ReviewsData = await res.json();
      setReviewsData(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReview = async (productId: number, data: { rating: number; comment?: string; media_urls?: string[]; shop_order_id: number }) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi gửi đánh giá');
      }
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (productId: number, reviewId: number, data: { rating?: number; comment?: string; media_urls?: string[] }) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/${productId}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi cập nhật đánh giá');
      }
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch seller reviews');
      const data = await res.json();
      setSellerReviews(Array.isArray(data) ? data : []);
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const replyToReview = async (reviewId: number, reply: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/seller/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reply }),
      });
      if (!res.ok) throw new Error('Failed to reply to review');
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (productId: number, reviewId: number) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${API_BASE}/${productId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Xóa đánh giá thất bại');
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    reviewsData,
    sellerReviews,
    loading,
    error,
    fetchProductReviews,
    submitReview,
    updateReview,
    deleteReview,
    fetchSellerReviews,
    replyToReview,
  };
};
