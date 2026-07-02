import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatVnd, formatPriceRange } from '../../utils/currency';

interface Product {
  id: number;
  name: string;
  base_price: string;
  thumbnail_url: string;
  shop_id?: number;
  shop: { id?: number; name: string; rating: number | null };
  images: Array<{ image_url: string }>;
  variants?: any[];
}

export const ProductFeed: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [myShopId, setMyShopId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('c2c_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.shop?.id) setMyShopId(Number(user.shop.id));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          // Chỉ lấy 8 sản phẩm mới nhất để không làm loãng giao diện trang chủ
          setProducts(data.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="px-6 mb-40">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12 px-4">
          <div>
            <span className="text-[10px] font-bold text-[#00629d] uppercase tracking-[0.3em]">Curated For You</span>
            <h2 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mt-2">Recently Added</h2>
          </div>
          <div className="flex gap-4">
             <button className="w-12 h-12 rounded-full border border-[#e1f0fb] flex items-center justify-center text-[#707882] hover:bg-[#00629d] hover:text-white transition-all">
                <span className="material-symbols-outlined">filter_list</span>
             </button>
             <Link to="/products" className="px-8 py-3 bg-[#e9f5ff] text-[#00629d] rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#00629d] hover:text-white transition-all">
                Browse All
             </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-[4/5] bg-[#e9f5ff] rounded-[2.5rem]"></div>
                <div className="h-4 bg-[#e9f5ff] rounded-full w-2/3"></div>
                <div className="h-3 bg-[#e9f5ff] rounded-full w-1/2 opacity-50"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-16">
            {products.map((product, index) => {
              const isOwnProduct = myShopId && Number(product.shop_id || product.shop?.id) === myShopId;

              if (isOwnProduct) {
                return (
                  <Link
                    key={product.id}
                    to={`/seller/edit-product/${product.id}`}
                    className={`group flex flex-col ${index % 2 !== 0 ? 'mt-12' : ''} transition-transform hover:-translate-y-2 duration-500`}
                  >
                    <div className={`relative overflow-hidden rounded-[3rem] bg-white border border-[#e1f0fb] group-hover:shadow-[0_20px_60px_rgba(180,120,0,0.08)] transition-all duration-700 ${index % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}>
                      <img
                        src={product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms] opacity-80"
                      />
                      <div className="absolute inset-0 bg-amber-900/5 group-hover:bg-amber-900/10 transition-colors" />
                      {/* Own badge */}
                      <div className="absolute top-6 left-6">
                        <span className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400/90 backdrop-blur-md rounded-xl text-white text-[11px] font-black shadow-sm">
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          Của bạn
                        </span>
                      </div>
                      {/* Edit on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-amber-600 font-bold text-sm shadow-lg">
                          <span className="material-symbols-outlined text-lg">edit_square</span>
                          Chỉnh sửa sản phẩm
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 px-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-lg text-[#0f1d25] group-hover:text-amber-600 transition-colors line-clamp-1">{product.name}</h4>
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">{product.shop.name} · Cửa hàng của bạn</p>
                        </div>
                        <span className="text-xl font-black text-[#00629d] font-['Plus_Jakarta_Sans'] tracking-tight">
                          {formatPriceRange(product.base_price, product.variants)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={`group flex flex-col ${index % 2 !== 0 ? 'mt-12' : ''} transition-transform hover:-translate-y-2 duration-500`}
                >
                  {/* Image Container with Intentional Asymmetry */}
                  <div className={`relative overflow-hidden rounded-[3rem] bg-white border border-[#e1f0fb] group-hover:shadow-[0_20px_60px_rgba(0,98,157,0.1)] transition-all duration-700 ${index % 3 === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}>
                    <img
                      src={product.images?.[0]?.image_url || product.thumbnail_url || 'https://via.placeholder.com/600x600?text=Product'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1500ms]"
                    />

                    {/* Cart Shortcut */}
                    <div className="absolute top-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <button className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-[#00629d] shadow-xl hover:bg-[#00629d] hover:text-white transition-colors">
                        <span className="material-symbols-outlined font-bold">add_shopping_cart</span>
                      </button>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute bottom-6 left-6 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full flex items-center gap-1.5 text-[#0f1d25] text-[10px] font-bold shadow-sm">
                      <span className="material-symbols-outlined text-xs text-[#d99000] fill-current">star</span>
                      {product.shop.rating || '4.8'}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-8 px-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-lg text-[#0f1d25] group-hover:text-[#00629d] transition-colors line-clamp-1">{product.name}</h4>
                        <p className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em]">{product.shop.name}</p>
                      </div>
                      <span className="text-xl font-black text-[#00629d] font-['Plus_Jakarta_Sans'] tracking-tight">
                        {formatPriceRange(product.base_price, product.variants)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
