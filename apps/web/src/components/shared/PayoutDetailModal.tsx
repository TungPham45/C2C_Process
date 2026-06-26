import { FC } from 'react';

const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export interface PayoutDetailModalProps {
  payout: any;
  onClose: () => void;
}

export const PayoutDetailModal: FC<PayoutDetailModalProps> = ({ payout, onClose }) => {
  if (!payout) return null;

  const isEligible = new Date(payout.eligible_at) <= new Date() && payout.status === 'holding';
  
  let statusBadge = null;
  if (payout.status === 'paid') {
    statusBadge = <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase"><span className="material-symbols-outlined text-[16px]">check_circle</span> Đã thanh toán</span>;
  } else if (isEligible || payout.status === 'ready') {
    statusBadge = <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase"><span className="material-symbols-outlined text-[16px]">event_available</span> Đã đến hạn</span>;
  } else {
    statusBadge = <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase"><span className="material-symbols-outlined text-[16px]">lock_clock</span> Đang giữ</span>;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-[modalIn_0.25s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-slate-900">Chi tiết đối soát</h3>
            <p className="text-xs text-slate-500 mt-0.5">Đơn hàng #{payout.shop_order_id}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          <div className="flex justify-between items-center pb-5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Trạng thái</span>
            {statusBadge}
          </div>

          {payout.shop_name && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Cửa hàng</span>
              <span className="text-sm font-bold text-slate-900">{payout.shop_name} (UID: {payout.seller_user_id})</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Tổng tiền đơn hàng</span>
            <span className="text-sm font-semibold text-slate-900">{formatVND(payout.order_amount)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Phí nền tảng (15%)</span>
            <span className="text-sm font-semibold text-red-500">-{formatVND(payout.platform_fee)}</span>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-900">Doanh thu thực nhận</span>
            <span className="text-xl font-black text-emerald-600">{formatVND(payout.seller_amount)}</span>
          </div>

          <div className="w-full h-px bg-slate-100 my-2"></div>

          {payout.shop_order?.delivered_at && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Ngày giao hàng</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(payout.shop_order.delivered_at).toLocaleString('vi-VN')}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Ngày đến hạn đối soát</span>
            <span className="text-sm font-semibold text-slate-900">
              {new Date(payout.eligible_at).toLocaleString('vi-VN')}
            </span>
          </div>

          {payout.paid_at && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Ngày thanh toán</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(payout.paid_at).toLocaleString('vi-VN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
