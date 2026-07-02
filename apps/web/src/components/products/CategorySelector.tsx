import React, { useState, useEffect } from 'react';
import { PRODUCT_API_URL } from '../../config/api';

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  level: number;
}

interface CategorySelectorProps {
  initialCategoryId?: number;
  initialPathText?: string;
  onConfirm: (categoryId: number, pathText: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  initialCategoryId, 
  initialPathText, 
  onConfirm, 
  isOpen, 
  onClose 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection state per level
  const [level1Id, setLevel1Id] = useState<number | null>(null);
  const [level2Id, setLevel2Id] = useState<number | null>(null);
  const [level3Id, setLevel3Id] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || categories.length > 0) return;
    const fetchCats = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${PRODUCT_API_URL}/categories/all`);
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
    fetchCats();
  }, [isOpen]);

  if (!isOpen) return null;

  const level1Cats = categories.filter(c => c.level === 1);
  const level2Cats = level1Id ? categories.filter(c => c.parent_id === level1Id) : [];
  const level3Cats = level2Id ? categories.filter(c => c.parent_id === level2Id) : [];

  const getPathText = () => {
    const l1 = categories.find(c => c.id === level1Id)?.name;
    const l2 = categories.find(c => c.id === level2Id)?.name;
    const l3 = categories.find(c => c.id === level3Id)?.name;
    return [l1, l2, l3].filter(Boolean).join(' > ');
  };

  // Determine the final selected leaf ID
  const isLeafSelected = () => {
    // Current active selection
    const activeId = level3Id || level2Id || level1Id;
    if (!activeId) return false;
    
    // Does this active selection have any children?
    const children = categories.filter(c => c.parent_id === activeId);
    return children.length === 0;
  };

  const getSelectedLeafId = () => {
    if (!isLeafSelected()) return null;
    return level3Id || level2Id || level1Id;
  };

  const handleConfirm = () => {
    const leafId = getSelectedLeafId();
    if (leafId) {
      onConfirm(leafId, getPathText());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/60 backdrop-blur-sm p-4">
      <div className="bg-[#f5faff] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#e1f0fb] flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Chỉnh sửa ngành hàng</h2>
          <button onClick={onClose} className="text-[#707882] hover:text-[#ba1a1a] transition-colors">
            <span className="material-symbols-outlined font-bold">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-white/50">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-[#00629d] font-bold animate-pulse">
              Đang tải cấu trúc danh mục...
            </div>
          ) : (
            <div className="grid grid-cols-3 bg-white border border-[#e1f0fb] rounded-xl h-[400px] overflow-hidden shadow-sm">
              {/* Level 1 List */}
              <div className="border-r border-[#e1f0fb] overflow-y-auto custom-scrollbar p-2">
                {level1Cats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { setLevel1Id(c.id); setLevel2Id(null); setLevel3Id(null); }}
                    className={`px-4 py-3 rounded-lg cursor-pointer flex justify-between items-center text-sm font-semibold transition-colors ${level1Id === c.id ? 'text-[#ba1a1a] bg-[#fff0f0]' : 'text-[#404751] hover:bg-[#f5faff]'}`}
                  >
                    <span>{c.name}</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </div>
                ))}
              </div>

              {/* Level 2 List */}
              <div className="border-r border-[#e1f0fb] overflow-y-auto custom-scrollbar p-2 bg-[#fbfcff]">
                {level1Id && level2Cats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => { setLevel2Id(c.id); setLevel3Id(null); }}
                    className={`px-4 py-3 rounded-lg cursor-pointer flex justify-between items-center text-sm font-semibold transition-colors ${level2Id === c.id ? 'text-[#ba1a1a] bg-[#fff0f0]' : 'text-[#404751] hover:bg-[#e9f5ff]'}`}
                  >
                    <span>{c.name}</span>
                    {categories.some(child => child.parent_id === c.id) && (
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Level 3 List */}
              <div className="overflow-y-auto custom-scrollbar p-2 bg-[#f5faff]">
                {level2Id && level3Cats.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setLevel3Id(c.id)}
                    className={`px-4 py-3 rounded-lg cursor-pointer flex justify-between items-center text-sm font-semibold transition-colors ${level3Id === c.id ? 'text-[#ba1a1a] bg-[#fff0f0]' : 'text-[#404751] hover:bg-[#e1f0fb]'}`}
                  >
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e1f0fb] bg-white flex justify-between items-center">
          <div className="text-sm font-medium text-[#404751]">
            Đã chọn : <span className="font-bold text-[#0f1d25]">{getPathText() || initialPathText || 'Chưa chọn ngành hàng'}</span>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-bold text-[#707882] border border-[#dbeaf5] hover:bg-[#f5faff] transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isLeafSelected()}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${isLeafSelected() ? 'bg-[#e2504c] text-white hover:bg-[#ba1a1a]' : 'bg-[#bfc7d3] text-white cursor-not-allowed'}`}
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
