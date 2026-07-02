import { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { Select } from '../../components/ui/Select';
import {
  buildSellerVoucherPayload,
  getSellerAuthHeaders,
  SellerVoucherFormData,
  sellerVoucherTargetOptions,
  sellerVoucherStatusOptions,
  SellerShopContext,
} from './vouchers';

export const SellerCreateVoucherPage: FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState<SellerShopContext['shop']>(null);
  const [formData, setFormData] = useState<SellerVoucherFormData>({
    code: '',
    target_type: 'all_buyers',
    discount_type: 'percentage' as const,
    discount_value: '',
    min_spend: '0',
    max_discount: '',
    total_quantity: '',
    start_date: '',
    end_date: '',
    max_per_user: '1',
    status: 'scheduled',
  });

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch('/api/products/seller/context', {
          headers: getSellerAuthHeaders(),
        });

        if (response.ok) {
          const data = (await response.json()) as SellerShopContext;
          setShop(data.shop);
        }
      } catch (error) {
        console.error('Failed to fetch seller context:', error);
      }
    };

    fetchContext();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await fetch('/api/vouchers/seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSellerAuthHeaders(),
        },
        body: JSON.stringify(buildSellerVoucherPayload(formData)),
      });

      if (response.ok) {
        navigate('/seller/vouchers');
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.message || 'Không thể tạo voucher. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      console.error('Failed to create seller voucher:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SellerLayout pageTitle="Tạo Voucher Mới">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <Link to="/seller/vouchers" className="text-xs font-bold text-[#707882] flex items-center gap-2 hover:text-[#00629d] mb-4 group transition-colors">
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> Danh Sách Voucher
            <span className="text-[#cfe5ff]">/</span> Chiến Dịch Mới
          </Link>
          <h1 className="text-4xl font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight mb-2">Tạo voucher của shop</h1>
          <p className="text-sm text-[#707882]">Voucher này sẽ được tự động gắn với shop #{shop?.id ?? '--'}.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.04)] border border-[#e1f0fb] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f5faff] to-transparent rounded-full -mr-32 -mt-32 opacity-50"></div>

            <div className="grid grid-cols-2 gap-10 relative z-10">

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Mã Voucher</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHOP50K"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all placeholder:text-[#a1aab3]/50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Khách Hàng Mục Tiêu</label>
                <Select
                  options={[...sellerVoucherTargetOptions]}
                  value={formData.target_type}
                  onChange={(val) => setFormData({ ...formData, target_type: val as SellerVoucherFormData['target_type'] })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Trạng Thái</label>
                <Select
                  options={[...sellerVoucherStatusOptions]}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Tổng Số Lượng</label>
                <input
                  type="number"
                  placeholder="300"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                  value={formData.total_quantity ?? ''}
                  onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Loại Giảm Giá</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                    className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] border-2 transition-all font-bold text-sm ${
                      formData.discount_type === 'percentage'
                        ? 'bg-[#e9f5ff] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-50'
                        : 'bg-[#f5faff] border-transparent text-[#707882] hover:bg-[#e9f5ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined">percent</span> Phần Trăm
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'fixed_amount' })}
                    className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] border-2 transition-all font-bold text-sm ${
                      formData.discount_type === 'fixed_amount'
                        ? 'bg-[#e9f5ff] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-50'
                        : 'bg-[#f5faff] border-transparent text-[#707882] hover:bg-[#e9f5ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined">payments</span> Số Tiền Cố Định
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Giá Trị Giảm</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                    className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">
                    {formData.discount_type === 'percentage' ? '%' : 'VND'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Đơn Tối Thiểu (VND)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="100000"
                    className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                    value={formData.min_spend}
                    onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</div>
                </div>
              </div>

              {formData.discount_type === 'percentage' && (
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Giảm Tối Đa (VND)</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="50000"
                      className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                      value={formData.max_discount ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</div>
                  </div>
                </div>
              )}

              <div className="col-span-2 space-y-3">
                <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Số Lượng Mỗi KH</label>
                <input
                  type="number"
                  className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                  value={formData.max_per_user}
                  onChange={(e) => setFormData({ ...formData, max_per_user: e.target.value })}
                />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Ngày Bắt Đầu</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all appearance-none"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2">Ngày Kết Thúc</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all appearance-none"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                    <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t border-[#f5faff] flex items-center justify-end gap-6">
              <button
                type="button"
                onClick={() => navigate('/seller/vouchers')}
                className="px-8 py-4 text-xs font-bold text-[#707882] uppercase tracking-widest hover:text-[#0f1d25] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-12 py-5 bg-gradient-to-br from-[#00629d] to-[#42a5f5] text-white rounded-[1.5rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </SellerLayout>
  );
};
