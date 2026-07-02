import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

interface PendingProduct {
  id: number;
  name: string;
  description: string | null;
  base_price: string;
  thumbnail_url: string;
  status: string;
  created_at: string;
  shop: { name: string };
  category: { name: string };
  images: Array<{ id: number; image_url: string; is_primary: boolean }>;
  variants: Array<{ id: number; sku: string; price_override: string | null; stock_quantity: number; attributes: any }>;
  attribute_values: Array<{
    id: number;
    custom_value: string | null;
    attribute: { name: string };
    attribute_option: { value_name: string } | null;
  }>;
}

const ProductModeration: FC = () => {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Rejection Modal State
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal State
  const [detailProduct, setDetailProduct] = useState<PendingProduct | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products/pending');
      if (!response.ok) throw new Error('Failed to fetch pending products');
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleApprove = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt sản phẩm này không?')) return;
    
    try {
      const response = await fetch(`/api/admin/products/${id}/approve`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Duyệt sản phẩm thất bại');
      
      // Update local state
      setProducts(products.filter(p => p.id !== id));
      setDetailProduct(null);
      alert('Sản phẩm đã được duyệt thành công!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    const id = rejectingId || detailProduct?.id;
    if (!id || !rejectReason.trim()) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/products/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      
      if (!response.ok) throw new Error('Từ chối duyệt thất bại');
      
      // Update local state
      setProducts(products.filter(p => p.id !== id));
      setRejectingId(null);
      setDetailProduct(null);
      setRejectReason('');
      alert('Sản phẩm đã bị từ chối duyệt.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Kiểm duyệt sản phẩm">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
          <div className="px-10 py-8 border-b border-[#f5faff] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Danh sách sản phẩm chờ duyệt</h3>
            <div className="flex gap-2">
               <span className="px-4 py-1.5 bg-[#e9f5ff] text-[#00629d] rounded-full text-[10px] font-bold uppercase tracking-wider">
                 Tổng cộng {products.length} sản phẩm
               </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5faff] text-[#707882] text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-10 py-5">Thông tin sản phẩm</th>
                  <th className="px-6 py-5">Người bán</th>
                  <th className="px-6 py-5">Danh mục</th>
                  <th className="px-6 py-5">Giá</th>
                  <th className="px-10 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5faff]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-[#707882] text-sm animate-pulse">
                      Đang tìm kiếm sản phẩm chờ duyệt...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                       <span className="material-symbols-outlined text-4xl text-[#cfe5ff] mb-4">check_circle</span>
                       <p className="text-[#0f1d25] font-bold">Đã duyệt hết!</p>
                       <p className="text-[#707882] text-xs">Hiện không có sản phẩm nào cần kiểm duyệt.</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#f5faff]/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <img 
                            src={product.thumbnail_url || 'https://via.placeholder.com/100'} 
                            alt={product.name}
                            className="w-14 h-14 rounded-2xl object-cover shadow-sm bg-[#f5faff]"
                          />
                          <div>
                            <p className="text-sm font-bold text-[#0f1d25] mb-1 group-hover:text-[#00629d] transition-colors">{product.name}</p>
                            <p className="text-[10px] text-[#707882] font-medium tracking-tight">ID: #{product.id} • {new Date(product.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#f5faff] text-[#0f1d25] text-xs font-semibold">
                          {product.shop.name}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-sm text-[#707882] font-medium">{product.category.name}</td>
                      <td className="px-6 py-6 font-['Plus_Jakarta_Sans'] font-bold text-[#0f1d25]">{Number(product.base_price).toLocaleString('vi-VN')} ₫</td>
                      <td className="px-10 py-6 text-right space-x-2">
                        <button 
                          onClick={() => setDetailProduct(product)}
                          className="px-4 py-2 bg-[#e9f5ff] text-[#00629d] rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#cfe5ff] transition-all"
                        >
                          Chi tiết
                        </button>
                        <button 
                          onClick={() => handleApprove(product.id)}
                          className="px-4 py-2 bg-[#dcfce7] text-[#166534] rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#bbf7d0] transition-all"
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => setRejectingId(product.id)}
                          className="px-4 py-2 bg-[#fee2e2] text-[#991b1b] rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#fecaca] transition-all"
                        >
                          Từ chối
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Review Modal */}
      {detailProduct && (
        <div className="fixed inset-0 bg-[#0f1d25]/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#f5faff] w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-500">
            {/* Modal Header */}
            <div className="px-12 py-8 bg-white flex items-center justify-between border-b border-[#e1f0fb]">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-[#e9f5ff] text-[#00629d] rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined">pageview</span>
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Kiểm duyệt sản phẩm</h3>
                    <p className="text-xs text-[#707882]">Vui lòng kiểm tra kỹ thông tin sản phẩm trước khi quyết định.</p>
                 </div>
              </div>
              <button 
                onClick={() => setDetailProduct(null)}
                className="w-10 h-10 rounded-full hover:bg-[#f5faff] flex items-center justify-center text-[#707882] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <div className="grid grid-cols-12 gap-10">
                {/* Left: Gallery & Content */}
                <div className="col-span-7 space-y-10">
                  {/* Gallery */}
                  <div>
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] mb-4 block ml-2">Bộ sưu tập sản phẩm</label>
                    <div className="grid grid-cols-2 gap-4">
                      {detailProduct.images.length > 0 ? (
                        detailProduct.images.map(img => (
                          <div key={img.id} className="aspect-square bg-white rounded-[2rem] border border-[#e1f0fb] overflow-hidden group">
                            <img src={img.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 py-10 bg-white/50 border-2 border-dashed border-[#cfe5ff] rounded-[2rem] flex flex-col items-center justify-center text-[#707882]">
                           <span className="material-symbols-outlined text-3xl mb-2">image_not_supported</span>
                           <p className="text-xs font-medium">Không có hình ảnh bổ sung</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] mb-4 block ml-2">Mô tả sản phẩm</label>
                    <div className="bg-white rounded-[2rem] p-8 border border-[#e1f0fb] text-[#404751] text-sm leading-relaxed whitespace-pre-wrap">
                      {detailProduct.description || "Không có mô tả."}
                    </div>
                  </div>
                </div>

                {/* Right: Variants & Specs */}
                <div className="col-span-5 space-y-10">
                   {/* Summary Card */}
                   <div className="bg-[#00629d] rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200">
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Thông tin cơ bản</p>
                      <h4 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] mb-4">{detailProduct.name}</h4>
                      <div className="flex items-center gap-6">
                         <div>
                            <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Giá cơ bản</p>
                            <p className="text-xl font-bold">{Number(detailProduct.base_price).toLocaleString('vi-VN')} ₫</p>
                         </div>
                         <div className="w-px h-8 bg-white/20"></div>
                         <div>
                            <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Cửa hàng</p>
                            <p className="text-sm font-bold uppercase tracking-tight">{detailProduct.shop.name}</p>
                         </div>
                      </div>
                   </div>

                   {/* Variants Table */}
                   <div>
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] mb-4 block ml-2">Các tùy chọn biến thể ({detailProduct.variants.length})</label>
                    <div className="bg-white rounded-[2rem] border border-[#e1f0fb] overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#f5faff] text-[#707882] font-bold border-b border-[#e1f0fb]">
                            <th className="px-6 py-4">Thuộc tính</th>
                            <th className="px-4 py-4">Giá</th>
                            <th className="px-4 py-4 text-right">Kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f5faff] text-[#0f1d25]">
                          {detailProduct.variants.map(v => (
                            <tr key={v.id}>
                              <td className="px-6 py-4 font-medium">
                                {Object.entries(v.attributes || {}).map(([k, val]: any) => `${k}: ${val}`).join(' / ')}
                              </td>
                              <td className="px-4 py-4 font-bold text-[#00629d]">
                                {Number(v.price_override || detailProduct.base_price).toLocaleString('vi-VN')} ₫
                              </td>
                              <td className="px-4 py-4 text-right font-bold tabular-nums">
                                {v.stock_quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div>
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] mb-4 block ml-2">Thông số kỹ thuật</label>
                    <div className="bg-white rounded-[2rem] border border-[#e1f0fb] overflow-hidden divide-y divide-[#f5faff]">
                      {detailProduct.attribute_values.length > 0 ? (
                        detailProduct.attribute_values.map(attr => (
                          <div key={attr.id} className="flex items-center justify-between px-8 py-4">
                            <span className="text-[10px] font-bold text-[#707882] uppercase tracking-wider">{attr.attribute.name}</span>
                            <span className="text-xs font-bold text-[#0f1d25]">
                              {attr.attribute_option?.value_name || attr.custom_value || "Chưa xác định"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-8 py-6 text-center text-[#707882] text-[10px] italic">Không có thông số kỹ thuật.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-12 py-10 bg-white border-t border-[#e1f0fb] flex items-center justify-between">
              <button 
                 onClick={() => setDetailProduct(null)}
                 className="px-10 py-4 bg-[#f5faff] text-[#707882] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#e1f0fb] transition-colors"
                >
                  Đóng xem trước
              </button>
              
              <div className="flex gap-4">
                 {rejectingId === detailProduct.id ? (
                   <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                      <input 
                        type="text" 
                        placeholder="Lý do từ chối..." 
                        className="w-64 px-6 py-4 bg-[#f5faff] border-2 border-transparent focus:border-[#ba1a1a]/20 rounded-full text-sm outline-none transition-all"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <button 
                        onClick={handleReject}
                        disabled={isSubmitting || !rejectReason.trim()}
                        className="px-10 py-4 bg-[#ba1a1a] text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-100 disabled:opacity-50"
                      >
                        {isSubmitting ? '...' : 'Xác nhận từ chối'}
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="text-[#ba1a1a] font-bold text-xs p-2">Hủy</button>
                   </div>
                 ) : (
                   <>
                    <button 
                      onClick={() => setRejectingId(detailProduct.id)}
                      className="px-10 py-4 bg-white text-[#ba1a1a] border-2 border-[#ba1a1a]/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#ffdad6] transition-all"
                    >
                      Từ chối duyệt
                    </button>
                    <button 
                      onClick={() => handleApprove(detailProduct.id)}
                      className="px-10 py-4 bg-gradient-to-br from-[#00629d] to-[#42a5f5] text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
                    >
                      Duyệt sản phẩm
                    </button>
                   </>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal (Shortcut from Table) */}
      {rejectingId && !detailProduct && (
        <div className="fixed inset-0 bg-[#0f1d25]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 transform animate-in slide-in-from-bottom-8 duration-500">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-[#ffdad6] text-[#ba1a1a] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-3xl">report</span>
                 </div>
                 <h3 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans'] mb-2">Từ chối duyệt</h3>
                 <p className="text-xs text-[#707882]">Vui lòng cung cấp lý do để người bán có thể cải thiện sản phẩm.</p>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-bold text-[#707882] uppercase tracking-[0.2em] ml-2 mb-2 block">Ghi chú kiểm duyệt</label>
                    <textarea 
                      className="w-full h-32 bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 rounded-2xl p-4 text-sm outline-none transition-all placeholder:text-[#707882]/40"
                      placeholder="VD: Hình ảnh mờ, mô tả sản phẩm thiếu thông tin chi tiết..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    ></textarea>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="flex-1 py-3 bg-[#e9f5ff] text-[#00629d] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#cfe5ff] transition-colors"
                    >
                      Hủy
                    </button>
                    <button 
                      onClick={handleReject}
                      disabled={isSubmitting || !rejectReason.trim()}
                      className="flex-1 py-3 bg-[#ba1a1a] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#93000a] transition-colors shadow-lg shadow-red-200 disabled:opacity-50 disabled:grayscale"
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ProductModeration;
