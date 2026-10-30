import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'forest' | 'green' | 'lime' | 'white' | 'current';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'current',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }[size];

  const colorClasses = {
    forest: 'border-[#1F3D33]/20 border-t-[#1F3D33]',
    green: 'border-[#2F6B4F]/20 border-t-[#2F6B4F]',
    lime: 'border-[#D6F26B]/30 border-t-[#D6F26B]',
    white: 'border-white/30 border-t-white',
    current: 'border-current/30 border-t-current',
  }[color];

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full ${sizeClasses} ${colorClasses} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
