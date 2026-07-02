import { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';
import { formatVnd } from '../utils/currency';
import { getOrderPricing } from '../utils/orderPricing';
import { resolveAssetUrl, PRODUCT_API_URL } from '../config/api';

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: 'CHờ Xử LÝ',     color: 'bg-[#fff8e5] text-[#e09110] border-[#ffb952]/30', icon: 'schedule' },
  confirmed:  { label: 'ĐÃ XÁC NHẬN',  color: 'bg-[#e1f9f1] text-[#00a67e] border-[#00a67e]/30', icon: 'check_circle' },
  shipped:    { label: 'ĐANG GIAO',    color: 'bg-[#cfe5ff] text-[#00629d] border-[#00629d]/30', icon: 'local_shipping' },
  delivered:  { label: 'HOÀN THÀNH',  color: 'bg-[#e0efff] text-[#00629d] border-[#00629d]/30', icon: 'inventory_2' },
  cancelled:  { label: 'ĐÃ HỦY',      color: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/30', icon: 'cancel' },
};

const sidebarItems = [
  { label: 'Hồ sơ của tôi',    icon: 'person',        path: '/profile',  active: false },
  { label: 'Lịch sử đơn hàng', icon: 'receipt_long',  path: '/orders',   active: true },
  { label: 'Tin nhắn',         icon: 'chat',          path: '/messages', active: false },
];

