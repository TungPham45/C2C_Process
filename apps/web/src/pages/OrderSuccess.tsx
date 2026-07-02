import { Link, useLocation } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

export const OrderSuccess = () => {
  const location = useLocation();
  const orderId = location.state?.orderId || 'ORD-987654321';

  return (
    <MarketplaceLayout>
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        {/* Success Illustration Block */}
        <div className="mb-12 relative inline-block">
          <div className="w-32 h-32 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-full flex items-center justify-center shadow-2xl shadow-blue-200 relative z-10 animate-scale-in">
            <span className="material-symbols-outlined text-white text-6xl font-black">check</span>
          </div>
          {/* Decorative Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-[#00629d]/10 rounded-full animate-ping-slow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border border-[#00629d]/5 rounded-full"></div>
        </div>

        <h1 className="text-5xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-4 tracking-tight">
          Đặt hàng thành công!
        </h1>
        <p className="text-[#707882] text-lg max-w-md mx-auto leading-relaxed">
          Đơn hàng của bạn đã được xử lý. Chúng tôi đã gửi email xác nhận với thông tin chi tiết.
        </p>

        {/* Order Details Snippet */}
        <div className="mt-16 bg-white/40 backdrop-blur-md border border-white/20 rounded-[3rem] p-10 max-w-md mx-auto shadow-sm">
          <div className="space-y-6">
            <div className="flex justify-between items-center py-4 border-b border-[#00629d]/5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707882]">Mã đơn hàng</span>
              <span className="font-black text-[#00629d] tracking-wider">#{orderId}</span>
            </div>
            <div className="flex justify-between items-center py-4 border-b border-[#00629d]/5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707882]">Trạng thái</span>
              <span className="px-3 py-1 bg-[#e1f0fb] text-[#00629d] rounded-full text-[10px] font-black uppercase tracking-tighter">Đã xử lý</span>
            </div>
            <div className="flex justify-between items-center py-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#707882]">Dự kiến giao</span>
              <span className="font-bold text-sm">3-5 ngày làm việc</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link 
            to="/" 
            className="w-full sm:w-auto px-10 h-14 bg-[#0f1d25] text-white rounded-2xl font-bold flex items-center justify-center transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl shadow-slate-200"
          >
            Tiếp tục mua sắm
          </Link>
          <Link 
            to={`/orders/${orderId}`}
            className="w-full sm:w-auto px-10 h-14 bg-white text-[#0f1d25] border border-slate-200 rounded-2xl font-bold flex items-center justify-center transition-all hover:bg-slate-50 hover:scale-105 active:scale-95"
          >
            Xem chi tiết đơn hàng
          </Link>
        </div>

        <p className="mt-20 text-[#707882] text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
          Cảm ơn bạn đã chọn Serene
        </p>
      </div>
    </MarketplaceLayout>
  );
};
