import React, { FC, useEffect, useState } from 'react';
import { ORDER_API_URL, resolveAssetUrl } from '../../config/api';
import { AdminLayout } from '../../components/layout/AdminLayout';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Đã duyệt (Hoàn tiền)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const ReturnManagement: FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('c2c_token');
      const url = filter === 'all'
        ? `${ORDER_API_URL}/internal/admin/returns`
        : `${ORDER_API_URL}/internal/admin/returns?status=${filter}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReturns(await res.json());
      } else {
        console.error('API Error:', res.status, res.statusText);
        const errText = await res.text();
        console.error('Response:', errText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [filter]);

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedReturn) return;
    if (status === 'rejected' && !adminNote.trim()) {
      return alert('Vui lòng nhập lý do từ chối vào ghi chú.');
    }
    if (status === 'approved' && !window.confirm('Bạn có chắc chắn phê duyệt yêu cầu này? Tiền sẽ được hoàn ngay lập tức cho người mua.')) {
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${ORDER_API_URL}/internal/admin/returns/${selectedReturn.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, admin_note: adminNote })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi cập nhật trạng thái');
      }

      alert(`Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} yêu cầu hoàn trả.`);
      setSelectedReturn(null);
      setAdminNote('');
      fetchReturns();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminLayout>
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">Quản lý Đổi/Trả hàng</h1>
          <p className="text-sm text-[#707882] mt-1">Xem xét và xử lý các yêu cầu hoàn trả từ người mua.</p>
        </div>
        <div className="flex bg-[#f0f3f8] p-1 rounded-xl">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${filter === f
                  ? 'bg-white text-[#0f1d25] shadow-sm'
                  : 'text-[#707882] hover:text-[#0f1d25]'
                }`}
            >
              {f === 'all' ? 'Tất cả' : statusMap[f]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e4e9f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-16 text-center">
            <span className="material-symbols-outlined text-6xl text-[#dbeaf5]">inbox</span>
            <p className="text-[#0f1d25] font-bold mt-4">Không có yêu cầu hoàn trả nào.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9fafc] border-b border-[#e4e9f0]">
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Mã YC</th>
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Đơn hàng</th>
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Người mua</th>
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Lý do</th>
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Trạng thái</th>
                <th className="p-4 text-xs font-bold text-[#707882] uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e9f0]">
              {returns.map(ret => (
                <tr key={ret.id} className="hover:bg-[#f9fafc] transition-colors">
                  <td className="p-4 font-bold text-[#0f1d25] text-sm">#RT-{ret.id}</td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-[#00629d]">#SER-{ret.shop_order_id}</p>
                    <p className="text-xs text-[#707882] mt-0.5">{new Date(ret.created_at).toLocaleDateString('vi-VN')}</p>
                  </td>
                  <td className="p-4 text-sm text-[#0f1d25]">UID: {ret.user_id}</td>
                  <td className="p-4 text-sm text-[#0f1d25] max-w-[200px] truncate" title={ret.reason}>{ret.reason}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusMap[ret.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {statusMap[ret.status]?.label || ret.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedReturn(ret)}
                      className="px-4 py-2 bg-[#e0efff] text-[#00629d] rounded-lg text-xs font-bold hover:bg-[#cfe5ff] transition-colors"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-[#e4e9f0] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-[#0f1d25]">Chi tiết Yêu cầu Hoàn trả #RT-{selectedReturn.id}</h2>
              <button onClick={() => setSelectedReturn(null)} className="text-[#707882] hover:text-[#0f1d25]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-[#f9fafc]">
              <div className="grid grid-cols-2 gap-8">
                {/* Left col: info & media */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-[#e4e9f0] shadow-sm">
                    <h3 className="font-bold text-[#0f1d25] mb-4 text-sm uppercase tracking-wider text-[#707882]">Thông tin chung</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-[#707882]">Mã đơn hàng:</span><span className="font-bold">#SER-{selectedReturn.shop_order_id}</span></div>
                      <div className="flex justify-between"><span className="text-[#707882]">Trạng thái đơn:</span><span className="font-bold">{selectedReturn.shop_order?.status}</span></div>
                      <div className="flex justify-between"><span className="text-[#707882]">Giá trị đơn:</span><span className="font-bold text-[#00629d]">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(selectedReturn.shop_order?.subtotal || 0) + Number(selectedReturn.shop_order?.shipping_fee || 0) - Number(selectedReturn.shop_order?.platform_discount_amount || 0))}
                      </span></div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-[#e4e9f0] shadow-sm">
                    <h3 className="font-bold text-[#0f1d25] mb-2 text-sm uppercase tracking-wider text-[#707882]">Lý do trả hàng</h3>
                    <p className="text-sm text-[#0f1d25] bg-[#f0f3f8] p-3 rounded-lg">{selectedReturn.reason}</p>
                  </div>

                  {selectedReturn.admin_note && (
                    <div className="bg-white p-5 rounded-xl border border-[#e4e9f0] shadow-sm">
                      <h3 className="font-bold text-[#0f1d25] mb-2 text-sm uppercase tracking-wider text-[#707882]">Ghi chú của Admin (cũ)</h3>
                      <p className="text-sm text-[#0f1d25] bg-yellow-50 p-3 rounded-lg border border-yellow-200">{selectedReturn.admin_note}</p>
                    </div>
                  )}
                </div>

                {/* Right col: Media */}
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-[#e4e9f0] shadow-sm">
                    <h3 className="font-bold text-[#0f1d25] mb-4 text-sm uppercase tracking-wider text-[#707882]">Hình ảnh chứng minh</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReturn.images?.map((url: string, idx: number) => (
                        <a key={idx} href={resolveAssetUrl(url)} target="_blank" rel="noreferrer" className="aspect-square rounded-lg border border-[#e4e9f0] overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={resolveAssetUrl(url)} alt="proof" className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {(!selectedReturn.images || selectedReturn.images.length === 0) && (
                        <div className="col-span-3 text-sm text-[#707882] italic">Không có hình ảnh</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedReturn.status === 'pending' && (
              <div className="p-6 border-t border-[#e4e9f0] bg-white shrink-0">
                <div className="mb-4">
                  <label className="block text-xs font-bold text-[#707882] uppercase tracking-wider mb-2">Ghi chú duyệt/từ chối</label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="Nhập ghi chú cho người mua (bắt buộc nếu từ chối)..."
                    className="w-full px-4 py-3 rounded-xl border border-[#e4e9f0] focus:ring-2 focus:ring-[#00629d]/20 focus:border-[#00629d] outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={isUpdating}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20"
                  >
                    Phê duyệt & Hoàn tiền
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};
