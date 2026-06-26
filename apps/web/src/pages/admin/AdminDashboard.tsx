import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';


interface AdminDashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  suspendedUsers?: number;
  totalShops?: number;
  activeShops?: number;
  pendingApplications?: number;
  totalProducts?: number;
  activeProducts?: number;
  pendingProducts?: number;
  totalCategories?: number;
  activeCategories?: number;
  rootCategories?: number;
  maxAttributes?: number;
  totalOrders?: number;
  pendingOrders?: number;
  confirmedOrders?: number;
  shippedOrders?: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  todayOrders?: number;
  totalRevenue?: number;
  totalBanners?: number;
  activeBanners?: number;
  inactiveBanners?: number;
  totalVouchers?: number;
  activeVouchers?: number;
  scheduledVouchers?: number;
  expiredVouchers?: number;
  platformVouchers?: number;
  shopVouchers?: number;
  totalClaims?: number;
  usedClaims?: number;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const formatNumber = (value?: number) => numberFormatter.format(value ?? 0);
const formatCurrency = (value?: number) => currencyFormatter.format(value ?? 0);

const getPercent = (value = 0, total = 0) => {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
};

const AdminDashboard: FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/dashboard');
        if (!response.ok) {
          throw new Error('Không thể tải dữ liệu dashboard');
        }

        const data = await response.json();
        if (!cancelled) {
          setStats(data);
        }
      } catch (dashboardError) {
        if (!cancelled) {
          setError(dashboardError instanceof Error ? dashboardError.message : 'Không thể tải dữ liệu dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const overviewCards = useMemo(() => [
    {
      label: 'Người dùng',
      value: formatNumber(stats?.totalUsers),
      detail: `${formatNumber(stats?.activeUsers)} đang hoạt động`,
      icon: 'groups',
      color: 'bg-[#e8f5e9] text-[#1b7f3a]',
      href: '/admin/users',
    },
    {
      label: 'Gian hàng',
      value: formatNumber(stats?.totalShops),
      detail: `${formatNumber(stats?.activeShops)} shop hoạt động`,
      icon: 'storefront',
      color: 'bg-[#e9f5ff] text-[#00629d]',
      href: '/admin/shops',
    },
    {
      label: 'Đơn hàng',
      value: formatNumber(stats?.totalOrders),
      detail: `${formatNumber(stats?.todayOrders)} đơn hôm nay`,
      icon: 'receipt_long',
      color: 'bg-[#fff4e0] text-[#9a5a00]',
      href: '/admin/analytics/shop-sales',
    },
    {
      label: 'Doanh thu ghi nhận',
      value: formatCurrency(stats?.totalRevenue),
      detail: 'Không tính đơn đã hủy',
      icon: 'payments',
      color: 'bg-[#f1e9ff] text-[#6c35b7]',
      href: '/admin/analytics/shop-sales',
    },
  ], [stats]);

  const managementCards = useMemo(() => [
    {
      title: 'Danh mục',
      total: stats?.totalCategories ?? 0,
      active: stats?.activeCategories ?? 0,
      meta: `${formatNumber(stats?.rootCategories)} danh mục gốc`,
      icon: 'category',
      href: '/admin/categories',
      color: '#00629d',
    },
    {
      title: 'Banner',
      total: stats?.totalBanners ?? 0,
      active: stats?.activeBanners ?? 0,
      meta: `${formatNumber(stats?.inactiveBanners)} đang tắt`,
      icon: 'view_carousel',
      href: '/admin/banners',
      color: '#1b7f3a',
    },
    {
      title: 'Voucher',
      total: stats?.totalVouchers ?? 0,
      active: stats?.activeVouchers ?? 0,
      meta: `${formatNumber(stats?.usedClaims)} lượt dùng`,
      icon: 'confirmation_number',
      href: '/admin/vouchers',
      color: '#9a5a00',
    },
  ], [stats]);

  const queueItems = [
    {
      label: 'Shop chờ duyệt',
      value: stats?.pendingApplications ?? 0,
      href: '/admin/applications',
      icon: 'how_to_reg',
      tone: 'text-[#9a5a00] bg-[#fff4e0]',
    },
    {
      label: 'Sản phẩm chờ duyệt',
      value: stats?.pendingProducts ?? 0,
      href: '/admin/products',
      icon: 'inventory_2',
      tone: 'text-[#ba1a1a] bg-[#fff0ef]',
    },
    {
      label: 'Đơn hàng chờ xử lý',
      value: stats?.pendingOrders ?? 0,
      href: '/admin/analytics/shop-sales',
      icon: 'pending_actions',
      tone: 'text-[#00629d] bg-[#e9f5ff]',
    },
  ];

  const orderStatusItems = [
    { label: 'Pending', value: stats?.pendingOrders ?? 0, color: 'bg-[#9a5a00]' },
    { label: 'Confirmed', value: stats?.confirmedOrders ?? 0, color: 'bg-[#00629d]' },
    { label: 'Shipped', value: stats?.shippedOrders ?? 0, color: 'bg-[#6c35b7]' },
    { label: 'Delivered', value: stats?.deliveredOrders ?? 0, color: 'bg-[#1b7f3a]' },
    { label: 'Cancelled', value: stats?.cancelledOrders ?? 0, color: 'bg-[#ba1a1a]' },
  ];

  return (
    <AdminLayout pageTitle="Tổng quan quản trị" pageSubtitle="Theo dõi dữ liệu vận hành chính của toàn nền tảng">
      {error && (
        <div className="mb-6 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm text-[#ba1a1a]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-[24px] border border-[#e1f0fb] bg-white" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <Link
                key={card.label}
                to={card.href}
                className="rounded-[24px] border border-[#e1f0fb] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#707882]">{card.label}</p>
                    <h3 className="mt-3 text-2xl font-black text-[#0f1d25]">{card.value}</h3>
                    <p className="mt-2 text-xs font-medium text-[#707882]">{card.detail}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.color}`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          <section className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-[28px] border border-[#e1f0fb] bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#0f1d25]">Vận hành nội dung</h3>
                  <p className="mt-1 text-xs text-[#707882]">Danh mục, banner và voucher đang hiển thị</p>
                </div>
                <span className="material-symbols-outlined text-[#00629d]">dashboard_customize</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {managementCards.map((card) => {
                  const percent = getPercent(card.active, card.total);

                  return (
                    <Link
                      key={card.title}
                      to={card.href}
                      className="rounded-2xl border border-[#edf5fb] bg-[#fbfdff] p-4 transition hover:border-[#00629d]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                          <span className="material-symbols-outlined" style={{ color: card.color }}>{card.icon}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#707882]">
                          {percent}% active
                        </span>
                      </div>
                      <h4 className="mt-4 text-sm font-bold text-[#0f1d25]">{card.title}</h4>
                      <p className="mt-1 text-2xl font-black text-[#0f1d25]">
                        {formatNumber(card.active)}
                        <span className="text-sm font-bold text-[#707882]"> / {formatNumber(card.total)}</span>
                      </p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf5fb]">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: card.color }} />
                      </div>
                      <p className="mt-3 text-xs text-[#707882]">{card.meta}</p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e1f0fb] bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#0f1d25]">Hàng chờ admin</h3>
                <p className="mt-1 text-xs text-[#707882]">Các mục cần xử lý thủ công</p>
              </div>

              <div className="space-y-3">
                {queueItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center justify-between rounded-2xl border border-[#edf5fb] px-4 py-3 transition hover:bg-[#f8fbff]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <span className="text-sm font-bold text-[#0f1d25]">{item.label}</span>
                    </div>
                    <span className="text-lg font-black text-[#0f1d25]">{formatNumber(item.value)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] border border-[#e1f0fb] bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#0f1d25]">Trạng thái đơn hàng</h3>
                  <p className="mt-1 text-xs text-[#707882]">Phân bổ theo trạng thái xử lý</p>
                </div>
                <Link to="/admin/analytics/shop-sales" className="text-xs font-bold text-[#00629d] hover:underline">
                  Xem báo cáo
                </Link>
              </div>

              <div className="space-y-4">
                {orderStatusItems.map((item) => {
                  const percent = getPercent(item.value, stats?.totalOrders ?? 0);

                  return (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0f1d25]">{item.label}</span>
                        <span className="font-semibold text-[#707882]">{formatNumber(item.value)} đơn</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#edf5fb]">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#e1f0fb] bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#0f1d25]">Sản phẩm & khuyến mãi</h3>
                <p className="mt-1 text-xs text-[#707882]">Tổng quan hàng hóa và voucher</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f8fbff] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#707882]">Sản phẩm active</p>
                  <p className="mt-3 text-2xl font-black text-[#0f1d25]">{formatNumber(stats?.activeProducts)}</p>
                  <p className="mt-2 text-xs text-[#707882]">Tổng {formatNumber(stats?.totalProducts)} sản phẩm</p>
                </div>
                <div className="rounded-2xl bg-[#fffaf0] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#707882]">Voucher active</p>
                  <p className="mt-3 text-2xl font-black text-[#0f1d25]">{formatNumber(stats?.activeVouchers)}</p>
                  <p className="mt-2 text-xs text-[#707882]">{formatNumber(stats?.scheduledVouchers)} sắp chạy</p>
                </div>
                <div className="rounded-2xl bg-[#f1e9ff] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#707882]">Voucher shop</p>
                  <p className="mt-3 text-2xl font-black text-[#0f1d25]">{formatNumber(stats?.shopVouchers)}</p>
                  <p className="mt-2 text-xs text-[#707882]">{formatNumber(stats?.platformVouchers)} voucher sàn</p>
                </div>
                <div className="rounded-2xl bg-[#e8f5e9] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#707882]">Thuộc tính tối đa</p>
                  <p className="mt-3 text-2xl font-black text-[#0f1d25]">{formatNumber(stats?.maxAttributes ?? 8)}</p>
                  <p className="mt-2 text-xs text-[#707882]">Trên một danh mục</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
