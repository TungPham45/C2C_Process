import { FC, ReactNode, useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

const PRIMARY = '#1d4ed8';

interface SellerLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export const SellerLayout: FC<SellerLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ full_name?: string; email?: string; role?: string } | null>(null);

  useEffect(() => {
    const readUser = () => {
      const raw = localStorage.getItem('c2c_user');
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          setUser(null);
        }
      }
    };
    readUser();

    // Listen for updates from Settings page
    const onStorage = () => readUser();
    window.addEventListener('storage', onStorage);
    window.addEventListener('user-updated', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('user-updated', onStorage);
    };
  }, []);

  const isProductsActive =
    location.pathname.startsWith('/seller/products') ||
    location.pathname.startsWith('/seller/add-product') ||
    location.pathname.startsWith('/seller/edit-product');

  const navBase =
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors';
  const navInactive = 'text-slate-600 hover:bg-white/70 hover:text-slate-900';
  const navActiveStyle = { backgroundColor: PRIMARY } as const;

  const handleLogout = () => {
    localStorage.removeItem('c2c_token');
    localStorage.removeItem('c2c_user');
    navigate('/login');
  };

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Người bán';
  const roleLabel = user?.role === 'admin' ? 'QUẢN TRỊ' : 'NGƯỜI BÁN';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Inter',system-ui,sans-serif]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-200/80 bg-[#eef3f9] px-3 py-6">
        <div className="mb-8 px-3">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Serene Curator</h1>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Kênh người bán
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 text-sm">
          <NavLink
            to="/seller/center"
            end
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Tổng quan
          </NavLink>

          <NavLink
            to="/seller/orders"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Đơn hàng
          </NavLink>

          <NavLink
            to="/seller/products"
            className={() => `${navBase} ${isProductsActive ? '' : navInactive}`}
            style={isProductsActive ? navActiveStyle : undefined}
          >
            <span className="material-symbols-outlined text-[20px]">category</span>
            Sản phẩm
          </NavLink>

          <NavLink
            to="/seller/vouchers"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
            Voucher
          </NavLink>

          <NavLink
            to="/seller/categories"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">category_search</span>
            Danh mục Shop
          </NavLink>

          <NavLink
            to="/seller/analytics"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">monitoring</span>
            Phân tích
          </NavLink>

          <NavLink
            to="/seller/reviews"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">reviews</span>
            Đánh giá
          </NavLink>

          <NavLink
            to="/seller/chat"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            Tin nhắn
          </NavLink>

          <NavLink
            to="/seller/inventory"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">layers</span>
            Kho hàng
          </NavLink>

          <NavLink
            to="/seller/wallet"
            className={({ isActive }) => `${navBase} ${isActive ? '' : navInactive}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            Ví & Giao dịch
          </NavLink>
        </nav>

        <Link
          to="/seller/add-product"
          className="mx-2 mb-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105 active:scale-[0.99]"
          style={{ backgroundColor: PRIMARY, boxShadow: '0 6px 20px rgba(29,78,216,0.35)' }}
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Đăng sản phẩm
        </Link>

        <div className="mt-auto space-y-0.5 border-t border-slate-200/80 pt-4">
          <NavLink
            to="/seller/settings"
            className={({ isActive }) => `${navBase} w-full text-left ${isActive ? '' : 'text-slate-600 hover:bg-white/70'}`}
            style={({ isActive }) => (isActive ? navActiveStyle : undefined)}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Cài đặt
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className={`${navBase} w-full text-left text-slate-600 hover:bg-red-50 hover:text-red-700`}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Top header */}
      <header className="fixed left-[260px] right-0 top-0 z-40 flex h-16 items-center gap-6 border-b border-slate-200/90 bg-white px-6 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4">
          <div className="relative w-full max-w-xl">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              search
            </span>
            <input
              type="search"
              placeholder="Tìm kiếm sản phẩm, đơn hàng..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <NotificationBell />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
            aria-label="Trợ giúp"
          >
            <span className="material-symbols-outlined text-[22px]">help</span>
          </button>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{roleLabel}</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
          <Link
            to="/"
            className="ml-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Về shop
          </Link>
        </div>
      </header>

      <main className="ml-[260px] min-h-screen pt-16">
        <div className="px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
};
