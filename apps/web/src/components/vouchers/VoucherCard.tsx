import { FC } from 'react';

interface Voucher {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  min_spend: string;
  max_discount?: string;
  start_date: string;
  end_date: string;
  target_type: string;
  shop_id?: number;
  total_quantity?: number;
  max_per_user?: number;
  _count?: {
    claims: number;
  };
  claims?: any[];
}

interface VoucherCardProps {
  voucher: Voucher;
  onClaim?: (id: number) => void;
  isClaimed?: boolean;
  isUsed?: boolean;
  onUse?: (voucher: Voucher) => void;
}

export const VoucherCard: FC<VoucherCardProps> = ({ voucher, onClaim, isClaimed, isUsed, onUse }) => {
  const now = new Date();
  const startDate = new Date(voucher.start_date);
  const endDate = new Date(voucher.end_date);
  
  const isExpired = now > endDate;
  const isComingSoon = now < startDate;
  const isOutOfStock = voucher.total_quantity ? (voucher._count?.claims || 0) >= voucher.total_quantity : false;
  const isFullyClaimedByUser = voucher.claims ? voucher.claims.length >= (voucher.max_per_user || 1) : false;
  
  const isInactive = isExpired || isComingSoon || isOutOfStock;

  const isPercentage = voucher.discount_type === 'percentage';
  let discountDisplay = '';
  if (isPercentage) {
    discountDisplay = `${parseFloat(voucher.discount_value)}%`;
  } else {
    const val = Number(voucher.discount_value);
    if (val >= 1000 && val % 1000 === 0) {
      discountDisplay = `${val / 1000}K`;
    } else {
      discountDisplay = `${val.toLocaleString('vi-VN')}đ`;
    }
  }

  const minSpendDisplay = voucher.min_spend 
    ? `Đơn tối thiểu ${Number(voucher.min_spend).toLocaleString('vi-VN')}đ` 
    : 'Không yêu cầu đơn tối thiểu';

  const expiryDate = endDate.toLocaleDateString('vi-VN');
  const targetLabel =
    voucher.target_type === 'new_buyer'
      ? 'Người dùng mới'
      : voucher.target_type === 'followers' || voucher.target_type === 'follower'
        ? 'Người theo dõi'
        : 'Tất cả người dùng';

  let statusBadge = null;
  if (isExpired) statusBadge = { label: 'Hết hạn', color: 'bg-red-100 text-red-600' };
  else if (isComingSoon) statusBadge = { label: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-600' };
  else if (isOutOfStock) statusBadge = { label: 'Hết lượt', color: 'bg-slate-100 text-slate-600' };

  return (
    <div className={`relative flex w-full max-w-sm h-32 group ${isInactive ? 'opacity-60' : ''}`}>
      {/* Left side (Discount) */}
      <div className={`flex flex-col items-center justify-center w-28 bg-white border-y border-l border-[#e9f5ff] rounded-l-2xl relative overflow-hidden ${isInactive ? 'grayscale' : ''}`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${isInactive ? 'bg-slate-400' : 'bg-[#00629d]'}`}></div>
        <div className={`text-2xl font-black ${isInactive ? 'text-slate-400' : 'text-[#00629d]'}`}>{discountDisplay}</div>
        <div className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mt-1">
          Giảm Giá
        </div>
        
        {/* Cut-out circles */}
        <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#f8fafc] border border-[#e9f5ff] rounded-full -translate-y-1/2 z-10"></div>
      </div>

      {/* Right side (Details) */}
      <div className="flex-1 flex flex-col justify-between p-4 bg-white border border-[#e9f5ff] rounded-r-2xl relative">
        <div className={`absolute top-0 left-0 w-full h-1 ${isInactive ? 'bg-slate-400' : 'bg-[#00629d]'}`}></div>
        
        <div>
          <div className="flex items-start justify-between">
            <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{voucher.code}</h4>
            {statusBadge && (
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#707882] mt-0.5">{minSpendDisplay}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e9f5ff] text-[#00629d] rounded uppercase">
              {targetLabel}
            </span>
            {voucher.shop_id && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded uppercase">
                    Voucher Shop
                </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] text-[#b5bfc9] font-medium">HSD: {expiryDate}</span>
          
          {isUsed ? (
            <button
              disabled
              className="px-4 py-1.5 bg-[#e5e7eb] text-[#6b7280] text-[10px] font-black uppercase rounded-full cursor-not-allowed"
            >
              Đã dùng
            </button>
          ) : isClaimed || isFullyClaimedByUser ? (
            <button 
              onClick={() => !isInactive && onUse?.(voucher)}
              disabled={isInactive}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full transition-all ${isInactive ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#00629d] text-white hover:bg-[#004d7c]'}`}
            >
              Dùng ngay
            </button>
          ) : (
            <button 
              onClick={() => !isInactive && onClaim?.(voucher.id)}
              disabled={isInactive}
              className={`px-4 py-1.5 border-2 text-[10px] font-black uppercase rounded-full transition-all ${isInactive ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-[#00629d] text-[#00629d] hover:bg-[#00629d] hover:text-white'}`}
            >
              Lưu
            </button>
          )}
        </div>

        {/* Dash line divider */}
        <div className="absolute left-0 top-4 bottom-4 w-[1px] border-l border-dashed border-[#e1f0fb]"></div>
      </div>

      {/* Hover elevation */}
      {!isInactive && (
        <div className="absolute inset-0 rounded-2xl bg-[#00629d]/5 scale-x-[1.02] scale-y-[1.05] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none -z-10"></div>
      )}
    </div>
  );
};
