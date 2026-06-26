import React, { useState, useEffect } from 'react';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { PRODUCT_API_URL } from '../../config/api';
import { ManageCategoryProductsModal } from '../../components/products/ManageCategoryProductsModal';

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

export const ShopCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 0, is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<Category | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/seller/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenModal = (category: Category | null = null) => {
    setModalError(null);
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, sort_order: category.sort_order, is_active: category.is_active });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', sort_order: (categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0), is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Category name is required');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const token = localStorage.getItem('c2c_token');
      const method = editingCategory ? 'PUT' : 'POST';
      const url = editingCategory 
        ? `${PRODUCT_API_URL}/seller/categories/${editingCategory.id}` 
        : `${PRODUCT_API_URL}/seller/categories`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCategories();
      } else {
        setModalError(await getResponseError(res, 'Có lỗi xảy ra'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      setModalError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm trong danh mục này sẽ không bị xóa nhưng sẽ không còn thuộc danh mục này nữa.')) return;

    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`${PRODUCT_API_URL}/seller/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <SellerLayout pageTitle="Serene Seller">
      <div className="max-w-screen-xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-8 rounded-2xl shadow-sm border border-[#e1f0fb]">
          <div>
            <h1 className="text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Danh mục của Shop</h1>
            <p className="text-sm text-[#707882] mt-1">Tối ưu hóa hiển thị sản phẩm trong cửa hàng của bạn (Tối đa 20 danh mục)</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#00629d] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#00629d]/20 hover:scale-105 active:scale-95 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Thêm danh mục mới
          </button>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e1f0fb] overflow-hidden">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
              <p className="text-[#707882] text-sm font-medium">Đang tải danh sách danh mục...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#e9f5ff] rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#00629d] text-3xl">category</span>
              </div>
              <div className="max-w-sm">
                <h3 className="text-lg font-bold text-[#0f1d25]">Chưa có danh mục nào</h3>
                <p className="text-sm text-[#707882]">Hãy tạo danh mục đầu tiên để khách hàng dễ dàng tìm kiếm sản phẩm trong shop của bạn.</p>
              </div>
              <button 
                 onClick={() => handleOpenModal()}
                className="text-[#00629d] text-sm font-bold flex items-center gap-1 hover:underline"
              >
                Nhấp vào đây để bắt đầu <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f5faff] border-b border-[#e1f0fb]">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-[#707882] uppercase tracking-[0.15em]">Thứ tự</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#707882] uppercase tracking-[0.15em]">Tên danh mục</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#707882] uppercase tracking-[0.15em]">Đường dẫn (Slug)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#707882] uppercase tracking-[0.15em]">Trạng thái</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#707882] uppercase tracking-[0.15em] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1f0fb]">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-[#fcfdfe] transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-[#00629d] bg-[#e9f5ff] w-6 h-6 flex items-center justify-center rounded-md">
                          {cat.sort_order}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#0f1d25]">{cat.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-[#707882] bg-[#f5f7fa] px-2 py-1 rounded">/{cat.slug}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${cat.is_active ? 'bg-[#e7f5e7] text-[#2e7d32]' : 'bg-[#fff0f0] text-[#ba1a1a]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.is_active ? 'bg-[#2e7d32]' : 'bg-[#ba1a1a]'}`}></span>
                          {cat.is_active ? 'Đang hiển thị' : 'Đang ẩn'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setTargetCategory(cat);
                              setIsProductModalOpen(true);
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[#707882] hover:bg-[#e9f5ff] hover:text-[#00629d] transition-all"
                            title="Quản lý sản phẩm"
                          >
                            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                          </button>
                          <button 
                            onClick={() => handleOpenModal(cat)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[#707882] hover:bg-[#e9f5ff] hover:text-[#00629d] transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[#707882] hover:bg-[#fff0f0] hover:text-[#ba1a1a] transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-[#fcfdfe] text-[11px] text-[#707882] flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Bạn có thể tạo tối đa 20 danh mục. Hiện tại đã dùng {categories.length}/20.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-6 border-b border-[#e1f0fb] flex justify-between items-center bg-[#f5faff]">
              <h2 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError(null);
                }}
                className="w-10 h-10 flex items-center justify-center text-[#707882] hover:bg-white rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {modalError && (
                <div className="rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm font-bold text-[#ba1a1a]">
                  {modalError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#404751] flex justify-between">
                  Tên danh mục <span className="text-[#ba1a1a]">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => {
                    setFormData({...formData, name: e.target.value});
                    setModalError(null);
                  }}
                  className="w-full bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all text-sm font-medium"
                  placeholder="Ví dụ: Hàng mới về, Giảm giá cực sốc..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#404751]">Thứ tự hiển thị</label>
                  <input 
                    type="number" 
                    value={formData.sort_order}
                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#f5faff] border-2 border-transparent focus:border-[#00629d]/20 focus:bg-white rounded-2xl px-4 py-3 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#404751]">Trạng thái</label>
                  <div className="flex items-center h-[52px]">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.is_active}
                        onChange={e => setFormData({...formData, is_active: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00629d]"></div>
                      <span className="ms-3 text-sm font-bold text-[#707882]">{formData.is_active ? 'Bật' : 'Tắt'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-[#707882] border-2 border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg transition-all ${isSubmitting ? 'bg-[#bfc7d3] cursor-not-allowed' : 'bg-[#00629d] hover:bg-[#004e7c] shadow-[#00629d]/20 active:scale-95'}`}
                >
                  {isSubmitting ? 'Đang lưu...' : (editingCategory ? 'Cập nhật' : 'Thêm ngay')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {targetCategory && (
        <ManageCategoryProductsModal 
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          categoryId={targetCategory.id}
          categoryName={targetCategory.name}
        />
      )}
    </SellerLayout>
  );
};

const getResponseError = async (response: Response, fallbackMessage: string) => {
  const clone = response.clone();

  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
  } catch {
    // Fall back to plain text.
  }

  try {
    const text = await clone.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Use fallback below.
  }

  return fallbackMessage;
};
