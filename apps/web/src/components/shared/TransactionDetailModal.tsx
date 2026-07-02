import { FC } from 'react';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  topup:        { label: 'Nạp tiền',       color: '#1b6b3e', bg: '#dcfce7', icon: 'add_circle' },
  payment:      { label: 'Thanh toán',     color: '#0f4c81', bg: '#dbeafe', icon: 'shopping_cart' },
  payout:       { label: 'Chi trả doanh thu', color: '#b91c1c', bg: '#fee2e2', icon: 'payments' },
  withdraw:     { label: 'Rút tiền',       color: '#92400e', bg: '#fef3c7', icon: 'arrow_outward' },
  refund:       { label: 'Hoàn trả',       color: '#b45309', bg: '#fef9c3', icon: 'undo' },
  transfer_in:  { label: 'Nhận thanh toán', color: '#047857', bg: '#d1fae5', icon: 'arrow_downward' },
  transfer_out: { label: 'Chuyển đi',      color: '#b91c1c', bg: '#fee2e2', icon: 'arrow_upward' },
  fee:          { label: 'Phí dịch vụ',    color: '#6b7280', bg: '#f3f4f6', icon: 'receipt' },
};

const STATUS_LABELS: Record<string, { dot: string; text: string; label: string }> = {
  completed: { dot: '#22c55e', text: '#16a34a', label: 'Thành công' },
  pending:   { dot: '#f59e0b', text: '#d97706', label: 'Đang xử lý' },
  failed:    { dot: '#ef4444', text: '#dc2626', label: 'Thất bại' },
};

const getParties = (tx: any, allTx?: any[]) => {
  const system = 'Hệ thống C2C';
  const bank = 'Tài khoản ngân hàng / Cổng TT';
  const user = tx.user?.full_name || 'Người dùng';
  
  let relatedTx = null;
  if (allTx && tx.reference_id) {
    relatedTx = allTx.find((t: any) => t.id !== tx.id && t.reference_id === tx.reference_id);
  }
  
  if (!relatedTx && allTx) {
    // Fuzzy matching: same absolute amount, within 5 seconds, and complementary types or same description
    const txTime = new Date(tx.created_at).getTime();
    relatedTx = allTx.find((t: any) => {
      if (t.id === tx.id) return false;
      
      const amountMatch = Math.abs(Number(t.amount)) === Math.abs(Number(tx.amount));
      if (!amountMatch) return false;

      const tTime = new Date(t.created_at).getTime();
      const timeDiff = Math.abs(tTime - txTime);
      if (timeDiff > 5000) return false; // 5 second window

      // Description match is a strong indicator
      const descMatch = t.description === tx.description || 
                        (t.description?.includes('Nhận') && tx.description?.includes('Chuyển')) ||
                        (t.description?.includes('Chuyển') && tx.description?.includes('Nhận'));
      
      return descMatch;
    });
  }

  const isSystem = tx.user?.role === 'admin' || user === 'Quản Trị Viên';
  
  if (relatedTx) {
    const relatedIsSystem = relatedTx.user?.role === 'admin' || relatedTx.user?.full_name === 'Quản Trị Viên';
    const relatedUserName = relatedTx.user?.full_name || 'Người dùng';

    if (relatedIsSystem) {
      // Related is system, so this user is the other party
      if (['transfer_in', 'refund', 'topup'].includes(tx.transaction_type)) {
        return { sender: system, receiver: user };
      } else {
        return { sender: user, receiver: system };
      }
    }

    if (['transfer_in', 'refund', 'topup'].includes(tx.transaction_type)) {
      return { 
        sender: relatedUserName, 
        receiver: isSystem ? system : user 
      };
    } else {
      return { 
        sender: isSystem ? system : user, 
        receiver: relatedUserName 
      };
    }
  }

  if (isSystem) {
    switch (tx.transaction_type) {
      case 'transfer_in': return { sender: 'Người gửi (N/A)', receiver: system };
      case 'transfer_out': return { sender: system, receiver: 'Người nhận (N/A)' };
      case 'payout': return { sender: system, receiver: 'Seller (N/A)' };
      case 'payment': return { sender: 'Người mua (N/A)', receiver: system };
      case 'refund': return { sender: system, receiver: 'Người dùng (N/A)' };
      case 'fee': return { sender: 'Người dùng (N/A)', receiver: system };
      case 'topup': return { sender: bank, receiver: system };
      case 'withdraw': return { sender: system, receiver: bank };
    }
  }

  switch (tx.transaction_type) {
    case 'topup': return { sender: bank, receiver: user };
    case 'payment': return { sender: user, receiver: system };
    case 'payout': return { sender: system, receiver: user };
    case 'withdraw': return { sender: user, receiver: bank };
    case 'refund': return { sender: system, receiver: user };
    case 'transfer_in': return { sender: 'Người gửi khác', receiver: user };
    case 'transfer_out': return { sender: user, receiver: 'Người nhận khác' };
    case 'fee': return { sender: user, receiver: system };
    default: return { sender: 'N/A', receiver: 'N/A' };
  }
};

