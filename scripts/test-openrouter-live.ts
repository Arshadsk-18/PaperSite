// ==============================================================================
// PaperSite: Verify Live OpenRouter Integration
// File: scripts/test-openrouter-live.ts
// Invokes sketch-to-layout to test OpenRouter free model (nvidia/nemotron-3.5-super-vl:free).
// Never prints API keys or secrets.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      process.env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
  }
} catch {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const demoEmail = process.env.VITE_DEMO_EMAIL || '';
const demoPassword = process.env.VITE_DEMO_PASSWORD || '';

async function testOpenRouterLive() {
  console.log('================================================================');
  console.log('  PaperSite OpenRouter Free AI Live Verification Suite          ');
  console.log('  Target Model: nvidia/nemotron-3.5-super-vl:free              ');
  console.log('================================================================\n');

  if (!supabaseUrl || !supabaseAnonKey || !demoEmail || !demoPassword) {
    console.error('[FAIL] Supabase credentials or demo account missing in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (authErr || !auth?.session?.access_token) {
    console.error(`[FAIL] Authentication failed: ${authErr?.message || 'No session token'}`);
    process.exit(1);
  }

  const token = auth.session.access_token;
  console.log('[PASS] Demo user authenticated successfully.');
  console.log('Testing sketch-to-layout Edge Function with OpenRouter model...');

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/sketch-to-layout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        businessType: 'cafe',
        businessName: 'Verification Coffee Bar',
        language: 'en',
      }),
    });

    const status = res.status;
    const bodyText = await res.text();
    let bodyJson: any = {};
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {}

    console.log(`HTTP Status: ${status}`);
    if (status === 200 && bodyJson?.success) {
      console.log('[PASS] OpenRouter free model responded with valid layout JSON!');
      console.log(`Layout theme: font=${bodyJson.layout?.theme?.font}, primary=${bodyJson.layout?.theme?.primary}`);
      console.log(`Sections generated: ${bodyJson.layout?.sections?.length || 0}`);
    } else if (bodyJson?.error === 'OPENROUTER_NOT_CONFIGURED') {
      console.log('[INFO] OPENROUTER_NOT_CONFIGURED: The server-side secret OPENROUTER_API_KEY is not yet deployed in remote Supabase secrets.');
      console.log('Run `supabase secrets set OPENROUTER_API_KEY="your-key"` to configure it.');
    } else if (bodyJson?.error === 'OPENROUTER_RATE_LIMITED' || status === 429) {
      console.log('[INFO] OPENROUTER_RATE_LIMITED: OpenRouter free model quota limit reached on remote provider.');
    } else if (bodyJson?.error === 'OPENROUTER_UNAVAILABLE' || status === 503) {
      console.log('[INFO] OPENROUTER_UNAVAILABLE (HTTP 503):');
      console.log('  The free NVIDIA model (nvidia/nemotron-3.5-super-vl:free) or upstream provider is temporarily unavailable or timed out.');
      console.log('  Check Supabase Dashboard -> Edge Functions -> Logs for the structured `openrouter_diagnostic` entry.');
    } else {
      console.log(`[INFO] Server response error: ${bodyJson?.error || bodyText.slice(0, 150)}`);
    }
  } catch (err: any) {
    console.error(`[FAIL] Network error calling Edge Function: ${err.message}`);
  }
}

testOpenRouterLive();
