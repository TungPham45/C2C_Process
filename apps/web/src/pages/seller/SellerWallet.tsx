import { FC, useEffect, useState, useCallback } from 'react';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { WALLET_API_URL, ORDER_API_URL } from '../../config/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  topup:        { label: 'Nạp tiền',       color: '#1b6b3e', bg: '#dcfce7', icon: 'add_circle' },
  payment:      { label: 'Thanh toán',     color: '#0f4c81', bg: '#dbeafe', icon: 'shopping_cart' },
  payout:       { label: 'Nhận thanh toán', color: '#6d28d9', bg: '#ede9fe', icon: 'payments' },
  withdraw:     { label: 'Rút tiền',       color: '#92400e', bg: '#fef3c7', icon: 'arrow_outward' },
  refund:       { label: 'Hoàn tiền',      color: '#b45309', bg: '#fef9c3', icon: 'undo' },
  transfer_in:  { label: 'Chuyển đến',     color: '#047857', bg: '#d1fae5', icon: 'arrow_downward' },
  transfer_out: { label: 'Chuyển đi',      color: '#b91c1c', bg: '#fee2e2', icon: 'arrow_upward' },
  fee:          { label: 'Phí nền tảng',   color: '#6b7280', bg: '#f3f4f6', icon: 'receipt' },
};

