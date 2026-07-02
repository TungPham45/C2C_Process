import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
}

export const CategoryNavigation: FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const rootCategories = categories.filter((category) => category.parent_id === null || category.level === 1);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/products/categories/all');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) return null;

  return (
    <section className="px-6 mb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10 px-4">
          <div>
            <span className="text-[10px] font-bold text-[#00629d] uppercase tracking-[0.3em]">Khám phá</span>
            <h2 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mt-2">Danh mục</h2>
          </div>
          <Link to="/products" className="text-sm font-bold text-[#707882] hover:text-[#00629d] transition-colors flex items-center gap-2">
            Xem tất cả <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {rootCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group relative h-64 rounded-[2.5rem] overflow-hidden bg-white border border-[#e1f0fb] hover:border-[#42a5f5] hover:scale-[1.02] transition-all flex flex-col items-center justify-center p-8 text-center"
            >
              {/* Decorative Background Icon */}
              <div className="absolute top-4 right-4 text-[#e9f5ff] group-hover:text-[#42a5f5]/10 transition-colors">
                <span className="material-symbols-outlined text-6xl">category</span>
              </div>

              <div className="w-20 h-20 rounded-3xl bg-[#f5faff] text-[#00629d] mb-6 flex items-center justify-center group-hover:bg-[#00629d] group-hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined text-4xl">
                  {cat.slug.includes('fashion') ? 'checkroom' :
                    cat.slug.includes('electronics') ? 'devices' :
                      cat.slug.includes('home') ? 'home' :
                        cat.slug.includes('beauty') ? 'face' :
                          cat.slug.includes('shoes') ? 'ice_skating' : 'stars'}
                </span>
              </div>

              <h4 className="font-black text-[#0f1d25] group-hover:text-[#00629d] transition-colors line-clamp-1">{cat.name}</h4>
              <p className="text-[10px] text-[#707882] mt-2 uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity">Khám phá</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
