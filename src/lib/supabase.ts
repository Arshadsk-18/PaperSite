import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' && process.env) || {};
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http')
);

// Exports a null-safe Supabase client or null if environment variables are not configured
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Safe accessor that logs a friendly message instead of throwing
export function getSupabase(): SupabaseClient | null {
  if (!supabase) {
    console.warn('[PaperSite] Supabase client is not configured. Please add your credentials to .env.local.');
  }
  return supabase;
}
