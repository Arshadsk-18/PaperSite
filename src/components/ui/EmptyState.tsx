import React from 'react';
import { Button, type ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-[#E3E8E4] rounded-2xl bg-[#F4F6F4]/50 ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#E3E8E4] flex items-center justify-center text-[#2F6B4F] mb-4 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[#14221B] mb-1.5">{title}</h3>
      <p className="text-sm text-[#5E6B63] max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        <Button variant={action.variant || 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
