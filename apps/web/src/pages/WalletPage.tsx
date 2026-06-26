import { FC, useEffect, useState } from 'react';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useWallet } from '../hooks/useWallet';

/* ──────────── helpers ──────────── */
const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  topup:        { label: 'Nạp tiền',      color: '#1b6b3e', bg: '#dcfce7' },
  payment:      { label: 'Thanh toán',    color: '#0f4c81', bg: '#dbeafe' },
  payout:       { label: 'Nhận thanh toán', color: '#6d28d9', bg: '#ede9fe' },
  withdraw:     { label: 'Rút tiền',      color: '#92400e', bg: '#fef3c7' },
  refund:       { label: 'Hoàn tiền',     color: '#b45309', bg: '#fef9c3' },
  transfer_in:  { label: 'Chuyển đến',    color: '#047857', bg: '#d1fae5' },
  transfer_out: { label: 'Chuyển đi',     color: '#b91c1c', bg: '#fee2e2' },
  fee:          { label: 'Phí',           color: '#6b7280', bg: '#f3f4f6' },
};

const STATUS_DOTS: Record<string, string> = {
  completed: '#22c55e',
  pending:   '#f59e0b',
  failed:    '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Hoàn thành',
  pending:   'Đang xử lý',
  failed:    'Thất bại',
};

const TOPUP_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

