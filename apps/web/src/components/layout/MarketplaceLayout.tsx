import { FC, ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { NotificationBell } from './NotificationBell';
import { SearchBar } from './SearchBar';
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa6";
interface MarketplaceLayoutProps {
  children: ReactNode;
  /** Replaces the default marketplace search field (e.g. “Search in this shop…”). */
  searchSlot?: ReactNode;
  /** Compact Serene header: cart, notifications, profile — hides seller shortcut. */
  storefrontHeader?: boolean;
}

export const MarketplaceLayout: FC<MarketplaceLayoutProps> = ({
  children,
  searchSlot,
  storefrontHeader,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const readUser = () => {
      const userStr = localStorage.getItem('c2c_user');
      if (!userStr) {
        setCurrentUser(null);
        return;
      }

      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        setCurrentUser(null);
      }
    };

    readUser();
    window.addEventListener('storage', readUser);
    window.addEventListener('user-updated', readUser);
    return () => {
      window.removeEventListener('storage', readUser);
      window.removeEventListener('user-updated', readUser);
    };
  }, []);

  const { cartItems, fetchCartItems } = useCart();

  useEffect(() => {
    if (currentUser) {
      fetchCartItems();

      // Fetch unread chat count
      const fetchChatCount = async () => {
        try {
          const res = await fetch('/api/chat/conversations', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('c2c_token')}` }
          });
          if (res.ok) {
            const convs = await res.json();
            const count = convs.reduce((sum: number, c: any) => {
              const isMyShop = c.seller_id === currentUser.id;
              return sum + (isMyShop ? (c.unread_count_seller || 0) : (c.unread_count_buyer || 0));
            }, 0);
            setUnreadChatCount(count);
          }
        } catch (e) {}
      };
      fetchChatCount();
      // Optional: Poll every 15s like NotificationBell
      const interval = setInterval(fetchChatCount, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchCartItems]);

  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    localStorage.removeItem('c2c_token');
    localStorage.removeItem('c2c_user');
    setCurrentUser(null);
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navShell = storefrontHeader
    ? 'max-w-[1280px] mx-auto h-[60px] rounded-full flex items-center justify-between px-6 lg:px-8 bg-white shadow-[0_4px_24px_rgba(43,120,197,0.08)] border border-[#e8f0fb]'
    : `max-w-7xl mx-auto h-16 rounded-3xl flex items-center justify-between px-8 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,98,157,0.06)] border border-white/40' : 'bg-white/40 backdrop-blur-md border border-white/20'}`;

  return (
    <div className={`min-h-screen font-['Inter'] text-[#0f1d25] ${storefrontHeader ? 'bg-[#f0f7ff]' : 'bg-[#f5faff]'}`}>
      {/* Floating Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4 ${storefrontHeader ? 'mt-2' : isScrolled ? 'mt-0' : 'mt-4'}`}>
        <nav className={navShell}>
          {/* Logo */}
          <Link
            to="/"
            className={`flex items-center shrink-0 group ${storefrontHeader ? 'gap-0' : 'gap-3'}`}
          >
            {!storefrontHeader && (
              <div className="w-10 h-10 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">
                <span className="material-symbols-outlined text-white text-2xl font-bold italic">eco</span>
              </div>
            )}
            <span
              className={`text-xl font-black font-['Plus_Jakarta_Sans'] tracking-tight ${storefrontHeader
                  ? 'text-[#2b82c9]'
                  : 'bg-gradient-to-r from-[#00629d] to-[#42a5f5] bg-clip-text text-transparent'
                }`}
            >
              Serene
            </span>
          </Link>

          <div
            className={`hidden md:flex items-center flex-1 justify-center ${storefrontHeader ? 'mx-4 lg:mx-10' : 'max-w-xl mx-12'}`}
          >
            {searchSlot ?? <SearchBar />}
          </div>

          {/* Mobile search icon when storefront uses custom slot */}
          {storefrontHeader && searchSlot && (
            <div className="md:hidden flex-1 flex justify-center px-2 min-w-0">{searchSlot}</div>
          )}

          {/* User Actions */}
          <div className="flex items-center gap-4 lg:gap-5 text-sm font-bold shrink-0">
            {!storefrontHeader && (
              <>
                {currentUser?.role === 'admin' ? (
                  <Link
                    to="/admin"
                    className="hidden lg:flex items-center gap-2 text-[#00629d] hover:opacity-70 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                    Quản Trị Viên
                  </Link>
                ) : (
                  <Link
                    to="/seller/center"
                    className="hidden lg:flex items-center gap-2 text-[#00629d] hover:opacity-70 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-xl">store</span>
                    Kênh Người Bán
                  </Link>
                )}
                <div className="w-px h-6 bg-[#00629d]/10 hidden lg:block" />
              </>
            )}
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser?.role !== 'admin' && (
                <>
                  {currentUser && !storefrontHeader && <NotificationBell />}
                  {!storefrontHeader && (
                    <Link
                      to="/messages"
                      className="relative w-10 h-10 flex items-center justify-center text-[#0f1d25] hover:bg-white/50 rounded-xl transition-colors"
                      title="Tin nhắn"
                    >
                      <span className="material-symbols-outlined">chat</span>
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                          {unreadChatCount > 99 ? '99+' : unreadChatCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    to="/cart"
                    className={`relative w-10 h-10 flex items-center justify-center transition-colors ${storefrontHeader
                        ? 'text-[#1a2b3c] hover:bg-[#EBF4FF] rounded-full'
                        : 'text-[#0f1d25] hover:bg-white/50 rounded-xl'
                      }`}
                  >
                    <span className={`material-symbols-outlined ${storefrontHeader ? 'text-[22px]' : ''}`}>
                      {storefrontHeader ? 'shopping_cart' : 'shopping_bag'}
                    </span>
                    {totalCartItems > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                        {totalCartItems}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {storefrontHeader && currentUser && (
                <NotificationBell />
              )}

              {currentUser ? (
                storefrontHeader ? (
                  <div className="relative group">
                    <button
                      type="button"
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2b82c9] to-[#5aa3e8] flex items-center justify-center text-white text-sm font-black ring-2 ring-white shadow-md"
                      aria-label="Tài khoản"
                    >
                      {(currentUser.full_name || currentUser.email || '?').charAt(0).toUpperCase()}
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#dbeaf5] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                      <div className="py-2">
                        {currentUser.role === 'admin' ? (
                          <>
                            <Link to="/admin" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">admin_panel_settings</span>
                              Bảng quản trị
                            </Link>
                            <Link to="/admin/products" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">inventory_2</span>
                              Duyệt sản phẩm
                            </Link>
                            <Link to="/admin/users" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">group</span>
                              Quản lý người dùng
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/profile"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#EBF4FF] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#2b82c9] text-lg">manage_accounts</span>
                              Hồ sơ của tôi
                            </Link>
                            <Link
                              to="/orders"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#EBF4FF] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#2b82c9] text-lg">receipt_long</span>
                              Đơn mua
                            </Link>
                            <Link
                              to="/addresses"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#EBF4FF] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#2b82c9] text-lg">location_on</span>
                              Địa chỉ nhận hàng
                            </Link>
                            <Link
                              to="/wallet"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#EBF4FF] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#2b82c9] text-lg">account_balance_wallet</span>
                              Ví của tôi
                            </Link>
                            <Link to="/vouchers" className="flex items-center gap-3 px-5 py-3 hover:bg-[#EBF4FF] transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-[#2b82c9] text-lg">confirmation_number</span>
                              Mã giảm giá
                            </Link>
                          </>
                        )}
                        <div className="border-t border-[#e9f5ff] my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-bold text-[#707882] text-left"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <button className="px-6 py-2.5 bg-[#00629d] text-white rounded-full hover:bg-[#004e7c] transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">person</span>
                      {currentUser.role === 'admin'
                        ? 'Quản Trị Viên'
                        : currentUser.full_name || currentUser.email?.split('@')[0]}
                    </button>
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#dbeaf5] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right group-hover:translate-y-0 translate-y-2 z-50 overflow-hidden">
                      <div className="py-2">
                        {currentUser.role === 'admin' ? (
                          <>
                            <Link to="/admin" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">admin_panel_settings</span>
                              Bảng quản trị
                            </Link>
                            <Link to="/admin/products" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">inventory_2</span>
                              Duyệt sản phẩm
                            </Link>
                            <Link to="/admin/users" className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50 transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-purple-600 text-lg">group</span>
                              Quản lý người dùng
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/profile"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#00629d] text-lg">manage_accounts</span>
                              Hồ sơ của tôi
                            </Link>
                            <Link
                              to="/orders"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#00629d] text-lg">receipt_long</span>
                              Đơn mua
                            </Link>
                            <Link
                              to="/addresses"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#00629d] text-lg">location_on</span>
                              Địa chỉ nhận hàng
                            </Link>
                            <Link
                              to="/wallet"
                              className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]"
                            >
                              <span className="material-symbols-outlined text-[#00629d] text-lg">account_balance_wallet</span>
                              Ví của tôi
                            </Link>
                            <Link to="/vouchers" className="flex items-center gap-3 px-5 py-3 hover:bg-[#f5faff] transition-colors text-sm font-bold text-[#0f1d25]">
                              <span className="material-symbols-outlined text-[#00629d] text-lg">confirmation_number</span>
                              Mã giảm giá
                            </Link>
                          </>
                        )}
                        <div className="border-t border-[#e9f5ff] my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-bold text-[#707882] text-left"
                        >
                          <span className="material-symbols-outlined text-lg">logout</span>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : storefrontHeader ? (
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="w-10 h-10 rounded-full bg-[#e8f1fa] border border-[#d0e4f7] flex items-center justify-center text-[#2b82c9] hover:bg-white transition-colors"
                  aria-label="Đăng nhập"
                >
                  <span className="material-symbols-outlined text-[22px]">person</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="px-6 py-2.5 bg-[#0f1d25] text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-200"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-32">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-40 bg-[#0f1d25] rounded-t-[4rem] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-12 py-20">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl font-bold italic">eco</span>
                </div>
                <span className="text-xl font-black font-['Plus_Jakarta_Sans'] tracking-tight">Serene</span>
              </div>
              <p className="text-[#bfc7d3] text-sm leading-relaxed max-w-xs">
                Nền tảng thương mại điện tử C2C cao cấp. Tinh tế và đẳng cấp.
              </p>
              <div className="flex gap-4">
                <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">
                    <FaFacebookF className="text-white text-lg" />
                  </a>
                </button>

                <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                    <FaYoutube className="text-white text-lg" />
                  </a>
                </button>

                <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                    <FaInstagram className="text-white text-lg" />
                  </a>
                </button>

                <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <a href="https://www.twitter.com/" target="_blank" rel="noopener noreferrer">
                    <FaTwitter className="text-white text-lg" />
                  </a>
                </button>

              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 flex flex-wrap gap-20">
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Mua sắm</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/categories" className="hover:text-white transition-colors">Danh mục</Link></li>
                  <li><Link to="/new" className="hover:text-white transition-colors">Mới nhất</Link></li>
                  <li><Link to="/featured" className="hover:text-white transition-colors">Cửa hàng nổi bật</Link></li>
                  <li><Link to="/brands" className="hover:text-white transition-colors">Thương hiệu</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Hỗ trợ</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/help" className="hover:text-white transition-colors">Trung tâm hỗ trợ</Link></li>
                  <li><Link to="/shipping" className="hover:text-white transition-colors">Vận chuyển</Link></li>
                  <li><Link to="/returns" className="hover:text-white transition-colors">Trả hàng & Hoàn tiền</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition-colors">Liên hệ</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h5 className="font-bold text-sm uppercase tracking-[0.2em] text-[#42a5f5]">Người bán</h5>
                <ul className="space-y-4 text-sm text-[#bfc7d3]">
                  <li><Link to="/seller/center" className="hover:text-white transition-colors">Kênh Người Bán</Link></li>
                  <li><Link to="/sell" className="hover:text-white transition-colors">Bắt đầu bán</Link></li>
                  <li><Link to="/guidelines" className="hover:text-white transition-colors">Quy định</Link></li>
                  <li><Link to="/dashboard" className="hover:text-white transition-colors">Quản lý</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/5 flex flex-wrap justify-between items-center gap-6">
            <p className="text-[#707882] text-xs">&copy; 2026 Serene Marketplace. All rights reserved.</p>
            <div className="flex gap-8 text-[#707882] text-xs uppercase tracking-widest font-bold">
              <Link to="/privacy" className="hover:text-white transition-colors">Bảo mật</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Điều khoản</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie</Link>
            </div>
          </div>
        </div>
      </footer >
    </div >
  );
};