export const MyPurchasesPage: FC = () => {
  const { orders, fetchBuyerOrders, loading, updateOrderStatus } = useOrders();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Review Modal State
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());

  const makeReviewKey = (shopOrderId: number, productId?: number | null) => `${shopOrderId}-${productId ?? 'unknown'}`;

  const handleSubmitReview = async () => {
    if (!reviewOrder || !reviewItem) return;
    if (!reviewItem.product_id) {
      alert('Không thể đánh giá vì sản phẩm này đã không còn tồn tại trên hệ thống (bị xóa hoặc gỡ bỏ).');
      return;
    }
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/${reviewItem.product_id}/reviews`, { // using correct API gateway endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          product_id: reviewItem.product_id,
          shop_order_id: reviewOrder.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi khi gửi đánh giá');
      }

      setReviewSuccess(true);
      setReviewedItems(prev => {
        const next = new Set(prev);
        next.add(makeReviewKey(reviewOrder.id, reviewItem.product_id));
        return next;
      });
      setTimeout(() => {
        setReviewOrder(null);
        setReviewItem(null);
        setReviewSuccess(false);
        setReviewRating(5);
        setReviewComment('');
      }, 2000);

    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    
    const success = await updateOrderStatus(orderId, 'cancelled');
    if (success) {
      alert('Đã hủy đơn hàng thành công');
      fetchBuyerOrders();
    } else {
      alert('Lỗi khi hủy đơn hàng. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
    const token = localStorage.getItem('c2c_token');
    if (!token) {
      navigate('/login', { state: { from: '/orders' } });
      return;
    }
    fetchBuyerOrders();
    
    // Fetch user's reviewed orders
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${PRODUCT_API_URL}/reviews/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReviewedItems(new Set(data.map((r: any) => makeReviewKey(r.shop_order_id, r.product_id))));
        }
      } catch (e) {}
    };
    fetchReviews();

  }, [fetchBuyerOrders, navigate]);

  const tabs = [
    { key: 'all',        label: 'Tất cả' },
    { key: 'pending',    label: 'Chờ xác nhận' },
    { key: 'shipped',    label: 'Đang giao' },
    { key: 'delivered',  label: 'Hoàn thành' },
    { key: 'cancelled',  label: 'Đã hủy' },
  ];

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o: any) => o.status?.toLowerCase() === activeTab);

  return (
    <MarketplaceLayout>
      <div className="max-w-[1280px] mx-auto px-8 py-4 font-['Inter']">
        <div className="grid grid-cols-12 gap-10">

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="sticky top-36 space-y-6">
              <div className="bg-white rounded-[2rem] border border-[#e4e9f0] p-8 shadow-sm">
                <h3 className="text-sm font-black text-[#0f1d25] mb-1">Tài khoản</h3>
                <p className="text-[10px] text-[#707882] font-semibold uppercase tracking-widest mb-6">Quản lý tài khoản của bạn</p>
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                        item.active
                          ? 'bg-[#e0efff] text-[#00629d]'
                          : 'text-[#707882] hover:bg-[#f5faff] hover:text-[#0f1d25]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 lg:col-span-9">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] tracking-tight">Đơn mua của tôi</h1>
              <p className="text-[#707882] text-sm font-medium mt-1">Theo dõi, quản lý và đánh giá đơn hàng của bạn.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#00629d] text-white shadow-md shadow-blue-300/30'
                      : 'bg-white text-[#707882] border border-[#e4e9f0] hover:bg-[#f5faff] hover:text-[#00629d]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
                <p className="mt-4 text-[#707882] font-bold text-sm">Đang tải đơn hàng...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-[#e4e9f0] p-16 text-center shadow-sm">
                <span className="material-symbols-outlined text-7xl text-[#dbeaf5]">shopping_bag</span>
                <h3 className="mt-6 text-lg font-black text-[#0f1d25]">Chưa có đơn hàng nào</h3>
                <p className="text-[#707882] text-sm mt-2 max-w-xs mx-auto">Khám phá sản phẩm yêu thích và đơn hàng sẽ xuất hiện tại đây.</p>
                <Link to="/" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#00629d] text-white rounded-full text-sm font-bold hover:bg-[#004e7c] transition-all shadow-md shadow-blue-400/20">
                  <span className="material-symbols-outlined text-lg">explore</span>
                  Khám phá sản phẩm
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order: any) => {
                  const status = statusConfig[order.status?.toLowerCase()] || statusConfig.pending;
                  const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
                  const customerName = order.shipping_address?.split(',')[0] || 'Order';
                  const pricing = getOrderPricing(order);

                  return (
                    <div key={order.id} className="bg-white rounded-[2rem] border border-[#e4e9f0] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Order Header */}
                      <div className="flex justify-between items-center px-8 py-5 bg-[#f9fafc] border-b border-[#e4e9f0]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#e0efff] rounded-full flex items-center justify-center text-[#00629d]">
                            <span className="material-symbols-outlined text-lg">storefront</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0f1d25]">{order.shop_name || `Shop #${order.shop_id}`}</p>
                            <p className="text-[10px] text-[#707882] font-semibold">
                              Order #SR-{String(order.id).padStart(5, '0')} • {orderDate}
                            </p>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.color}`}>
                          {status.label}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="px-8 py-5 divide-y divide-[#f0f3f8]">
                        {(order.items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-5 py-4 first:pt-0 last:pb-0">
                            <div className="w-20 h-20 bg-[#f0f3f8] border border-[#e4e9f0] rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {(item.product_image_url || item.product_thumbnail_url) ? (
                                <img 
                                  src={resolveAssetUrl(item.product_image_url || item.product_thumbnail_url)} 
                                  alt={item.product_name} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className="material-symbols-outlined text-3xl text-[#bfc7d3]">inventory_2</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-[#0f1d25] line-clamp-1">{item.product_name}</h4>
                              {item.variant_details && (
                                <p className="text-[10px] text-[#707882] mt-0.5 uppercase tracking-wider font-bold">
                                  {typeof item.variant_details === 'object'
                                    ? Object.entries(item.variant_details).map(([k, v]) => `${k}: ${v}`).join(' • ')
                                    : String(item.variant_details)
                                  }
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-black text-[#00629d] text-sm">
                                {formatVnd(item.price_at_purchase)}
                              </p>
                              <p className="text-[10px] text-[#707882] font-semibold mt-0.5">SL: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div className="flex items-center justify-between px-8 py-5 bg-[#f9fafc] border-t border-[#e4e9f0]">
                        <div>
                          <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest">Tổng cộng</p>
                          <p className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                            {formatVnd(pricing.finalTotal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {order.status?.toLowerCase() === 'pending' && (
                            <button 
                              onClick={() => handleCancelOrder(order.id)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-full text-xs font-bold hover:bg-red-50 transition-all"
                            >
                              <span className="material-symbols-outlined text-base">cancel</span>
                              Hủy đơn hàng
                            </button>
                          )}
                          {order.status?.toLowerCase() === 'shipped' && (
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e4e9f0] text-[#0f1d25] rounded-full text-xs font-bold hover:bg-[#f5faff] transition-all">
                              <span className="material-symbols-outlined text-base">local_shipping</span>
                              Theo dõi
                            </button>
                          )}
                          {order.status?.toLowerCase() === 'delivered' &&
                            (order.items || []).some((item: any) => !reviewedItems.has(makeReviewKey(order.id, item.product_id))) && (
                            <button 
                              onClick={() => {
                                const firstUnreviewedItem = (order.items || []).find(
                                  (item: any) => !reviewedItems.has(makeReviewKey(order.id, item.product_id))
                                );
                                setReviewOrder(order);
                                setReviewItem(firstUnreviewedItem || order.items?.[0] || null);
                                setReviewRating(5);
                                setReviewComment('');
                                setReviewSuccess(false);
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#00629d] text-[#00629d] rounded-full text-xs font-bold hover:bg-[#f5faff] transition-all"
                            >
                              <span className="material-symbols-outlined text-base fill-current">star</span>
                              Đánh giá
                            </button>
                          )}
                          {order.status?.toLowerCase() === 'delivered' &&
                            (order.items || []).length > 0 &&
                            (order.items || []).every((item: any) => reviewedItems.has(makeReviewKey(order.id, item.product_id))) && (
                            <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-[#f5faff] border border-[#e1f0fb] text-[#a0aab5] rounded-full text-xs font-bold cursor-not-allowed">
                              <span className="material-symbols-outlined text-base fill-current">star</span>
                              Đã đánh giá
                            </button>
                          )}
                          <Link
                            to={`/orders/${order.id}`}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#00629d] text-white rounded-full text-xs font-bold hover:bg-[#004e7c] transition-all shadow-sm shadow-blue-400/20"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
      {/* Review Modal */}
      {reviewOrder && reviewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f1d25]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white max-w-[480px] w-full rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-5 border-b border-[#e4e9f0] flex items-center justify-between bg-[#f9fafc]">
              <h3 className="font-black text-[#0f1d25] text-lg font-['Plus_Jakarta_Sans']">Đánh giá Sản phẩm</h3>
              <button onClick={() => { setReviewOrder(null); setReviewItem(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f0f3f8] text-[#707882] hover:bg-[#e4e9f0] hover:text-[#0f1d25] transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {reviewSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 bg-[#e1f9f1] text-[#00a67e] rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <span className="material-symbols-outlined text-3xl font-bold">check</span>
                  </div>
                  <h4 className="font-bold text-[#0f1d25] text-lg">Cảm ơn bạn!</h4>
                  <p className="text-[#707882] text-sm mt-1">Đánh giá của bạn đã được hệ thống ghi nhận.</p>
                </div>
              ) : (
                <>
                  {/* Product Mini Preview */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-[#f5faff] border border-[#e1f0fb]">
                    <div className="w-14 h-14 bg-white rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-[#e4e9f0]">
                      {reviewItem.product_thumbnail_url ? (
                        <img src={resolveAssetUrl(reviewItem.product_thumbnail_url)} className="w-full h-full object-cover" alt="thumbnail" />
                      ) : (
                        <span className="material-symbols-outlined text-[#bfc7d3]">inventory_2</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#0f1d25] text-sm line-clamp-1">{reviewItem.product_name}</p>
                      <p className="text-xs text-[#707882] mt-0.5 tracking-wider uppercase font-bold">SL: {reviewItem.quantity}</p>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-sm font-bold text-[#404751]">Chất lượng sản phẩm</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className={`material-symbols-outlined text-4xl transition-all ${
                            star <= reviewRating 
                              ? 'text-[#ffb952] fill-current scale-110 drop-shadow-sm' 
                              : 'text-[#e4e9f0] hover:text-[#ffb952]/40'
                          }`}
                        >
                          star
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#ffb952] font-bold mt-1">
                      {['Tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'][reviewRating - 1]}
                    </p>
                  </div>

                  {/* Comment */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">Nhận xét (Tùy chọn)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Chia sẻ trải nghiệm sử dụng của bạn để giúp những người mua khác..."
                      className="w-full h-32 p-4 bg-[#f9fafc] border border-[#e4e9f0] focus:bg-white focus:border-[#00629d]/50 rounded-2xl outline-none transition-all placeholder-[#a0aab5] resize-none text-sm"
                    ></textarea>
                  </div>

                  {/* Action */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="w-full h-12 bg-[#00629d] text-white rounded-xl font-bold hover:bg-[#004e7c] transition-all flex items-center justify-center gap-2 disabled:bg-[#a0aab5] disabled:cursor-not-allowed shadow-md shadow-blue-400/20"
                  >
                    {submittingReview ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Gửi đánh giá ngay'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </MarketplaceLayout>
  );
};
