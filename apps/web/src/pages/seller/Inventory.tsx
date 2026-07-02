import { FC, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useProducts } from '../../hooks/useProducts';
import { resolveAssetUrl } from '../../config/api';

type StockLevel = 'all' | 'in_stock' | 'low' | 'out';

export const InventoryPage: FC = () => {
  const { products, loading, fetchShopProducts } = useProducts();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StockLevel>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchShopProducts();
  }, [fetchShopProducts]);

  // Flatten variants with parent product info
  const inventoryRows = useMemo(() => {
    const rows: any[] = [];
    const list = Array.isArray(products) ? products : [];
    list.forEach((p: any) => {
      const variants = Array.isArray(p.variants) ? p.variants : [];
      if (variants.length === 0) {
        // Product without variants — show product row with 0 stock
        rows.push({
          productId: p.id,
          productName: p.name,
          sku: '-',
          variantLabel: p.category?.name || 'Chưa phân loại',
          stock: 0,
          price: Number(p.base_price) || 0,
          thumbnail: resolveAssetUrl(p.thumbnail_url),
          status: p.status,
        });
      } else {
        variants.forEach((v: any) => {
          const attrs = v.attributes;
          let label = 'Mặc định';
          if (attrs && typeof attrs === 'object') {
            label = Object.values(attrs).join(' / ');
          }
          rows.push({
            productId: p.id,
            variantId: v.id,
            productName: p.name,
            variantLabel: p.category?.name || 'Chưa phân loại',
            stock: v.stock_quantity ?? 0,
            price: Number(v.price_override) || Number(p.base_price) || 0,
            thumbnail: resolveAssetUrl(p.thumbnail_url),
            status: p.status,
          });
        });
      }
    });
    return rows;
  }, [products]);

  // Filter logic
  const filteredRows = useMemo(() => {
    let rows = inventoryRows;
    if (filter === 'in_stock') rows = rows.filter(r => r.stock > 5);
    else if (filter === 'low') rows = rows.filter(r => r.stock > 0 && r.stock <= 5);
    else if (filter === 'out') rows = rows.filter(r => r.stock === 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.productName.toLowerCase().includes(q));
    }
    return rows;
  }, [inventoryRows, filter, search]);

  // Summary stats
  const summary = useMemo(() => {
    const total = inventoryRows.length;
    const inStock = inventoryRows.filter(r => r.stock > 5).length;
    const low = inventoryRows.filter(r => r.stock > 0 && r.stock <= 5).length;
    const out = inventoryRows.filter(r => r.stock === 0).length;
    const totalUnits = inventoryRows.reduce((acc, r) => acc + r.stock, 0);
    const totalValue = inventoryRows.reduce((acc, r) => acc + (r.stock * r.price), 0);
    return { total, inStock, low, out, totalUnits, totalValue };
  }, [inventoryRows]);

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Hết hàng</span>;
    if (stock <= 5) return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Sắp hết</span>;
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Còn hàng</span>;
  };

  const filterButtons: { label: string; value: StockLevel; icon: string; count: number }[] = [
    { label: 'Tất cả', value: 'all', icon: 'inventory_2', count: summary.total },
    { label: 'Còn hàng', value: 'in_stock', icon: 'check_circle', count: summary.inStock },
    { label: 'Sắp hết', value: 'low', icon: 'warning', count: summary.low },
    { label: 'Hết hàng', value: 'out', icon: 'error', count: summary.out },
  ];

  return (
    <SellerLayout pageTitle="Kho hàng">
      <div className="pb-12 max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Quản Lý Kho Hàng</h2>
          <p className="text-[#404751] mt-1 text-sm">Theo dõi tồn kho theo từng phân loại sản phẩm</p>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="text-center p-8 text-[#00629d] font-bold animate-pulse">Đang nạp dữ liệu kho...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { title: 'Tổng sản phẩm', value: summary.total, icon: 'grid_view', color: 'from-blue-500 to-cyan-400' },
                { title: 'Tổng tồn kho', value: new Intl.NumberFormat('vi-VN').format(summary.totalUnits) + ' sp', icon: 'warehouse', color: 'from-purple-500 to-pink-400' },
                { title: 'Giá trị kho', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.totalValue), icon: 'payments', color: 'from-emerald-400 to-teal-500' },
                { title: 'Cần nhập thêm', value: summary.low + summary.out, icon: 'production_quantity_limits', color: 'from-amber-400 to-orange-500' },
              ].map((card, idx) => (
                <div key={idx} className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 p-5 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-1 transition-transform duration-300">
                  <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md mb-3`}>
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                  <p className="text-[#707882] font-medium text-xs">{card.title}</p>
                  <h3 className="text-xl font-extrabold text-[#0f1d25] mt-1 font-['Plus_Jakarta_Sans']">{card.value}</h3>
                </div>
              ))}
            </div>

            {/* Filters + Search */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-2">
                {filterButtons.map(fb => (
                  <button
                    key={fb.value}
                    onClick={() => setFilter(fb.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${filter === fb.value
                      ? 'bg-[#00629d] text-white shadow-lg shadow-blue-200'
                      : 'bg-white/70 text-[#404751] hover:bg-white border border-[#bfc7d3]/20'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{fb.icon}</span>
                    {fb.label}
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${filter === fb.value ? 'bg-white/20' : 'bg-[#f0f4f8]'
                      }`}>{fb.count}</span>
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#707882] text-xl">search</span>
                <input
                  type="text"
                  placeholder="Tìm tên sản phẩm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#bfc7d3]/30 bg-white/70 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00629d]/30 focus:border-[#00629d] transition-all"
                />
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f8fc] border-b border-[#e1e7ef]">
                      <th className="text-left px-6 py-4 font-bold text-[#404751]">Sản phẩm</th>
                      <th className="text-left px-4 py-4 font-bold text-[#404751]">Ngành hàng</th>

                      <th className="text-center px-4 py-4 font-bold text-[#404751]">Tồn kho</th>
                      <th className="text-right px-4 py-4 font-bold text-[#404751]">Đơn giá</th>
                      <th className="text-center px-4 py-4 font-bold text-[#404751]">Trạng thái</th>
                      <th className="text-center px-6 py-4 font-bold text-[#404751]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-[#707882]">
                          <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">inventory_2</span>
                          <p className="font-bold">Không tìm thấy sản phẩm nào</p>
                          <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => (
                        <tr key={`${row.productId}-${row.variantId || 0}-${idx}`} className="border-b border-[#f0f4f8] hover:bg-[#f5faff] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#f0f4f8] flex-shrink-0">
                                {row.thumbnail ? (
                                  <img src={row.thumbnail} alt={row.productName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-[#bfc7d3] text-2xl flex items-center justify-center h-full">image</span>
                                )}
                              </div>
                              <span className="font-semibold text-[#0f1d25] truncate max-w-[180px]">{row.productName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[#404751]">{row.variantLabel}</td>

                          <td className="px-4 py-4 text-center">
                            <span className={`font-extrabold text-lg ${row.stock === 0 ? 'text-rose-600' : row.stock <= 5 ? 'text-amber-600' : 'text-[#0f1d25]'}`}>
                              {row.stock}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-[#0f1d25]">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.price)}
                          </td>
                          <td className="px-4 py-4 text-center">{getStockBadge(row.stock)}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => navigate(`/seller/edit-product/${row.productId}`)}
                              title="Cập nhật kho"
                              className="p-2 rounded-xl hover:bg-blue-50 text-[#00629d] transition-colors"
                            >
                              <span className="material-symbols-outlined text-xl">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
};
