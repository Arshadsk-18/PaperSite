import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const SupabaseBanner: React.FC = () => {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Supabase Not Configured:</strong> Running in offline demo mode. Set{' '}
          <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          in <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">.env.local</code>.
        </span>
      </div>
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-medium text-amber-300 hover:text-amber-100 underline shrink-0"
      >
        <span>Supabase Dashboard</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};
