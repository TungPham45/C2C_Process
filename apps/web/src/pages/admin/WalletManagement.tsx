import { FC, useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ADMIN_API_URL } from '../../config/api';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatCompact = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  topup:        { label: 'NẠP TIỀN',        color: '#1b6b3e', bg: '#dcfce7' },
  payment:      { label: 'THANH TOÁN',       color: '#0f4c81', bg: '#dbeafe' },
  payout:       { label: 'CHI TRẢ SELLER',   color: '#6d28d9', bg: '#ede9fe' },
  withdraw:     { label: 'RÚT TIỀN',        color: '#92400e', bg: '#fef3c7' },
  refund:       { label: 'HOÀN TIỀN',       color: '#b45309', bg: '#fef9c3' },
  transfer_in:  { label: 'CHUYỂN ĐẾN',      color: '#047857', bg: '#d1fae5' },
  transfer_out: { label: 'CHUYỂN ĐI',       color: '#b91c1c', bg: '#fee2e2' },
  fee:          { label: 'PHÍ NỀN TẢNG',    color: '#6b7280', bg: '#f3f4f6' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  completed: { label: 'THÀNH CÔNG', color: '#16a34a', icon: 'check_circle' },
  pending:   { label: 'CHỜ DUYỆT', color: '#d97706', icon: 'hourglass_empty' },
  failed:    { label: 'TỪ CHỐI',   color: '#dc2626', icon: 'cancel' },
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('c2c_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const WalletManagement: FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState('');
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  // --- PAYOUTS STATE ---
  const [activeTab, setActiveTab] = useState<'ledger' | 'payouts'>('ledger');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutFilterStatus, setPayoutFilterStatus] = useState('all');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${ADMIN_API_URL}/wallets/stats`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { }
  }, []);

  const fetchTx = useCallback(async (type?: string, status?: string, page = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== 'all') params.set('type', type);
      if (status && status !== 'all') params.set('status', status);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await fetch(`${ADMIN_API_URL}/transactions?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data);
        setPagination({ total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages });
      }
    } catch { }
    setTxLoading(false);
  }, []);

  const fetchPayouts = useCallback(async (status?: string) => {
    setPayoutsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      const res = await fetch(`${ADMIN_API_URL}/payouts?${params}`, { headers: getAuthHeaders() });
      if (res.ok) setPayouts(await res.json());
    } catch { }
    setPayoutsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'ledger') fetchTx(filterType, filterStatus); }, [filterType, filterStatus, fetchTx, activeTab]);
  useEffect(() => { if (activeTab === 'payouts') fetchPayouts(payoutFilterStatus); }, [payoutFilterStatus, fetchPayouts, activeTab]);

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${ADMIN_API_URL}/transactions/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setToast(newStatus === 'completed' ? 'Giao dịch đã được phê duyệt' : 'Giao dịch đã bị từ chối');
        fetchTx(filterType, filterStatus, pagination.page);
        fetchStats();
        setTimeout(() => setToast(''), 3000);
      }
    } catch { }
    setActionMenuId(null);
  };

  const handleReleasePayout = async (id: number) => {
    try {
      const res = await fetch(`${ADMIN_API_URL}/payouts/${id}/release`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setToast('Đã chi trả tiền cho Seller thành công');
        fetchPayouts(payoutFilterStatus);
        fetchStats();
        setTimeout(() => setToast(''), 3000);
      } else {
        const error = await res.json();
        alert(error.message || 'Lỗi khi chi trả');
      }
    } catch (e) {
      alert('Lỗi khi chi trả');
    }
  };

  const handleProcessEligiblePayouts = async () => {
    if (!window.confirm('Thực hiện tự động chi trả cho các đơn hàng đã đến hạn?')) return;
    try {
      const res = await fetch(`${ADMIN_API_URL}/payouts/process-eligible`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        setToast(`Đã xử lý ${result.processed} giao dịch chi trả thành công. Thất bại: ${result.failed}`);
        fetchPayouts(payoutFilterStatus);
        fetchStats();
        setTimeout(() => setToast(''), 3000);
      }
    } catch {
      alert('Lỗi khi chạy tiến trình');
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Ví & Giao dịch" pageSubtitle="Giám sát ví người dùng và kiểm duyệt giao dịch trên nền tảng">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-8 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {toast}
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-[#e1f0fb] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-1">TỔNG SỐ VÍ</p>
          <h3 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">{stats?.totalWallets ?? '—'}</h3>
          <p className="text-xs text-[#707882] mt-1">ví hoạt động</p>
        </div>
        <div className="bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">TỔNG SỐ DƯ</p>
          <h3 className="text-2xl font-black font-['Plus_Jakarta_Sans'] relative z-10">
            {stats ? formatVND(stats.adminBalance) : '—'}
          </h3>
          <p className="text-white/50 text-xs mt-1">ví quản trị viên</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#e1f0fb] p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-1">KHỐI LƯỢNG GIAO DỊCH</p>
          <h3 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">
            {stats ? formatVND(stats.platformVolume) : '—'}
          </h3>
          <p className="text-xs text-[#707882] mt-1">đã hoàn thành</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">CHỜ DUYỆT</p>
          <h3 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-amber-600">{stats?.pendingCount ?? 0}</h3>
          <p className="text-xs text-amber-500 mt-1">
            {stats ? formatVND(stats.pendingPayouts) : '0₫'} đang chờ
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'ledger'
              ? 'bg-[#0f1d25] text-white shadow-lg'
              : 'bg-white text-[#707882] border border-[#e1f0fb] hover:bg-[#f5faff] hover:text-[#0f1d25]'
          }`}
        >
          Sổ cái Giao dịch
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'payouts'
              ? 'bg-[#0f1d25] text-white shadow-lg'
              : 'bg-white text-[#707882] border border-[#e1f0fb] hover:bg-[#f5faff] hover:text-[#0f1d25]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          Chi trả Seller
          {stats?.pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
              {stats.pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ledger' ? (
      <div className="bg-white rounded-2xl border border-[#e1f0fb] shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f0f7ff]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Sổ cái tổng hợp</h2>
              <p className="text-xs text-[#707882] mt-0.5">Kiểm soát mọi giao dịch trên nền tảng</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-[#f5faff] border border-[#e9f5ff] rounded-xl text-xs font-bold text-[#0f1d25] outline-none focus:border-[#00629d] transition-all cursor-pointer"
              >
                <option value="all">Loại: Tất cả</option>
                <option value="topup">Nạp tiền</option>
                <option value="payment">Thanh toán</option>
                <option value="payout">Chi trả Seller</option>
                <option value="withdraw">Rút tiền</option>
                <option value="refund">Hoàn tiền</option>
                <option value="fee">Phí nền tảng</option>
              </select>
              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-[#f5faff] border border-[#e9f5ff] rounded-xl text-xs font-bold text-[#0f1d25] outline-none focus:border-[#00629d] transition-all cursor-pointer"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="completed">Hoàn thành</option>
                <option value="pending">Chờ duyệt</option>
                <option value="failed">Từ chối</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-[#bfc7d3]">
                <th className="px-8 py-4">MÃ GD</th>
                <th className="px-4 py-4">NGƯỜI DÙNG</th>
                <th className="px-4 py-4">CHI TIẾT</th>
                <th className="px-4 py-4">LOẠI</th>
                <th className="px-4 py-4">SỐ TIỀN</th>
                <th className="px-4 py-4">TRẠNG THÁI</th>
                <th className="px-4 py-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#f5faff]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-5"><div className="h-4 w-20 bg-[#f5faff] rounded-lg animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-[#dbeaf5] mb-4 block">account_balance</span>
                    <p className="font-bold text-[#707882]">Chưa có giao dịch nào</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const typeCfg = TYPE_CONFIG[tx.transaction_type] || { label: tx.transaction_type.toUpperCase(), color: '#6b7280', bg: '#f3f4f6' };
                  const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.completed;
                  const isCredit = ['topup', 'payout', 'refund', 'transfer_in'].includes(tx.transaction_type);

                  return (
                    <tr key={tx.id} className="border-t border-[#f5faff] hover:bg-[#fbfdff] transition-colors">
                      <td className="px-8 py-4">
                        <span className="text-sm font-mono font-bold text-[#404751]">#TRX-{String(tx.id).padStart(4, '0')}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#e9f5ff] flex items-center justify-center text-[#00629d] text-xs font-bold">
                            {(tx.user?.full_name || tx.user?.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0f1d25]">
                              {tx.user?.full_name || 'Ẩn danh'}
                            </p>
                            <p className="text-[10px] text-[#bfc7d3]">@{tx.user?.email?.split('@')[0] || `user_${tx.user_id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-[#0f1d25]">{tx.description || typeCfg.label}</p>
                        <p className="text-[10px] text-[#bfc7d3] mt-0.5">
                          {new Date(tx.created_at).toLocaleString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider"
                          style={{ color: typeCfg.color, background: typeCfg.bg }}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-[#0f1d25]'}`}>
                          {isCredit ? '+' : '-'}{formatVND(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm" style={{ color: statusCfg.color }}>{statusCfg.icon}</span>
                          <span className="text-xs font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center relative">
                        {tx.status === 'pending' ? (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === tx.id ? null : tx.id)}
                              className="w-8 h-8 rounded-lg hover:bg-[#f5faff] flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg text-[#707882]">more_vert</span>
                            </button>
                            {actionMenuId === tx.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e9f5ff] rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                  onClick={() => handleStatusUpdate(tx.id, 'completed')}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">check_circle</span>
                                  Phê duyệt
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(tx.id, 'failed')}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">cancel</span>
                                  Từ chối
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#bfc7d3] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-8 py-5 border-t border-[#f0f7ff] flex items-center justify-between">
            <p className="text-xs text-[#707882] font-bold uppercase tracking-wider">
              HIỂN THỊ {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} BẢN GHI
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTx(filterType, filterStatus, pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="w-9 h-9 rounded-full border border-[#e9f5ff] flex items-center justify-center text-[#707882] hover:bg-[#f5faff] disabled:opacity-30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => fetchTx(filterType, filterStatus, i + 1)}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                    i + 1 === pagination.page
                      ? 'bg-[#0f1d25] text-white'
                      : 'border border-[#e9f5ff] text-[#707882] hover:bg-[#f5faff]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => fetchTx(filterType, filterStatus, pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="w-9 h-9 rounded-full border border-[#e9f5ff] flex items-center justify-center text-[#707882] hover:bg-[#f5faff] disabled:opacity-30 transition-all"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
      ) : (
      <div className="bg-white rounded-2xl border border-[#e1f0fb] shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f0f7ff]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Chi trả doanh thu</h2>
              <p className="text-xs text-[#707882] mt-0.5">Quản lý và thực hiện lệnh chuyển tiền cho người bán (đã trừ 15% phí nền tảng)</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={payoutFilterStatus}
                onChange={(e) => setPayoutFilterStatus(e.target.value)}
                className="px-4 py-2 bg-[#f5faff] border border-[#e9f5ff] rounded-xl text-xs font-bold text-[#0f1d25] outline-none focus:border-[#00629d] transition-all cursor-pointer"
              >
                <option value="all">Trạng thái: Tất cả</option>
                <option value="holding">Đang giữ tiền (Chưa đến hạn)</option>
                <option value="ready">Đã đến hạn (Có thể chi trả)</option>
                <option value="paid">Đã thanh toán</option>
              </select>
              <button
                onClick={handleProcessEligiblePayouts}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Auto Pay Đã Đến Hạn
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-[#bfc7d3]">
                <th className="px-8 py-4">MÃ ĐH</th>
                <th className="px-4 py-4">SELLER</th>
                <th className="px-4 py-4">THỜI GIAN</th>
                <th className="px-4 py-4">SỐ TIỀN (SAU PHÍ)</th>
                <th className="px-4 py-4">TRẠNG THÁI</th>
                <th className="px-4 py-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {payoutsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#f5faff]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-5"><div className="h-4 w-20 bg-[#f5faff] rounded-lg animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-[#dbeaf5] mb-4 block">receipt_long</span>
                    <p className="font-bold text-[#707882]">Chưa có khoản chi trả nào</p>
                  </td>
                </tr>
              ) : (
                payouts.map((p) => {
                  const isEligible = new Date(p.eligible_at) <= new Date() && p.status === 'holding';
                  return (
                    <tr key={p.id} className="border-t border-[#f5faff] hover:bg-[#fbfdff] transition-colors">
                      <td className="px-8 py-4">
                        <span className="text-sm font-mono font-bold text-[#404751]">#{p.shop_order_id}</span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-[#0f1d25]">{p.shop_name}</p>
                        <p className="text-[10px] text-[#bfc7d3]">UID: {p.seller_user_id}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[10px] text-[#707882]"><span className="font-semibold text-[#0f1d25]">Giao:</span> {new Date(p.shop_order.delivered_at).toLocaleDateString('vi-VN')}</p>
                        <p className="text-[10px] text-[#707882]"><span className="font-semibold text-[#0f1d25]">Đến hạn:</span> {new Date(p.eligible_at).toLocaleDateString('vi-VN')}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-emerald-600">{formatVND(p.seller_amount)}</p>
                          <span className="text-[10px] bg-[#f5faff] text-[#00629d] px-2 py-0.5 rounded-md font-semibold">
                            (Phí {formatVND(p.platform_fee)})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {p.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> ĐÃ THANH TOÁN
                          </span>
                        ) : isEligible || p.status === 'ready' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">event_available</span> ĐÃ ĐẾN HẠN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">lock_clock</span> ĐANG GIỮ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => handleReleasePayout(p.shop_order_id)}
                            className="bg-[#e9f5ff] hover:bg-[#00629d] hover:text-white text-[#00629d] px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          >
                            Chi Trả Ngay
                          </button>
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
    </AdminLayout>
  );
};

export default WalletManagement;
