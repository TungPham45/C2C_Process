import { FC, useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface Banner {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const BannersAdminPage: FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // qly bật tắt modal
  const [formData, setFormData] = useState<Partial<Banner>>({}); // qly dlieu đang nhập trong form
  const [isUploading, setIsUploading] = useState(false); // qly upload ảnh

  const token = localStorage.getItem('c2c_token');

  // get dsach banner
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/banners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  // upload ảnh
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // lấy file 
    if (!file) return;

    const fd = new FormData(); // gửi bằng form data - gán nhãn file để be tìm
    fd.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, image_url: data.url }); // cập nhật luôn vào state để hiển thị ảnh xem trc
      }
    } catch (err) {
      alert("Lỗi tải ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  // xử lý cả 2 trường hợp (Thêm mới hoặc Sửa) dựa vào việc formData có id hay không
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image_url) {
      alert("Vui lòng điền đủ Tiêu đề và Ảnh");
      return;
    }

    try {
      const method = formData.id ? 'PUT' : 'POST';
      const url = formData.id ? `/api/admin/banners/${formData.id}` : '/api/admin/banners';

      const payload = {
        title: formData.title,
        image_url: formData.image_url,
        target_url: formData.target_url,
        is_active: formData.is_active ?? true,
        sort_order: Number(formData.sort_order || 0)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchBanners();
      } else {
        alert("Có lỗi xảy ra khi lưu");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // delete banner
  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa banner này?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBanners();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Banner">
      {/* tiêu đề - nút thêm mới */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Banner Trang Chủ</h2>
          <p className="text-sm text-[#707882]">Cập nhật và quản lý các banner quảng cáo</p>
        </div>
        <button
          //thiết lập các gtri mặc định cho form data (mặc định là được kích hoạt và thứ tự là 0)
          onClick={() => { setFormData({ is_active: true, sort_order: 0 }); setIsModalOpen(true); }}
          className="px-6 py-3 bg-[#00629d] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#004e7c] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span> Thêm Banner
        </button>
      </div>

      {/* bảng danh sách banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e1f0fb] max-w-5xl mx-auto overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#707882]">Đang tải...</div>
        ) : banners.length === 0 ? (
          <div className="p-10 text-center text-[#707882]">Chưa có banner nào.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#f9fafc] border-b border-[#e1f0fb]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Hiển thị</th>
                <th className="px-6 py-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Banner</th>
                <th className="px-6 py-4 text-xs font-bold text-[#707882] uppercase tracking-wider">Tiêu đề / Link</th>
                <th className="px-6 py-4 text-xs font-bold text-[#707882] uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1f0fb]">
              {banners.map(b => (
                <tr key={b.id} className={`hover:bg-[#f5faff] transition-colors ${!b.is_active ? 'opacity-50' : ''}`}>
                  {/* cột hiển thị (Status & Sort Order)*/}
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'Đang bật' : 'Đã ẩn'}
                    </span>
                    <div className="mt-2 text-xs text-[#707882]">Thứ tự: {b.sort_order}</div>
                  </td>
                  {/* cột hiển thị banner */}
                  <td className="px-6 py-4">
                    <img src={b.image_url} alt={b.title} className="w-40 h-20 object-cover rounded-lg border border-[#e1f0fb]" />
                  </td>
                  {/* cột hiển thị tiêu đề và link */}
                  <td className="px-6 py-4 max-w-xs">
                    <p className="font-bold text-sm text-[#0f1d25] truncate">{b.title}</p>
                    <a href={b.target_url || '#'} target="_blank" rel="noreferrer" className="text-xs text-[#00629d] truncate block mt-1 hover:underline">
                      {b.target_url || 'Không có link'}
                    </a>
                  </td>
                  {/* cột hiển thị hành động */}
                  <td className="px-6 py-4 text-right space-x-3">
                    {/* nút sửa */}
                    <button
                      onClick={() => { setFormData(b); setIsModalOpen(true); }}
                      className="w-8 h-8 rounded-lg bg-[#e9f5ff] text-[#00629d] hover:bg-[#cfe5ff] transition-colors inline-flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    {/* nút xóa */}
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="w-8 h-8 rounded-lg bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffb4ab] transition-colors inline-flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* modal form */}
      {isModalOpen && (
        // tiêu đề
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d25]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[#e1f0fb] flex justify-between items-center bg-[#f9fafc]">
              <h3 className="font-bold text-lg text-[#0f1d25] font-['Plus_Jakarta_Sans']">{formData.id ? 'Sửa Banner' : 'Thêm Banner Mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#707882] hover:text-[#0f1d25]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {/* các ô nhập liệu */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#707882] uppercase tracking-wider mb-2">Tiêu đề (Nội bộ)</label>
                <input
                  type="text" required
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 px-4 bg-[#f5faff] border border-[#e1f0fb] rounded-xl text-sm focus:outline-none focus:border-[#42a5f5]"
                  placeholder="Ví dụ: Banner Khuyến Mãi Mùa Hè"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707882] uppercase tracking-wider mb-2">Hình ảnh</label>
                <div className="flex gap-4 items-center">
                  {/* ô nhập url */}
                  <div className="flex-1 relative">
                    <input
                      type="text" required
                      value={formData.image_url || ''}
                      onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full h-11 px-4 bg-[#f5faff] border border-[#e1f0fb] rounded-xl text-sm focus:outline-none focus:border-[#42a5f5]"
                      placeholder="URL hoặc tải lên"
                    />
                  </div>
                  {/* nút tải lên */}
                  <label className="cursor-pointer h-11 px-4 flex items-center gap-2 bg-[#e9f5ff] text-[#00629d] rounded-xl font-semibold text-sm hover:bg-[#cfe5ff]">
                    {isUploading ? 'Đang tải...' : 'Tải lên'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </div>
                {/* xem trước ảnh - chỉ khi nào có link ảnh thì mới hiện */}
                {formData.image_url && (
                  <div className="mt-3">
                    <img src={formData.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-[#e1f0fb]" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#707882] uppercase tracking-wider mb-2">Đường dẫn khi click (Tùy chọn)</label>
                <input
                  type="text"
                  value={formData.target_url || ''}
                  onChange={e => setFormData({ ...formData, target_url: e.target.value })}
                  className="w-full h-11 px-4 bg-[#f5faff] border border-[#e1f0fb] rounded-xl text-sm focus:outline-none focus:border-[#42a5f5]"
                  placeholder="/products hoặc https://..."
                />
              </div>

              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#707882] uppercase tracking-wider mb-2">Thứ tự</label>
                  <input
                    type="number"
                    value={formData.sort_order || 0}
                    onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                    className="w-full h-11 px-4 bg-[#f5faff] border border-[#e1f0fb] rounded-xl text-sm focus:outline-none focus:border-[#42a5f5]"
                  />
                </div>
                <div className="w-32 flex items-center justify-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active ?? true}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-[#e1f0fb] text-[#00629d] focus:ring-[#00629d]"
                    />
                    <span className="text-sm font-semibold text-[#0f1d25]">Kích hoạt</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#e1f0fb]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-[#707882] hover:bg-[#f5faff] rounded-xl transition-colors">
                  Hủy
                </button>
                {/* type submit -> khi nhấn kích hoạt hàm handleSave */}
                <button type="submit" disabled={isUploading} className="px-5 py-2.5 bg-[#00629d] text-white text-sm font-bold rounded-xl hover:bg-[#004e7c] transition-colors disabled:opacity-50">
                  Lưu Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
