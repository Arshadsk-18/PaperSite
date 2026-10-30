import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export const SupabaseBanner: React.FC = () => {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <aside
      aria-label="Configuration notice"
      className="bg-[#FFFBEB] border-b border-[#FDE68A] text-[#92400E] px-4 py-2.5 text-xs sm:text-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            <strong>Supabase not configured:</strong> Running in offline demo mode. Set{' '}
            <code className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded font-mono text-xs border border-[#FDE68A]">
              VITE_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded font-mono text-xs border border-[#FDE68A]">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            in <code className="font-mono font-medium">.env.local</code>.
          </span>
        </div>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-[#B45309] hover:text-[#78350F] underline shrink-0"
        >
          <span>Supabase dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </aside>
  );
};
