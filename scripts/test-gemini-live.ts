// ==============================================================================
// PaperSite: Verify Active Gemini Model
// File: scripts/test-gemini-live.ts
// Invokes sketch-to-layout and checks model response and status.
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

async function testGemini() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  const token = auth?.session?.access_token;
  if (!token) {
    console.log('Failed to obtain token');
    process.exit(1);
  }

  console.log('Testing sketch-to-layout Edge Function with active Gemini model...');
  const res = await fetch(`${supabaseUrl}/functions/v1/sketch-to-layout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({
      businessType: 'cafe',
      businessName: 'Verification Coffee',
      language: 'en',
    }),
  });

  const status = res.status;
  const bodyText = await res.text();
  console.log(`HTTP Status: ${status}`);
  console.log(`Response snippet: ${bodyText.slice(0, 300)}`);
}

testGemini();
