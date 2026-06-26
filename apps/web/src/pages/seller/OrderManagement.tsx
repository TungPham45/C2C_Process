import { FC, useEffect, useMemo, useState } from 'react';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useOrders } from '../../hooks/useOrders';
import { Link } from 'react-router-dom';
import { formatVnd } from '../../utils/currency';
import { getOrderPricing } from '../../utils/orderPricing';

export const SellerOrderManagement: FC = () => {
  const { orders, fetchSellerOrders, loading, error } = useOrders();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order: any) => {
      const id = String(order?.id ?? '').toLowerCase();
      const status = String(order?.status ?? '').toLowerCase();
      const carrier = String(order?.carrier_name ?? '').toLowerCase();
      const tracking = String(order?.tracking_number ?? '').toLowerCase();
      const shippingAddress = String(order?.shipping_address ?? '').toLowerCase();
      const customerName = String(order?.shipping_address ?? '').split(',')[0]?.trim().toLowerCase() || '';
      const itemNames = Array.isArray(order?.items)
        ? order.items
            .map((it: any) => String(it?.product_name ?? '').toLowerCase())
            .join(' ')
        : '';

      // Allow searching "#1", "1", "SER-0001" (if used), etc.
      const normalizedIdTokens = [`#${id}`, id];
      return (
        normalizedIdTokens.some((t) => t.includes(q)) ||
        status.includes(q) ||
        customerName.includes(q) ||
        shippingAddress.includes(q) ||
        carrier.includes(q) ||
        tracking.includes(q) ||
        itemNames.includes(q)
      );
    });
  }, [orders, query]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-[#fff8e5] text-[#ffb952]';
      case 'shipped': return 'bg-[#cfe5ff] text-[#00629d]';
      case 'delivered': return 'bg-[#e1f9f1] text-[#00a67e]';
      case 'cancelled': return 'bg-[#ffdad6] text-[#ba1a1a]';
      default: return 'bg-[#f5faff] text-[#707882]';
    }
  };

  return (
    <SellerLayout pageTitle="Quản lý đơn hàng">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0f1d25] tracking-tight font-['Plus_Jakarta_Sans']">
            Quản lý Đơn hàng
          </h1>
          <p className="text-[#404751] mt-1 font-medium">Theo dõi và xử lý các đơn hàng của bạn.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-[#e9f5ff] rounded-full px-4 py-2 flex items-center gap-2 border border-[#bfc7d3]/20 w-72 shadow-sm">
            <span className="material-symbols-outlined text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn, khách hàng, sản phẩm, vận đơn..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none text-sm w-full focus:ring-0 outline-none" 
            />
            {!!query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Xoá tìm kiếm"
                title="Xoá"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-[#dbeaf5] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e9f5ff] bg-[#f5faff]/50">
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Mã Đơn hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Ngày đặt</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Khách hàng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Tổng cộng</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Trạng thái</th>
                <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-[#707882]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9f5ff]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
                    <p className="mt-4 text-[#707882] font-bold">Đang tải đơn hàng...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined text-6xl text-[#dbeaf5]">local_shipping</span>
                    <p className="mt-4 text-[#707882] font-bold">
                      {orders.length === 0 ? 'Chưa có đơn hàng nào.' : 'Không tìm thấy đơn hàng phù hợp.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const pricing = getOrderPricing(order);
                  return (
                  <tr key={order.id} className="hover:bg-[#f5faff]/30 transition-colors">
                    <td className="px-8 py-6 font-black text-[#00629d]">#{order.id}</td>
                    <td className="px-8 py-6 text-sm text-[#404751]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-[#0f1d25] truncate max-w-[150px]">
                        {order.shipping_address.split(',')[0]}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-[#0f1d25]">{formatVnd(pricing.finalTotal)}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link 
                        to={`/seller/orders/${order.id}`} 
                        className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center text-[#00629d] hover:bg-[#00629d] hover:text-white transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </Link>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SellerLayout>
  );
};
