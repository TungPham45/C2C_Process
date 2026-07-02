import { FC, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { formatVnd, formatPriceRange } from '../utils/currency';

type SortKey = 'popular' | 'newest' | 'best-selling' | 'price';
type ViewMode = 'grid' | 'list';

interface Product {
  id: number;
  name: string;
  base_price: string;
  thumbnail_url: string;
  shop_id: number;
  category_id: number;
  rating?: string | number | null;
  sold_count?: number | null;
  created_at?: string | null;
  shop: { id?: number; name: string; rating: number | string | null };
  images: Array<{ image_url: string }>;
  variants?: any[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  sort_order?: number | null;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'popular', label: 'Popularity' },
  { key: 'newest', label: 'Newest' },
  { key: 'best-selling', label: 'Best Selling' },
  { key: 'price', label: 'Price' },
];

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPrice = (product: Product) => formatPriceRange(product.base_price, product.variants);
const formatRating = (product: Product) => {
  const rating = toNumber(product.rating ?? product.shop?.rating ?? 0);
  return rating > 0 ? rating.toFixed(1) : 'New';
};
const formatSold = (count: number | null | undefined) => {
  const value = Math.max(0, count ?? 0);
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}k sold`;
  return `${value} sold`;
};
const getImage = (product: Product) => {
  const image = product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product';
  return image.startsWith('http') ? image : `http://localhost:3000${image}`;
};

const buildTree = (categories: Category[]) => {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];
  categories.forEach((category) => map.set(category.id, { ...category, children: [] }));
  categories.forEach((category) => {
    const node = map.get(category.id);
    if (!node) return;
    if (category.parent_id && map.has(category.parent_id)) map.get(category.parent_id)?.children.push(node);
    else roots.push(node);
  });
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
};

const buildPath = (categoryId: number, categories: Category[]) => {
  const lookup = new Map(categories.map((category) => [category.id, category]));
  const path: Category[] = [];
  const visited = new Set<number>();
  let currentId: number | null = categoryId;
  while (currentId && !visited.has(currentId)) {
    const current = lookup.get(currentId);
    if (!current) break;
    path.unshift(current);
    visited.add(currentId);
    currentId = current.parent_id;
  }
  return path;
};