const STATUS_COLORS: Record<string, { dot: string; text: string; label: string }> = {
  completed: { dot: '#22c55e', text: '#166534', label: 'Hoàn thành' },
  pending:   { dot: '#f59e0b', text: '#92400e', label: 'Đang xử lý' },
  failed:    { dot: '#ef4444', text: '#b91c1c', label: 'Thất bại' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('c2c_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const SellerWalletPage: FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [activeFilter, setActiveFilter] = useState('all');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(WALLET_API_URL, { headers: getAuthHeaders() });
      if (res.ok) setWallet(await res.json());
    } catch { }
    setLoading(false);
  }, []);

  const fetchTx = useCallback(async (type?: string, page = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== 'all') params.set('type', type);
      params.set('page', String(page));
      params.set('limit', '10');
      const res = await fetch(`${WALLET_API_URL}/transactions?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data);
        setPagination({ total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages });
      }
    } catch { }
    setTxLoading(false);
  }, []);

  const fetchPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const res = await fetch(`${ORDER_API_URL}/seller-payouts`, { headers: getAuthHeaders() });
      if (res.ok) setPayouts(await res.json());
    } catch { }
    setPayoutsLoading(false);
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);
  useEffect(() => { if (activeTab === 'transactions') fetchTx(activeFilter); }, [activeFilter, fetchTx, activeTab]);
  useEffect(() => { if (activeTab === 'payouts') fetchPayouts(); }, [fetchPayouts, activeTab]);

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${WALLET_API_URL}/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: withdrawAmount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Rút tiền thất bại');
      }
      const data = await res.json();
      setWallet(data.wallet);
      setShowWithdraw(false);
      setWithdrawAmount(0);
      setToast(data.needs_approval ? 'Yêu cầu rút tiền đã gửi. Đang chờ phê duyệt.' : 'Rút tiền thành công!');
      fetchTx(activeFilter);
      setTimeout(() => setToast(''), 4000);
    } catch (err: any) {
      setToast(err.message || 'Có lỗi xảy ra');
      setTimeout(() => setToast(''), 4000);
    }
    setActionLoading(false);
  };

  const filters = [
    { key: 'all',      label: 'Tất cả' },
    { key: 'payment',  label: 'Bán hàng' },
    { key: 'payout',   label: 'Thanh toán' },
    { key: 'fee',      label: 'Phí' },
    { key: 'withdraw', label: 'Rút tiền' },
    { key: 'refund',   label: 'Hoàn tiền' },
  ];

  return (
    <SellerLayout pageTitle="Quản lý Ví">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-20 right-8 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {toast}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Balance */}
          <div className="col-span-2 bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] rounded-2xl p-7 text-white relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">SỐ DƯ VÍ CỬA HÀNG</p>
            {loading ? (
              <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse mt-2" />
            ) : (
              <h2 className="text-3xl font-black font-['Plus_Jakarta_Sans'] tracking-tight">
                {formatVND(wallet?.balance ?? 0)}
              </h2>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-[#1d4ed8] rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">arrow_outward</span>
                Rút tiền
              </button>
            </div>
          </div>
          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng quan tháng này</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-base">trending_up</span>
                  </div>
                  <span className="text-sm text-slate-600">Giao dịch</span>
                </div>
                <span className="font-bold text-slate-900">{pagination.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-base">account_balance_wallet</span>
                  </div>
                  <span className="text-sm text-slate-600">Số dư</span>
                </div>
                <span className="font-bold text-slate-900">{formatVND(wallet?.balance ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'transactions'
                ? 'border-[#1d4ed8] text-[#1d4ed8]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lịch sử giao dịch
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'payouts'
                ? 'border-[#1d4ed8] text-[#1d4ed8]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Doanh thu chờ đối soát
          </button>
        </div>

        {activeTab === 'transactions' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lịch sử giao dịch</h3>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi thu chi từ cửa hàng</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeFilter === f.key
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-7 py-3">Ngày</th>
                  <th className="px-4 py-3">Chi tiết</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-7 py-4"><div className="h-4 w-20 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-36 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-50 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-50 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-7 py-14 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">receipt_long</span>
                      <p className="font-bold text-slate-500">Chưa có giao dịch</p>
                      <p className="text-xs text-slate-400 mt-1">Khi có đơn hàng mới, giao dịch sẽ hiển thị tại đây</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const cfg = TYPE_LABELS[tx.transaction_type] || { label: tx.transaction_type, color: '#6b7280', bg: '#f3f4f6', icon: 'receipt' };
                    const st = STATUS_COLORS[tx.status] || STATUS_COLORS.completed;
                    const isCredit = ['topup', 'payout', 'refund', 'transfer_in'].includes(tx.transaction_type);
                    return (
                      <tr key={tx.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-7 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(tx.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                              <span className="material-symbols-outlined text-base" style={{ color: cfg.color }}>{cfg.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{tx.description || cfg.label}</p>
                              {tx.reference_id && <p className="text-[11px] text-slate-400">#{tx.reference_id}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color, background: cfg.bg }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                            <span className="text-sm" style={{ color: st.text }}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {isCredit ? '+' : '-'}{formatVND(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
              </span>
              <div className="flex gap-1.5">
                <button disabled={pagination.page <= 1} onClick={() => fetchTx(activeFilter, pagination.page - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => (
                  <button key={i+1} onClick={() => fetchTx(activeFilter, i+1)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${i+1 === pagination.page ? 'bg-[#1d4ed8] text-white' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {i+1}
                  </button>
                ))}
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTx(activeFilter, pagination.page + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
        ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Doanh thu chờ đối soát</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tiền hàng sẽ được cộng vào ví sau 7 ngày kể từ khi giao thành công</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="px-7 py-3">Mã đơn hàng</th>
                  <th className="px-4 py-3">Chi tiết tiền hàng</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái đối soát</th>
                </tr>
              </thead>
              <tbody>
                {payoutsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-7 py-4"><div className="h-4 w-20 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-36 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-50 rounded animate-pulse" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-20 bg-slate-50 rounded-full animate-pulse" /></td>
                    </tr>
                  ))
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-7 py-14 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">storefront</span>
                      <p className="font-bold text-slate-500">Chưa có khoản doanh thu chờ đối soát nào</p>
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const isEligible = new Date(p.eligible_at) <= new Date() && p.status === 'holding';
                    return (
                      <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-7 py-4">
                          <span className="text-sm font-mono font-bold text-slate-700">#{p.shop_order_id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-emerald-600">{formatVND(p.seller_amount)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Tổng: {formatVND(p.order_amount)} - Phí: {formatVND(p.platform_fee)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] text-slate-500 mb-0.5"><span className="font-medium text-slate-700">Giao hàng:</span> {new Date(p.shop_order.delivered_at).toLocaleDateString('vi-VN')}</p>
                          <p className="text-[11px] text-slate-500"><span className="font-medium text-slate-700">Đến hạn:</span> {new Date(p.eligible_at).toLocaleDateString('vi-VN')}</p>
                        </td>
                        <td className="px-4 py-4">
                          {p.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span> Đã thanh toán
                            </span>
                          ) : isEligible || p.status === 'ready' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[14px]">event_available</span> Đã đến hạn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[14px]">lock_clock</span> Đang giữ (7 ngày)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdraw(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Rút tiền</h3>
              <button onClick={() => setShowWithdraw(false)} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center"><span className="material-symbols-outlined text-slate-400">close</span></button>
            </div>
            <div className="px-7 py-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Số tiền rút</label>
                <input type="number" value={withdrawAmount || ''} onChange={(e) => setWithdrawAmount(Number(e.target.value))} max={wallet?.balance ?? 0} placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50" />
              </div>
              <p className="text-xs text-slate-400">Số dư hiện tại: <span className="font-bold text-slate-700">{formatVND(wallet?.balance ?? 0)}</span></p>
              {withdrawAmount >= 5_000_000 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">info</span>
                  <p className="text-xs text-amber-700">Giao dịch ≥ 5.000.000₫ cần phê duyệt của quản trị viên.</p>
                </div>
              )}
            </div>
            <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowWithdraw(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all">Hủy</button>
              <button onClick={handleWithdraw} disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > (wallet?.balance ?? 0) || actionLoading} className="px-6 py-2.5 bg-[#1d4ed8] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#1e40af] disabled:opacity-50 transition-all flex items-center gap-2">
                {actionLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </SellerLayout>
  );
};

export default SellerWalletPage;
