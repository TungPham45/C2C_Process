import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { VariantBuilder, GeneratedVariant, VariantGroup } from '../../components/products/VariantBuilder';
import { CategorySelector } from '../../components/products/CategorySelector';
import { DynamicAttributes } from '../../components/products/DynamicAttributes';
import { normalizeProductAssetUrls, PRODUCT_API_URL, resolveAssetUrl } from '../../config/api';

export const EditProductPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Category specific state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryPath, setCategoryPath] = useState('');
  const [initialVariantsMap, setInitialVariantsMap] = useState<GeneratedVariant[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: 0,
    base_price: '',
    base_stock: '100',
    images: [] as string[],
  });

  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [selectedShopCategories, setSelectedShopCategories] = useState<number[]>([]);
  const [isShopCategoryLoading, setIsShopCategoryLoading] = useState(false);

  const [hasVariants, setHasVariants] = useState(false);
  const [variantsMap, setVariantsMap] = useState<GeneratedVariant[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [activeSection, setActiveSection] = useState<'basic' | 'desc' | 'sales' | 'ship'>('basic');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const token = localStorage.getItem('c2c_token');
    
    setUploadingCount(files.length);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${PRODUCT_API_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return resolveAssetUrl(data.url as string);
      });
      
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls].slice(0, 9)
      }));
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Lỗi khi tải hình ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingCount(0);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`${PRODUCT_API_URL}/seller/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = normalizeProductAssetUrls(await res.json());

          // Hydrate images from the images relation (sorted by sort_order)
          // Filter out blob: URLs as they are dead across sessions
          const imageUrls = (data.images || [])
            .map((img: any) => img.image_url)
            .filter((u: string) => u && !u.startsWith('blob:'));

          // Determine base price/stock from default variant if no real variants exist
          const hasRealVariants = (data.variants || []).some(
            (v: any) => v.attributes && Object.keys(v.attributes).length > 0
          );
          const defaultVariant = (data.variants || [])[0];

          setFormData({
            name: data.name || '',
            description: data.description || '',
            category_id: data.category_id || 0,
            base_price: defaultVariant?.price_override?.toString() || data.base_price?.toString() || '',
            base_stock: defaultVariant?.stock_quantity?.toString() || '0',
            images: imageUrls.length > 0 ? imageUrls : [], 
          });

          // Hydrate selected shop categories
          if (data.shop_categories) {
            setSelectedShopCategories(data.shop_categories.map((c: any) => c.id));
          }

          // Hydrate category path — build breadcrumb from the categories tree
          if (data.category_id) {
            try {
              const catRes = await fetch(`${PRODUCT_API_URL}/categories/all`);
              if (catRes.ok) {
                const allCats = await catRes.json();
                const buildPath = (catId: number): string => {
                  const cat = allCats.find((c: any) => c.id === catId);
                  if (!cat) return '';
                  if (cat.parent_id) return buildPath(cat.parent_id) + ' > ' + cat.name;
                  return cat.name;
                };
                setCategoryPath(buildPath(data.category_id));
              }
            } catch (e) {
              setCategoryPath(data.category?.name || '');
            }
          }

          // Hydrate variants and extract groups
          if (hasRealVariants) {
            setHasVariants(true);
            const realVariants = (data.variants || []).filter((v: any) => v.attributes && Object.keys(v.attributes).length > 0);
            
            // Extract Groups (e.g. Màu, Size)
            const extractedGroups: Record<string, Set<string>> = {};
            realVariants.forEach((v: any) => {
              const attrs = v.attributes || {};
              Object.entries(attrs).forEach(([key, val]) => {
                const trimmedKey = key.trim();
                if (!extractedGroups[trimmedKey]) extractedGroups[trimmedKey] = new Set<string>();
                extractedGroups[trimmedKey].add(String(val));
              });
            });

            const groups: VariantGroup[] = Object.entries(extractedGroups).map(([name, options], idx) => ({
              id: `group-${idx}`,
              name,
              options: Array.from(options)
            }));
            setVariantGroups(groups);

            const hydratedVariants: GeneratedVariant[] = realVariants.map((v: any) => {
              const attrs = v.attributes || {};
              const id = Object.entries(attrs).map(([k, val]) => `${k.trim()}:${val}`).join('|');
              return {
                id,
                attributes: attrs,
                price: v.price_override?.toString() || '',
                stock: v.stock_quantity?.toString() || '0',
                sku: v.sku?.replace(/-v\d+$/, '') || '',
                image: (v.images && v.images.length > 0) ? resolveAssetUrl(v.images[0].image_url) : ''
              };
            });
            setVariantsMap(hydratedVariants);
            setInitialVariantsMap(hydratedVariants);
          }

          // Hydrate attribute values
          if (data.attribute_values && data.attribute_values.length > 0) {
            const attrMap: Record<number, string> = {};
            data.attribute_values.forEach((av: any) => {
              if (av.attribute_option) {
                attrMap[av.attribute_id] = av.attribute_option.value_name;
              } else if (av.custom_value) {
                attrMap[av.attribute_id] = av.custom_value;
              }
            });
            setAttributeValues(attrMap);
          }
        } else {
          alert('Không tìm thấy sản phẩm');
          navigate('/seller/products');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id, navigate]);

  useEffect(() => {
    const sectionIds: Array<'basic' | 'desc' | 'sales' | 'ship'> = ['basic', 'desc', 'sales', 'ship'];
    const onScroll = () => {
      let closest: { id: 'basic' | 'desc' | 'sales' | 'ship'; top: number } | null = null;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const topDistance = Math.abs(rect.top - 130);
        if (!closest || topDistance < closest.top) closest = { id, top: topDistance };
      }
      if (closest) setActiveSection(closest.id);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: 'basic' | 'desc' | 'sales' | 'ship') => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveSection(id);
  };

  const handleSubmit = async () => {
    let finalBasePrice = formData.base_price;
    if (hasVariants && variantsMap.length > 0) {
      finalBasePrice = variantsMap[0].price;
    }

    if (!formData.name || !finalBasePrice) return alert('Vui lòng điền tên và giá sản phẩm');
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/seller/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category_id: Number(formData.category_id),
          base_price: Number(finalBasePrice),
          base_stock: Number(hasVariants && variantsMap.length > 0 ? variantsMap[0].stock : formData.base_stock),
          thumbnail_url: formData.images[0] || '',
          images: formData.images,
          has_variants: hasVariants,
          variants: hasVariants ? variantsMap : [],
          attributeValues: attributeValues,
          shop_category_ids: selectedShopCategories
        })
      });
      if (res.ok) {
        navigate('/seller/products');
      } else {
        alert('Có lỗi xảy ra khi cập nhật sản phẩm');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const fetchShopCategories = async () => {
      setIsShopCategoryLoading(true);
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`${PRODUCT_API_URL}/seller/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setShopCategories(data.filter((c: any) => c.is_active));
        }
      } catch (err) {
        console.error('Failed to fetch shop categories:', err);
      } finally {
        setIsShopCategoryLoading(false);
      }
    };
    fetchShopCategories();

  }, [isLoading]);

  const getPreviewPrice = () => {
    if (hasVariants && variantsMap.length > 0) {
      const prices = variantsMap.map(v => Number(v.price) || 0).filter(p => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const format = (p: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
        
        if (minPrice === maxPrice) {
          return format(minPrice);
        }
        return `${format(minPrice)} - ${format(maxPrice)}`;
      }
    }
    
    if (formData.base_price) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(formData.base_price));
    }
    
    return '₫ 0';
  };

  if (isLoading) {
    return (
      <SellerLayout pageTitle="Serene Seller">
        <div className="text-center p-8 text-[#00629d] font-bold animate-pulse">Đang tải dữ liệu sản phẩm...</div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout pageTitle="Serene Seller">
      <div className="grid grid-cols-12 gap-8 max-w-screen-2xl mx-auto">
        {/* Left Checklist (20%) */}
        <aside className="col-span-3">
          <div className="sticky top-24 space-y-6">
            <div className="bg-[#e9f5ff] rounded-xl p-6 border border-blue-100/50">
              <h3 className="text-[#0f1d25] font-bold text-lg mb-4 flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                <span className="material-symbols-outlined text-[#00629d]">draw</span>
                Đang chỉnh sửa
              </h3>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-[#404751]">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">error</span>
                  <span>Hãy kiểm tra kĩ mô tả trước khi lưu</span>
                </li>
                <li className="flex gap-3 text-sm text-[#404751] opacity-50">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>URL sản phẩm sẽ không đổi</span>
                </li>
              </ul>
              
              <div className="mt-6 pt-6 border-t border-[#bfc7d3]/20">
                <p className="text-xs text-[#707882] font-medium">Trạng thái ID</p>
                <p className="text-[#00629d] mt-1 font-bold font-mono">#{id}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Middle Main Form (60%) */}
        <section className="col-span-6 space-y-8">
          {/* Sticky Anchor Menu */}
          <nav className="sticky top-[4.5rem] z-30 flex gap-8 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm border border-[#dbeaf5] mx-auto w-fit">
            <button
              type="button"
              onClick={() => scrollToSection('basic')}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeSection === 'basic'
                  ? 'font-semibold bg-[#00629d] text-white shadow-md'
                  : 'font-medium text-[#707882] hover:text-[#00629d]'
              }`}
            >
              Thông tin cơ bản
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('desc')}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeSection === 'desc'
                  ? 'font-semibold bg-[#00629d] text-white shadow-md'
                  : 'font-medium text-[#707882] hover:text-[#00629d]'
              }`}
            >
              Mô tả bài đăng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('sales')}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeSection === 'sales'
                  ? 'font-semibold bg-[#00629d] text-white shadow-md'
                  : 'font-medium text-[#707882] hover:text-[#00629d]'
              }`}
            >
              Bán hàng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ship')}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeSection === 'ship'
                  ? 'font-semibold bg-[#00629d] text-white shadow-md'
                  : 'font-medium text-[#707882] hover:text-[#00629d]'
              }`}
            >
              Vận chuyển
            </button>
          </nav>

          {/* Card 1: Basic Info */}
          <div id="basic" className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2 h-8 bg-[#00629d] rounded-full"></span>
              <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Thông tin cơ bản</h2>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block text-sm font-semibold text-[#404751]">Hình ảnh sản phẩm <span className="text-[#ba1a1a]">*</span></label>
              <div className="grid grid-cols-5 gap-3">
                <input 
                  type="file" 
                  multiple
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                />
                
                {formData.images.length < 9 && (
                  <div 
                    onClick={() => !uploadingCount && fileInputRef.current?.click()}
                    className={`aspect-square border-2 border-dashed border-[#00629d]/30 bg-[#00629d]/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors group ${uploadingCount ? 'cursor-wait opacity-50' : 'cursor-pointer hover:bg-[#00629d]/10'}`}
                  >
                    {uploadingCount > 0 ? (
                      <>
                        <span className="material-symbols-outlined text-[#00629d] animate-spin">progress_activity</span>
                        <span className="text-[10px] text-[#00629d] font-bold">Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[#00629d] group-hover:scale-110 transition-transform">add_a_photo</span>
                        <span className="text-[10px] text-[#00629d] font-bold">Thêm hình ({formData.images.length}/9)</span>
                      </>
                    )}
                  </div>
                )}
                
                {formData.images.map((img, idx) => (
                  <div key={img} className="aspect-square bg-[#e9f5ff] rounded-xl border border-[#00629d] p-1 shadow-sm relative group">
                    <img src={img} className="w-full h-full object-cover rounded-lg" alt={`Thumbnail ${idx}`} />
                    <div 
                      className="absolute inset-1 bg-black/40 hidden group-hover:flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                    >
                      <span className="material-symbols-outlined text-white text-3xl">delete</span>
                    </div>
                    {idx === 0 && (
                      <div className="absolute bottom-1 right-1 left-1 bg-[#e2504c] text-white text-[10px] font-bold text-center py-0.5 rounded-md">
                        Ảnh Bìa
                      </div>
                    )}
                  </div>
                ))}

                {[...Array(Math.max(0, 8 - formData.images.length))].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-[#e9f5ff] rounded-xl border border-[#bfc7d3]/20"></div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-[#404751]">Tên sản phẩm <span className="text-[#ba1a1a]">*</span></label>
                  <span className="text-[11px] text-[#707882]">{formData.name.length} / 120</span>
                </div>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00629d]/20 transition-all outline-none placeholder:text-[#707882]/50" 
                  placeholder="Nhập tên sản phẩm" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#404751] mb-2">Ngành hàng <span className="text-[#ba1a1a]">*</span></label>
                <div 
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full bg-[#e9f5ff] border border-transparent hover:border-[#6cbdfe] rounded-xl px-4 py-3 text-sm transition-all cursor-pointer flex justify-between items-center group shadow-sm"
                >
                  <span className={categoryPath ? 'text-[#0f1d25] font-semibold' : 'text-[#707882]'}>
                    {categoryPath || 'Chọn ngành hàng chính xác nhất...'}
                  </span>
                  <span className="material-symbols-outlined text-[#707882] group-hover:text-[#00629d] transition-colors">edit</span>
                </div>
              </div>

              <DynamicAttributes 
                categoryId={formData.category_id || null} 
                values={attributeValues} 
                onChange={(attrId, val) => setAttributeValues(prev => ({...prev, [attrId]: val}))} 
              />

              <CategorySelector 
                isOpen={isCategoryModalOpen} 
                onClose={() => setIsCategoryModalOpen(false)} 
                onConfirm={(id, path) => { setFormData({...formData, category_id: id}); setCategoryPath(path); setAttributeValues({}); }} 
              />

              {/* Shop Categories Selection */}
              <div className="mt-8">
                <label className="block text-sm font-semibold text-[#404751] mb-2 uppercase tracking-wider text-[10px]">Danh mục riêng của Shop</label>
                <div className="bg-[#f5faff] rounded-xl p-4 border border-[#e1f0fb]">
                  {isShopCategoryLoading ? (
                    <p className="text-xs text-[#707882] animate-pulse">Đang tải danh mục của bạn...</p>
                  ) : shopCategories.length === 0 ? (
                    <p className="text-xs text-[#707882] italic">Bạn chưa tạo danh mục riêng nào. <span className="text-[#00629d] cursor-pointer font-bold hover:underline" onClick={() => navigate('/seller/categories')}>Tạo ngay</span></p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {shopCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedShopCategories(prev => 
                              prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
                            selectedShopCategories.includes(cat.id)
                              ? 'bg-[#00629d] text-white border-[#00629d] shadow-sm'
                              : 'bg-white text-[#707882] border-slate-100 hover:border-[#00629d]/20'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Description */}
          <div id="desc" className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2 h-8 bg-[#42a5f5] rounded-full"></span>
              <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Mô tả sản phẩm</h2>
            </div>
            <div className="relative">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-[#404751]">Chi tiết sản phẩm <span className="text-[#ba1a1a]">*</span></label>
                <div className="flex gap-4">
                  <button className="text-[#00629d] text-xs font-bold hover:underline">Sử dụng mẫu mô tả</button>
                  <span className="text-[11px] text-[#707882]">{formData.description.length} / 3000</span>
                </div>
              </div>
              <textarea 
                rows={10}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#e9f5ff] border-none outline-none rounded-xl px-4 py-3 text-sm transition-all focus:ring-2 focus:ring-[#00629d]/20 placeholder:text-[#707882]/50" 
                placeholder="Hãy mô tả chi tiết về sản phẩm của bạn: chất liệu, công dụng, hướng dẫn sử dụng..." 
              />
            </div>
          </div>

          {/* Card 3: Sales Info (Variant Matrix) */}
          <VariantBuilder 
            basePrice={formData.base_price} 
            setBasePrice={p => setFormData({...formData, base_price: p})} 
            baseStock={formData.base_stock}
            setBaseStock={s => setFormData({...formData, base_stock: s})}
            hasVariants={hasVariants}
            setHasVariants={setHasVariants}
            onVariantsChange={setVariantsMap}
            initialGroups={variantGroups}
            initialVariants={initialVariantsMap}
          />

          {/* Card 4: Shipping */}
          <div id="ship" className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2 h-8 bg-[#ffb952] rounded-full"></span>
              <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Vận chuyển</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#404751] mb-2">Cân nặng (gram)</label>
                  <input
                    type="number"
                    defaultValue={500}
                    min={1}
                    className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#404751] mb-2">Thời gian chuẩn bị hàng</label>
                  <select className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20">
                    <option>Chuẩn bị trong ngày</option>
                    <option>1 ngày</option>
                    <option>2 ngày</option>
                    <option>3 ngày</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#404751] mb-2">Kích thước gói hàng (cm)</label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    defaultValue={20}
                    min={1}
                    placeholder="Dài"
                    className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                  <input
                    type="number"
                    defaultValue={12}
                    min={1}
                    placeholder="Rộng"
                    className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                  <input
                    type="number"
                    defaultValue={6}
                    min={1}
                    placeholder="Cao"
                    className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20"
                  />
                </div>
              </div>

              <div className="bg-[#e9f5ff] border border-[#dbeaf5] rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-[#0f1d25] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00629d]">local_shipping</span>
                  Đơn vị vận chuyển áp dụng
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm text-[#404751]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-[#00629d] focus:ring-[#00629d]" />
                    Giao hàng tiết kiệm
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded text-[#00629d] focus:ring-[#00629d]" />
                    Giao hàng nhanh
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-[#00629d] focus:ring-[#00629d]" />
                    J&T Express
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-[#00629d] focus:ring-[#00629d]" />
                    Viettel Post
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#404751] mb-2">Ghi chú vận chuyển</label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Sản phẩm dễ vỡ, cần dán cảnh báo khi đóng gói..."
                  className="w-full bg-[#e9f5ff] border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20 placeholder:text-[#707882]/60"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Live Preview (20%) */}
        <aside className="col-span-3">
          <div className="sticky top-24">
            <div className="text-center mb-4">
              <h3 className="font-bold text-[#0f1d25] flex items-center justify-center gap-2 font-['Plus_Jakarta_Sans']">
                <span className="material-symbols-outlined text-[#00629d]">visibility</span>
                Xem trước hiển thị
              </h3>
              <p className="text-[10px] text-[#707882] mt-1 uppercase tracking-widest font-bold">Mobile View</p>
            </div>
            
            {/* Mobile Frame */}
            <div className="relative mx-auto border-[8px] border-slate-800 rounded-[2.5rem] w-[240px] h-[480px] bg-white shadow-2xl overflow-hidden flex flex-col">
              <div className="absolute top-0 z-10 w-full h-4 bg-slate-800 flex justify-center items-end pb-1">
                <div className="w-16 h-2 bg-slate-900 rounded-full"></div>
              </div>
              
              <div className="flex-1 overflow-y-auto mt-4 pb-12 custom-scrollbar">
                <div className="w-full aspect-square bg-[#e1f0fb] relative overflow-hidden">
                  <div className="w-full h-full bg-[#f5faff] flex items-center justify-center">
                    {formData.images.length > 0 ? (
                      <img src={formData.images[0]} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-[#707882]">image</span>
                    )}
                  </div>
                </div>
                
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-[#00629d] font-bold">
                    <span className="material-symbols-outlined text-[12px]">verified</span> Thương hiệu chính hãng
                  </div>
                  <h4 className="text-xs font-bold line-clamp-2">{formData.name || 'Tên sản phẩm của bạn sẽ hiển thị tại đây'}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#00629d] font-bold text-sm">
                      {getPreviewPrice()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="absolute bottom-0 w-full border-t border-[#e1f0fb] bg-white p-2 flex gap-2">
                <div className="flex-1 h-8 rounded-lg bg-[#e1f0fb] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#707882] text-lg">chat</span>
                </div>
                <div className="flex-[2] h-8 rounded-lg bg-[#6cbdfe] text-white text-[10px] font-bold flex items-center justify-center">
                  Thêm vào giỏ
                </div>
                <div className="flex-[2] h-8 rounded-lg bg-[#00629d] text-white text-[10px] font-bold flex items-center justify-center">
                  Mua ngay
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky Bottom Bar */}
      <footer className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-white/95 backdrop-blur-md border-t border-[#e1f0fb] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 px-8 py-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#707882] text-xs">
            <span className="material-symbols-outlined">info</span>
            Biên tập lại thông tin để gia tăng doanh số.
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/seller/products')}
              className="px-8 py-2.5 rounded-full text-sm font-semibold text-[#707882] hover:bg-[#e9f5ff] transition-colors"
            >
              Hủy chỉnh sửa
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-10 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-[#00629d]/20 transition-all ${isSubmitting ? 'bg-[#bfc7d3] cursor-not-allowed' : 'bg-[#42a5f5] text-white hover:scale-[1.02]'}`}
            >
              {isSubmitting ? 'Đang lưu cập nhật...' : 'Cập nhật sản phẩm'}
            </button>
          </div>
        </div>
      </footer>
    </SellerLayout>
  );
};
