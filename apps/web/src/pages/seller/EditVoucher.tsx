import { FC, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { Select } from '../../components/ui/Select';
import { formatVndCode } from '../../utils/currency';
import {
  buildSellerVoucherPayload,
  getSellerAuthHeaders,
  sellerVoucherTargetOptions,
  sellerVoucherStatusOptions,
  SellerShopContext,
  SellerVoucherFormData,
  SellerVoucherStats,
  toSellerVoucherFormData,
} from './vouchers';

export const SellerEditVoucherPage: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<SellerVoucherStats | null>(null);
  const [formData, setFormData] = useState<SellerVoucherFormData | null>(null);
  const [shop, setShop] = useState<SellerShopContext['shop']>(null);

  useEffect(() => {
    fetchVoucher();
  }, [id]);

  const fetchVoucher = async () => {
    try {
      setLoading(true);
      const headers = getSellerAuthHeaders();
      const [voucherResponse, contextResponse] = await Promise.all([
        fetch(`/api/vouchers/seller/${id}`, { headers }),
        fetch('/api/products/seller/context', { headers }),
      ]);

      if (voucherResponse.ok) {
        const data = (await voucherResponse.json()) as SellerVoucherStats;
        setStats(data);
        setFormData(toSellerVoucherFormData(data));
      }

      if (contextResponse.ok) {
        const context = (await contextResponse.json()) as SellerShopContext;
        setShop(context.shop);
      }
    } catch (error) {
      console.error('Failed to fetch seller voucher:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/vouchers/seller/${id}`, {
        method: 'PUT',
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
        alert(err?.message || 'Không thể cập nhật voucher. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Failed to update seller voucher:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this voucher? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/vouchers/seller/${id}`, {
        method: 'DELETE',
        headers: getSellerAuthHeaders(),
      });

      if (response.ok) {
        navigate('/seller/vouchers');
      }
    } catch (error) {
      console.error('Failed to archive seller voucher:', error);
    }
  };

  if (loading || !formData) {
    return <SellerLayout pageTitle="Edit Shop Voucher">Loading...</SellerLayout>;
  }

  return (
    <SellerLayout pageTitle="Edit Shop Voucher">
      <div className="max-w-6xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link to="/seller/vouchers" className="text-xs font-bold text-[#707882] flex items-center gap-2 hover:text-[#00629d] mb-4 group transition-colors">
              <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> Danh Sách Voucher
              <span className="text-[#cfe5ff]">/</span> Sửa Chiến Dịch
            </Link>
            <h1 className="text-4xl font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Chỉnh sửa voucher</h1>
            <p className="text-sm text-[#707882] mt-2">Điều chỉnh chiến dịch, thông số và trạng thái phát hành voucher cho shop của bạn.</p>
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigate('/seller/vouchers')} className="px-8 py-4 bg-[#f5faff] text-[#707882] rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#e9f5ff] transition-all">Bỏ Qua Thay Đổi</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-br from-[#00629d] to-[#42a5f5] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all disabled:opacity-50"
            >
              {saving ? 'Đang cập nhật...' : 'Cập Nhật Voucher'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-8 space-y-10">
            <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-[#e1f0fb]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] mb-1">Hiệu Suất Sử Dụng Voucher</p>
                  <h4 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                    {stats?.used_count} / {stats?.total_quantity || '∞'} Đã dùng
                  </h4>
                </div>
                <div className="px-4 py-1.5 bg-[#dcfce7] text-[#166534] rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {stats?.capacity}% Đã phát
                </div>
              </div>

              <div className="w-full h-3 bg-[#f5faff] rounded-full overflow-hidden mb-8">
                <div
                  className="h-full bg-gradient-to-r from-[#00629d] to-[#42a5f5] rounded-full transition-all duration-1000"
                  style={{ width: `${stats?.capacity}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest opacity-60">ID Shop</p>
                  <p className="text-sm font-bold text-[#0f1d25]">#{stats?.shop_id ?? shop?.id ?? '--'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest opacity-60">Trạng Thái</p>
                  <p className="text-sm font-bold text-[#0f1d25] capitalize">{stats?.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest opacity-60">TB MỖI NGÀY</p>
                  <p className="text-sm font-bold text-[#0f1d25]">{stats?.dailyAvg} Lượt Dùng</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest opacity-60">HẾT HẠN TRONG</p>
                  <p className="text-sm font-bold text-[#0f1d25]">{stats?.expiresIn} Ngày</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-[#e1f0fb] space-y-12">
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#e9f5ff] text-[#00629d] font-bold text-xs flex items-center justify-center">1</div>
                  <h5 className="font-bold text-[#0f1d25] tracking-tight">Định Danh & Cấu Hình</h5>
                </div>

                <div className="grid grid-cols-2 gap-10">

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Mã Voucher</label>
                    <input
                      type="text"
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Loại Giảm Giá</label>
                    <Select
                      options={[
                        { value: 'percentage', label: 'Giảm theo phần trăm' },
                        { value: 'fixed_amount', label: 'Giảm số tiền cố định' }
                      ]}
                      value={formData.discount_type}
                      onChange={(val) => setFormData({ ...formData, discount_type: val as 'percentage' | 'fixed_amount' })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Khách Hàng Mục Tiêu</label>
                    <Select
                      options={[...sellerVoucherTargetOptions]}
                      value={formData.target_type}
                      onChange={(val) => setFormData({ ...formData, target_type: val as SellerVoucherFormData['target_type'] })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Trạng Thái Voucher</label>
                    <Select
                      options={[...sellerVoucherStatusOptions]}
                      value={formData.status}
                      onChange={(val) => setFormData({ ...formData, status: val })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Giá Trị Giảm</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={formData.discount_type === 'percentage' ? '10' : '50000'}
                        className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">{formData.discount_type === 'percentage' ? '%' : 'VND'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Tổng Số Lượng</label>
                    <input
                      type="number"
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                      value={formData.total_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-8 pt-6 border-t border-[#f5faff]">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#e9f5ff] text-[#00629d] font-bold text-xs flex items-center justify-center">2</div>
                  <h5 className="font-bold text-[#0f1d25] tracking-tight">Giới Hạn Sử Dụng</h5>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Đơn Tối Thiểu (VND)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="100000"
                        className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                        value={formData.min_spend}
                        onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
                      />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Giảm Tối Đa (VND)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="50000"
                        className="w-full pl-8 pr-16 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                        value={formData.max_discount || ''}
                        onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                      />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] font-bold text-xs">VND</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Số Lượng Mỗi KH</label>
                    <input
                      type="number"
                      className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                      value={formData.max_per_user}
                      onChange={(e) => setFormData({ ...formData, max_per_user: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-8 pt-6 border-t border-[#f5faff]">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#e9f5ff] text-[#00629d] font-bold text-xs flex items-center justify-center">3</div>
                  <h5 className="font-bold text-[#0f1d25] tracking-tight">Thời Gian Kích Hoạt</h5>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Ngày Bắt Đầu</label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                      <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-widest ml-2">Ngày Kết Thúc</label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                      <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-[#a1aab3] pointer-events-none">calendar_today</span>
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-12 border-t border-[#f5faff] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex items-center gap-3 text-[#ba1a1a] font-bold text-xs uppercase tracking-widest hover:opacity-70 transition-all"
                >
                  <span className="material-symbols-outlined">delete_sweep</span> Xóa vĩnh viễn voucher này
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-10 py-4 bg-[#00629d] text-white rounded-[1.5rem] text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
                >
                  {saving ? '...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-10">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-[#e1f0fb]">
              <p className="text-xs font-bold text-[#0f1d25] mb-3">Trạng Thái Voucher</p>
              <Select
                className="mb-6"
                options={[...sellerVoucherStatusOptions]}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
              />
              <p className="text-[11px] text-[#707882] leading-relaxed mb-8">
                Cài đặt này cho phép người mua có thể lưu mã hoặc áp dụng khi thanh toán tại shop của bạn hay không.
              </p>

              <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest mb-4 ml-2">Xem Trước Voucher</p>
              <div className="relative group">
                <div className="absolute inset-x-0 bottom-0 h-4 bg-[#00629d]/10 blur-xl scale-95 transition-all group-hover:blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-[#42a5f5] to-[#00629d] p-8 rounded-[2rem] text-white overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Mã Trị Giá</p>
                      <h6 className="text-xl font-black font-['JetBrains_Mono'] tracking-tight mb-6">{formData.code || 'CODE'}</h6>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        <p className="text-2xl font-black">{formData.discount_type === 'percentage' ? `${formData.discount_value}%` : `${formatVndCode(formData.discount_value)} off`}</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-white">storefront</span>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
