import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useProducts } from '../../hooks/useProducts';
import { formatPriceRange } from '../../utils/currency';

type ProductTabKey = 'all' | 'active' | 'violation' | 'pending_admin' | 'not_listed';
type StockFilterKey = 'all' | 'need_restock';

export const ProductManagementPage: FC = () => {
  const { products, loading, fetchShopProducts, deleteProduct } = useProducts();
  const [activeTab, setActiveTab] = useState<ProductTabKey>('all');
  const [stockFilter, setStockFilter] = useState<StockFilterKey>('all');
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, boolean>>({});

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      await deleteProduct(id);
    }
  };

  useEffect(() => {
    fetchShopProducts(); // Session token takes over context
  }, [fetchShopProducts]);

  const statusGroup = (raw: any) => {
    const s = String(raw ?? '').toLowerCase();
    if (s === 'active') return 'active';
    if (['rejected', 'violated', 'violation', 'banned', 'blocked'].includes(s)) return 'violation';
    if (['pending_approval', 'pending', 'submitted', 'under_review'].includes(s)) return 'pending_admin';
    if (['draft', 'unpublished', 'inactive'].includes(s)) return 'not_listed';
    // Default: treat unknown non-active as pending queue
    return 'pending_admin';
  };

  const tabCounts = useMemo(() => {
    const base = { all: products.length, active: 0, violation: 0, pending_admin: 0, not_listed: 0 };
    for (const p of products as any[]) {
      const g = statusGroup(p?.status) as keyof typeof base;
      if (g in base) base[g] += 1;
    }
    return base;
  }, [products]);

  const getTotalStock = (p: any) =>
    Array.isArray(p?.variants) ? p.variants.reduce((acc: number, v: any) => acc + (Number(v?.stock_quantity) || 0), 0) : 0;

  const LOW_STOCK_THRESHOLD = 5;

  const needRestockCount = useMemo(() => {
    return (products as any[]).filter((p) => getTotalStock(p) <= LOW_STOCK_THRESHOLD).length;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === 'all') return products;
    return (products as any[]).filter((p) => statusGroup(p?.status) === activeTab);
  }, [activeTab, products]);

  const visibleProducts = useMemo(() => {
    if (stockFilter === 'need_restock') {
      return (filteredProducts as any[]).filter((p) => getTotalStock(p) <= LOW_STOCK_THRESHOLD);
    }
    return filteredProducts;
  }, [filteredProducts, stockFilter]);

  const searchedProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return visibleProducts as any[];
    return (visibleProducts as any[]).filter((p) => {
      const name = String(p?.name ?? '').toLowerCase();
      const slug = String(p?.slug ?? '').toLowerCase();
      const id = String(p?.id ?? '').toLowerCase();
      const sku = `prd-${id}`;
      return (
        name.includes(q) ||
        slug.includes(q) ||
        id === q ||
        sku.includes(q) ||
        `#${id}`.includes(q)
      );
    });
  }, [productQuery, visibleProducts]);

  const searchedProductIds = useMemo(
    () => (searchedProducts as any[]).map((p) => String(p?.id)).filter(Boolean),
    [searchedProducts]
  );

  const selectedCountInView = useMemo(() => {
    if (searchedProductIds.length === 0) return 0;
    let c = 0;
    for (const id of searchedProductIds) if (selectedProductIds[id]) c += 1;
    return c;
  }, [searchedProductIds, selectedProductIds]);

  const allSelectedInView = searchedProductIds.length > 0 && selectedCountInView === searchedProductIds.length;
  const someSelectedInView = selectedCountInView > 0 && !allSelectedInView;

  const toggleOne = (id: string, next?: boolean) => {
    setSelectedProductIds((prev) => {
      const cur = !!prev[id];
      const v = next ?? !cur;
      if (v === cur) return prev;
      return { ...prev, [id]: v };
    });
  };

  const toggleAllInView = (next: boolean) => {
    setSelectedProductIds((prev) => {
      if (searchedProductIds.length === 0) return prev;
      const out = { ...prev };
      for (const id of searchedProductIds) out[id] = next;
      return out;
    });
  };

  try {
    return (
      <SellerLayout pageTitle="Serene Seller">
        {/* Page Canvas */}
        <div className="pb-12">
          {/* Header Section */}
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Quản lý sản phẩm</h2>
              <p className="text-[#404751] mt-1 text-sm">Cập nhật và tối ưu hóa danh mục sản phẩm của bạn</p>
            </div>
            <Link to="/seller/add-product" className="flex items-center gap-2 px-6 py-3 bg-[#42a5f5] text-[#00395e] rounded-full font-bold shadow-lg shadow-[#42a5f5]/20 hover:scale-[1.02] transition-transform active:scale-95">
              <span className="material-symbols-outlined">add</span>
              Thêm 1 sản phẩm mới
            </Link>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-8 border-b border-transparent mb-6 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-3 border-b-2 font-bold text-base whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-[#00629d] text-[#00629d]'
                  : 'border-transparent text-[#707882] hover:text-[#404751] font-medium transition-all'
              }`}
            >
              Tất cả ({tabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`pb-3 border-b-2 text-base whitespace-nowrap ${
                activeTab === 'active'
                  ? 'border-[#00629d] text-[#00629d] font-bold'
                  : 'border-transparent text-[#707882] hover:text-[#404751] font-medium transition-all'
              }`}
            >
              Đang hoạt động ({tabCounts.active})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('violation')}
              className={`pb-3 border-b-2 text-base whitespace-nowrap ${
                activeTab === 'violation'
                  ? 'border-[#00629d] text-[#00629d] font-bold'
                  : 'border-transparent text-[#707882] hover:text-[#404751] font-medium transition-all'
              }`}
            >
              Vi phạm ({tabCounts.violation})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending_admin')}
              className={`pb-3 border-b-2 text-base whitespace-nowrap ${
                activeTab === 'pending_admin'
                  ? 'border-[#00629d] text-[#00629d] font-bold'
                  : 'border-transparent text-[#707882] hover:text-[#404751] font-medium transition-all'
              }`}
            >
              Chờ duyệt bởi Admin ({tabCounts.pending_admin})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('not_listed')}
              className={`pb-3 border-b-2 text-base whitespace-nowrap ${
                activeTab === 'not_listed'
                  ? 'border-[#00629d] text-[#00629d] font-bold'
                  : 'border-transparent text-[#707882] hover:text-[#404751] font-medium transition-all'
              }`}
            >
              Chưa được đăng ({tabCounts.not_listed})
            </button>
          </div>

          {/* Filters */}
          <div className="bg-[#e9f5ff] rounded-3xl p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 p-1 bg-[#e1f0fb] rounded-xl">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    stockFilter === 'all'
                      ? 'bg-white text-[#00629d] font-bold shadow-sm'
                      : 'text-[#707882] hover:text-[#404751] font-medium'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('need_restock')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    stockFilter === 'need_restock'
                      ? 'bg-white text-[#00629d] font-bold shadow-sm'
                      : 'text-[#707882] hover:text-[#404751] font-medium'
                  }`}
                  title={`Hiển thị sản phẩm có tồn kho ≤ ${LOW_STOCK_THRESHOLD}`}
                >
                  Cần bổ sung hàng ({needRestockCount})
                </button>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Tên sản phẩm / SKU"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                  {!!productQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setProductQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-[#f5faff] flex items-center justify-center text-[#707882] hover:text-[#404751] transition-colors"
                      aria-label="Xoá tìm kiếm"
                      title="Xoá"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  ) : (
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#707882]">
                      search
                    </span>
                  )}
                </div>

                <div className="relative min-w-[180px]">
                  <select className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl text-sm outline-none cursor-pointer focus:ring-2 focus:ring-[#00629d]/20">
                    <option>Tất cả danh mục</option>
                    <option>Thời trang</option>
                    <option>Điện tử</option>
                    <option>Gia dụng</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#707882] pointer-events-none">expand_more</span>
                </div>

                <button className="p-2.5 bg-white border border-[#bfc7d3]/20 rounded-xl hover:bg-[#f5faff] transition-colors">
                  <span className="material-symbols-outlined text-[#707882]">filter_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr_120px_120px_140px_140px_120px] items-center px-6 text-xs font-bold text-[#707882] tracking-wider uppercase">
              <div className="pr-6">
                <input
                  type="checkbox"
                  className="rounded text-[#00629d] focus:ring-[#00629d]"
                  checked={allSelectedInView}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelectedInView;
                  }}
                  onChange={(e) => toggleAllInView(e.target.checked)}
                  aria-label="Chọn tất cả sản phẩm đang hiển thị"
                  disabled={searchedProductIds.length === 0}
                  title={
                    searchedProductIds.length === 0
                      ? 'Không có sản phẩm để chọn'
                      : allSelectedInView
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả'
                  }
                />
              </div>
              <div>Tên sản phẩm</div>
              <div className="text-center">Giá</div>
              <div className="text-center">Kho hàng</div>
              <div className="text-center">Hiệu suất</div>
              <div className="text-center">Đánh giá</div>
              <div className="text-right">Thao tác</div>
            </div>

            {loading && <div className="text-center p-8 text-[#00629d] font-bold animate-pulse">Đang tải dữ liệu sản phẩm...</div>}

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center p-8 text-[#707882] font-medium">
                {products.length === 0 ? 'Chưa có sản phẩm nào.' : 'Không có sản phẩm trong tab này.'}
              </div>
            )}

            {!loading && filteredProducts.length > 0 && visibleProducts.length === 0 && (
              <div className="text-center p-8 text-[#707882] font-medium">
                Không có sản phẩm cần bổ sung hàng trong mục này.
              </div>
            )}

            {!loading && visibleProducts.length > 0 && searchedProducts.length === 0 && (
              <div className="text-center p-8 text-[#707882] font-medium">
                Không tìm thấy sản phẩm phù hợp.
              </div>
            )}

            {searchedProducts.map((p) => {
              const totalStock = getTotalStock(p);
              const isOutOfStock = p.status === 'active' && totalStock === 0;

              return (
              <div key={p.id} className={`grid grid-cols-[auto_1fr_120px_120px_140px_140px_120px] items-center p-4 rounded-3xl transition-all group border ${p.status === 'active' ? 'bg-white hover:bg-[#f5faff] shadow-sm border-[#e1f0fb] hover:scale-[1.005]' : 'bg-[#e9f5ff]/50 hover:bg-[#f5faff] border-dashed border-[#bfc7d3]/30'}`}>
                <div className="pr-6">
                  <input
                    type="checkbox"
                    className="rounded text-[#00629d] focus:ring-[#00629d]"
                    checked={!!selectedProductIds[String(p.id)]}
                    onChange={(e) => toggleOne(String(p.id), e.target.checked)}
                    aria-label={`Chọn sản phẩm ${p.name || `#${p.id}`}`}
                  />
                </div>
                <div className={`flex items-center gap-4 ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${p.status === 'active' ? 'bg-blue-100 text-blue-300' : 'bg-gray-200 text-gray-400 grayscale'}`}>
                    {p.thumbnail_url && !p.thumbnail_url.startsWith('blob:') ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover rounded-2xl" /> : <span className="material-symbols-outlined">image</span>}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{p.name}</h4>
                    <p className="text-[10px] text-[#707882] mt-1 font-mono">SKU: {p.slug || `PRD-${p.id}`}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        p.status === 'active' ? 'bg-[#cfe5ff] text-[#00629d]' : 
                        p.status === 'rejected' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 
                        'bg-[#ffddb4] text-[#291800]'
                      }`}>
                        {p.status === 'active' ? (p.category?.name || 'Phân loại') : 
                         p.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                      </span>
                      {isOutOfStock && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-[#ffdad6] text-[#ba1a1a]">
                          Hết hàng
                        </span>
                      )}
                      {p.shop_categories?.map((sc: any) => (
                        <span key={sc.id} className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-[#e9f5ff] text-[#42a5f5] border border-[#42a5f5]/20">
                          {sc.name}
                        </span>
                      ))}
                      {p.status === 'rejected' && p.moderation_note && (
                        <div className="group/note relative">
                          <span className="material-symbols-outlined text-sm text-[#ba1a1a] cursor-help">info</span>
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#0f1d25] text-white text-[10px] rounded-xl opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                            <p className="font-bold mb-1 text-[#42a5f5]">Lý do từ chối:</p>
                            {p.moderation_note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`text-center font-bold text-[#0f1d25] text-xs ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  {formatPriceRange(p.base_price, p.variants)}
                </div>
                <div className={`text-center ${p.status !== 'active' ? 'opacity-70' : ''}`}>
                  <span className={`text-sm font-medium ${isOutOfStock ? 'text-[#ba1a1a]' : 'text-[#0f1d25]'}`}>{totalStock}</span>
                  {p.status === 'active' && (
                    <div className="w-12 h-1 bg-[#e1f0fb] rounded-full mx-auto mt-2 overflow-hidden">
                      <div className={`h-full rounded-full ${isOutOfStock ? 'w-0 bg-[#ba1a1a]' : 'w-3/4 bg-[#6cbdfe]'}`}></div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  {p.status === 'active' && isOutOfStock ? (
                    <div className="text-[#ba1a1a] font-bold text-[10px] uppercase tracking-tighter">Hết hàng</div>
                  ) : p.status === 'active' ? (
                    <>
                      <div className="flex items-center justify-center gap-1 text-green-600 font-bold text-sm">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        +{(p.view_count || 0) > 0 ? Math.round((p.view_count * 0.5) + (Math.sqrt(p.view_count) * 5)) : 0}%
                      </div>
                      <p className="text-[10px] text-[#707882]">Lượt xem: {p.view_count || 0}</p>
                    </>
                  ) : p.status === 'rejected' ? (
                    <div className="text-[#ba1a1a] font-bold text-[10px] uppercase tracking-tighter">Cần chỉnh sửa</div>
                  ) : (
                    <div className="italic text-[#707882] text-[10px]">Đang kiểm duyệt...</div>
                  )}
                </div>
                <div className="text-center">
                  {p.status === 'active' ? (
                    <>
                      <div className="flex items-center justify-center gap-0.5 text-[#d99000]">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span className="text-sm font-bold text-[#0f1d25]">{Number(p.rating) > 0 ? Number(p.rating).toFixed(1) : '0.0'}</span>
                      </div>
                      <p className="text-[10px] text-[#707882]">({p._count?.reviews || 0} đánh giá)</p>
                    </>
                  ) : (
                    <span className="text-[#707882]">—</span>
                  )}
                </div>
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/seller/edit-product/${p.id}`} className="p-2 text-[#707882] hover:text-[#00629d] hover:bg-[#00629d]/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">edit</span></Link>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-[#707882] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-xl">delete</span></button>
                </div>
              </div>
            );
            })}

          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-1 bg-white p-2 rounded-full shadow-sm border border-[#bfc7d3]/10">
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#00629d] text-white font-bold text-sm shadow-md">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] font-medium text-sm transition-colors">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] font-medium text-sm transition-colors">3</button>
              <div className="w-10 h-10 flex items-center justify-center text-[#707882] font-medium">...</div>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-[#707882] hover:bg-[#e1f0fb] transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
            </nav>
          </div>

        </div>

        <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00629d] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50">
          <span className="material-symbols-outlined">support_agent</span>
        </button>

      </SellerLayout>
    );
  } catch (err: any) {
    return (
      <div style={{ padding: '50px', color: 'red', fontSize: '20px' }}>
        <h2>React Runtime Error:</h2>
        <pre>{err.stack || err.message || String(err)}</pre>
      </div>
    );
  }
};
