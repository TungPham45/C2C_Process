import { FC, ReactNode } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const AdminLayout: FC<AdminLayoutProps> = ({ children, pageTitle = 'Serene Admin', pageSubtitle }) => {
  const location = useLocation();

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive
      ? 'bg-white text-[#00629d] shadow-[0_4px_20px_rgba(0,98,157,0.1)] font-semibold'
      : 'text-[#707882] hover:bg-[#e9f5ff] hover:text-[#00629d]'
    }`;

  const isAdminProductsActive = location.pathname.startsWith('/admin/products');
  const displayTitle = pageTitle === 'Serene Admin' ? 'Quản Trị Serene' : pageTitle;
  const headerSubtitle = pageSubtitle ?? getAdminPageSubtitle(location.pathname);

  return (
    <div className="bg-[#f5faff] text-[#0f1d25] min-h-screen font-['Inter'] selection:bg-[#cfe5ff]">
      {/* Sidebar */}
      <aside className="w-72 h-screen fixed left-0 top-0 bg-[#f5faff] border-r border-[#e1f0fb] flex flex-col p-6 z-50">
        <div className="mb-10 px-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">shield_person</span>
            </div>
            <h1 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">
              {displayTitle}
            </h1>
          </div>
          <p className="text-[10px] text-[#707882] font-bold uppercase tracking-[0.2em] ml-10">Trung tâm điều khiển</p>
        </div>

        <nav className="flex-1 space-y-2 text-sm overflow-y-auto pr-2 pb-4 
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-[#00629d]/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#00629d]/40">
          <NavLink to="/admin" end className={getNavLinkClass}>
            <span className="material-symbols-outlined">dashboard</span> Tổng quan
          </NavLink>

          <NavLink to="/admin/applications" className={getNavLinkClass}>
            <span className="material-symbols-outlined">how_to_reg</span> Đăng ký mở shop
          </NavLink>

          <NavLink to="/admin/shops" className={getNavLinkClass}>
            <span className="material-symbols-outlined">storefront</span> Quản lý Shop
          </NavLink>

          <NavLink to="/admin/categories" className={getNavLinkClass}>
            <span className="material-symbols-outlined">category</span> Quản lý Danh mục
          </NavLink>

          <NavLink to="/admin/locations" className={getNavLinkClass}>
            <span className="material-symbols-outlined">location_city</span> Quản lý Địa giới
          </NavLink>

          <NavLink to="/admin/banners" className={getNavLinkClass}>
            <span className="material-symbols-outlined">view_carousel</span> Quản lý Banner
          </NavLink>

          <NavLink to="/admin/vouchers" className={getNavLinkClass}>
            <span className="material-symbols-outlined">confirmation_number</span> Quản lý Voucher
          </NavLink>

          <NavLink
            to="/admin/products"
            className={() => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isAdminProductsActive
              ? 'bg-white text-[#00629d] shadow-[0_4px_20px_rgba(0,98,157,0.1)] font-semibold'
              : 'text-[#707882] hover:bg-[#e9f5ff] hover:text-[#00629d]'
              }`}
          >
            <span className="material-symbols-outlined">inventory_2</span> Kiểm duyệt sản phẩm
          </NavLink>


          <NavLink to="/admin/reports" className={getNavLinkClass}>
            <span className="material-symbols-outlined">flag</span> Quản lý Tố Cáo
          </NavLink>

          <NavLink to="/admin/returns" className={getNavLinkClass}>
            <span className="material-symbols-outlined">assignment_return</span> Quản lý Đổi trả
          </NavLink>

          <NavLink to="/admin/wallets" className={getNavLinkClass}>
            <span className="material-symbols-outlined">account_balance_wallet</span> Ví & Giao dịch
          </NavLink>

          <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-[#707882] uppercase tracking-widest opacity-50">Hệ thống</div>

          <NavLink to="/admin/users" className={getNavLinkClass}>
            <span className="material-symbols-outlined">switch_account</span> Quản lý Người Dùng
          </NavLink>

          <NavLink to="/admin/analytics/users" className={getNavLinkClass}>
            <span className="material-symbols-outlined">insights</span> Phân tích tăng trưởng
          </NavLink>

          <NavLink to="/admin/analytics/shop-sales" className={getNavLinkClass}>
            <span className="material-symbols-outlined">query_stats</span> Báo cáo hiệu suất
          </NavLink>

          <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#707882] opacity-50 cursor-not-allowed">
            <span className="material-symbols-outlined">settings</span> Cài đặt hệ thống
          </a>
        </nav>

        <div className="mt-auto bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#cfe5ff] flex items-center justify-center text-[#00629d] font-bold">
              AD
            </div>
            <div>
              <p className="text-xs font-bold text-[#0f1d25]">Quản trị viên</p>
              <p className="text-[10px] text-[#707882]">Quyền tối cao</p>
            </div>
          </div>
          <Link to="/" className="w-full py-2 mb-2 text-xs font-semibold text-[#00629d] bg-[#e9f5ff] hover:bg-[#d0e9ff] rounded-lg transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">home</span> Về Trang Chủ
          </Link>
          <button className="w-full py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">logout</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed top-0 right-0 w-[calc(100%-18rem)] h-20 bg-[#f5faff]/80 backdrop-blur-xl z-40 flex items-center justify-between px-10">
        <div>
          <h2 className="text-sm font-bold text-[#0f1d25]">{displayTitle}</h2>
          <p className="text-[10px] text-[#707882]">{headerSubtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-[#e1f0fb]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-[#0f1d25]">Đang Hoạt Động</span>
          </div>

          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#707882] shadow-sm hover:text-[#00629d] transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-72 pt-28 pb-20 px-10">
        {children}
      </main>
    </div>
  );
};

const getAdminPageSubtitle = (pathname: string) => {
  if (pathname.startsWith('/admin/applications')) return 'Xem xét và duyệt đăng ký mở shop';
  if (pathname.startsWith('/admin/reports')) return 'Xem xét và xử lý báo cáo vi phạm';
  if (pathname.startsWith('/admin/returns')) return 'Quản lý và kiểm duyệt các yêu cầu hoàn/trả hàng';
  if (pathname.startsWith('/admin/wallets')) return 'Giám sát ví người dùng và kiểm duyệt giao dịch';
  if (pathname.startsWith('/admin/shops')) return 'Theo dõi và quản lý trạng thái gian hàng';
  if (pathname.startsWith('/admin/categories')) return 'Quản lý cây danh mục và bộ thuộc tính sản phẩm';
  if (pathname.startsWith('/admin/locations')) return 'Quản lý tỉnh thành và phường xã theo mô hình mới';
  if (pathname.startsWith('/admin/banners')) return 'Quản lý banner hiển thị trên marketplace';
  if (pathname.startsWith('/admin/vouchers')) return 'Quản lý voucher và chương trình khuyến mãi';
  if (pathname.startsWith('/admin/products')) return 'Review and approve submitted products';
  if (pathname.startsWith('/admin/users')) return 'Quản lý tài khoản và quyền truy cập người dùng';
  if (pathname.startsWith('/admin/analytics/users')) return 'Theo dõi tăng trưởng và hành vi người dùng';
  if (pathname.startsWith('/admin/analytics/shop-sales')) return 'Phân tích doanh thu và hiệu suất gian hàng';

  return 'Trung tâm điều khiển hệ thống';
};
