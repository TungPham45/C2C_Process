import React, { useState, useEffect, useMemo } from 'react';
import { PRODUCT_API_URL, resolveAssetUrl } from '../../config/api';

interface Product {
  id: number;
  name: string;
  thumbnail_url: string;
  base_price: string;
  is_assigned: boolean;
}

interface ManageCategoryProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
}

export const ManageCategoryProductsModal: React.FC<ManageCategoryProductsModalProps> = ({
  isOpen,
  onClose,
  categoryId,
  categoryName
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !categoryId) return;

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`${PRODUCT_API_URL}/seller/categories/${categoryId}/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
          setSelectedIds(new Set(data.filter((p: Product) => p.is_assigned).map((p: Product) => p.id)));
          setErrorMessage(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          setErrorMessage(errData.message || `Lỗi máy chủ (${res.status})`);
        }
      } catch (err) {
        console.error('Failed to fetch category products:', err);
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen, categoryId]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const toggleProduct = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/seller/categories/${categoryId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productIds: Array.from(selectedIds) })
      });
      if (res.ok) {
        onClose();
      } else {
        alert('Có lỗi xảy ra khi cập nhật sản phẩm');
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform animate-in slide-in-from-bottom-8 duration-500">
        {/* Header */}
        <div className="p-6 border-b border-[#e1f0fb] flex justify-between items-center bg-[#f5faff]">
          <div>
            <h2 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Quản lý sản phẩm</h2>
            <p className="text-xs text-[#707882] mt-0.5">Danh mục: <span className="text-[#00629d] font-bold">{categoryName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-[#707882] hover:bg-white rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#e1f0fb]">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#707882] text-[20px]">search</span>
            <input 
              type="text"
              placeholder="Tìm kiếm sản phẩm theo tên..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#f5faff] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
              <p className="text-[#707882] text-xs font-medium">Đang tải danh sách sản phẩm...</p>
            </div>
           ) : errorMessage ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">error</span>
              <p className="text-sm font-bold mb-1">Đã xảy ra lỗi</p>
              <p className="text-xs opacity-80 max-w-[80%]">{errorMessage}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-1.5 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-lg hover:bg-[#930006] transition-all"
              >
                Tải lại trang
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#707882]">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
              <p className="text-sm font-medium">Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map(p => (
                <div 
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedIds.has(p.id) 
                      ? 'bg-[#e9f5ff] border-[#00629d]/20' 
                      : 'bg-white border-transparent hover:border-slate-100'
                  }`}
                >
                  <div className={`w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border ${selectedIds.has(p.id) ? 'border-[#00629d]/30' : 'border-slate-100'}`}>
                    <img src={resolveAssetUrl(p.thumbnail_url) || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#0f1d25] truncate">{p.name}</h4>
                    <p className="text-[10px] text-[#707882] font-mono">ID: #{p.id}</p>
                  </div>
                  <div className="flex items-center">
                    {selectedIds.has(p.id) ? (
                      <span className="material-symbols-outlined text-[#00629d]">task_alt</span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-200">add_circle</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#e1f0fb] bg-[#fcfdfe] flex justify-between items-center">
          <div className="text-xs text-[#707882]">
            Đã chọn <span className="text-[#00629d] font-bold">{selectedIds.size}</span> sản phẩm
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-bold text-[#707882] border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className={`px-8 py-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isSubmitting ? 'bg-[#bfc7d3] cursor-not-allowed' : 'bg-[#00629d] hover:bg-[#004e7c] shadow-[#00629d]/20 active:scale-95'}`}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
