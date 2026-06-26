import { FC, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useCart } from '../hooks/useCart';
import { resolveAssetUrl } from '../config/api';

export const CartPage: FC = () => {
  const { cartItems, loading, updateCartItem, removeFromCart, fetchCartItems } = useCart();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
        try {
            setCurrentUser(JSON.parse(userStr));
            fetchCartItems();
        } catch (e) {}
    } else {
        navigate('/login', { state: { from: '/cart' } });
    }
  }, [fetchCartItems, navigate]);

  // Group cart items by shop
  const groupedItems = useMemo(() => {
    const groups: Record<number, { shop: any; items: any[] }> = {};
    cartItems.forEach((item) => {
      const shopId = item.product?.shop?.id;
      if (!shopId) return;
      if (!groups[shopId]) {
        groups[shopId] = { shop: item.product.shop, items: [] };
      }
      groups[shopId].items.push(item);
    });
    return Object.values(groups);
  }, [cartItems]);

  useEffect(() => {
    setSelectedItemIds((prev) => {
      const hadPreviousState = Object.keys(prev).length > 0;
      const next: Record<number, boolean> = {};
      for (const item of cartItems) {
        const itemId = Number(item.id);
        next[itemId] = hadPreviousState ? (prev[itemId] ?? true) : true;
      }
      return next;
    });
  }, [cartItems]);

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartItem(itemId, newQuantity);
  };

  const handleRemove = (itemId: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      removeFromCart(itemId);
    }
  };

  const getPrice = (item: any) => {
    let rawPrice = item.variant?.price_override || item.variant?.price;
    if (rawPrice === undefined || rawPrice === null) {
       rawPrice = item.product?.base_price;
    }
    const numPrice = Number(String(rawPrice).replace(/[^0-9.-]+/g,""));
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => !!selectedItemIds[Number(item.id)]),
    [cartItems, selectedItemIds],
  );

  const selectedGroupedItems = useMemo(() => {
    const groups: Record<number, { shop: any; items: any[] }> = {};
    selectedCartItems.forEach((item) => {
      const shopId = item.product?.shop?.id;
      if (!shopId) return;
      if (!groups[shopId]) {
        groups[shopId] = { shop: item.product.shop, items: [] };
      }
      groups[shopId].items.push(item);
    });
    return Object.values(groups);
  }, [selectedCartItems]);

  const calculateSubtotal = (items: any[]) => {
    return items.reduce((acc, item) => acc + (getPrice(item) * item.quantity), 0);
  };

  const totalPayment = calculateSubtotal(selectedCartItems);

  const selectedCount = selectedCartItems.length;
  const allSelected = cartItems.length > 0 && selectedCount === cartItems.length;

  const toggleItemSelection = (itemId: number, checked: boolean) => {
    setSelectedItemIds((prev) => ({ ...prev, [itemId]: checked }));
  };

  const toggleAllSelection = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    for (const item of cartItems) {
      next[Number(item.id)] = checked;
    }
    setSelectedItemIds(next);
  };

  const toggleShopSelection = (items: any[], checked: boolean) => {
    setSelectedItemIds((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[Number(item.id)] = checked;
      }
      return next;
    });
  };

  const handleCheckout = () => {
    if (selectedCartItems.length === 0) return;
    
    navigate('/checkout', { 
        state: { 
            fromCart: true, 
            cartItems: selectedCartItems, 
            groupedItems: selectedGroupedItems 
        } 
    });
  };

  return (
    <MarketplaceLayout>
      <div className="bg-[#f5faff] min-h-screen pb-24 font-['Inter']">
        {/* Banner */}
        <div className="bg-[#0f1d25] pt-12 pb-24 px-8 rounded-b-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-10 w-64 h-64 bg-[#00629d] rounded-full mix-blend-screen filter blur-3xl"></div>
            <div className="absolute bottom-0 right-10 w-64 h-64 bg-[#42a5f5] rounded-full mix-blend-screen filter blur-3xl"></div>
          </div>
          <div className="max-w-[1200px] mx-auto relative z-10">
            <h1 className="text-4xl md:text-5xl font-black font-['Plus_Jakarta_Sans'] text-white tracking-tight mb-4">
              Giỏ hàng của bạn
            </h1>
            <p className="text-[#a0aab5] text-sm md:text-base max-w-lg font-medium">
              Kiểm tra lại các sản phẩm bạn đã chọn trước khi tiến hành bước thanh toán.
            </p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 -mt-12 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Cart Items list */}
            <div className="flex-1">
              <div className="bg-white rounded-3xl shadow-sm border border-[#e4e9f0] p-6 lg:p-8 space-y-10">
                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <div className="w-10 h-10 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
                    </div>
                ) : groupedItems.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-6xl text-[#dbeaf5] mb-4">shopping_bag</span>
                        <h3 className="text-xl font-bold text-[#0f1d25] mb-2">Giỏ hàng trống</h3>
                        <p className="text-[#707882] mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng.</p>
                        <Link to="/" className="px-8 py-3 bg-[#00629d] text-white rounded-full font-bold shadow-md shadow-blue-500/20 hover:bg-[#004e7c] transition-colors">
                            Tiếp tục mua sắm
                        </Link>
                    </div>
                ) : (
                    groupedItems.map((group) => (
                      <div key={group.shop.id} className="space-y-6">
                        {/* Shop Header */}
                        <div className="flex items-center gap-3 border-b border-[#f0f3f8] pb-4">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded text-[#00629d] focus:ring-[#00629d]"
                              checked={group.items.every((item) => !!selectedItemIds[Number(item.id)])}
                              onChange={(e) => toggleShopSelection(group.items, e.target.checked)}
                              aria-label={`Chọn tất cả sản phẩm của ${group.shop.name}`}
                            />
                            <span className="material-symbols-outlined text-[#00629d]">storefront</span>
                            <span className="font-bold text-[#0f1d25]">{group.shop.name}</span>
                            <Link to={`/seller/${group.shop.id}`} className="text-xs text-[#00629d] font-semibold hover:underline">Xem Shop</Link>
                        </div>

                        {/* Items */}
                        <div className="space-y-6">
                            {group.items.map((item) => (
                                <div key={item.id} className="flex gap-6 items-start">
                                    <input
                                      type="checkbox"
                                      className="mt-8 w-4 h-4 rounded text-[#00629d] focus:ring-[#00629d]"
                                      checked={!!selectedItemIds[Number(item.id)]}
                                      onChange={(e) => toggleItemSelection(Number(item.id), e.target.checked)}
                                      aria-label={`Chọn sản phẩm ${item.product?.name || item.id}`}
                                    />
                                    {/* Image */}
                                    <div className="w-24 h-24 bg-[#f0f3f8] rounded-2xl overflow-hidden flex-shrink-0">
                                        {(() => {
                                          const imageSrc = resolveAssetUrl(item.variant?.image_url || item.product?.thumbnail_url || '');
                                          return imageSrc ? (
                                            <img src={imageSrc} alt="thumbnail" className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="material-symbols-outlined text-[#dbeaf5] text-4xl w-full h-full flex items-center justify-center">image</span>
                                          );
                                        })()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <Link to={`/product/${item.product?.id}`} className="text-[#0f1d25] font-bold block truncate hover:text-[#00629d] transition-colors">
                                            {item.product?.name}
                                        </Link>
                                        
                                        {item.variant?.attributes && (
                                            <div className="mt-1 text-xs text-[#707882] font-semibold flex gap-2 flex-wrap">
                                                Phân loại: 
                                                {Object.entries(item.variant.attributes).map(([k, v]) => (
                                                    <span key={k} className="px-2 py-0.5 bg-[#f0f3f8] rounded text-[#404751]">{String(v)}</span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="font-bold text-[#00629d]">
                                                {getPrice(item).toLocaleString('vi-VN')} ₫
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center bg-[#f0f3f8] rounded-full p-1 border border-[#e4e9f0]">
                                                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[18px]">remove</span></button>
                                                    <span className="w-8 text-center text-sm font-bold text-[#0f1d25]">{item.quantity}</span>
                                                    <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-[#404751] hover:text-[#0f1d25] transition-colors"><span className="material-symbols-outlined text-[18px]">add</span></button>
                                                </div>

                                                <button onClick={() => handleRemove(item.id)} className="text-[#707882] hover:text-red-500 transition-colors" title="Xóa">
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="w-full lg:w-[380px]">
              <div className="bg-white rounded-3xl shadow-sm border border-[#e4e9f0] p-6 lg:p-8 sticky top-32">
                <h3 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-6">Tóm tắt đơn hàng</h3>
                <div className="mb-4 p-3 rounded-2xl bg-[#f5faff] border border-[#e4e9f0]">
                  <label className="flex items-center justify-between text-sm font-semibold text-[#404751]">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-[#00629d] focus:ring-[#00629d]"
                        checked={allSelected}
                        onChange={(e) => toggleAllSelection(e.target.checked)}
                        disabled={cartItems.length === 0}
                      />
                      Chọn tất cả
                    </span>
                    <span className="text-[#00629d]">{selectedCount}/{cartItems.length}</span>
                  </label>
                </div>
                
                <div className="space-y-4 text-sm font-medium border-b border-[#f0f3f8] pb-6 mb-6">
                  <div className="flex justify-between text-[#404751]">
                    <span>Tạm tính ({selectedCount} sản phẩm)</span>
                    <span className="font-bold text-[#0f1d25]">{totalPayment.toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex justify-between text-[#404751]">
                    <span>Giảm giá</span>
                    <span className="font-bold text-green-600">0 ₫</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="text-[#0f1d25] font-bold">Tổng cộng</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                      {totalPayment.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-[10px] text-[#707882] uppercase mt-1">Đã bao gồm VAT</div>
                  </div>
                </div>

                <button 
                  disabled={selectedCount === 0}
                  onClick={handleCheckout}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    selectedCount > 0 
                    ? 'bg-[#00629d] hover:bg-[#004e7c] text-white shadow-blue-500/20 active:scale-[0.98]' 
                    : 'bg-[#e4e9f0] text-[#a0aab5] cursor-not-allowed shadow-none'
                  }`}
                >
                  Thanh toán sản phẩm đã chọn
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
