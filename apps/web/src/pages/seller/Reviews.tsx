import { FC, useEffect, useState } from 'react';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useReviews, Review } from '../../hooks/useReviews';
import { resolveAssetUrl } from '../../config/api';

type FilterType = 'all' | 'pending' | 'replied' | '5' | '4' | '3' | '2' | '1';

export const ReviewsPage: FC = () => {
  const { sellerReviews, loading, fetchSellerReviews, replyToReview } = useReviews();
  const [filter, setFilter] = useState<FilterType>('all');
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSellerReviews();
  }, [fetchSellerReviews]);

  const filteredReviews = sellerReviews.filter((r: Review) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !r.seller_reply;
    if (filter === 'replied') return !!r.seller_reply;
    return r.rating === Number(filter);
  });

  const stats = {
    total: sellerReviews.length,
    pending: sellerReviews.filter(r => !r.seller_reply).length,
    replied: sellerReviews.filter(r => !!r.seller_reply).length,
    avgRating: sellerReviews.length > 0
      ? Math.round((sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length) * 10) / 10
      : 0,
  };

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    const result = await replyToReview(reviewId, replyText.trim());
    if (result) {
      setReplyingId(null);
      setReplyText('');
      await fetchSellerReviews();
    }
    setSubmitting(false);
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: stats.total },
    { key: 'pending', label: 'Chưa phản hồi', count: stats.pending },
    { key: 'replied', label: 'Đã phản hồi', count: stats.replied },
    { key: '5', label: '5★' },
    { key: '4', label: '4★' },
    { key: '3', label: '3★' },
    { key: '2', label: '2★' },
    { key: '1', label: '1★' },
  ];

  return (
    <SellerLayout pageTitle="Đánh giá">
      <div className="pb-12 max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Quản lý đánh giá</h2>
            <p className="text-[#404751] mt-1 text-sm">Theo dõi và phản hồi đánh giá từ khách hàng</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { title: 'Tổng đánh giá', value: stats.total, icon: 'reviews', color: 'from-blue-500 to-cyan-400' },
            { title: 'Đánh giá TB', value: `${stats.avgRating}/5`, icon: 'star', color: 'from-amber-400 to-orange-500' },
            { title: 'Chưa phản hồi', value: stats.pending, icon: 'pending', color: 'from-rose-400 to-pink-500' },
            { title: 'Đã phản hồi', value: stats.replied, icon: 'check_circle', color: 'from-emerald-400 to-teal-500' },
          ].map((card, idx) => (
            <div key={idx} className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-transform duration-300 group">
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md mb-4`}>
                <span className="material-symbols-outlined text-xl">{card.icon}</span>
              </div>
              <p className="text-[#707882] font-medium text-sm">{card.title}</p>
              <h3 className="text-2xl font-extrabold text-[#0f1d25] mt-1 font-['Plus_Jakarta_Sans']">{card.value}</h3>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                filter === f.key
                  ? 'bg-[#00629d] text-white shadow-md'
                  : 'bg-white border border-[#e4e9f0] text-[#404751] hover:border-[#00629d] hover:text-[#00629d]'
              }`}
            >
              {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="text-center p-12 text-[#00629d] font-bold animate-pulse">Đang tải đánh giá...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-[#dbeaf5] mb-4 block">rate_review</span>
            <h3 className="text-lg font-bold text-[#0f1d25] mb-2">Chưa có đánh giá nào</h3>
            <p className="text-sm text-[#707882]">Khi khách hàng đánh giá sản phẩm, chúng sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((rev: Review) => {
              const maskedName = `Người dùng ***${String(rev.user_id).slice(-2)}`;
              const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
              const thumbnail = rev.product?.thumbnail_url ? resolveAssetUrl(rev.product.thumbnail_url) : '';
              const isReplying = replyingId === rev.id;

              return (
                <div key={rev.id} className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] transition-shadow">
                  <div className="flex gap-5">
                    {/* Product thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-[#f0f3f8] flex-shrink-0 overflow-hidden">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-[#bfc7d3]">inventory_2</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-[#0f1d25] line-clamp-1">{rev.product?.name || 'Sản phẩm'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-[#707882] font-medium">{maskedName}</span>
                            <span className="text-[10px] text-[#bfc7d3]">•</span>
                            <span className="text-xs text-[#707882]">{dateStr}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`material-symbols-outlined text-[14px] ${s <= rev.rating ? 'text-[#ffb952]' : 'text-[#e4e9f0]'}`} style={{ fontVariationSettings: s <= rev.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-sm text-[#404751] leading-relaxed mb-3">{rev.comment}</p>
                      )}

                      {/* Seller reply */}
                      {rev.seller_reply ? (
                        <div className="p-4 bg-[#f5faff] rounded-xl border border-[#e0efff]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-[#00629d] text-sm">storefront</span>
                            <span className="text-xs font-bold text-[#00629d]">Phản hồi của bạn</span>
                            {rev.replied_at && <span className="text-[10px] text-[#707882]">• {new Date(rev.replied_at).toLocaleDateString('vi-VN')}</span>}
                          </div>
                          <p className="text-sm text-[#404751]">{rev.seller_reply}</p>
                        </div>
                      ) : isReplying ? (
                        <div className="space-y-3">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Viết phản hồi cho khách hàng..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-[#e4e9f0] bg-white text-sm text-[#0f1d25] resize-none focus:outline-none focus:ring-2 focus:ring-[#00629d]/20 focus:border-[#00629d] transition-all"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setReplyingId(null); setReplyText(''); }}
                              className="px-4 py-2 rounded-lg text-sm font-bold text-[#707882] hover:bg-[#f0f3f8] transition-colors"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleReply(rev.id)}
                              disabled={submitting || !replyText.trim()}
                              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-[#00629d] hover:bg-[#004e7c] disabled:opacity-50 transition-all shadow-sm"
                            >
                              {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyingId(rev.id); setReplyText(''); }}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#00629d] hover:text-[#004e7c] transition-colors mt-1"
                        >
                          <span className="material-symbols-outlined text-sm">reply</span>
                          Phản hồi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SellerLayout>
  );
};
