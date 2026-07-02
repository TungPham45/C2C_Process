import React, { useState, useEffect } from 'react';
import { PRODUCT_API_URL } from '../../config/api';

export interface AttributeOption {
  value_name: string;
  sort_order: number;
}

export interface AttributeDefinition {
  id: number;
  name: string;
  input_type: string;
  is_required: boolean;
  options: AttributeOption[];
}

interface DynamicAttributesProps {
  categoryId: number | null;
  values: Record<number, string>;
  onChange: (attributeId: number, valueName: string) => void;
}

export const DynamicAttributes: React.FC<DynamicAttributesProps> = ({ categoryId, values, onChange }) => {
  const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }

    const fetchAttributes = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${PRODUCT_API_URL}/categories/${categoryId}/attributes`);
        if (res.ok) {
          const data = await res.json();
          setAttributes(data);
        } else {
          setAttributes([]);
        }
      } catch (err) {
        console.error('Failed to fetch category attributes', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttributes();
  }, [categoryId]);

  if (!categoryId) return null;

  if (isLoading) {
    return (
      <div className="mt-6 p-6 border-2 border-dashed border-[#e1f0fb] rounded-xl flex items-center justify-center font-bold text-[#00629d] animate-pulse">
        Đang tải thuộc tính ngành hàng...
      </div>
    );
  }

  if (attributes.length === 0) {
    return null; // Category has no deep attributes
  }

  return (
    <div className="mt-8 pt-8 border-t border-[#e1f0fb] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-[#6cbdfe]">tune</span>
        <h3 className="font-bold text-[#0f1d25] text-lg font-['Plus_Jakarta_Sans']">Thuộc tính chi tiết</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {attributes.map(attr => (
          <div key={attr.id} className="relative">
            <label className="block text-sm font-semibold text-[#404751] mb-2">
              {attr.name} {attr.is_required && <span className="text-[#ba1a1a]">*</span>}
            </label>
            <div className="relative group">
              <select
                value={values[attr.id] || ''}
                onChange={(e) => onChange(attr.id, e.target.value)}
                className="w-full bg-[#fbfcff] appearance-none outline-none border border-[#dbeaf5] rounded-xl px-4 py-3 text-sm text-[#0f1d25] focus:ring-2 focus:ring-[#00629d]/20 focus:border-[#00629d]/40 transition-all cursor-pointer hover:border-[#6cbdfe]"
              >
                <option value="" disabled hidden>Chọn {attr.name.toLowerCase()}</option>
                {attr.options.map(opt => (
                  <option key={opt.value_name} value={opt.value_name}>
                    {opt.value_name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#707882] pointer-events-none group-hover:text-[#00629d] transition-colors">
                expand_more
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
