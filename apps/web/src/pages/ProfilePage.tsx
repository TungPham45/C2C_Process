import { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { PRODUCT_API_URL, resolveAssetUrl } from '../config/api';
import { FollowersModal } from '../components/FollowersModal';

interface ShopData {
  id: string | number;
  name: string;
  description?: string;
  logo_url?: string;
  status: 'active' | 'pending' | 'suspended';
  _count?: { followers: number; products: number };
}

interface FollowedShop {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
  follower_count: number;
  is_following?: boolean;
  _count?: { products: number };
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  avatar_url?: string;
  shop?: ShopData | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active: { label: 'Đang hoạt động', color: '#1b6b3e', bg: '#dcfce7', icon: 'check_circle' },
  pending: { label: 'Chờ phê duyệt', color: '#92400e', bg: '#fef9c3', icon: 'hourglass_empty' },
  suspended: { label: 'Đã tạm dừng', color: '#ba1a1a', bg: '#fee2e2', icon: 'block' },
};

export const ProfilePage: FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [shopDetail, setShopDetail] = useState<ShopData | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

  const [followedShops, setFollowedShops] = useState<FollowedShop[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [targetShopId, setTargetShopId] = useState<number | string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    try {
      const parsed: UserProfile = JSON.parse(userStr);
      setUser(parsed);

      // Fetch fresh shop context if user might have a shop
      const token = localStorage.getItem('c2c_token');
      if (token) {
        setLoadingShop(true);
        fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.shop) {
              setShopDetail(data.shop);
              // Sync back to localStorage
              const updatedUser = { ...parsed, shop: data.shop };
              localStorage.setItem('c2c_user', JSON.stringify(updatedUser));
              setUser(updatedUser);
            }
          })
          .catch(() => { })
          .finally(() => setLoadingShop(false));

        setLoadingFollows(true);
        fetch(`${PRODUCT_API_URL}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setFollowedShops(data.map((shop: any) => ({ ...shop, is_following: true }))))
          .catch(() => {})
          .finally(() => setLoadingFollows(false));
      }
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const toggleFollowShop = async (shopId: number, currentFollowingStatus: boolean) => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;
    try {
      const res = await fetch(`${PRODUCT_API_URL}/shop/${shopId}/follow`, {
        method: currentFollowingStatus ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setFollowedShops(prev => prev.map(s => {
          if (s.id === shopId) {
            return {
              ...s,
              is_following: Boolean(result.is_following),
              follower_count: Number(result.follower_count)
            };
          }
          return s;
        }));
      }
    } catch (e) {}
  };

  if (!user) return null;

  const displayName = user.full_name || user.email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const shopStatus = shopDetail?.status ?? (user.shop as any)?.status;
  const shopName = shopDetail?.name ?? (user.shop as any)?.name;
  const shopDescription = shopDetail?.description ?? (user.shop as any)?.description;
  const shopId = shopDetail?.id ?? (user.shop as any)?.id;
  const shopLogo = shopDetail?.logo_url ?? (user.shop as any)?.logo_url;
  const statusCfg = shopStatus ? STATUS_CONFIG[shopStatus] : null;

  return (
    <MarketplaceLayout>
      <div className="max-w-5xl mx-auto px-6 pb-40">

        {/* ── Hero Banner ── */}
        <div className="relative h-52 rounded-[2.5rem] overflow-hidden mb-0 bg-gradient-to-r from-[#003d66] via-[#00629d] to-[#42a5f5]">
          {/* decorative blobs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-1/3 w-48 h-48 bg-[#99cbff]/20 rounded-full blur-xl" />
          <div className="absolute top-6 left-8 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">eco</span>
            </div>
            <span className="text-white font-black text-xl font-['Plus_Jakarta_Sans']">Serene</span>
          </div>
        </div>

        {/* ── Avatar + Name strip ── */}
        <div className="flex items-end gap-6 px-8 -mt-12 mb-10 relative z-10">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#00629d] to-[#42a5f5] flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-white text-white text-3xl font-black font-['Plus_Jakarta_Sans'] shrink-0 overflow-hidden relative group">
            {user.avatar_url ? (
              <img src={resolveAssetUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>

          <div className="pb-0 flex-1">
            <h1 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] leading-tight">
              {displayName}
            </h1>
            <p className="text-sm text-[#707882] font-medium mt-0.5">{user.email}</p>
          </div>

          {/* Quick actions */}
          <div className="pb-3 flex gap-3">
            <Link
              to="/orders"
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dbeaf5] text-[#0f1d25] rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:border-[#00629d]/30 transition-all"
            >
              <span className="material-symbols-outlined text-[#00629d] text-lg">receipt_long</span>
              Đơn mua
            </Link>
            {shopStatus === 'active' && shopId && (
              <Link
                to={`/shop/${shopId}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-[#004e7c] transition-all"
              >
                <span className="material-symbols-outlined text-lg">store</span>
                Xem cửa hàng
              </Link>
            )}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-12 gap-6">

          {/* ── Left column: User info ── */}
          <div className="col-span-12 lg:col-span-5 space-y-5">

            {/* Personal info card */}
            <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-[#f0f7ff] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00629d]">manage_accounts</span>
                <h2 className="font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Thông tin cá nhân</h2>
              </div>

              <div className="px-7 py-6 space-y-5">
                {/* Full name */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">badge</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Họ và tên</p>
                    <p className="font-bold text-[#0f1d25]">{user.full_name || '—'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">mail</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Email</p>
                    <p className="font-bold text-[#0f1d25] break-all">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">verified_user</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Vai trò</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : user.shop
                        ? 'bg-[#e9f5ff] text-[#00629d]'
                        : 'bg-[#f5faff] text-[#707882]'
                      }`}>
                      <span className="material-symbols-outlined text-[12px]">
                        {user.role === 'admin' ? 'admin_panel_settings' : user.shop ? 'store' : 'person'}
                      </span>
                      {user.role === 'admin' ? 'Quản trị viên' : user.shop ? 'Người bán' : 'Người mua'}
                    </span>
                  </div>
                </div>

                {/* Member ID */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">tag</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Mã thành viên</p>
                    <p className="font-mono text-sm font-bold text-[#404751]">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-[#f0f7ff] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00629d]">grid_view</span>
                <h2 className="font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Truy cập nhanh</h2>
              </div>
              <div className="p-4 space-y-1">
                {[
                  { to: '/orders', icon: 'receipt_long', label: 'Đơn mua của tôi', sub: 'Xem tất cả đơn đặt hàng' },
                  { to: '/addresses', icon: 'location_on', label: 'Địa chỉ nhận hàng', sub: 'Quản lý nơi nhận đơn và giao hàng mặc định' },
                  { to: '/wallet', icon: 'account_balance_wallet', label: 'Ví của tôi', sub: 'Nạp tiền, rút tiền và lịch sử giao dịch' },
                  { to: '/cart', icon: 'shopping_bag', label: 'Giỏ hàng', sub: 'Sản phẩm đang chờ thanh toán' },
                  { to: '/messages', icon: 'chat', label: 'Tin nhắn', sub: 'Hộp thư với người bán' },
                ].map(({ to, icon, label, sub }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#f5faff] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f5faff] group-hover:bg-[#e9f5ff] flex items-center justify-center text-[#00629d] transition-colors">
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0f1d25]">{label}</p>
                      <p className="text-xs text-[#707882]">{sub}</p>
                    </div>
                    <span className="material-symbols-outlined text-[#bfc7d3] text-sm group-hover:text-[#00629d] transition-colors">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column: Shop info ── */}
          <div className="col-span-12 lg:col-span-7 space-y-5">

            {/* Shop section */}
            {loadingShop ? (
              <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm p-12 flex items-center justify-center gap-3 text-[#707882]">
                <span className="material-symbols-outlined animate-spin text-[#00629d]">progress_activity</span>
                <span className="font-medium text-sm">Đang tải thông tin cửa hàng...</span>
              </div>
            ) : shopStatus ? (
              /* ── Has Shop ── */
              <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
                {/* Shop header */}
                <div className="bg-gradient-to-r from-[#00629d] to-[#42a5f5] px-7 py-6 relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                  <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg overflow-hidden border border-white/40">
                      {shopLogo ? (
                        <img src={resolveAssetUrl(shopLogo)} alt="Shop Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-white text-3xl">storefront</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Cửa hàng của tôi</p>
                      <h2 className="text-xl font-black text-white font-['Plus_Jakarta_Sans']">
                        {shopName || 'Chưa có tên'}
                      </h2>
                    </div>
                    {statusCfg && (
                      <span
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
                        style={{ background: statusCfg.bg, color: statusCfg.color }}
                      >
                        <span className="material-symbols-outlined text-[14px]">{statusCfg.icon}</span>
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Shop body */}
                <div className="px-7 py-6 space-y-5">
                  {/* Description */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#00629d] text-lg">description</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Mô tả cửa hàng</p>
                      <p className="text-sm text-[#404751] leading-relaxed">
                        {shopDescription || 'Chưa có mô tả.'}
                      </p>
                    </div>
                  </div>

                  {/* Shop ID & Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {shopId && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#00629d] text-lg">tag</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Mã cửa hàng</p>
                          <p className="font-mono text-sm font-bold text-[#404751]">{shopId}</p>
                        </div>
                      </div>
                    )}
                    {shopStatus === 'active' && shopDetail?._count && (
                      <button
                        onClick={() => {
                          setTargetShopId(shopDetail.id);
                          setShowFollowersModal(true);
                        }}
                        className="flex items-start gap-3 hover:opacity-80 transition-opacity text-left"
                        title="Xem danh sách người theo dõi"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#e9f5ff] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[#00629d] text-lg">group</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#bfc7d3] mb-0.5">Người theo dõi</p>
                          <p className="text-sm font-bold text-[#00629d] underline underline-offset-2">{shopDetail._count.followers} người • {shopDetail._count.products} Sản phẩm</p>
                        </div>
                      </button>
                    )}

                  </div>

                  {/* Status info block */}
                  {shopStatus === 'pending' && (
                    <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <span className="material-symbols-outlined text-amber-500 text-2xl mt-0.5">info</span>
                      <div>
                        <p className="font-bold text-amber-800 text-sm">Đang chờ phê duyệt</p>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          Hồ sơ cửa hàng của bạn đang được Ban quản trị xem xét. Sau khi được phê duyệt, bạn có thể bắt đầu đăng bán sản phẩm.
                        </p>
                      </div>
                    </div>
                  )}

                  {shopStatus === 'suspended' && (
                    <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                      <span className="material-symbols-outlined text-red-500 text-2xl mt-0.5">warning</span>
                      <div>
                        <p className="font-bold text-red-800 text-sm">Cửa hàng đã bị tạm dừng</p>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                          Vui lòng liên hệ với Ban quản trị để biết thêm chi tiết và khôi phục hoạt động.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {shopStatus === 'active' && (
                      <>
                        <Link
                          to="/seller/center"
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-[#004e7c] transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">dashboard</span>
                          Quản lý cửa hàng
                        </Link>
                        {shopId && (
                          <Link
                            to={`/shop/${shopId}`}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dbeaf5] text-[#00629d] rounded-full text-sm font-bold hover:border-[#00629d]/40 hover:bg-[#f5faff] transition-all"
                          >
                            <span className="material-symbols-outlined text-lg">open_in_new</span>
                            Xem trang shop
                          </Link>
                        )}
                        <Link
                          to="/seller/products"
                          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dbeaf5] text-[#0f1d25] rounded-full text-sm font-bold hover:border-[#00629d]/40 hover:bg-[#f5faff] transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">inventory_2</span>
                          Sản phẩm
                        </Link>
                        <Link
                          to="/seller/orders"
                          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#dbeaf5] text-[#0f1d25] rounded-full text-sm font-bold hover:border-[#00629d]/40 hover:bg-[#f5faff] transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">local_shipping</span>
                          Đơn bán
                        </Link>
                      </>
                    )}
                    {shopStatus === 'pending' && (
                      <Link
                        to="/seller/register"
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-sm font-bold hover:bg-amber-200 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">hourglass_empty</span>
                        Xem trạng thái duyệt
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── No Shop ── */
              <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
                <div className="px-7 py-6 border-b border-[#f0f7ff] flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00629d]">store</span>
                  <h2 className="font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Cửa hàng của tôi</h2>
                </div>
                <div className="px-7 py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-[#f5faff] rounded-3xl flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-4xl text-[#bfc7d3]">store</span>
                  </div>
                  <h3 className="text-lg font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-2">
                    Bạn chưa có cửa hàng
                  </h3>
                  <p className="text-sm text-[#707882] leading-relaxed max-w-xs mb-8">
                    Mở cửa hàng ngay hôm nay để bắt đầu bán hàng và tiếp cận hàng triệu khách hàng trên Serene.
                  </p>
                  <Link
                    to="/seller/register"
                    className="flex items-center gap-2 px-7 py-3.5 bg-[#00629d] text-white rounded-full font-black text-sm shadow-lg shadow-blue-500/20 hover:bg-[#004e7c] hover:scale-105 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined">add_business</span>
                    Đăng ký mở cửa hàng
                  </Link>
                </div>
              </div>
            )}

            {/* Seller center shortcuts (only shown for active shops) */}
            {shopStatus === 'active' && (
              <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-[#f0f7ff] flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00629d]">rocket_launch</span>
                  <h2 className="font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Công cụ người bán</h2>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {[
                    { to: '/seller/add-product', icon: 'add_box', label: 'Đăng sản phẩm mới', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { to: '/seller/orders', icon: 'local_shipping', label: 'Quản lý đơn hàng', color: 'text-[#00629d]', bg: 'bg-[#e9f5ff]' },
                    { to: '/seller/products', icon: 'inventory_2', label: 'Kho hàng', color: 'text-violet-600', bg: 'bg-violet-50' },
                    { to: '/seller/chat', icon: 'chat', label: 'Tin nhắn khách', color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map(({ to, icon, label, color, bg }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-[#f0f7ff] hover:border-[#dbeaf5] hover:shadow-sm transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>
                        <span className="material-symbols-outlined text-lg">{icon}</span>
                      </div>
                      <p className="text-sm font-bold text-[#0f1d25] leading-tight">{label}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Followed Shops Section */}
            <div className="bg-white rounded-[2rem] border border-[#e9f5ff] shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-[#f0f7ff] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00629d]">favorite</span>
                <h2 className="font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Đang theo dõi</h2>
                <span className="bg-[#e9f5ff] text-[#00629d] px-2 py-0.5 rounded-full text-xs font-bold">{followedShops.filter(s => s.is_following).length}</span>
              </div>
              <div className="p-0">
                {loadingFollows ? (
                  <div className="p-8 flex justify-center"><span className="material-symbols-outlined animate-spin text-[#00629d]">progress_activity</span></div>
                ) : followedShops.length === 0 ? (
                  <div className="p-8 text-center text-[#707882] text-sm">Bạn chưa theo dõi cửa hàng nào.</div>
                ) : (
                  <div className="divide-y divide-[#f0f7ff]">
                    {followedShops.map(shop => (
                      <div key={shop.id} className="p-4 px-7 flex items-center justify-between hover:bg-[#fcfdfe] transition-colors">
                        <Link to={`/shop/${shop.id}`} className="flex items-center gap-4 group">
                          <div className="w-12 h-12 rounded-xl border border-[#e9f5ff] overflow-hidden shrink-0">
                            {shop.logo_url ? <img src={resolveAssetUrl(shop.logo_url)} alt={shop.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined w-full h-full flex items-center justify-center bg-[#f5faff] text-[#bfc7d3]">storefront</span>}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0f1d25] group-hover:text-[#00629d] transition-colors">{shop.name}</h3>
                            <p className="text-xs text-[#707882] mt-0.5">{shop.follower_count} người theo dõi • {shop._count?.products || 0} sản phẩm</p>
                          </div>
                        </Link>
                        {shop.is_following !== false ? (
                          <button onClick={() => toggleFollowShop(shop.id, true)} className="px-4 py-1.5 border border-[#dbeaf5] text-[#707882] rounded-full text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
                            Bỏ theo dõi
                          </button>
                        ) : (
                          <button onClick={() => toggleFollowShop(shop.id, false)} className="px-4 py-1.5 bg-[#00629d] text-white rounded-full text-xs font-bold hover:bg-[#004e7c] transition-colors shadow-sm">
                            Theo dõi
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {targetShopId && (
        <FollowersModal
          shopId={targetShopId}
          isOpen={showFollowersModal}
          onClose={() => {
            setShowFollowersModal(false);
            setTargetShopId(null);
          }}
        />
      )}
    </MarketplaceLayout>
  );
};

export default ProfilePage;
