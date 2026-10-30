import React from 'react';

export interface PillProps {
  variant?: 'green' | 'lime' | 'surface' | 'forest' | 'danger' | 'muted';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Pill: React.FC<PillProps> = ({
  variant = 'surface',
  size = 'md',
  children,
  icon,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-3 py-1 gap-1.5',
  }[size];

  const variantClasses = {
    green: 'bg-[#2F6B4F]/10 text-[#2F6B4F] border border-[#2F6B4F]/20 font-medium',
    lime: 'bg-[#D6F26B] text-[#1F3D33] font-semibold',
    surface: 'bg-[#F4F6F4] text-[#14221B] border border-[#E3E8E4]',
    forest: 'bg-[#1F3D33] text-white font-medium',
    danger: 'bg-[#C8382F]/10 text-[#C8382F] border border-[#C8382F]/20 font-medium',
    muted: 'bg-gray-100 text-[#5E6B63] border border-gray-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
