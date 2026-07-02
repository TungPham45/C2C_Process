import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveAssetUrl } from '../../config/api';
import { formatPriceRange } from '../../utils/currency';

interface SearchSuggestion {
  id: number;
  name: string;
  thumbnail_url?: string;
  base_price: string;
  shop: { name: string };
  images?: Array<{ image_url: string }>;
  variants?: any[];
}

export const SearchBar: FC<{ placeholder?: string; compact?: boolean }> = ({
  placeholder = 'Tìm kiếm sản phẩm, cửa hàng...',
  compact = false,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
        setOpen(true);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(query), 320);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (q: string) => {
    if (q.trim()) {
      navigate(`/products?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
      setQuery(q);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigate(`/product/${suggestions[activeIndex].id}`);
        setOpen(false);
      } else {
        commit(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const thumbnailSrc = (s: SearchSuggestion) => {
    const raw = s.images?.[0]?.image_url || s.thumbnail_url;
    return raw ? resolveAssetUrl(raw) : null;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${compact ? 'max-w-sm' : 'max-w-xl'}`}>
      {/* Input */}
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-11 pl-11 pr-10 bg-[#f5faff]/60 border border-transparent focus:bg-white focus:border-[#00629d]/20 focus:shadow-[0_0_0_3px_rgba(0,98,157,0.07)] rounded-2xl text-sm outline-none transition-all placeholder:text-[#707882]/60 text-[#0f1d25]"
        />
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707882] text-[20px] group-focus-within:text-[#00629d] transition-colors select-none">
          search
        </span>
        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#707882] hover:text-[#0f1d25] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
        {/* Loading spinner */}
        {loading && !query === false && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_16px_40px_rgba(15,29,37,0.1)] border border-[#e4e9f0] overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          {query.trim().length >= 2 && (
            <div className="px-4 py-2.5 border-b border-[#f0f3f8] flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#707882]">
                Gợi ý tìm kiếm
              </span>
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin" />
              )}
            </div>
          )}

          {suggestions.length === 0 && !loading && query.trim().length >= 2 && (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-[#e4e9f0] block mb-2">search_off</span>
              <p className="text-sm text-[#707882] font-medium">Không tìm thấy sản phẩm nào</p>
            </div>
          )}

          {suggestions.map((s, idx) => {
            const thumbSrc = thumbnailSrc(s);
            const price = formatPriceRange(s.base_price, s.variants);
            const isActive = idx === activeIndex;
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(-1)}
                onClick={() => { navigate(`/product/${s.id}`); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isActive ? 'bg-[#f0f7ff]' : 'hover:bg-[#f9fafc]'}`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-[#f0f3f8] flex-shrink-0 overflow-hidden border border-[#e4e9f0]">
                  {thumbSrc ? (
                    <img src={thumbSrc} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#bfc7d3] flex items-center justify-center h-full text-xl">inventory_2</span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0f1d25] truncate">{s.name}</p>
                  <p className="text-[11px] text-[#707882] mt-0.5 truncate">{s.shop?.name}</p>
                </div>
                {/* Price */}
                <div className="text-sm font-black text-[#00629d] whitespace-nowrap">{price}</div>
              </button>
            );
          })}

          {/* View all results */}
          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => commit(query)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-[#f0f3f8] text-sm font-bold text-[#00629d] hover:bg-[#f0f7ff] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              Xem tất cả kết quả cho "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};
