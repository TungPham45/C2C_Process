import { FC, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { PRODUCT_API_URL, AUTH_API_URL, resolveAssetUrl } from '../../config/api';

export const SettingsPage: FC = () => {
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Shop editable fields
  const [shopName, setShopName] = useState('');
  const [shopDesc, setShopDesc] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        setFullName(parsed.full_name || '');
        setPhone(parsed.phone || '');
      } catch { /* ignore */ }
    }

    const fetchShop = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setShop(data.shop);
            setShopName(data.shop.name || '');
            setShopDesc(data.shop.description || '');
            setLogoPreview(resolveAssetUrl(data.shop.logo_url) || '');
          }
        }
      } catch (e) {
        console.error('Failed to load shop context', e);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, []);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!shopName?.trim()) {
      setError('Tên shop không được để trống');
      return;
    }
    if (shopName.length > 255) {
      setError('Tên shop quá dài (tối đa 255 ký tự)');
      return;
    }

    if (logoFile) {
      if (logoFile.size > 5 * 1024 * 1024) {
        setError('Kích thước logo không được vượt quá 5MB');
        return;
      }
      if (!logoFile.type.startsWith('image/')) {
        setError('Vui lòng chỉ tải lên file hình ảnh hợp lệ');
        return;
      }
    }

    const nameRegex = /^[\p{L}\s]+$/u;
    if (fullName && !nameRegex.test(fullName)) {
      setError('Họ và tên người nhận chỉ được chứa chữ cái.');
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (phone && !phoneRegex.test(phone)) {
      setError('Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('c2c_token');
      let logoUrl = shop?.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadRes = await fetch(`${PRODUCT_API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('Tải ảnh lên thất bại');
        const uploadData = await uploadRes.json();
        logoUrl = uploadData.url;
      }

      // Update shop info
      const shopRes = await fetch(`${PRODUCT_API_URL}/seller/shop`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: shopName,
          description: shopDesc,
          logo_url: logoUrl,
        }),
      });
      if (!shopRes.ok) throw new Error('Cập nhật cửa hàng thất bại');
      const updatedShop = await shopRes.json();
      setShop(updatedShop);
      setLogoFile(null);

      // Update user profile
      const profileRes = await fetch(`${AUTH_API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone,
        }),
      });
      if (!profileRes.ok) throw new Error('Cập nhật thông tin tài khoản thất bại');
      const updatedUser = await profileRes.json();

      // Sync localStorage and notify layout header
      const currentUser = JSON.parse(localStorage.getItem('c2c_user') || '{}');
      const merged = { ...currentUser, ...updatedUser, shop: updatedShop };
      localStorage.setItem('c2c_user', JSON.stringify(merged));
      setUser(merged);
      window.dispatchEvent(new Event('user-updated'));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Đã xảy ra lỗi');
    } finally {
      setSaving(false);
    }
  };

  // const handleSuspend = async () => {
  //   if (!window.confirm('Bạn có chắc muốn tạm ngưng bán hàng? Cửa hàng sẽ ẩn khỏi marketplace cho đến khi bạn kích hoạt lại.')) return;
  //   try {
  //     const token = localStorage.getItem('c2c_token');
  //     const res = await fetch(`${PRODUCT_API_URL}/seller/shop`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  //       body: JSON.stringify({ status: 'suspended' }),
  //     });
  //     if (!res.ok) throw new Error('Không thể tạm ngưng cửa hàng');
  //     alert('Cửa hàng đã được tạm ngưng thành công.');
  //     navigate('/');
  //   } catch (e: any) {
  //     setError(e.message || 'Đã xảy ra lỗi');
  //   }
  // };

  const handleDeleteShop = async () => {
    if (!window.confirm('CẢNH BÁO: Hành động này sẽ xóa VĨNH VIỄN cửa hàng, bao gồm toàn bộ sản phẩm, danh mục và lượt đánh giá. Bạn sẽ trở về quyền Người dùng bình thường. Bạn có CHẮC CHẮN muốn tiếp tục?')) return;

    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/seller/shop`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể xóa cửa hàng');

      alert('Cửa hàng của bạn đã bị xóa vĩnh viễn. Bạn đã trở lại quyền người dùng bình thường.');

      // Update local storage to remove shop and reset role
      const currentUserStr = localStorage.getItem('c2c_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        delete currentUser.shop;
        currentUser.role = 'user'; // Ensure role is back to user visually
        localStorage.setItem('c2c_user', JSON.stringify(currentUser));
        setUser(currentUser);
      }

      window.dispatchEvent(new Event('user-updated'));
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Đã xảy ra lỗi khi xóa cửa hàng');
    }
  };

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Đang hoạt động', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    pending: { label: 'Chờ duyệt', color: 'text-amber-700', bg: 'bg-amber-100' },
    suspended: { label: 'Tạm khóa', color: 'text-rose-700', bg: 'bg-rose-100' },
  };

  const shopStatus = statusMap[shop?.status] || statusMap['pending'];

  return (
    <SellerLayout pageTitle="Cài đặt">
      <div className="pb-12 max-w-4xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Cài Đặt Cửa Hàng</h2>
          <p className="text-[#404751] mt-1 text-sm">Quản lý thông tin cửa hàng và tài khoản của bạn</p>
        </div>

        {loading ? (
          <div className="text-center p-12 text-[#00629d] font-bold animate-pulse">Đang tải thông tin...</div>
        ) : (
          <>
            {/* Shop Profile Card */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              {/* Banner */}
              <div className="h-32 bg-gradient-to-r from-[#00629d] via-[#0288d1] to-[#00838f] relative">
                <div className="absolute -bottom-12 left-8">
                  <div
                    className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl bg-white flex items-center justify-center overflow-hidden cursor-pointer group relative"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Shop logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-[#bfc7d3]">storefront</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                  </div>
                </div>
                <div className="absolute top-4 right-6">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${shopStatus.color} ${shopStatus.bg}`}>
                    {shopStatus.label}
                  </span>
                </div>
              </div>

              <div className="pt-16 px-8 pb-8 space-y-6">
                <p className="text-xs text-[#707882]">Nhấp vào ảnh đại diện để thay đổi logo cửa hàng</p>

                {/* Shop Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Tên cửa hàng</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    maxLength={255}
                    className="w-full px-4 py-3 rounded-xl border border-[#bfc7d3]/30 bg-white/80 text-[#0f1d25] font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#00629d]/30 focus:border-[#00629d] transition-all"
                  />
                </div>

                {/* Shop Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Mô tả cửa hàng</label>
                  <textarea
                    value={shopDesc}
                    onChange={e => setShopDesc(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-[#bfc7d3]/30 bg-white/80 text-[#0f1d25] text-sm focus:outline-none focus:ring-2 focus:ring-[#00629d]/30 focus:border-[#00629d] transition-all resize-none"
                    placeholder="Viết vài dòng giới thiệu về cửa hàng..."
                  />
                </div>

                {/* Shop Slug */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Đường dẫn cửa hàng</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#f5f8fc] border border-[#e1e7ef]">
                    <span className="text-sm text-[#707882]">serene.vn/shop/</span>
                    <span className="text-sm font-bold text-[#0f1d25]">{shop?.slug || '—'}</span>
                  </div>
                </div>

                {/* Info Row */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-[#707882]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                    <span>Ngày tạo: <strong className="text-[#0f1d25]">{shop?.created_at ? new Date(shop.created_at).toLocaleDateString('vi-VN') : '—'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">star</span>
                    <span>Đánh giá: <strong className="text-[#0f1d25]">{shop?.rating || '0'} ⭐</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">badge</span>
                    <span>ID: <strong className="text-[#0f1d25]">#{shop?.id || '—'}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info — Editable */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-6">
              <h3 className="text-xl font-extrabold text-[#0f1d25]">Thông tin tài khoản</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Họ và tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value.replace(/[^\p{L}\s]/gu, ''))}
                    className="w-full px-4 py-3 rounded-xl border border-[#bfc7d3]/30 bg-white/80 text-[#0f1d25] font-medium focus:outline-none focus:ring-2 focus:ring-[#00629d]/30 focus:border-[#00629d] transition-all"
                    placeholder="Nhập họ và tên..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Email</label>
                  <div className="px-4 py-3 rounded-xl bg-[#f5f8fc] border border-[#e1e7ef] text-[#0f1d25] font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#707882] text-lg">lock</span>
                    {user?.email || '—'}
                  </div>
                  <p className="text-[10px] text-[#707882] mt-1">Email không thể thay đổi</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    className="w-full px-4 py-3 rounded-xl border border-[#bfc7d3]/30 bg-white/80 text-[#0f1d25] font-medium focus:outline-none focus:ring-2 focus:ring-[#00629d]/30 focus:border-[#00629d] transition-all"
                    placeholder="Nhập số điện thoại..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Vai trò</label>
                  <div className="px-4 py-3 rounded-xl bg-[#f5f8fc] border border-[#e1e7ef]">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-[#00629d] bg-blue-100">Người bán</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                {error}
              </div>
            )}

            {/* Save Button — Global */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-10 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 ${saved
                    ? 'bg-emerald-500 shadow-emerald-200'
                    : saving
                      ? 'bg-[#00629d]/70 cursor-wait'
                      : 'bg-[#00629d] hover:bg-[#004f80] shadow-blue-200 hover:shadow-blue-300'
                  }`}
              >
                {saved ? '✓ Đã lưu thành công' : saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-white/70 backdrop-blur-xl border border-rose-200/50 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
              <h3 className="text-xl font-extrabold text-rose-700 mb-2">Vùng nguy hiểm</h3>
              <p className="text-sm text-[#707882] mb-6">Các hành động dưới đây không thể hoàn tác. Hãy suy nghĩ kỹ trước khi thực hiện.</p>
              <div className="flex gap-4">
                {/* <button
                  onClick={handleSuspend}
                  className="px-6 py-3 rounded-xl border-2 border-rose-300 text-rose-700 font-bold text-sm hover:bg-rose-50 transition-colors"
                >
                  Tạm ngưng bán hàng
                </button> */}
                <button
                  onClick={handleDeleteShop}
                  className="px-6 py-3 rounded-xl border-2 border-rose-500 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-colors"
                  title="Xóa vĩnh viễn cửa hàng của bạn"
                >
                  Xóa cửa hàng
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
};
