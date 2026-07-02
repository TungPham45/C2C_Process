import React, { useState, useEffect, useMemo } from 'react';
import { PRODUCT_API_URL, resolveAssetUrl } from '../../config/api';

export interface GeneratedVariant {
  id: string; // e.g. "Màu:Đỏ|Kích cỡ:200GB"
  attributes: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  image?: string;
}

export interface VariantGroup {
  id: string;
  name: string;
  options: string[];
}

interface VariantBuilderProps {
  basePrice: string;
  setBasePrice: (val: string) => void;
  baseStock: string;
  setBaseStock: (val: string) => void;
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  onVariantsChange: (variants: GeneratedVariant[]) => void;
  initialGroups?: VariantGroup[];
  initialVariants?: GeneratedVariant[];
}

export const VariantBuilder: React.FC<VariantBuilderProps> = ({ 
  basePrice, setBasePrice, 
  baseStock, setBaseStock,
  hasVariants, setHasVariants,
  onVariantsChange,
  initialGroups = [],
  initialVariants = []
}) => {
  
  const [groups, setGroups] = useState<VariantGroup[]>(initialGroups);

  // Sync groups if initialGroups changes (hydration)
  useEffect(() => {
    if (initialGroups && initialGroups.length > 0) {
      setGroups(initialGroups);
    }
  }, [initialGroups]);

  const [variantsMap, setVariantsMap] = useState<Record<string, GeneratedVariant>>({});
  const [groupImages, setGroupImages] = useState<Record<string, string>>({});
  
  // Sync variantsMap if initialVariants changes (hydration)
  useEffect(() => {
    if (initialVariants && initialVariants.length > 0) {
      setVariantsMap(prev => {
        const next = { ...prev };
        let hasChanges = false;
        initialVariants.forEach(v => {
          if (!next[v.id]) {
             next[v.id] = v;
             hasChanges = true;
          }
        });
        return hasChanges ? next : prev;
      });
      
      if (groups.length > 0) {
        setGroupImages(prev => {
          const next = { ...prev };
          let changed = false;
          const g1 = groups[0].name;
          initialVariants.forEach(v => {
            if (v.image && v.attributes[g1] && !next[v.attributes[g1]]) {
              next[v.attributes[g1]] = v.image;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [initialVariants, groups]);

  const variantImageInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadKey, setActiveUploadKey] = useState<string | null>(null);

  // Global inputs for "Danh sách phân loại hàng"
  const [globalPrice, setGlobalPrice] = useState('');
  const [globalStock, setGlobalStock] = useState('');
  const [globalSku, setGlobalSku] = useState('');

  // 1. Generate Cartesian Product of all group options
  const combinations = useMemo(() => {
    if (groups.length === 0 || groups.every(g => g.options.length === 0)) return [];
    
    // Remove empty groups or groups with no options
    const validGroups = groups.filter(g => g.name.trim() !== '' && g.options.some(o => o.trim() !== ''));
    if (validGroups.length === 0) return [];

    let combos: Record<string, string>[] = [{}];
    
    for (const group of validGroups) {
      const validOptions = group.options.filter(o => o.trim() !== '');
      if (validOptions.length === 0) continue;
      
      const newCombos: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const option of validOptions) {
          newCombos.push({ ...combo, [group.name]: option });
        }
      }
      combos = newCombos;
    }
    return combos;
  }, [groups]);

  // 2. Hydrate variantsMap with new combinations, preserving existing data (Prices/Stocks/Images)
  useEffect(() => {
    setVariantsMap(prev => {
      const next: Record<string, GeneratedVariant> = {};
      combinations.forEach(combo => {
        const id = Object.entries(combo).map(([k, v]) => `${k}:${v}`).join('|');
        if (prev[id]) {
          next[id] = { ...prev[id], image: groupImages[combo[groups[0]?.name]] || prev[id].image }; 
        } else {
          next[id] = {
            id,
            attributes: combo,
            price: globalPrice || basePrice || '',
            stock: globalStock || baseStock || '0',
            sku: '',
            image: groupImages[combo[groups[0]?.name]] || ''
          };
        }
      });
      return next;
    });
  }, [combinations, groupImages, basePrice, baseStock, globalPrice, globalStock]);

  useEffect(() => {
    onVariantsChange(Object.values(variantsMap));
  }, [variantsMap, onVariantsChange]);

  const updateGroupOption = (groupId: string, optionIndex: number, val: string) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newOpts = [...g.options];
        newOpts[optionIndex] = val;
        // Auto-add new empty slot if last one is typed in
        if (optionIndex === newOpts.length - 1 && val !== '') {
          newOpts.push('');
        }
        return { ...g, options: newOpts };
      }
      return g;
    }));
  };

  const removeGroupOption = (groupId: string, optionIndex: number) => {
    setGroups(groups.map(g => {
      if (g.id === groupId) {
        const newOpts = [...g.options];
        newOpts.splice(optionIndex, 1);
        if (newOpts.length === 0) newOpts.push('');
        return { ...g, options: newOpts };
      }
      return g;
    }));
  };

  const applyGlobalSettings = () => {
    setVariantsMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key] = {
          ...next[key],
          price: globalPrice || next[key].price,
          stock: globalStock || next[key].stock,
          sku: globalSku || next[key].sku
        };
      });
      return next;
    });
  };

  const updateVariant = (id: string, field: keyof GeneratedVariant, val: string) => {
    setVariantsMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: val }
    }));
  };

  const [isUploadingVariantImage, setIsUploadingVariantImage] = useState(false);

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeUploadKey) {
      const file = e.target.files[0];
      const token = localStorage.getItem('c2c_token');
      
      const fd = new FormData();
      fd.append('file', file);
      setIsUploadingVariantImage(true);
      
      try {
        const res = await fetch(`${PRODUCT_API_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });
        if (res.ok) {
          const data = await res.json();
          setGroupImages(prev => ({ ...prev, [activeUploadKey]: resolveAssetUrl(data.url) }));
        } else {
          alert('Failed to upload variant image');
        }
      } catch (err) {
        console.error('Variant image upload error:', err);
        alert('Network error during image upload');
      } finally {
        setIsUploadingVariantImage(false);
      }
    }
    if (variantImageInputRef.current) variantImageInputRef.current.value = '';
  };

  if (!hasVariants) {
    return (
      <div id="sales" className="bg-white rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-2 h-8 bg-[#6cbdfe] rounded-full"></span>
          <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Thông tin bán hàng</h2>
        </div>
        
        <label className="flex items-center gap-2 mb-6 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => setHasVariants(true)}>
          <input type="radio" checked={false} readOnly className="w-4 h-4 text-[#ea4335] border-gray-300 focus:ring-[#ea4335]" />
          <span className="text-sm font-bold text-[#404751]">Phân loại hàng</span>
        </label>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#404751] mb-2">Giá bán (VNĐ) <span className="text-[#ba1a1a]">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#707882] font-bold">₫</span>
              <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-[#e9f5ff] border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#404751] mb-2">Kho hàng <span className="text-[#ba1a1a]">*</span></label>
            <input type="number" value={baseStock} onChange={e => setBaseStock(e.target.value)} className="w-full px-4 py-3 bg-[#e9f5ff] border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#00629d]/20" />
          </div>
        </div>
      </div>
    );
  }

  // Row span calculation for the first group to merge UI cells like in the screenshot
  const group1 = groups[0]?.name;
  const group2 = groups[1]?.name;
  const group2Length = groups[1]?.options.filter(o => o.trim() !== '').length || 1;

  let currentGroup1Val = '';
  let rowSpanCounter = 0;

  return (
    <div id="sales" className="bg-white rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-2 h-8 bg-[#6cbdfe] rounded-full"></span>
        <h2 className="text-xl font-bold font-['Plus_Jakarta_Sans']">Thông tin bán hàng</h2>
      </div>

      <label className="flex items-center gap-2 mb-6 cursor-pointer">
        <input type="radio" checked={true} readOnly className="w-4 h-4 accent-[#ea4335]" onClick={() => setHasVariants(false)} />
        <span className="text-sm font-bold text-[#0f1d25]">Phân loại hàng</span>
      </label>

      {/* --- Variant Groups Builder --- */}
      <div className="space-y-4 mb-8">
        {groups.map((group, gIndex) => (
          <div key={group.id} className="bg-[#f8f9fa] p-6 rounded-xl relative border border-[#bfc7d3]/20">
            <button 
              onClick={() => setGroups(groups.filter(g => g.id !== group.id))}
              className="absolute top-4 right-4 text-[#707882] hover:text-[#ba1a1a]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm text-[#707882] whitespace-nowrap w-20">Phân loại {gIndex + 1}</label>
              <div className="relative flex-1 max-w-sm">
                <input 
                  type="text" 
                  value={group.name} 
                  onChange={e => setGroups(groups.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))}
                  className="w-full bg-white border border-[#bfc7d3]/30 rounded-md px-3 py-2 text-sm outline-none focus:border-[#00629d]" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#bfc7d3]">{group.name.length}/14</span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <label className="text-sm text-[#707882] whitespace-nowrap w-20 pt-2">Tùy chọn</label>
              <div className="flex-1 grid grid-cols-2 gap-4">
                {group.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={opt} 
                        onChange={e => updateGroupOption(group.id, oIndex, e.target.value)}
                        placeholder="Nhập"
                        className="w-full bg-white border border-[#bfc7d3]/30 rounded-md px-3 py-2 text-sm outline-none focus:border-[#00629d]" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#bfc7d3]">{opt.length}/20</span>
                    </div>
                    {opt !== '' && (
                      <button onClick={() => removeGroupOption(group.id, oIndex)} className="text-[#bfc7d3] hover:text-[#ba1a1a]">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <button 
            onClick={() => setGroups([{ id: '1', name: '', options: [''] }])}
            className="w-full py-4 border-2 border-dashed border-[#bfc7d3] text-[#00629d] font-bold text-sm bg-white rounded-xl hover:bg-[#f5faff] transition-colors flex justify-center items-center mt-4"
          >
            + THÊM NHÓM PHÂN LOẠI 1
          </button>
        )}

        {groups.length === 1 && (
          <button 
            onClick={() => setGroups([...groups, { id: '2', name: '', options: [''] }])}
            className="w-full py-4 border-2 border-dashed border-[#bfc7d3] text-[#00629d] font-bold text-sm bg-white rounded-xl hover:bg-[#f5faff] transition-colors flex justify-center items-center mt-4"
          >
            + THÊM NHÓM PHÂN LOẠI 2
          </button>
        )}
      </div>

      {/* --- Global Apply Bar --- */}
      {combinations.length > 0 && (
        <>
          <h3 className="text-base font-bold text-[#0f1d25] mb-4">Danh sách phân loại hàng</h3>
          <div className="flex gap-4 items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-[#e1f0fb]">
            <div className="relative w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707882] text-sm">₫</span>
              <input type="number" placeholder="Giá" value={globalPrice} onChange={e => setGlobalPrice(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none" />
            </div>
            <input type="number" placeholder="Số lượng" value={globalStock} onChange={e => setGlobalStock(e.target.value)} className="w-32 px-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none" />
            <input type="text" placeholder="SKU phân loại" value={globalSku} onChange={e => setGlobalSku(e.target.value)} className="w-32 px-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none" />
            <button onClick={applyGlobalSettings} className="px-6 py-2 bg-[#ea4335] hover:bg-[#d93025] text-white font-bold text-sm rounded-md shadow-sm transition-colors whitespace-nowrap">
              Áp dụng cho tất cả
            </button>
          </div>

          {/* --- The Cartesian Matrix Table --- */}
          <div className="w-full overflow-hidden border border-[#e1f0fb] rounded-xl shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#e1f0fb]">
                <tr>
                  {validGroups(groups).map(g => (
                    <th key={g.name} className="p-4 font-bold text-[#404751] text-center border-r border-[#e1f0fb]">
                      <span className="text-[#ea4335] mr-1">*</span>{g.name}
                    </th>
                  ))}
                  <th className="p-4 font-bold text-[#404751] text-center border-r border-[#e1f0fb]"><span className="text-[#ea4335] mr-1">*</span>Giá</th>
                  <th className="p-4 font-bold text-[#404751] text-center border-r border-[#e1f0fb]"><span className="text-[#ea4335] mr-1">*</span>Số lượng</th>
                  <th className="p-4 font-bold text-[#404751] text-center">SKU phân loại</th>
                </tr>
              </thead>
              <tbody>
                {combinations.map((combo, idx) => {
                  const id = Object.entries(combo).map(([k, v]) => `${k}:${v}`).join('|');
                  const variantData = variantsMap[id] || { price: '', stock: '', sku: '' };
                  
                  // Rowspan magic for the first column
                  let printFirstCol = false;
                  if (group1 && combo[group1] !== currentGroup1Val) {
                    currentGroup1Val = combo[group1];
                    printFirstCol = true;
                  }

                  return (
                    <tr key={idx} className="border-b border-[#e1f0fb] hover:bg-[#f5faff] transition-colors">
                      {printFirstCol && group1 && (
                        <td rowSpan={group2Length} className="p-4 border-r border-[#e1f0fb] text-center align-middle bg-white group relative">
                          <span className="font-semibold text-[#0f1d25] block mb-2">{combo[group1]}</span>
                            <div 
                              onClick={() => { if (!isUploadingVariantImage) { setActiveUploadKey(combo[group1]); variantImageInputRef.current?.click(); } }}
                              className={`w-12 h-12 bg-[#e9f5ff] rounded-md mx-auto flex items-center justify-center border border-[#bfc7d3]/20 transition-colors overflow-hidden ${isUploadingVariantImage && activeUploadKey === combo[group1] ? 'cursor-wait opacity-50' : 'cursor-pointer hover:bg-[#e1f0fb]'}`}
                            >
                              {isUploadingVariantImage && activeUploadKey === combo[group1] ? (
                                <span className="material-symbols-outlined text-[#00629d] animate-spin text-xl">progress_activity</span>
                              ) : groupImages[combo[group1]] ? (
                                <img src={groupImages[combo[group1]]} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="material-symbols-outlined text-[#707882] text-xl">add_photo_alternate</span>
                              )}
                            </div>
                        </td>
                      )}
                      
                      {group2 && (
                        <td className="p-4 border-r border-[#e1f0fb] text-center font-medium text-[#404751]">
                          {combo[group2]}
                        </td>
                      )}

                      <td className="p-3 border-r border-[#e1f0fb]">
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bfc7d3] text-sm font-medium">₫</span>
                           <input 
                             type="number" 
                             value={variantData.price} 
                             onChange={e => updateVariant(id, 'price', e.target.value)}
                             className="w-full pl-8 pr-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none focus:border-[#00629d]" 
                           />
                        </div>
                      </td>
                      <td className="p-3 border-r border-[#e1f0fb]">
                        <input 
                          type="number" 
                          value={variantData.stock} 
                          onChange={e => updateVariant(id, 'stock', e.target.value)}
                          className="w-full px-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none focus:border-[#00629d]" 
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={variantData.sku} 
                          onChange={e => updateVariant(id, 'sku', e.target.value)}
                          placeholder={combo[group1] || 'Nhập'}
                          className="w-full px-3 py-2 border border-[#bfc7d3]/30 rounded-md text-sm outline-none focus:border-[#00629d]" 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <input type="file" ref={variantImageInputRef} onChange={handleVariantImageUpload} accept="image/*" className="hidden" />
    </div>
  );
};

// Helper inside file scope
function validGroups(groups: VariantGroup[]) {
  return groups.filter(g => g.name.trim() !== '' && g.options.some(o => o.trim() !== ''));
}
