import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  value, 
  onChange, 
  options, 
  className = '',
  placeholder = 'Select an option'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className="w-full px-8 py-5 bg-[#f5faff] border-2 border-transparent focus-within:border-[#00629d]/20 focus-within:bg-[#eef6ff] rounded-3xl text-sm font-bold text-[#0f1d25] outline-none transition-all cursor-pointer flex justify-between items-center group"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
            e.preventDefault();
          }
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className={`material-symbols-outlined text-[#a1aab3] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#e1f0fb] rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-8 py-4 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between ${
                option.value === value 
                  ? 'bg-[#f5faff] text-[#00629d]' 
                  : 'text-[#707882] hover:bg-[#f8fbff] hover:text-[#0f1d25]'
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {option.value === value && (
                <span className="material-symbols-outlined text-base">check</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
