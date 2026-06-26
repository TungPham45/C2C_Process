import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface PendingShop {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  status: string;
  created_at: string;
}

const ShopModeration: FC = () => {
  const [shops, setShops] = useState<PendingShop[]>([]); // dsach các cửa hàng lấy về từ api
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // lấy danh sách các cửa hàng chờ duyệt
  const fetchShops = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch }),
        sortBy: sortBy,
      }).toString();

      const response = await fetch(`/api/admin/applications?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch pending shops');
      const data = await response.json();
      setShops(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [debouncedSearch, sortBy]);

  // xử lý duyệt cửa hàng
  const handleApprove = async (id: number, shopName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn duyệt Cửa hàng "${shopName}" không?`)) return;

    try {
      const response = await fetch(`/api/admin/applications/${id}/approve`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Duyệt cửa hàng thất bại');

      // Cập nhật giao diện: Loại bỏ shop đã duyệt
      setShops(shops.filter(s => s.id !== id));
      alert(`Cửa hàng "${shopName}" đã được duyệt thành công!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout pageTitle="Duyệt Đăng ký Cửa hàng">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách hồ sơ chờ duyệt</h3>
              <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-[#fff8e5] text-[#ffb952] rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Tổng cộng {shops.length} hồ sơ
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center bg-[#f5faff] p-4 rounded-xl">
              <div className="flex-1 min-w-[200px] relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#707882] text-lg">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên shop, slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] focus:ring-1 focus:ring-[#00629d] text-sm"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] text-sm text-[#0f1d25] bg-white"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="name_asc">Tên (A-Z)</option>
                  <option value="name_desc">Tên (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5faff] text-[#707882] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Cửa hàng</th>
                  <th className="px-6 py-5">Đường dẫn URL</th>
                  <th className="px-6 py-5">Ngày đăng ký</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-10 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-[#707882] text-sm animate-pulse">
                      Đang tìm kiếm hồ sơ đăng ký...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-10 text-center text-[#ba1a1a] font-bold">
                      {error}
                    </td>
                  </tr>
                ) : shops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                      <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-4">check_circle</span>
                      <p className="text-[#0f1d25] font-bold">Đã xử lý hết!</p>
                      <p className="text-[#707882] text-xs">Hiện không có đăng ký mở cửa hàng nào cần kiểm duyệt.</p>
                    </td>
                  </tr>
                ) : (
                  shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-[#f5faff]/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00629d] to-[#42a5f5] flex items-center justify-center shadow-sm text-white font-bold text-lg">
                            {shop.name ? shop.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0f1d25] mb-1 group-hover:text-[#00629d] transition-colors">{shop.name}</p>
                            <p className="text-[10px] text-[#707882] font-medium tracking-tight">ID: #{shop.id} • Owner: #{shop.owner_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#707882] font-medium">/{shop.slug}</td>
                      <td className="px-6 py-6 font-['Plus_Jakarta_Sans'] font-bold text-[#0f1d25]">
                        {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                          Đang chờ
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(shop.id, shop.name)}
                          className="px-6 py-3 bg-[#dcfce7] text-[#166534] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#bbf7d0] transition-all shadow-sm"
                        >
                          Duyệt mở Shop
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ShopModeration;
