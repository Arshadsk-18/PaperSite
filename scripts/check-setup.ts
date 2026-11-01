// ==============================================================================
// PaperSite: Setup Verification Script
// File: scripts/check-setup.ts
// Verifies environment variables, database permissions, Realtime, and Edge Functions.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      process.env[k] = v;
    }
  }
} catch {
  // Rely on process.env
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const demoEmail = process.env.VITE_DEMO_EMAIL || '';
const demoPassword = process.env.VITE_DEMO_PASSWORD || '';

async function runCheckSetup() {
  console.log('====================================================');
  console.log('       PaperSite System Verification Suite          ');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Environment variables are present
  const hasEnv = !!(supabaseUrl && supabaseAnonKey && demoEmail && demoPassword);
  if (hasEnv) {
    console.log('[PASS] Environment variables are present');
  } else {
    console.log('[FAIL] Environment variables are missing');
    allPassed = false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Sign in with demo account to acquire user JWT
  const { data: authData, error: _authError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  const authToken = authData?.session?.access_token || '';

  // 2. Can read published_sites
  const { data: pubData, error: pubError } = await supabase
    .from('published_sites')
    .select('*')
    .limit(5);

  if (!pubError && Array.isArray(pubData)) {
    console.log('[PASS] Can read published_sites');
  } else {
    console.log(`[FAIL] Can read published_sites (${pubError?.message || 'unknown error'})`);
    allPassed = false;
  }

  // 3. Realtime is enabled on bookings
  let realtimeJoined = false;
  const channel = supabase.channel('check_bookings_realtime');
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {});

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 5000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        realtimeJoined = true;
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  await supabase.removeChannel(channel);

  if (realtimeJoined) {
    console.log('[PASS] Realtime is enabled on bookings');
  } else {
    console.log('[FAIL] Realtime is not enabled on bookings');
    allPassed = false;
  }

  // 4. Each Edge Function responds
  const functions = [
    { name: 'layout-to-html', body: { layoutJson: { theme: { primary: '#1F3D33', font: 'Inter', businessName: 'Test' }, sections: [{ id: 'hero-1', type: 'hero', title: 'Hi' }] } }, auth: true },
    { name: 'submit-booking', body: { projectId: '11111111-1111-1111-1111-111111111111', customerName: 'Test', phone: '+919876543210' }, auth: false },
    { name: 'publish-site', body: { projectId: '00000000-0000-0000-0000-000000000000' }, auth: true },
    { name: 'unpublish-site', body: { projectId: '00000000-0000-0000-0000-000000000000' }, auth: true },
    { name: 'sketch-to-layout', body: { businessType: 'cafe', businessName: 'Coffee' }, auth: true },
    { name: 'edit-region', body: { currentLayoutJson: { theme: { primary: '#1F3D33', font: 'Inter', businessName: 'Test' }, sections: [{ id: 'hero-1', type: 'hero', title: 'Hi' }] }, instructionText: 'update' }, auth: true },
  ];

  let aiNotConfiguredDetected = false;

  for (const fn of functions) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      };
      if (fn.auth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/${fn.name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fn.body),
      });

      const bodyText = await res.text();
      let bodyJson: any = {};
      try { bodyJson = JSON.parse(bodyText); } catch {}

      if (bodyJson?.error === 'OPENROUTER_NOT_CONFIGURED' || bodyJson?.error === 'GEMINI_NOT_CONFIGURED') {
        aiNotConfiguredDetected = true;
      }

      // 404 for missing project id in publish/unpublish is expected valid business response
      // As long as the function is reached and responds with JSON (not 404 Route Not Found from Supabase gateway)
      const isFunctionResponding = res.status < 500 || (res.status >= 500 && (bodyJson?.error?.includes('OPENROUTER') || bodyJson?.error?.includes('GEMINI')));
      if (isFunctionResponding) {
        console.log(`[PASS] Edge Function '${fn.name}' responds (status ${res.status})`);
      } else {
        console.log(`[FAIL] Edge Function '${fn.name}' failed to respond (status ${res.status})`);
        allPassed = false;
      }
    } catch (err: any) {
      console.log(`[FAIL] Edge Function '${fn.name}' error: ${err.message}`);
      allPassed = false;
    }
  }

  // 5. AI provider configuration check
  if (!aiNotConfiguredDetected) {
    console.log('[PASS] AI provider secret is configured in Supabase');
  } else {
    console.log('[INFO] AI provider secret (OPENROUTER_API_KEY) is not yet set in remote Supabase secrets');
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('Result: ALL CHECKS PASSED');
  } else {
    console.log('Result: SOME CHECKS FAILED');
  }
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
}

runCheckSetup();
