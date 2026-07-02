import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/layout/AdminLayout';
import { formatVnd, formatVndCompact } from '../../../utils/currency';

interface Voucher {
  id: number;
  code: string;
  target_type: 'all_buyers' | 'new_buyer';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_spend: number;
  max_discount: number | null;
  total_quantity: number | null;
  used_count: number;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';
  start_date: string;
  end_date: string;
}

export const VoucherList: FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vouchers');
      if (response.ok) {
        const data = await response.json();
        setVouchers(data);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this voucher? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchVouchers();
      }
    } catch (error) {
      console.error('Failed to delete voucher:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#dcfce7] text-[#166534]';
      case 'scheduled': return 'bg-[#fef9c3] text-[#854d0e]';
      case 'expired': return 'bg-[#fee2e2] text-[#991b1b]';
      case 'paused': return 'bg-[#f3f4f6] text-[#374151]';
      default: return 'bg-[#e0f2fe] text-[#0369a1]';
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Voucher">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#e9f5ff] text-[#00629d] rounded-2xl flex items-center justify-center">
                   <span className="material-symbols-outlined">confirmation_number</span>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest">Tổng Voucher</p>
                   <h4 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">{vouchers.length}</h4>
                </div>
             </div>
             <p className="text-xs text-[#707882]">
                <span className="text-[#16a34a] font-bold">+12%</span> so với năm ngoái
             </p>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#fdf2f8] text-[#be185d] rounded-2xl flex items-center justify-center">
                   <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest">Tiền giảm áp dụng</p>
                   <h4 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">{formatVndCompact(42910500)}</h4>
                </div>
             </div>
             <p className="text-xs text-[#707882]">Toàn hệ thống</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#ecfdf5] text-[#047857] rounded-2xl flex items-center justify-center">
                   <span className="material-symbols-outlined">verified</span>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-[#707882] uppercase tracking-widest">Yêu cầu thu thập</p>
                   <h4 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">8,294</h4>
                </div>
             </div>
             <div className="px-3 py-1 bg-[#ecfdf5] text-[#047857] rounded-full text-[10px] font-bold w-fit">Active</div>
          </div>
        </div>

        {/* Registry Section */}
        <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex items-center justify-between">
            <div>
               <h3 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh Sách Voucher Hệ Thống</h3>
               <p className="text-xs text-[#707882]">Quản lý giảm giá toàn nền tảng và các chỉ số hiệu suất của voucher.</p>
            </div>
            <div className="flex gap-4">
               <button className="px-6 py-3 bg-[#f5faff] text-[#00629d] rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#e9f5ff] transition-all">
                  <span className="material-symbols-outlined text-sm">download</span> Xuất Báo Cáo
               </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5faff]/50">
                <tr className="text-[#a1aab3] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-6">ID</th>
                  <th className="px-6 py-6">Mã</th>
                  <th className="px-6 py-6">Loại & K.Lượng</th>
                  <th className="px-6 py-6">Khách Hàng</th>
                  <th className="px-6 py-6">T.Thiểu / T.Đa</th>
                  <th className="px-6 py-6">Tỷ Lệ SD</th>
                  <th className="px-6 py-6">Trạng Thái</th>
                  <th className="px-10 py-6 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-10 py-8 h-20 bg-gray-50/50"></td>
                    </tr>
                  ))
                ) : (
                  vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-[#f5faff]/30 transition-colors group">
                      <td className="px-10 py-6 text-xs text-[#707882] font-semibold tracking-tighter">#VCH-{String(v.id).padStart(4, '0')}</td>
                      <td className="px-6 py-6">
                        <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-lg text-xs font-bold font-['JetBrains_Mono'] uppercase tracking-wider">
                          {v.code}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-[#0f1d25] mb-0.5">
                          {v.discount_type === 'percentage' ? `${v.discount_value}%` : formatVnd(v.discount_value)}
                        </p>
                        <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest opacity-60">
                          {v.discount_type === 'percentage' ? 'Giảm 1 phần' : 'Số tiền cố định'}
                        </p>
                      </td>
                      <td className="px-6 py-6">
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                           v.target_type === 'new_buyer' ? 'bg-[#fff4d6] text-[#9a6700]' : 'bg-[#e9f5ff] text-[#00629d]'
                         }`}>
                            {v.target_type === 'new_buyer' ? 'Khách Mới' : 'Tất Cả'}
                         </span>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-xs font-semibold text-[#0f1d25]">Tổi thiểu: {formatVnd(v.min_spend)}</p>
                         <p className="text-[10px] text-[#707882] font-medium opacity-80">Tối đa: {v.max_discount ? formatVnd(v.max_discount) : 'Không có'}</p>
                      </td>
                      <td className="px-6 py-6 w-48">
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-1.5 bg-[#f5faff] rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${v.status === 'expired' ? 'bg-red-400' : 'bg-[#00629d]'}`} 
                                style={{ width: `${v.total_quantity ? (v.used_count / v.total_quantity) * 100 : 0}%` }}
                              ></div>
                           </div>
                           <span className="text-[10px] font-bold text-[#0f1d25] whitespace-nowrap">
                              {v.used_count} / {v.total_quantity || '∞'}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(v.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse"></span>
                            {v.status}
                         </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button onClick={() => handleDelete(v.id)} className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-[#707882] hover:text-red-500 transition-all" title="Delete Voucher">
                              <span className="material-symbols-outlined">delete_outline</span>
                           </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-10 py-6 bg-[#f5faff]/30 border-t border-[#f5faff] flex items-center justify-between">
             <p className="text-xs text-[#707882] font-medium">Hiển thị {vouchers.length} voucher</p>
             <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg bg-white border border-[#e1f0fb] flex items-center justify-center text-[#707882] hover:border-[#00629d] transition-all"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <button className="w-8 h-8 rounded-lg bg-[#00629d] text-white flex items-center justify-center text-xs font-bold">1</button>
                <button className="w-8 h-8 rounded-lg bg-white border border-[#e1f0fb] flex items-center justify-center text-[#707882] hover:border-[#00629d] transition-all"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
             </div>
          </div>
        </div>

        {/* Footer Optimization Card */}
        <div className="bg-[#003c61] rounded-[3rem] p-10 text-white flex items-center justify-between shadow-2xl shadow-blue-200">
           <div className="flex gap-8 items-center">
              <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md">
                 <span className="material-symbols-outlined text-4xl text-[#42a5f5]">auto_awesome</span>
              </div>
              <div>
                 <h4 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] mb-2">Tối Ưu Tự Động</h4>
                 <p className="text-sm text-blue-100 max-w-lg opacity-80">
                    Hệ thống ghi nhận nhu cầu mua sắm tăng cao ở một vài danh mục. Đề xuất tạo 500 voucher 20% giới hạn thời gian cho đợt Sale ngày mai.
                 </p>
              </div>
           </div>
           <button className="px-8 py-4 bg-white text-[#00629d] rounded-2xl text-sm font-bold hover:bg-blue-50 transition-all flex items-center gap-3">
              Áp Dụng Khuyến Nghị <span className="material-symbols-outlined">arrow_forward</span>
           </button>
        </div>
      </div>
    </AdminLayout>
  );
};
