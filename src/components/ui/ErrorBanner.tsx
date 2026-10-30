import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Something went wrong',
  message,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 p-4 rounded-xl bg-[#C8382F]/10 border border-[#C8382F]/20 text-[#C8382F] ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-[#14221B]">{title}</h4>
          <p className="text-xs sm:text-sm text-[#5E6B63] mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-[#5E6B63] hover:text-[#14221B] hover:bg-black/5 transition"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
