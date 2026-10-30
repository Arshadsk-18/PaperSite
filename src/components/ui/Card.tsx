import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'white' | 'forest';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'white',
  padding = 'md',
  border = true,
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    white: 'bg-white text-[#14221B]',
    surface: 'bg-[#F4F6F4] text-[#14221B]',
    forest: 'bg-[#1F3D33] text-white',
  }[variant];

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  const borderClass = border
    ? variant === 'forest'
      ? 'border border-[#2F6B4F]/40'
      : 'border border-[#E3E8E4]'
    : '';

  return (
    <div
      className={`rounded-xl transition-all shadow-xs ${variantClasses} ${paddingClasses} ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
