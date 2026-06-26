import { FC, useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { useReviews, ReviewsData } from '../hooks/useReviews';
import { formatVnd, formatPriceRange } from '../utils/currency';
import ReportModal from '../components/shared/ReportModal';

// Biến cờ toàn cục để chặn double-fetch trong môi trường Dev (Strict Mode)
let globalLastFetchedId: string | null = null;
let lastFetchTimestamp: number = 0;

export const ProductDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchProductDetail, loading, error } = useProducts();
  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [reviewPage, setReviewPage] = useState(1);

  const { addToCart } = useCart();
  const { fetchProductReviews } = useReviews();

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    const loadProduct = async () => {
      const now = Date.now();
      // Nếu cùng 1 ID và gọi quá gần nhau (dưới 1 giây) -> Chặn
      if (id && (globalLastFetchedId !== id || now - lastFetchTimestamp > 1000)) {
        globalLastFetchedId = id;
        lastFetchTimestamp = now;
        
        const productId = parseInt(id);
        const data = await fetchProductDetail(productId);
        if (data) {
          setProduct(data);
          setSelectedImage(data.thumbnail_url || '');
          if (data.variants && data.variants.length > 0) {
             const firstVariant = data.variants[0];
             setSelectedVariant(firstVariant);
             if (firstVariant.attributes) {
               setSelections(firstVariant.attributes);
             }
          }
        }
        const revData = await fetchProductReviews(productId, 1, 10);
        setReviewPage(1);
        setReviewsData(revData);
      }
    };
    loadProduct();
  }, [id, fetchProductDetail, fetchProductReviews]);

  // Derive attribute groups from variants
  const attributeGroups = useMemo(() => {
    if (!product?.variants) return {};
    const groups: Record<string, Set<string>> = {};
    product.variants.forEach((v: any) => {
      if (v.attributes) {
        Object.entries(v.attributes).forEach(([key, value]) => {
          if (!groups[key]) groups[key] = new Set();
          groups[key].add(String(value));
        });
      }
    });
    const result: Record<string, string[]> = {};
    Object.entries(groups).forEach(([key, values]) => {
      result[key] = Array.from(values);
    });
    return result;
  }, [product?.variants]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#f9fafc]">
          <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (error || !product) {
    return (
      <MarketplaceLayout>
        <div className="flex flex-col items-center justify-center py-40 min-h-screen bg-[#f9fafc] px-6 text-center">
          <span className="material-symbols-outlined text-7xl text-red-300 mb-6">block</span>
          <h2 className="text-3xl font-black text-[#0f1d25] mb-4">Sản phẩm không khả dụng</h2>
          <p className="text-[#707882] text-lg max-w-md mx-auto mb-8">
            {error === 'Failed to fetch product details' ? 'Sản phẩm này đã bị khóa do vi phạm chính sách hoặc không tồn tại.' : (error || 'Sản phẩm này đã bị khóa hoặc không tồn tại.')}
          </p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-[#00629d] text-white rounded-full font-bold">
            Về Trang Chủ
          </button>
        </div>
      </MarketplaceLayout>
    );
  }

  const handleBuyNow = () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Navigate to checkout, ideally passing the selected variant ID and product info
    navigate('/checkout', { 
       state: { 
          product, 
          variant: selectedVariant,
          quantity
       } 
    });
  };

  const handleStartChat = async () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    if (!product || !product.shop_id || !product.shop?.owner_id) {
       alert("Shop không khả dụng để chat.");
       return;
    }

    try {
       setIsStartingChat(true);
       const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ shop_id: product.shop_id, seller_id: product.shop.owner_id })
       });
       
       if (!res.ok) throw new Error("Could not start chat");
       const json = await res.json();
       navigate(`/messages?convId=${json.id}`);
    } catch (e: any) {
       alert("Không thể bắt đầu chat lúc này.");
    } finally {
       setIsStartingChat(false);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!selectedVariant) return;
    
    const success = await addToCart(product.shop_id, selectedVariant.id, quantity);
    if (success) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      alert('Có lỗi xảy ra khi thêm vào giỏ hàng.');
    }
  };

  const handleAdminRejectProduct = async () => {
    const reason = window.prompt('Nhập lý do gỡ sản phẩm (sẽ gửi cho người bán):');
    if (!reason) return;
    
    try {
      setIsRejecting(true);
      const token = localStorage.getItem('c2c_token');
      const response = await fetch(`/api/admin/products/${product.id}/reject`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        alert('Đã gỡ sản phẩm thành công');
        navigate('/admin/products');
      } else {
        alert('Có lỗi xảy ra. Không thể gỡ sản phẩm.');
      }
    } catch (error) {
      alert('Có lỗi hệ thống.');
    } finally {
      setIsRejecting(false);
    }
  };

  const getPrice = () => {
    let rawPrice = selectedVariant?.price_override ?? selectedVariant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = product?.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const getComparePrice = () => {
    // Giá gốc thực (trước giảm): lấy từ variant hoặc product
    const raw = selectedVariant?.compare_at_price ?? selectedVariant?.original_price
      ?? product?.compare_at_price ?? product?.original_price ?? null;
    if (raw == null) return null;
    const num = Number(String(raw).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) || num <= 0 ? null : num;
  };

  const getDiscountPercent = () => {
    const comparePrice = getComparePrice();
    const salePrice = getPrice();
    if (!comparePrice || comparePrice <= salePrice) return null;
    return Math.round((1 - salePrice / comparePrice) * 100);
  };

  const allImages = [
    product.thumbnail_url,
    ...(product.images || []).map((img: any) => img.image_url)
  ].filter(Boolean);
  const images = Array.from(new Set(allImages));



  // Handle selection change and find matching variant
  const handleSelectionChange = (key: string, value: string) => {
    const nextSelections = { ...selections, [key]: value };
    setSelections(nextSelections);

    // Find if there's a variant matching these selections
    const matching = product?.variants?.find((v: any) => {
      if (!v.attributes) return false;
      return Object.entries(nextSelections).every(([k, val]) => v.attributes[k] === val);
    });

    if (matching) {
      setSelectedVariant(matching);
      if (matching.image_url) setSelectedImage(matching.image_url);
    }
  };

  // Check if an option is available (in stock for the current other selections)
  const isOptionAvailable = (attrName: string, attrValue: string) => {
    if (!product?.variants) return false;
    
    // Find any variant that matches this selection AND has stock
    return product.variants.some((v: any) => {
      if (!v.attributes) return false;
      
      // Must match the hypothetical option we are checking
      if (v.attributes[attrName] !== attrValue) return false;
      
      // Must match all OTHER current selections
      const matchesOthers = Object.entries(selections).every(([k, val]) => {
        if (k === attrName) return true; // Already checked above
        return v.attributes[k] === val;
      });
      
      return matchesOthers && (v.stock_quantity || 0) > 0;
    });
  };

  const totalReviews = reviewsData?.total || 0;
  const avgRating = reviewsData?.avg_rating ?? (Number(product?.rating || 0) || 0);
  const soldCount = Number(product?.sold_count || 0);
  const ratingDistribution = reviewsData?.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const featuredReviews = reviewsData?.reviews?.slice(0, 2) || [];

  const maskUserName = (review: any) => {
    const fullName = review?.user?.full_name?.trim();
    if (fullName) return fullName;
    const userId = review?.user_id;
    if (!userId) return 'Người mua';
    const str = String(userId);
    if (str.length <= 2) return `U${str}`;
    return `${str[0]}***${str[str.length - 1]}`;
  };

  const formatReviewDate = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('vi-VN');
  };

  const renderStars = (rating: number) => (
    <div className="flex text-[#ffb952]">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`material-symbols-outlined text-[16px] ${star <= rating ? 'fill-current' : 'text-[#e4e9f0] fill-current'}`}>
          star
        </span>
      ))}
    </div>
  );

  return (
    <MarketplaceLayout>
      <div className="bg-[#f9fafc] min-h-screen pb-20 font-['Inter']">
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#707882] mb-8">
            <Link to="/" className="hover:text-[#00629d] transition-colors">Trang chủ</Link>
            <span className="text-[#dbeaf5]">&gt;</span>
            <span>{product.category?.name || 'Lifestyle'}</span>
            <span className="text-[#dbeaf5]">&gt;</span>
            <span className="text-[#0f1d25] font-bold">{product.name}</span>
          </div>

          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
            
            {/* Left: Images Carousel */}
            <div className="space-y-4">
              <div className="w-full aspect-[4/5] bg-[#f0f3f8] rounded-[2rem] overflow-hidden flex items-center justify-center relative shadow-sm">
                 {selectedImage ? (
                    <img src={selectedImage} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                 ) : (
                    <span className="material-symbols-outlined text-[#00629d]/10 text-9xl">image</span>
                 )}
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img: any, idx: number) => {
                   const src = typeof img === 'string' ? img : img.image_url;
                   if (!src) return null;
                   return (
                      <button 
                         key={idx}
                         onClick={() => setSelectedImage(src)}
                         className={`w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden border-[3px] transition-all bg-[#f0f3f8] ${selectedImage === src ? 'border-[#00629d]' : 'border-transparent opacity-80 hover:opacity-100'}`}
                      >
                         <img src={src} alt="thumbnail" className="w-full h-full object-cover mix-blend-multiply" />
                      </button>
                   );
                })}
              </div>
            </div>

            {/* Right: Info Area */}
            <div className="flex flex-col pt-4">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-[#e0efff] text-[#00629d] text-[10px] font-black uppercase tracking-wider rounded-md mb-4">
                  LỰA CHỌN HÀNG ĐẦU
                </span>
                <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] leading-tight tracking-tight">
                  {product.name}
                </h1>
              </div>
              
              {/* Reviews & Sales Badge */}
              <div className="flex items-center gap-4 mb-6">
                 {renderStars(Math.round(avgRating))}
                 <div className="text-sm">
                   <span className="font-bold text-[#0f1d25] mr-1">{avgRating.toFixed(1)}</span>
                   <span className="text-[#707882]">({totalReviews.toLocaleString('vi-VN')} đánh giá)</span>
                 </div>
                 <div className="w-[1px] h-4 bg-[#dbeaf5]"></div>
                 <div className="text-sm">
                   <span className="font-bold text-[#0f1d25] mr-1">{soldCount.toLocaleString('vi-VN')}</span>
                   <span className="text-[#707882]">Đã bán</span>
                 </div>
              </div>

              <div className="bg-[#f0f7ff] rounded-2xl p-6 mb-8 flex items-baseline gap-4 flex-wrap">
                 <span className="text-4xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                   {selectedVariant ? formatVnd(getPrice()) : formatPriceRange(product.base_price, product.variants)}
                 </span>
                 {getComparePrice() && getComparePrice()! > getPrice() && (
                   <>
                     <span className="text-lg font-semibold text-[#707882] line-through">
                       {formatVnd(getComparePrice()!)}
                     </span>
                     <span className="text-xs font-bold text-[#d32f2f] uppercase tracking-wider">
                       GIẢM {getDiscountPercent()}%
                     </span>
                   </>
                 )}
              </div>

              {/* Variant Selections */}
              {Object.keys(attributeGroups).length > 0 ? (
                <div className="space-y-6 mb-8">
                  {Object.entries(attributeGroups).map(([attrName, values]) => (
                    <div key={attrName}>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-3">{attrName}</h3>
                      <div className="flex flex-wrap gap-3">
                        {values.map((val) => {
                          const isSelected = selections[attrName] === val;
                          const isAvailable = isOptionAvailable(attrName, val);
                          return (
                            <button 
                              key={val} 
                              disabled={!isAvailable}
                              onClick={() => handleSelectionChange(attrName, val)}
                              className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                                isSelected 
                                  ? 'border-[#00629d] bg-[#f0f7ff] text-[#00629d] ring-2 ring-[#00629d]/10' 
                                  : isAvailable
                                    ? 'border-transparent bg-[#f0f3f8] text-[#404751] hover:bg-[#e4e9f0]'
                                    : 'border-transparent bg-[#f0f3f8]/50 text-[#bfc7d3] cursor-not-allowed opacity-50'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : product?.variants?.length > 1 || product?.variants?.some((v: any) => !!v.name) ? (
                <div className="space-y-6 mb-8">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#707882] mb-3">Chọn phiên bản</h3>
                    <div className="flex flex-wrap gap-3">
                      {product.variants.map((v: any, idx: number) => (
                        <button 
                          key={v.id} 
                          disabled={(v.stock_quantity || 0) <= 0}
                          onClick={() => {
                              setSelectedVariant(v);
                              if (v.image_url) setSelectedImage(v.image_url);
                          }}
                          className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                            selectedVariant?.id === v.id 
                              ? 'border-[#00629d] bg-[#f0f7ff] text-[#00629d]' 
                              : (v.stock_quantity || 0) > 0
                                ? 'border-transparent bg-[#f0f3f8] text-[#404751] hover:bg-[#e4e9f0]'
                                : 'border-transparent bg-[#f0f3f8]/50 text-[#bfc7d3] cursor-not-allowed opacity-50'
                          }`}
                        >
                          {v.name || `Phiên bản ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Quantity Picker & Stock */}
              <div className="flex items-center gap-4 mb-10">
                <div className="flex items-center bg-[#f0f3f8] rounded-full p-1 border border-[#e4e9f0]">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[20px]">remove</span></button>
                  <span className="w-10 text-center font-bold text-[#0f1d25]">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[20px]">add</span></button>
                </div>
                <div className="text-xs text-[#707882] font-medium">
                  {selectedVariant?.stock_quantity > 0 ? (
                    <>Chỉ còn <span className="font-bold text-[#0f1d25]">{selectedVariant.stock_quantity} sản phẩm</span> trong kho</>
                  ) : (
                    <span className="text-[#d32f2f] font-bold uppercase">Hết hàng</span>
                  )}
                </div>
              </div>

               {/* Actions */}
              <div className="flex items-center gap-4 mt-auto">
                  {currentUser?.role === 'admin' ? (
                     <button 
                        onClick={handleAdminRejectProduct}
                        disabled={isRejecting}
                        className="w-full h-14 bg-red-50 text-red-600 rounded-full font-bold text-base flex items-center justify-center gap-2 hover:bg-red-100 transition-all disabled:opacity-50"
                     >
                        <span className="material-symbols-outlined">delete_forever</span>
                        {isRejecting ? 'Đang gỡ...' : 'Gỡ sản phẩm (Bản quyền/Vi phạm)'}
                     </button>
                  ) : currentUser?.shop && String(currentUser.shop.id) === String(product.shop_id) ? (
                     <button 
                        onClick={() => navigate(`/seller/edit-product/${product.id}`)}
                        className="w-full h-14 bg-[#fff8ec] text-[#e09110] rounded-full font-bold text-base flex items-center justify-center gap-2 hover:bg-[#ffeecb] transition-all"
                     >
                        <span className="material-symbols-outlined">edit_square</span>
                        Chỉnh sửa sản phẩm
                     </button>
                  ) : (
                     <>
                        <button 
                           className="h-14 w-14 bg-white border-2 border-[#00629d] text-[#00629d] rounded-full font-bold flex items-center justify-center transition-all hover:bg-[#f0f7ff] active:scale-[0.98] mr-2"
                           onClick={handleStartChat}
                           disabled={isStartingChat}
                           title="Chat với người bán"
                        >
                           <span className={`material-symbols-outlined ${isStartingChat ? 'animate-pulse' : ''}`}>chat</span>
                        </button>
                        <button 
                           onClick={handleAddToCart}
                           className="flex-1 h-14 bg-white border-2 border-[#00629d] text-[#00629d] rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all hover:bg-[#f0f7ff] active:scale-[0.98]"
                        >
                           <span className="material-symbols-outlined">shopping_bag</span>
                           Thêm vào giỏ
                        </button>
                        <button 
                           onClick={handleBuyNow}
                           className="flex-1 h-14 bg-[#00629d] text-white rounded-full font-bold text-base transition-all hover:bg-[#004e7c] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                        >
                           <span className="material-symbols-outlined">shopping_bag</span>
                           Mua ngay
                        </button>
                        {currentUser && (
                          <button
                            onClick={() => setShowReportModal(true)}
                            className="h-14 w-14 bg-white border-2 border-red-300 text-red-400 rounded-full font-bold flex items-center justify-center transition-all hover:bg-red-50 hover:border-red-500 hover:text-red-600 active:scale-[0.98]"
                            title="Tố cáo sản phẩm"
                          >
                            <span className="material-symbols-outlined text-[20px]">flag</span>
                          </button>
                        )}
                     </>
                  )}
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#e4e9f0] my-16"></div>

          {/* Middle Section: Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-16">
            
            {/* Left: Shop Card */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#e0efff] rounded-full flex items-center justify-center text-[#00629d] overflow-hidden">
                    {/* Simulated Logo based on actual product data if possible, using icon for now */}
                    <span className="material-symbols-outlined text-3xl">storefront</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0f1d25] text-lg text-truncate max-w-[180px]">{product.shop?.name || `Shop #${product.shop_id}`}</h4>
                    <p className="text-xs text-[#707882] font-semibold text-[#00629d]">Người bán ưu tiên</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                  <div className="bg-[#f0f7ff] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#707882] mb-1">Sản phẩm</p>
                    <p className="text-xl font-black text-[#0f1d25]">{product.shop?._count?.products || 0}</p>
                  </div>
                  <div className="bg-[#f0f7ff] rounded-xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#707882] mb-1">Đánh giá</p>
                    <p className="text-xl font-black text-[#0f1d25]">{Number(product.shop?.rating || 0).toFixed(1)}/5.0</p>
                  </div>
                </div>

                <Link to={`/shop/${product.shop_id}`} className="w-full py-3 bg-[#e4e9f0] hover:bg-[#dbeaf5] text-[#00629d] rounded-xl font-bold transition-colors block text-center mt-6">
                  Xem cửa hàng
                </Link>
              </div>
            </div>

            {/* Right: Specifications & Marketing */}
            <div className="lg:col-span-8 space-y-12">
              <div>
                <h3 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-6">Thông số kỹ thuật</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   {product.attribute_values && product.attribute_values.length > 0 ? (
                     product.attribute_values.map((attrVal: any) => (
                       <div key={attrVal.id} className="flex justify-between text-sm border-b border-[#e4e9f0] pb-2">
                         <span className="text-[#707882]">{attrVal.attribute?.name}</span>
                         <span className="font-bold text-[#0f1d25]">{attrVal.attribute_option?.value_name || attrVal.custom_value}</span>
                       </div>
                     ))
                   ) : (
                     <div className="col-span-2 text-sm text-[#707882]">Không có thông số nào.</div>
                   )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#00629d] mb-4">Mô tả sản phẩm</h3>
                <div className="space-y-4 text-[15px] leading-relaxed text-[#404751]">
                  {product.description ? (
                    <p className="whitespace-pre-line">{product.description}</p>
                  ) : (
                    <p>Người bán chưa cung cấp mô tả.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-[#e4e9f0] my-16"></div>

          {/* Bottom Section: Đánh giá từ cộng đồng */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <h2 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-2">Đánh giá từ cộng đồng</h2>
                <p className="text-[#707882] text-sm font-medium">
                  Dựa trên {totalReviews.toLocaleString('vi-VN')} đánh giá đã xác nhận
                </p>
              </div>
              <div className="bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-[#e4e9f0] flex items-center gap-8 min-w-[340px]">
                <div className="text-center">
                  <div className="text-[#00629d] text-5xl font-black font-['Plus_Jakarta_Sans'] leading-none">{avgRating.toFixed(1)}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#707882] mt-2">TRÊN 5</div>
                </div>
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
                    const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2 text-xs">
                        <div className="flex text-[#ffb952]">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`material-symbols-outlined text-[12px] fill-current ${star <= rating ? '' : 'text-[#e4e9f0]'}`}>
                              star
                            </span>
                          ))}
                        </div>
                        <div className="flex-1 h-1.5 bg-[#f0f3f8] rounded-full overflow-hidden">
                          <div className="h-full bg-[#00629d] rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="text-[#707882] font-semibold">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {featuredReviews.length === 0 ? (
                <div className="md:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0] text-center text-[#707882] text-sm">
                  Chưa có đánh giá nào cho sản phẩm này.
                </div>
              ) : (
                featuredReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#e4e9f0]">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#e0efff] text-[#00629d] rounded-full flex items-center justify-center font-bold">
                          {maskUserName(review).charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#0f1d25] text-sm">{maskUserName(review)}</p>
                          <p className="text-xs text-[#707882]">{formatReviewDate(review.created_at)}</p>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-[#404751] text-sm leading-relaxed mb-6">
                      {review.comment?.trim() || 'Người mua không để lại bình luận.'}
                    </p>
                    {Array.isArray(review.media_urls) && review.media_urls.length > 0 && (
                      <div className="flex gap-3 flex-wrap">
                        {review.media_urls.slice(0, 3).map((mediaUrl, index) => (
                          <div key={`${review.id}-${index}`} className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden">
                            <img src={mediaUrl} className="w-full h-full object-cover" alt="review media" />
                          </div>
                        ))}
                      </div>
                    )}
                    {review.seller_reply && (
                      <div className="mt-4 p-3 rounded-xl bg-[#f5faff] border border-[#e1f0fb]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#00629d] mb-1">Phản hồi từ shop</p>
                        <p className="text-sm text-[#404751]">{review.seller_reply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {reviewsData && reviewsData.total > reviewsData.reviews.length && (
              <div className="flex justify-center">
                <button
                  onClick={async () => {
                    const nextPage = reviewPage + 1;
                    setReviewPage(nextPage);
                    const data = await fetchProductReviews(parseInt(id!), nextPage, 10);
                    if (data) {
                      setReviewsData(prev => prev ? {
                        ...data,
                        reviews: [...prev.reviews, ...data.reviews]
                      } : data);
                    }
                  }}
                  className="px-8 py-3 rounded-full border-2 border-[#00629d] text-[#00629d] font-bold text-sm hover:bg-[#f0f7ff] transition-colors"
                >
                  Xem thêm đánh giá
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      <div 
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0f1d25] text-white px-8 py-4 rounded-full shadow-2xl shadow-black/20 flex items-center gap-4 transition-all duration-300 z-50 ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-[#4caf50]">check_circle</span>
        <span className="font-semibold text-sm">Đã thêm vào giỏ hàng thành công!</span>
        <Link to="/cart" className="ml-4 text-xs font-bold text-[#42a5f5] uppercase tracking-wider hover:opacity-80">
          Xem Giỏ
        </Link>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="product"
        targetId={product?.id}
        reporterId={currentUser?.id}
      />

    </MarketplaceLayout>
  );
};