const SidebarItem: FC<{
  node: CategoryNode;
  activeId: number | null;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  depth?: number;
}> = ({ node, activeId, expanded, onToggle, depth = 0 }) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isActive = node.id === activeId;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Link
          to={`/category/${node.slug}`}
          className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-[#e8f3fc] font-bold text-[#00629d]' : 'font-semibold text-[#4c5d6d] hover:bg-[#f6f9fc] hover:text-[#0f1d25]'}`}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8ea0b0] transition hover:bg-[#f6f9fc] hover:text-[#0f1d25]"
          >
            <span className={`material-symbols-outlined text-[18px] transition ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <SidebarItem key={child.id} node={child} activeId={activeId} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ProductsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [myShopId, setMyShopId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [selectedSort, setSelectedSort] = useState<SortKey>((searchParams.get('sort') as SortKey) || 'popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('c2c_user');
      if (!rawUser) return;
      const user = JSON.parse(rawUser);
      if (user?.shop?.id) setMyShopId(Number(user.shop.id));
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchQuery(q);
    setDebouncedQuery(q);
    setSelectedSort((searchParams.get('sort') as SortKey) || 'popular');
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim());
    else next.delete('q');
    if (selectedSort !== 'popular') next.set('sort', selectedSort);
    else next.delete('sort');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [debouncedQuery, searchParams, selectedSort, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoryError(null);
      try {
        const response = await fetch('/api/products/categories/all');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setCategoryError(error instanceof Error ? error.message : 'Failed to fetch categories');
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      setProductError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
        if (slug) params.set('categorySlug', slug);
        const response = await fetch(params.toString() ? `/api/products?${params}` : '/api/products');
        if (!response.ok) {
          if (response.status === 404 && slug) {
            if (!cancelled) setProducts([]);
            return;
          }
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setProductError(error instanceof Error ? error.message : 'Failed to fetch products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, slug]);

  const activeCategory = useMemo(() => (slug ? categories.find((category) => category.slug === slug) ?? null : null), [categories, slug]);
  const tree = useMemo(() => buildTree(categories), [categories]);
  const categoryPath = useMemo(() => (activeCategory ? buildPath(activeCategory.id, categories) : []), [activeCategory, categories]);

  useEffect(() => {
    if (!activeCategory) return;
    const pathIds = buildPath(activeCategory.id, categories).map((category) => category.id);
    setExpanded((prev) => new Set([...prev, ...pathIds]));
  }, [activeCategory, categories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, selectedSort, viewMode, minPrice, maxPrice, slug]);

  const filteredProducts = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    return products.filter((product) => {
      const price = toNumber(product.base_price);
      if (min !== null && !Number.isNaN(min) && price < min) return false;
      if (max !== null && !Number.isNaN(max) && price > max) return false;
      return true;
    });
  }, [maxPrice, minPrice, products]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];
    next.sort((a, b) => {
      if (selectedSort === 'newest') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      if (selectedSort === 'best-selling') return (b.sold_count ?? 0) - (a.sold_count ?? 0);
      if (selectedSort === 'price') return toNumber(a.base_price) - toNumber(b.base_price);
      const scoreA = (a.sold_count ?? 0) * 2 + toNumber(a.rating ?? a.shop?.rating ?? 0);
      const scoreB = (b.sold_count ?? 0) * 2 + toNumber(b.rating ?? b.shop?.rating ?? 0);
      return scoreB - scoreA;
    });
    return next;
  }, [filteredProducts, selectedSort]);

  const pageSize = viewMode === 'grid' ? 9 : 6;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageProducts = sortedProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => Math.max(1, Math.min(totalPages - 4, safePage - 3)) + index).filter((value) => value <= totalPages);
  const categoryNotFound = Boolean(slug) && !categoriesLoading && !categoryError && !activeCategory;

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-[#fbfdff] pb-24">
        <div className="mx-auto max-w-[1440px] px-6 pt-10 sm:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <aside className="w-full lg:sticky lg:top-32 lg:w-1/4 lg:max-w-[280px] lg:shrink-0">
              <div className="rounded-[1.75rem] border border-[#e8eef5] bg-white p-5 shadow-[0_8px_24px_rgba(15,29,37,0.03)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ea0b0]">Category Area</p>
                <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl font-black text-[#0f1d25]">Browse</h2>
                <div className="mt-5 flex flex-col gap-1.5 pb-4">
                  <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#4c5d6d] transition hover:bg-[#f6f9fc] hover:text-[#0f1d25]"><span className="material-symbols-outlined text-[20px] text-[#8ea0b0]">home</span>Home</Link>
                  <button type="button" onClick={() => setSelectedSort('newest')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#4c5d6d] transition hover:bg-[#f6f9fc] hover:text-[#0f1d25]"><span className="material-symbols-outlined text-[20px] text-[#8ea0b0]">auto_awesome</span>New Arrivals</button>
                  <button type="button" onClick={() => setSelectedSort('best-selling')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#4c5d6d] transition hover:bg-[#f6f9fc] hover:text-[#0f1d25]"><span className="material-symbols-outlined text-[20px] text-[#8ea0b0]">local_fire_department</span>Best Sellers</button>
                </div>
                <div className="border-t border-[#eef3f8] py-4">
                  {categoriesLoading ? (
                    <div className="space-y-3">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-11 animate-pulse rounded-2xl bg-[#f2f6fa]" />)}</div>
                  ) : (
                    <div className="flex flex-col gap-1">{tree.map((node) => <SidebarItem key={node.id} node={node} activeId={activeCategory?.id ?? null} expanded={expanded} onToggle={(id) => setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })} />)}</div>
                  )}
                </div>
                <div className="border-t border-[#eef3f8] pt-5">
                  <button type="button" disabled className="flex w-full items-center justify-between rounded-[1.5rem] border border-[#dbe7f2] bg-[#f8fbfe] px-4 py-4 text-left text-sm font-semibold text-[#5d6a75]">
                    <span className="flex items-center gap-3"><span className="material-symbols-outlined text-[20px] text-[#00629d]">favorite</span>View Wishlist</span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-[#a4b2bf]">Soon</span>
                  </button>
                </div>
              </div>
            </aside>

            <section className="min-w-0 w-full lg:w-3/4 lg:flex-1">
              <div className="rounded-[2.5rem] border border-[#e8eef5] bg-white p-6 shadow-[0_18px_50px_rgba(15,29,37,0.04)] sm:p-8">
                <div className="border-b border-[#eef3f8] pb-8">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a7b5]">
                    <Link to="/" className="transition hover:text-[#00629d]">Home</Link>
                    {categoryPath.map((category) => <span key={category.id} className="flex items-center gap-2"><span>/</span><Link to={`/category/${category.slug}`} className="transition hover:text-[#00629d]">{category.name}</Link></span>)}
                    {!activeCategory && <span>/ Products</span>}
                  </div>
                  <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-black text-[#0f1d25] sm:text-4xl">{activeCategory ? activeCategory.name : 'All Products'}</h1>
                      <p className="mt-3 max-w-2xl text-sm text-[#6d7a86]">{activeCategory ? `Every product from ${activeCategory.name} and its descendant categories appears here.` : 'Browse the full marketplace catalog with sorting, filtering, and category navigation.'}</p>
                    </div>
                    <div className="rounded-full bg-[#f4f8fb] px-5 py-3 text-sm font-semibold text-[#5d6a75]">{sortedProducts.length} results</div>
                  </div>
                  <div className="mt-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#98a7b5]">Sort By</p>
                      <div className="flex flex-wrap gap-2">
                        {SORT_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => setSelectedSort(option.key)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${selectedSort === option.key ? 'bg-[#0f1d25] text-white' : 'bg-[#f3f7fb] text-[#5d6a75] hover:bg-[#e7f1fb] hover:text-[#00629d]'}`}>{option.label}</button>)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => setShowFilters((prev) => !prev)} className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${showFilters ? 'border-[#00629d] bg-[#eaf4fd] text-[#00629d]' : 'border-[#dbe7f2] bg-white text-[#4d5f6f] hover:border-[#00629d] hover:text-[#00629d]'}`}><span className="material-symbols-outlined text-[18px]">tune</span>Filter</button>
                      <div className="flex items-center rounded-full border border-[#dbe7f2] bg-white p-1">
                        <button type="button" onClick={() => setViewMode('grid')} className={`flex h-10 w-10 items-center justify-center rounded-full transition ${viewMode === 'grid' ? 'bg-[#0f1d25] text-white' : 'text-[#8ea0b0] hover:text-[#00629d]'}`}><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
                        <button type="button" onClick={() => setViewMode('list')} className={`flex h-10 w-10 items-center justify-center rounded-full transition ${viewMode === 'list' ? 'bg-[#0f1d25] text-white' : 'text-[#8ea0b0] hover:text-[#00629d]'}`}><span className="material-symbols-outlined text-[18px]">view_list</span></button>
                      </div>
                    </div>
                  </div>
                  {showFilters && (
                    <div className="mt-6 grid gap-4 rounded-[2rem] border border-[#e8eef5] bg-[#fbfdff] p-5 md:grid-cols-4">
                      <label className="space-y-2 md:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a7b5]">Keyword</span><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products" className="h-12 w-full rounded-2xl border border-[#dbe7f2] bg-white px-4 text-sm text-[#0f1d25] outline-none transition focus:border-[#00629d]" /></label>
                      <label className="space-y-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a7b5]">Min Price</span><input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="0" className="h-12 w-full rounded-2xl border border-[#dbe7f2] bg-white px-4 text-sm text-[#0f1d25] outline-none transition focus:border-[#00629d]" /></label>
                      <label className="space-y-2"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#98a7b5]">Max Price</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Any" className="h-12 w-full rounded-2xl border border-[#dbe7f2] bg-white px-4 text-sm text-[#0f1d25] outline-none transition focus:border-[#00629d]" /></label>
                      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-4"><p className="text-sm text-[#6d7a86]">{activeCategory ? `Filtering inside ${activeCategory.name}.` : 'Filtering the full catalog.'}</p><button type="button" onClick={() => { setSearchQuery(''); setMinPrice(''); setMaxPrice(''); }} className="rounded-full border border-[#dbe7f2] px-4 py-2 text-sm font-semibold text-[#4d5f6f] transition hover:border-[#00629d] hover:text-[#00629d]">Clear Filters</button></div>
                    </div>
                  )}
                </div>
                <div className="pt-8">
                  {(categoryError || productError) && <div className="flex flex-col items-center justify-center py-20 text-center"><span className="material-symbols-outlined mb-4 text-5xl text-[#d1dce7]">error</span><h3 className="text-xl font-bold text-[#0f1d25]">Unable to load products</h3><p className="mt-2 max-w-md text-sm text-[#6d7a86]">{categoryError || productError}</p></div>}
                  {!categoryError && !productError && categoryNotFound && <div className="flex flex-col items-center justify-center py-20 text-center"><span className="material-symbols-outlined mb-4 text-5xl text-[#d1dce7]">category</span><h3 className="text-xl font-bold text-[#0f1d25]">Category not found</h3><p className="mt-2 max-w-md text-sm text-[#6d7a86]">The selected category does not exist or is no longer active.</p></div>}
                  {!categoryError && !productError && !categoryNotFound && loading && <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>{Array.from({ length: pageSize }).map((_, index) => <div key={index} className="space-y-4 rounded-[2rem] border border-[#eef3f8] p-4 animate-pulse"><div className="aspect-[4/5] rounded-[1.5rem] bg-[#eef4f9]" /><div className="h-4 w-2/3 rounded-full bg-[#eef4f9]" /><div className="h-3 w-1/2 rounded-full bg-[#eef4f9]" /></div>)}</div>}
                  {!categoryError && !productError && !categoryNotFound && !loading && sortedProducts.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-center"><span className="material-symbols-outlined mb-4 text-5xl text-[#d1dce7]">inventory_2</span><h3 className="text-xl font-bold text-[#0f1d25]">No products found</h3><p className="mt-2 max-w-md text-sm text-[#6d7a86]">Adjust the search or price filters to broaden the result set.</p></div>}
                  {!categoryError && !productError && !categoryNotFound && !loading && sortedProducts.length > 0 && (
                    <>
                      <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3' : 'space-y-5'}>
                        {pageProducts.map((product) => {
                          const isOwnProduct = myShopId !== null && myShopId === Number(product.shop_id);
                          const target = isOwnProduct ? `/seller/edit-product/${product.id}` : `/product/${product.id}`;
                          if (viewMode === 'list') {
                            return <Link key={product.id} to={target} className="group flex flex-col gap-5 rounded-[2rem] border border-[#e8eef5] p-4 transition hover:border-[#cbdced] hover:shadow-[0_18px_40px_rgba(15,29,37,0.05)] sm:flex-row"><div className="relative w-full overflow-hidden rounded-[1.5rem] bg-[#f3f7fb] sm:w-[230px]"><div className="aspect-[4/5] sm:h-full"><img src={getImage(product)} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>{isOwnProduct && <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-[#0f1d25] shadow-sm"><span className="material-symbols-outlined text-[16px]">edit</span></div>}</div><div className="flex min-w-0 flex-1 flex-col justify-between py-1"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8ea0b0]">{product.shop.name}</p><h3 className="mt-2 text-xl font-bold text-[#0f1d25] transition group-hover:text-[#00629d]">{product.name}</h3></div><div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div className="text-2xl font-black text-[#0f1d25]">{formatPrice(product)}</div><div className="flex flex-wrap items-center gap-4 text-sm text-[#5d6a75]"><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#f39a1f]">star</span>{formatRating(product)}</span><span>{formatSold(product.sold_count)}</span></div></div></div></Link>;
                          }
                          return <Link key={product.id} to={target} className="group rounded-[2rem] border border-[#e8eef5] p-4 transition hover:border-[#cbdced] hover:shadow-[0_18px_40px_rgba(15,29,37,0.05)]"><div className="relative overflow-hidden rounded-[1.5rem] bg-[#f3f7fb]"><div className="aspect-[4/5]"><img src={getImage(product)} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /></div>{isOwnProduct && <div className="absolute right-3 top-3 rounded-full bg-white/92 p-2 text-[#0f1d25] shadow-sm"><span className="material-symbols-outlined text-[16px]">edit</span></div>}</div><div className="px-1 pt-5"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8ea0b0]">{product.shop.name}</p><h3 className="mt-2 min-h-[56px] text-lg font-bold leading-7 text-[#0f1d25] transition group-hover:text-[#00629d] line-clamp-2">{product.name}</h3><div className="mt-4 text-2xl font-black text-[#0f1d25]">{formatPrice(product)}</div><div className="mt-4 flex items-center justify-between border-t border-[#eef3f8] pt-4 text-sm text-[#5d6a75]"><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-[#f39a1f]">star</span>{formatRating(product)}</span><span>{formatSold(product.sold_count)}</span></div></div></Link>;
                        })}
                      </div>
                      <div className="mt-12 flex items-center justify-center gap-2">
                        <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe7f2] text-[#5d6a75] transition hover:border-[#00629d] hover:text-[#00629d] disabled:cursor-not-allowed disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                        {pageNumbers.map((page) => <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`flex h-11 min-w-[44px] items-center justify-center rounded-full px-4 text-sm font-bold transition ${safePage === page ? 'bg-[#0f1d25] text-white' : 'border border-[#dbe7f2] text-[#5d6a75] hover:border-[#00629d] hover:text-[#00629d]'}`}>{page}</button>)}
                        <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe7f2] text-[#5d6a75] transition hover:border-[#00629d] hover:text-[#00629d] disabled:cursor-not-allowed disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
