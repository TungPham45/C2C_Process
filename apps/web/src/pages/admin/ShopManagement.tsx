import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface Shop {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  status: string;
  created_at: string;
}

const ShopManagement: FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        sortBy: sortBy,
      }).toString();

      const response = await fetch(`/api/admin/shops?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch shops');
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
  }, [debouncedSearch, filterStatus, sortBy]);

  const handleUpdateStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'active' ? 'kích hoạt' : 'đình chỉ';

    if (!confirm(`Bạn có chắc chắn muốn ${actionName} shop này không?`)) return;

    try {
      const response = await fetch(`/api/admin/shops/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`Cập nhật trạng thái thất bại`);

      // Update local state -> để cập nhật giao diện
      setShops(shops.map(s => (s.id === id ? { ...s, status: newStatus } : s)));
      alert(`Đã ${actionName} shop thành công!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Shop">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách các Shop</h3>
              <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Tổng cộng {shops.length} shop
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
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] text-sm text-[#0f1d25] bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="suspended">Đình chỉ</option>
                </select>
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
                  <th className="px-10 py-5">Thông tin Shop</th>
                  <th className="px-6 py-5">Ngày tạo</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-10 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-[#707882] text-sm animate-pulse">
                      Đang tải dữ liệu shop...
                    </td>
                  </tr>
                ) : shops.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center">
                      <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-4">storefront</span>
                      <p className="text-[#0f1d25] font-bold">Chưa có shop nào!</p>
                    </td>
                  </tr>
                ) :
                  // duyệt tất cả các shop
                  (
                    shops.map((shop) => (
                      <tr key={shop.id} className="hover:bg-[#f5faff]/50 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#e9f5ff] text-[#00629d] flex items-center justify-center font-bold text-lg">
                              {shop.name ? shop.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#0f1d25] mb-1 group-hover:text-[#00629d] transition-colors">{shop.name}</p>
                              <p className="text-[10px] text-[#707882] font-medium tracking-tight">Slug: {shop.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-sm text-[#707882] font-medium">
                          {shop.created_at ? new Date(shop.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                        </td>
                        {/* hiển thị trạng thái của shop (active, pending, suspended) */}
                        <td className="px-6 py-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' ? 'bg-[#dcfce7] text-[#166534]' :
                            shop.status === 'pending' ? 'bg-[#fef9c3] text-[#854d0e]' :
                              'bg-[#fee2e2] text-[#991b1b]'
                            }`}>
                            {shop.status === 'active' ? 'Đang hoạt động' :
                              shop.status === 'pending' ? 'Chờ duyệt' : 'Đã đình chỉ'}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right space-x-2">
                          {shop.status !== 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(shop.id, shop.status)}
                              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${shop.status === 'active'
                                ? 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'
                                : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                                }`}
                            >
                              {shop.status === 'active' ? 'Đình chỉ' : 'Kích hoạt'}
                            </button>
                          )}
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

export default ShopManagement;
