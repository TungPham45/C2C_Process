import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { PRODUCT_API_URL } from '../../config/api';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';

const PRIMARY = '#1d4ed8';

export const SellerCenterPage: FC = () => {
  const [userName, setUserName] = useState('');
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const { orders, fetchSellerOrders } = useOrders();
  const { products, fetchShopProducts } = useProducts();
  const [unreadSellerMessages, setUnreadSellerMessages] = useState(0);

  const [metrics, setMetrics] = useState({
    activeProducts: 0,
    pendingProducts: 0,
    totalRevenue: '0',
    pendingOrders: 0,
  });

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.email.split('@')[0]);
      } catch {
        setUserName('');
      }
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const headers = { Authorization: `Bearer ${token}` };

        const ctxRes = await fetch(`${PRODUCT_API_URL}/seller/context`, { headers });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          if (ctxData.shop) setShopStatus(ctxData.shop.status);
        }

        const res = await fetch(`${PRODUCT_API_URL}/seller/metrics`, { headers });
        if (res.ok) setMetrics(await res.json());
      } catch (err) {
        console.error('Fetch error', err);
      }
    };

    fetchData();
    fetchSellerOrders();
  }, [fetchSellerOrders]);

  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'bg-[#fff8e5] text-[#ffb952]';
      case 'shipped':
        return 'bg-[#cfe5ff] text-[#00629d]';
      case 'delivered':
        return 'bg-[#e1f9f1] text-[#00a67e]';
      case 'cancelled':
        return 'bg-[#ffdad6] text-[#ba1a1a]';
      default:
        return 'bg-[#f5faff] text-[#707882]';
    }
  };

  const getOrderLabel = (order: any) => {
    if (!Array.isArray(order?.items) || order.items.length === 0) {
      return 'Don hang moi';
    }

    const firstItemName = order.items[0]?.product_name || 'San pham';
    const remainingItems = order.items.length - 1;
    return remainingItems > 0 ? `${firstItemName} +${remainingItems} san pham` : firstItemName;
  };


  useEffect(() => {
    // Dashboard needs quick counts; fetch lightweight lists in background.
    fetchSellerOrders();
    fetchShopProducts();
  }, [fetchSellerOrders, fetchShopProducts]);

  useEffect(() => {
    const token = localStorage.getItem('c2c_token');
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const convs = (await res.json()) as Array<{ unread_count_seller?: number }>;
        const total = Array.isArray(convs)
          ? convs.reduce((sum, c) => sum + Number(c.unread_count_seller || 0), 0)
          : 0;
        setUnreadSellerMessages(total);
      } catch {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 6000);
    return () => clearInterval(interval);
  }, []);

  const orderCounts = useMemo(() => {
    const base = { pending: 0, shipped: 0, delivered: 0, cancelled: 0, other: 0 };
    (orders || []).forEach((o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'pending') base.pending += 1;
      else if (s === 'shipped') base.shipped += 1;
      else if (s === 'delivered') base.delivered += 1;
      else if (s === 'cancelled') base.cancelled += 1;
      else base.other += 1;
    });
    return base;
  }, [orders]);

  const revenueEstimate = useMemo(() => {
    const sum = (orders || []).reduce((acc: number, o: any) => {
      const s = String(o?.status || '').toLowerCase();
      if (s === 'cancelled') return acc;
      const val = Number(o?.subtotal ?? o?.total ?? 0);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
    return sum;
  }, [orders]);

  const lowStock = useMemo(() => {
    const threshold = 5;
    const list = (products || []).map((p: any) => {
      const totalStock = Array.isArray(p?.variants)
        ? p.variants.reduce((acc: number, v: any) => acc + Number(v?.stock_quantity || 0), 0)
        : 0;
      return { ...p, __totalStock: totalStock };
    });
    return list
      .filter((p: any) => Number(p.__totalStock || 0) > 0 && Number(p.__totalStock || 0) <= threshold)
      .sort((a: any, b: any) => Number(a.__totalStock || 0) - Number(b.__totalStock || 0))
      .slice(0, 5);
  }, [products]);

  const pendingApprovalProducts = useMemo(() => {
    const list = (products || [])
      .filter((p: any) => {
        const s = String(p?.status || '').toLowerCase();
        return s === 'draft' || s === 'pending_approval' || s === 'pending';
      })
      .sort((a: any, b: any) => {
        const at = new Date(a?.created_at || a?.createdAt || 0).getTime();
        const bt = new Date(b?.created_at || b?.createdAt || 0).getTime();
        return bt - at;
      });
    return list.slice(0, 5);
  }, [products]);

  return (
    <SellerLayout>
      {/* Page title row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Tổng quan cửa hàng</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Theo dõi sản phẩm, đơn hàng và danh mục nền tảng để tối ưu gian hàng của bạn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Xuất dữ liệu
          </button>
          <Link
            to="/seller/add-product"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-105"
            style={{ backgroundColor: PRIMARY, boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm sản phẩm mới
          </Link>
        </div>
      </div>


          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Đơn mới',
                value: String(orderCounts.pending),
                sub: 'Chờ xác nhận',
                subClass: orderCounts.pending > 0 ? 'text-amber-600' : 'text-slate-500',
              },
              {
                title: 'Tin nhắn chưa đọc',
                value: String(unreadSellerMessages),
                sub: 'Từ người mua',
                subClass: unreadSellerMessages > 0 ? 'text-[#ba1a1a]' : 'text-slate-500',
              },
              {
                title: 'Sắp hết hàng',
                value: String(lowStock.length),
                sub: 'Cần nhập thêm',
                subClass: lowStock.length > 0 ? 'text-[#ba1a1a]' : 'text-slate-500',
              },
              {
                title: 'Chờ duyệt',
                value: String(metrics.pendingProducts),
                sub: 'Sản phẩm chờ admin',
                subClass: 'text-slate-500',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm"
                style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)', borderBottom: `3px solid ${PRIMARY}` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.title}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{card.value}</p>
                <p className={`mt-1 text-xs font-medium ${card.subClass}`}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                title: 'Quản lý đơn hàng',
                desc: 'Xử lý đơn mới, cập nhật trạng thái',
                icon: 'shopping_cart',
                to: '/seller/orders',
              },
              {
                title: 'Quản lý sản phẩm',
                desc: 'Sửa sản phẩm, theo dõi tồn kho',
                icon: 'category',
                to: '/seller/products',
              },
              {
                title: 'Trả lời tin nhắn',
                desc: 'Phản hồi người mua nhanh hơn',
                icon: 'chat',
                to: '/seller/chat',
              },
            ].map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{a.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{a.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 transition group-hover:text-slate-500">chevron_right</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Orders & stock panels */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Đơn hàng cần xử lý</h2>
                <Link to="/seller/orders" className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Xem tất cả
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { key: 'pending', label: 'Chờ xác nhận', value: orderCounts.pending, tone: 'bg-amber-50 text-amber-800 border-amber-200' },
                  { key: 'shipped', label: 'Đang giao', value: orderCounts.shipped, tone: 'bg-blue-50 text-blue-800 border-blue-200' },
                  { key: 'delivered', label: 'Đã giao', value: orderCounts.delivered, tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { key: 'cancelled', label: 'Đã hủy', value: orderCounts.cancelled, tone: 'bg-rose-50 text-rose-800 border-rose-200' },
                ].map((s) => (
                  <div key={s.key} className={`rounded-xl border p-4 ${s.tone}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Doanh thu tạm tính:{' '}
                <span className="font-semibold">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueEstimate || 0)}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">(không gồm đơn hủy)</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Sản phẩm sắp hết hàng</h2>
                <Link to="/seller/products" className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Quản lý kho
                </Link>
              </div>
              {lowStock.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Chưa có sản phẩm nào sắp hết hàng.</p>
              ) : (
                <div className="space-y-3">
                  {lowStock.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">Tồn kho: {p.__totalStock}</p>
                      </div>
                      <Link
                        to={`/seller/edit-product/${p.id}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Cập nhật
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      <p className="mt-8 text-center text-xs text-slate-400">
        Xin chào, <span className="font-semibold text-slate-600">{userName}</span> — chúc bạn một ngày bán hàng hiệu quả.
      </p>

    </SellerLayout>
  );
};

