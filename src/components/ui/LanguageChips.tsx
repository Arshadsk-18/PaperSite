import React from 'react';
import type { SupportedLanguage } from '../../types';

export interface LanguageChipItem {
  code: SupportedLanguage;
  label: string;
  sublabel: string;
}

export const LANGUAGES: LanguageChipItem[] = [
  { code: 'en', label: 'EN', sublabel: 'English' },
  { code: 'te', label: 'తెలుగు', sublabel: 'Telugu' },
  { code: 'hi', label: 'हिन्दी', sublabel: 'Hindi' },
];

export interface LanguageChipsProps {
  value: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const LanguageChips: React.FC<LanguageChipsProps> = ({
  value,
  onChange,
  size = 'md',
  className = '',
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="Select language"
      className={`inline-flex items-center gap-1.5 p-1 bg-[#F4F6F4] border border-[#E3E8E4] rounded-lg ${className}`}
    >
      {LANGUAGES.map((lang) => {
        const isSelected = value === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            data-testid={`lang-chip-${lang.code}`}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(lang.code)}
            className={`transition-all rounded-md font-medium min-h-[38px] flex items-center justify-center px-3 gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest ${
              size === 'sm' ? 'text-xs py-1' : 'text-sm py-1.5'
            } ${
              isSelected
                ? 'bg-white text-[#1F3D33] shadow-xs font-semibold border border-[#E3E8E4]'
                : 'text-[#5E6B63] hover:text-[#14221B] hover:bg-white/50'
            }`}
          >
            <span>{lang.label}</span>
            <span className="text-[10px] text-[#5E6B63] opacity-75">({lang.code.toUpperCase()})</span>
          </button>
        );
      })}
    </div>
  );
};
