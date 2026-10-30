import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors select-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50 disabled:pointer-events-none min-h-[44px]';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-[#2F6B4F] text-white hover:bg-[#255740] active:bg-[#1E4633] shadow-xs',
    accent: 'bg-[#D6F26B] text-[#1F3D33] hover:bg-[#c6e559] active:bg-[#b8d64d] font-semibold shadow-xs',
    ghost: 'bg-transparent text-[#14221B] hover:bg-[#F4F6F4] active:bg-[#E3E8E4]',
    outline: 'bg-white border border-[#E3E8E4] text-[#14221B] hover:bg-[#F4F6F4] active:bg-[#E3E8E4]',
    danger: 'bg-[#C8382F] text-white hover:bg-[#b02e26] active:bg-[#99261f] shadow-xs',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" color={variant === 'accent' ? 'forest' : 'current'} /> : icon}
      <span>{children}</span>
    </button>
  );
};