/* ──────────── component ──────────── */
export const WalletPage: FC = () => {
  const {
    wallet, loading, error, fetchWallet,
    topUp, withdraw,
    transactions, transactionsLoading, pagination, fetchTransactions,
  } = useWallet();

  const [activeTab, setActiveTab] = useState('all');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { fetchWallet(); }, [fetchWallet]);
  useEffect(() => { fetchTransactions({ type: activeTab === 'all' ? undefined : activeTab, page: 1, limit: 10 }); }, [activeTab, fetchTransactions]);

  const handleTopUp = async () => {
    if (topUpAmount <= 0) return;
    setActionLoading(true);
    try {
      await topUp(topUpAmount, 'simulated');
      setShowTopUp(false);
      setTopUpAmount(0);
      setSuccessMsg('Nạp tiền thành công!');
      fetchTransactions({ type: activeTab === 'all' ? undefined : activeTab, page: 1 });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { }
    setActionLoading(false);
  };

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0) return;
    setActionLoading(true);
    try {
      const result = await withdraw(withdrawAmount);
      setShowWithdraw(false);
      setWithdrawAmount(0);
      setSuccessMsg(result.needs_approval
        ? 'Yêu cầu rút tiền đã gửi, đang chờ phê duyệt!'
        : 'Rút tiền thành công!');
      fetchTransactions({ type: activeTab === 'all' ? undefined : activeTab, page: 1 });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch { }
    setActionLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    fetchTransactions({ type: activeTab === 'all' ? undefined : activeTab, page: newPage, limit: 10 });
  };

  const tabs = [
    { key: 'all',      label: 'Tất cả' },
    { key: 'topup',    label: 'Nạp tiền' },
    { key: 'payment',  label: 'Thanh toán' },
    { key: 'withdraw', label: 'Rút tiền' },
    { key: 'refund',   label: 'Hoàn tiền' },
  ];

  return (
    <MarketplaceLayout>
      <div className="max-w-5xl mx-auto px-6 pb-40">

        {/* Success toast */}
        {successMsg && (
          <div className="fixed top-24 right-8 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease]">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* ── Balance Card ── */}
        <div className="bg-gradient-to-br from-[#003d66] via-[#00629d] to-[#42a5f5] rounded-[2.5rem] p-8 lg:p-10 mb-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 left-1/4 w-56 h-56 bg-[#99cbff]/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-2">SỐ DƯ VÍ</p>
            {loading ? (
              <div className="h-14 w-56 bg-white/10 rounded-2xl animate-pulse" />
            ) : (
              <h1 className="text-4xl lg:text-5xl font-black font-['Plus_Jakarta_Sans'] text-white tracking-tight mb-1">
                {formatVND(wallet?.balance ?? 0)}
              </h1>
            )}
            <p className="text-white/50 text-sm mt-1 mb-8">
              Cập nhật lần cuối: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleDateString('vi-VN') : '—'}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowTopUp(true)}
                className="flex items-center gap-2 px-7 py-3 bg-white text-[#00629d] rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Nạp tiền
              </button>
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-2 px-7 py-3 bg-white/15 backdrop-blur text-white border border-white/20 rounded-full font-bold text-sm hover:bg-white/25 transition-all"
              >
                <span className="material-symbols-outlined text-lg">arrow_outward</span>
                Rút tiền
              </button>
            </div>
          </div>
          {/* Decorative wallet icon */}
          <div className="absolute right-10 bottom-8 opacity-10">
            <span className="material-symbols-outlined text-[120px] text-white">account_balance_wallet</span>
          </div>
        </div>

        {/* ── Transaction History ── */}
        <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-[#f0f7ff] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Lịch sử giao dịch</h2>
              <p className="text-xs text-[#707882] mt-0.5">Xem chi tiết thu chi của bạn</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#00629d] text-white shadow-md'
                      : 'bg-[#f5faff] text-[#707882] hover:bg-[#e9f5ff]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-[#bfc7d3]">
                  <th className="px-8 py-4">Ngày & Giờ</th>
                  <th className="px-4 py-4">Chi tiết</th>
                  <th className="px-4 py-4">Loại</th>
                  <th className="px-4 py-4">Trạng thái</th>
                  <th className="px-4 py-4 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {transactionsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[#f5faff]">
                      <td className="px-8 py-5"><div className="h-4 w-24 bg-[#f5faff] rounded-lg animate-pulse" /></td>
                      <td className="px-4 py-5"><div className="h-4 w-40 bg-[#f5faff] rounded-lg animate-pulse" /></td>
                      <td className="px-4 py-5"><div className="h-6 w-20 bg-[#f5faff] rounded-full animate-pulse" /></td>
                      <td className="px-4 py-5"><div className="h-4 w-20 bg-[#f5faff] rounded-lg animate-pulse" /></td>
                      <td className="px-4 py-5 text-right"><div className="h-4 w-24 bg-[#f5faff] rounded-lg animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-[#dbeaf5] mb-4 block">receipt_long</span>
                      <p className="font-bold text-[#707882]">Chưa có giao dịch nào</p>
                      <p className="text-xs text-[#bfc7d3] mt-1">Nạp tiền vào ví để bắt đầu sử dụng</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const typeCfg = TYPE_LABELS[tx.transaction_type] || { label: tx.transaction_type, color: '#6b7280', bg: '#f3f4f6' };
                    const isCredit = ['topup', 'payout', 'refund', 'transfer_in'].includes(tx.transaction_type);
                    return (
                      <tr key={tx.id} className="border-t border-[#f5faff] hover:bg-[#fbfdff] transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-[#0f1d25]">
                            {new Date(tx.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-[#bfc7d3]">
                            {new Date(tx.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-semibold text-[#0f1d25]">{tx.description || typeCfg.label}</p>
                          {tx.reference_id && (
                            <p className="text-[11px] text-[#bfc7d3] mt-0.5">Ref: {tx.reference_id}</p>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: typeCfg.color, background: typeCfg.bg }}
                          >
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: STATUS_DOTS[tx.status] || '#9ca3af' }}
                            />
                            <span className="text-sm font-medium text-[#404751]">
                              {STATUS_LABELS[tx.status] || tx.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <span className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-[#0f1d25]'}`}>
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-8 py-5 border-t border-[#f0f7ff] flex items-center justify-between">
              <p className="text-xs text-[#707882]">
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} trên {pagination.total} giao dịch
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="w-9 h-9 rounded-full border border-[#e9f5ff] flex items-center justify-center text-[#707882] hover:bg-[#f5faff] disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                        p === pagination.page
                          ? 'bg-[#0f1d25] text-white'
                          : 'border border-[#e9f5ff] text-[#707882] hover:bg-[#f5faff]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="w-9 h-9 rounded-full border border-[#e9f5ff] flex items-center justify-center text-[#707882] hover:bg-[#f5faff] disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Up Modal ── */}
      {showTopUp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTopUp(false)}>
          <div
            className="bg-white rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-[modalIn_0.25s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-[#f0f7ff] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Nạp tiền vào ví</h3>
                <p className="text-xs text-[#707882] mt-0.5">Chọn số tiền hoặc nhập tùy chỉnh</p>
              </div>
              <button onClick={() => setShowTopUp(false)} className="w-9 h-9 rounded-full hover:bg-[#f5faff] flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[#707882]">close</span>
              </button>
            </div>
            <div className="px-8 py-6 space-y-6">
              {/* Preset amounts */}
              <div className="grid grid-cols-3 gap-3">
                {TOPUP_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all border ${
                      topUpAmount === amt
                        ? 'bg-[#00629d] text-white border-[#00629d] shadow-md'
                        : 'bg-[#f5faff] text-[#0f1d25] border-[#e9f5ff] hover:border-[#00629d]/30'
                    }`}
                  >
                    {formatVND(amt)}
                  </button>
                ))}
              </div>
              {/* Custom input */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#bfc7d3] mb-2 block">
                  Hoặc nhập số tiền
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={topUpAmount || ''}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-5 py-3.5 bg-[#f5faff] border border-[#e9f5ff] rounded-xl text-lg font-bold text-[#0f1d25] outline-none focus:border-[#00629d] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#bfc7d3]">VND</span>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </p>
              )}
            </div>
            <div className="px-8 py-5 bg-[#f5faff] border-t border-[#e9f5ff] flex items-center justify-between">
              <p className="text-sm text-[#707882]">
                Nạp: <span className="font-bold text-[#0f1d25]">{formatVND(topUpAmount)}</span>
              </p>
              <button
                onClick={handleTopUp}
                disabled={!topUpAmount || topUpAmount <= 0 || actionLoading}
                className="px-8 py-3 bg-[#00629d] text-white rounded-full font-bold text-sm shadow-md hover:bg-[#004e7c] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {actionLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                Xác nhận nạp tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ── */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdraw(false)}>
          <div
            className="bg-white rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-[modalIn_0.25s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-[#f0f7ff] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Rút tiền từ ví</h3>
                <p className="text-xs text-[#707882] mt-0.5">Số dư hiện tại: {formatVND(wallet?.balance ?? 0)}</p>
              </div>
              <button onClick={() => setShowWithdraw(false)} className="w-9 h-9 rounded-full hover:bg-[#f5faff] flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[#707882]">close</span>
              </button>
            </div>
            <div className="px-8 py-6 space-y-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#bfc7d3] mb-2 block">
                  Số tiền rút
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount || ''}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    max={wallet?.balance ?? 0}
                    placeholder="0"
                    className="w-full px-5 py-3.5 bg-[#f5faff] border border-[#e9f5ff] rounded-xl text-lg font-bold text-[#0f1d25] outline-none focus:border-[#00629d] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#bfc7d3]">VND</span>
                </div>
              </div>
              {withdrawAmount >= 5_000_000 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">info</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Cần phê duyệt</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Giao dịch rút từ 5.000.000₫ trở lên sẽ cần được quản trị viên phê duyệt trước khi xử lý.
                    </p>
                  </div>
                </div>
              )}
              {withdrawAmount > (wallet?.balance ?? 0) && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  Số dư ví không đủ
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </p>
              )}
            </div>
            <div className="px-8 py-5 bg-[#f5faff] border-t border-[#e9f5ff] flex items-center justify-between">
              <p className="text-sm text-[#707882]">
                Rút: <span className="font-bold text-[#0f1d25]">{formatVND(withdrawAmount)}</span>
              </p>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > (wallet?.balance ?? 0) || actionLoading}
                className="px-8 py-3 bg-[#0f1d25] text-white rounded-full font-bold text-sm shadow-md hover:bg-[#1a2b3c] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {actionLoading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                Xác nhận rút tiền
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </MarketplaceLayout>
  );
};

export default WalletPage;
