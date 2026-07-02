import { useState, useCallback } from 'react';
import { WALLET_API_URL } from '../config/api';

interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: number;
  wallet_id: number;
  user_id: number;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  reference_id?: string;
  reference_type?: string;
  payment_method?: string;
  description?: string;
  created_at: string;
  completed_at?: string;
}

interface TransactionPage {
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('c2c_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(WALLET_API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch wallet');
      const data = await res.json();
      setWallet(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const topUp = useCallback(async (amount: number, paymentMethod?: string) => {
    setError(null);
    try {
      const res = await fetch(`${WALLET_API_URL}/topup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, payment_method: paymentMethod }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Top-up failed');
      }
      const data = await res.json();
      setWallet(data.wallet);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const withdraw = useCallback(async (amount: number, description?: string) => {
    setError(null);
    try {
      const res = await fetch(`${WALLET_API_URL}/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, description }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Withdrawal failed');
      }
      const data = await res.json();
      setWallet(data.wallet);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchTransactions = useCallback(
    async (filters: { type?: string; status?: string; page?: number; limit?: number } = {}) => {
      setTransactionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== 'all') params.set('type', filters.type);
        if (filters.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));

        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${WALLET_API_URL}/transactions${query}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const data: TransactionPage = await res.json();
        setTransactions(data.data);
        setPagination({
          total: data.total,
          page: data.page,
          limit: data.limit,
          totalPages: data.totalPages,
        });
        return data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setTransactionsLoading(false);
      }
    },
    [],
  );

  return {
    wallet,
    loading,
    error,
    fetchWallet,
    topUp,
    withdraw,
    transactions,
    transactionsLoading,
    pagination,
    fetchTransactions,
  };
}
