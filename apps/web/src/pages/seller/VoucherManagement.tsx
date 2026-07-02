import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { formatVnd, formatVndCompact } from '../../utils/currency';
import {
  getSellerAuthHeaders,
  getSellerVoucherTargetLabel,
  SellerShopContext,
  SellerVoucher,
} from './vouchers';

export const SellerVoucherManagementPage: FC = () => {
  const [vouchers, setVouchers] = useState<SellerVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<SellerShopContext['shop']>(null);

  useEffect(() => {
    fetchVoucherData();
  }, []);

  const fetchVoucherData = async () => {
    try {
      setLoading(true);
      const headers = getSellerAuthHeaders();
      const [voucherResponse, contextResponse] = await Promise.all([
        fetch('/api/vouchers/seller', { headers }),
        fetch('/api/products/seller/context', { headers }),
      ]);

      if (voucherResponse.ok) {
        setVouchers(await voucherResponse.json());
      }

      if (contextResponse.ok) {
        const context = (await contextResponse.json()) as SellerShopContext;
        setShop(context.shop);
      }
    } catch (error) {
      console.error('Failed to fetch seller vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this voucher? This action cannot be undone.')) return;
    try {
      const headers = getSellerAuthHeaders();
      const response = await fetch(`/api/vouchers/seller/${id}`, { method: 'DELETE', headers });
      if (response.ok) {
        fetchVoucherData();
      }
    } catch (error) {
      console.error('Failed to delete voucher:', error);
    }
  };

  const metrics = useMemo(() => {
    const activeVouchers = vouchers.filter((voucher) => voucher.status === 'active').length;
    const totalRedemptions = vouchers.reduce((sum, voucher) => sum + Number(voucher.used_count || 0), 0);
    const totalDiscountPool = vouchers.reduce((sum, voucher) => {
      if (voucher.discount_type === 'fixed_amount') {
        return sum + Number(voucher.discount_value || 0) * (voucher.total_quantity ?? 0);
      }

      return sum + Number(voucher.max_discount || 0) * (voucher.total_quantity ?? 0);
    }, 0);

    return {
      activeVouchers,
      totalRedemptions,
      totalDiscountPool,
    };
  }, [vouchers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#dcfce7] text-[#166534]';
      case 'scheduled':
        return 'bg-[#fef9c3] text-[#854d0e]';
      case 'expired':
        return 'bg-[#fee2e2] text-[#991b1b]';
      case 'paused':
        return 'bg-[#f3f4f6] text-[#374151]';
      default:
        return 'bg-[#e0f2fe] text-[#0369a1]';
    }
  };

  return (
    <SellerLayout pageTitle="Shop Voucher Studio">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.25em] mb-2">Quản Lý Voucher Của Shop</p>
            <h1 className="text-4xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Quản lý chiến dịch voucher</h1>
            <p className="text-sm text-[#707882] mt-2">
              Tạo và thiết lập giảm giá cho {shop?.name || 'shop của bạn'}.
            </p>
          </div>
          <Link
            to="/seller/vouchers/new"
            className="px-6 py-3 bg-gradient-to-br from-[#00629d] to-[#42a5f5] text-white rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span> Tạo Voucher Mới
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
            <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mb-2">ID Shop</p>
            <h3 className="text-3xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">#{shop?.id ?? '--'}</h3>
            <p className="text-xs text-[#707882] mt-3">Các voucher tạo tại đây được gắn kết với shop này.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
            <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mb-2">Tổng Voucher</p>
            <h3 className="text-3xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{vouchers.length}</h3>
            <p className="text-xs text-[#707882] mt-3">Bản nháp, đã lên lịch, đang chạy và tạm dừng.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
            <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mb-2">Đang Hoạt Động</p>
            <h3 className="text-3xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{metrics.activeVouchers}</h3>
            <p className="text-xs text-[#707882] mt-3">Voucher người mua có thể áp dụng khi thanh toán.</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
            <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mb-2">Đã Dùng / Ngân Sách</p>
            <h3 className="text-3xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{metrics.totalRedemptions}</h3>
            <p className="text-xs text-[#707882] mt-3">{formatVndCompact(metrics.totalDiscountPool)} mức giảm tối đa.</p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách voucher của shop</h2>
              <p className="text-xs text-[#707882]">Chỉ hiển thị các voucher thuộc về shop hiện tại của bạn.</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-[#e9f5ff] text-[#00629d] text-xs font-bold uppercase tracking-widest">
              {shop?.status || 'unknown'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5faff]/50">
                <tr className="text-[#a1aab3] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-6">ID</th>
                  <th className="px-6 py-6">Shop</th>
                  <th className="px-6 py-6">Mã</th>
                  <th className="px-6 py-6">Loại & K.Lượng</th>
                  <th className="px-6 py-6">T.Thiểu / T.Đa</th>
                  <th className="px-6 py-6">Đã Dùng</th>
                  <th className="px-6 py-6">Trạng thái</th>
                  <th className="px-10 py-6 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td colSpan={8} className="px-10 py-8 h-20 bg-gray-50/50"></td>
                    </tr>
                  ))
                ) : vouchers.length ? (
                  vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-[#f5faff]/30 transition-colors group">
                      <td className="px-10 py-6 text-xs text-[#707882] font-semibold tracking-tighter">#VCH-{String(voucher.id).padStart(4, '0')}</td>
                      <td className="px-6 py-6 text-xs font-bold text-[#0f1d25]">#{voucher.shop_id}</td>
                      <td className="px-6 py-6">
                        <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-lg text-xs font-bold font-['JetBrains_Mono'] uppercase tracking-wider">
                          {voucher.code}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-[#0f1d25] mb-0.5">
                          {voucher.discount_type === 'percentage' ? `${voucher.discount_value}%` : formatVnd(voucher.discount_value)}
                        </p>
                        <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest opacity-60">
                          {getSellerVoucherTargetLabel(voucher.target_type)}
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-xs font-semibold text-[#0f1d25]">T.Thiểu: {formatVnd(voucher.min_spend)}</p>
                        <p className="text-[10px] text-[#707882] font-medium opacity-80">T.Đa: {voucher.max_discount ? formatVnd(voucher.max_discount) : 'Không có'}</p>
                      </td>
                      <td className="px-6 py-6 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-[#f5faff] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${voucher.status === 'expired' ? 'bg-red-400' : 'bg-[#00629d]'}`}
                              style={{ width: `${voucher.total_quantity ? (voucher.used_count / voucher.total_quantity) * 100 : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-[#0f1d25] whitespace-nowrap">
                            {voucher.used_count} / {voucher.total_quantity || '∞'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(voucher.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                          {voucher.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/seller/vouchers/edit/${voucher.id}`} className="w-10 h-10 rounded-full hover:bg-[#e9f5ff] flex items-center justify-center text-[#707882] hover:text-[#00629d] transition-all" title="Edit Voucher">
                            <span className="material-symbols-outlined">edit</span>
                          </Link>
                          <button onClick={() => handleDelete(voucher.id)} className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-[#707882] hover:text-red-500 transition-all" title="Delete Voucher">
                            <span className="material-symbols-outlined">delete_outline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-10 py-12 text-center text-sm text-[#707882]">
                      Chưa có voucher nào. Khởi tạo một chiến dịch ngay để thu hút khách hàng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