export interface TransactionDetailModalProps {
  transaction: any;
  allTransactions?: any[];
  onClose: () => void;
}

export const TransactionDetailModal: FC<TransactionDetailModalProps> = ({ transaction, allTransactions, onClose }) => {
  if (!transaction) return null;

  const typeCfg = TYPE_LABELS[transaction.transaction_type] || { label: transaction.transaction_type, color: '#6b7280', bg: '#f3f4f6', icon: 'receipt' };
  const st = STATUS_LABELS[transaction.status] || { dot: '#6b7280', text: '#4b5563', label: transaction.status };
  const isCredit = ['topup', 'refund', 'transfer_in'].includes(transaction.transaction_type);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-[modalIn_0.25s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#f0f7ff] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Chi tiết giao dịch</h3>
            <p className="text-xs text-[#707882] mt-0.5">#{transaction.id ? `TRX-${String(transaction.id).padStart(4, '0')}` : 'N/A'}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f5faff] flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[#707882]">close</span>
          </button>
        </div>

        {/* Amount & Type Banner */}
        <div className="px-8 py-8 flex flex-col items-center justify-center bg-gradient-to-b from-[#f5faff] to-white border-b border-[#f0f7ff]">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm" style={{ background: typeCfg.bg }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: typeCfg.color }}>{typeCfg.icon}</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: typeCfg.color }}>
            {typeCfg.label}
          </p>
          <h2 className={`text-4xl font-black font-['Plus_Jakarta_Sans'] ${isCredit ? 'text-emerald-600' : 'text-[#0f1d25]'}`}>
            {isCredit ? '+' : '-'}{formatVND(transaction.amount)}
          </h2>
          <div className="flex items-center gap-2 mt-4 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
            <div className="w-2 h-2 rounded-full" style={{ background: st.dot }} />
            <span className="text-sm font-semibold" style={{ color: st.text }}>{st.label}</span>
          </div>
        </div>

        {/* Details List */}
        <div className="px-8 py-6 space-y-4">
          {transaction.description && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-sm text-[#707882] whitespace-nowrap">Nội dung:</span>
              <span className="text-sm font-semibold text-[#0f1d25] text-right">{transaction.description}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-[#707882]">Thời gian tạo:</span>
            <span className="text-sm font-semibold text-[#0f1d25]">
              {new Date(transaction.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {transaction.completed_at && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#707882]">Thời gian hoàn thành:</span>
              <span className="text-sm font-semibold text-[#0f1d25]">
                {new Date(transaction.completed_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-[#707882]">Người gửi:</span>
            <span className="text-sm font-semibold text-[#0f1d25]">{getParties(transaction, allTransactions).sender}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-[#707882]">Người nhận:</span>
            <span className="text-sm font-semibold text-[#0f1d25]">{getParties(transaction, allTransactions).receiver}</span>
          </div>

          <div className="w-full h-px bg-[#f0f7ff] my-2"></div>

          {(transaction.balance_before !== undefined && transaction.balance_before !== null) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#707882]">Số dư trước:</span>
              <span className="text-sm font-semibold text-[#0f1d25]">{formatVND(transaction.balance_before)}</span>
            </div>
          )}

          {(transaction.balance_after !== undefined && transaction.balance_after !== null) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#707882]">Số dư sau:</span>
              <span className="text-sm font-semibold text-[#0f1d25]">{formatVND(transaction.balance_after)}</span>
            </div>
          )}

          {(transaction.reference_id || transaction.payment_method) && (
            <>
              <div className="w-full h-px bg-[#f0f7ff] my-2"></div>

              {transaction.reference_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#707882]">Mã tham chiếu:</span>
                  <span className="text-sm font-mono font-semibold text-[#0f1d25] bg-slate-50 px-2 py-0.5 rounded">
                    {transaction.reference_id}
                  </span>
                </div>
              )}

              {transaction.payment_method && (
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-[#707882]">Phương thức thanh toán:</span>
                  <span className="text-sm font-semibold text-[#0f1d25] uppercase">
                    {transaction.payment_method}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
