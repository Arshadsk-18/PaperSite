import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  duration = 4000,
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      bg: 'bg-white border-[#1F8A4C]/30 text-[#14221B]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#1F8A4C] shrink-0" />,
    },
    error: {
      bg: 'bg-white border-[#C8382F]/30 text-[#14221B]',
      icon: <AlertCircle className="w-5 h-5 text-[#C8382F] shrink-0" />,
    },
    info: {
      bg: 'bg-white border-[#2F6B4F]/30 text-[#14221B]',
      icon: <Info className="w-5 h-5 text-[#2F6B4F] shrink-0" />,
    },
  }[type];

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all ${config.bg} ${className}`}
    >
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#5E6B63] hover:text-[#14221B] transition"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
