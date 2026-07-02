import { FC, useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
}

const AccountManagement: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // state for filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // handle debounced
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterRole !== 'all' && { role: filterRole }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        sortBy: sortBy,
      }).toString();

      const response = await fetch(`/api/admin/users?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, filterRole, filterStatus, sortBy]);

  const handleUpdateStatus = async (id: number, currentStatus: string | null) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'active' ? 'kích hoạt' : 'đình chỉ';

    if (!confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này không?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error(`Cập nhật trạng thái thất bại`);

      setUsers(users.map(u => (u.id === id ? { ...u, status: newStatus } : u)));
      alert(`Đã ${actionName} tài khoản thành công!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout pageTitle="Quản lý Tài Khoản">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách Tài Khoản</h3>
              <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Tổng cộng {users.length} user
                </span>
              </div>
            </div>

            {/* filter and search bar */}
            <div className="flex flex-wrap gap-4 items-center bg-[#f5faff] p-4 rounded-xl">
              <div className="flex-1 min-w-[200px] relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#707882] text-lg">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, email, sđt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] focus:ring-1 focus:ring-[#00629d] text-sm"
                />
              </div>
              <div className="flex gap-4">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] text-sm text-[#0f1d25] bg-white"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="user">Người dùng</option>
                  <option value="seller">Người bán</option>
                  <option value="admin">Quản trị viên</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[#cfe5ff] focus:outline-none focus:border-[#00629d] text-sm text-[#0f1d25] bg-white"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="pending_verification">Chờ xác thực</option>
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

          {/* user table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5faff] text-[#707882] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Người dùng</th>
                  <th className="px-6 py-5">Số điện thoại</th>
                  <th className="px-6 py-5">Vai trò</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-10 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-[#707882] text-sm animate-pulse">
                      Đang tải dữ liệu tài khoản...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                      <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-4">group</span>
                      <p className="text-[#0f1d25] font-bold">Chưa có tài khoản nào!</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f5faff]/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#e9f5ff] text-[#00629d] flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#0f1d25] mb-1 group-hover:text-[#00629d] transition-colors">{user.full_name || 'Khách hàng'}</p>
                            <p className="text-[10px] text-[#707882] font-medium tracking-tight">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#707882] font-medium">
                        {user.phone || 'Chưa cập nhật'}
                      </td>
                      <td className="px-6 py-6 text-sm font-semibold text-[#00629d] uppercase tracking-wider text-[10px]">
                        {user.role}
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.status === 'active' ? 'bg-[#dcfce7] text-[#166534]' :
                          user.status === 'pending_verification' ? 'bg-[#fef9c3] text-[#854d0e]' :
                            'bg-[#fee2e2] text-[#991b1b]'
                          }`}>
                          {user.status === 'active' ? 'Hoạt động' :
                            user.status === 'pending_verification' ? 'Chờ xác thực' : 'Đình chỉ'}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="w-[85px] py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all bg-[#f5faff] text-[#00629d] hover:bg-[#e9f5ff] text-center"
                          >
                            Chi tiết
                          </button>
                          {user.role !== 'admin' && user.status !== 'pending_verification' ? (
                            <button
                              onClick={() => handleUpdateStatus(user.id, user.status)}
                              className={`w-[85px] py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all text-center ${user.status === 'active'
                                ? 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'
                                : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                                }`}
                            >
                              {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                            </button>
                          ) : (
                            <div className="w-[85px]"></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* user detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f9fafb]">
              <h3 className="font-bold text-lg text-[#0f1d25]">Chi tiết Tài Khoản</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#e9f5ff] text-[#00629d] flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-lg font-bold text-[#0f1d25] mb-1">{selectedUser.full_name || 'Khách hàng'}</p>
                  <p className="text-sm text-[#707882]">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-[#707882] text-xs uppercase font-bold mb-1">Số điện thoại</span>
                  <span className="font-medium text-[#0f1d25]">{selectedUser.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="block text-[#707882] text-xs uppercase font-bold mb-1">Vai trò</span>
                  <span className="font-bold text-[#00629d] uppercase">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="block text-[#707882] text-xs uppercase font-bold mb-1">Trạng thái</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${selectedUser.status === 'active' ? 'bg-[#dcfce7] text-[#166534]' :
                      selectedUser.status === 'pending_verification' ? 'bg-[#fef9c3] text-[#854d0e]' :
                        'bg-[#fee2e2] text-[#991b1b]'
                    }`}>
                    {selectedUser.status === 'active' ? 'Hoạt động' :
                      selectedUser.status === 'pending_verification' ? 'Chờ xác thực' : 'Đình chỉ'}
                  </span>
                </div>
                <div>
                  <span className="block text-[#707882] text-xs uppercase font-bold mb-1">Ngày tham gia</span>
                  <span className="font-medium text-[#0f1d25]">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-[#f9fafb] flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 bg-[#00629d] text-white font-bold rounded-xl hover:bg-[#004f80] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AccountManagement;
