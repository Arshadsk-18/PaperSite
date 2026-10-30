// ==============================================================================
// PaperSite: Authentication Helper
// File: supabase/functions/_shared/auth.ts
// Verifies caller JWT and extracts the authenticated user profile.
// ==============================================================================

import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

export async function requireUser(req: Request): Promise<{ user: User; client: any }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('MISSING_OR_INVALID_AUTHORIZATION_HEADER');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_CONFIGURATION_MISSING');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    throw new Error(`UNAUTHORIZED: ${error?.message || 'Invalid user token'}`);
  }

  return { user, client };
}
