// ==============================================================================
// PaperSite: Database RLS Security Test Runner
// File: scripts/run-db-tests.ts
// Tests Postgres RLS permissions directly as anon and authenticated user.
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

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('      PaperSite Database Security & RLS Suite       ');
  console.log('====================================================\n');

  let allPassed = true;

  // 1. Anon Client (No login)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  // Test 1: Anonymous cannot read bookings
  const { data: anonBookings, error: anonReadErr } = await anonClient
    .from('bookings')
    .select('*');

  if (anonReadErr || !anonBookings || anonBookings.length === 0) {
    console.log('[PASS] Anonymous user cannot read bookings directly (RLS/Grant blocked)');
  } else {
    console.log('[FAIL] Anonymous user was able to read bookings!');
    allPassed = false;
  }

  // Test 2: Anonymous cannot insert bookings directly
  const { error: anonInsertErr } = await anonClient
    .from('bookings')
    .insert({
      project_id: '11111111-1111-1111-1111-111111111111',
      customer_name: 'Attacker',
      phone: '+919999999999',
      service: 'Illegal',
      preferred_time: 'Now',
      status: 'new',
    });

  if (anonInsertErr) {
    console.log('[PASS] Anonymous user cannot insert bookings directly (blocked by RLS)');
  } else {
    console.log('[FAIL] Anonymous user was able to insert booking directly!');
    allPassed = false;
  }

  // Test 3: Anonymous CAN read published_sites (Public storefront)
  const { data: pubSite, error: pubErr } = await anonClient
    .from('published_sites')
    .select('slug, business_name')
    .eq('slug', 'brew-bay')
    .single();

  if (!pubErr && pubSite?.slug === 'brew-bay') {
    console.log('[PASS] Anonymous user can read published_sites for public store pages');
  } else {
    console.log('[FAIL] Anonymous user could not read published_sites');
    allPassed = false;
  }

  // Test 4: Anonymous cannot write/alter published_sites
  const { error: anonPubWriteErr } = await anonClient
    .from('published_sites')
    .insert({
      project_id: '11111111-1111-1111-1111-111111111111',
      slug: 'hack-site',
      html: '<h1>Defaced</h1>',
      business_name: 'Fake',
    });

  if (anonPubWriteErr) {
    console.log('[PASS] Anonymous user cannot write to published_sites');
  } else {
    console.log('[FAIL] Anonymous user was able to tamper with published_sites!');
    allPassed = false;
  }

  // 2. Authenticated Client (Signed-in business owner)
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authLoginErr } = await authClient.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (authLoginErr || !authData.user) {
    console.log(`[FAIL] Authenticated login failed: ${authLoginErr?.message}`);
    process.exit(1);
  }

  // Test 5: Authenticated owner can read their own projects
  const { data: ownerProjects, error: projErr } = await authClient
    .from('projects')
    .select('id, business_name, owner_id');

  const allOwnedByUser = (ownerProjects || []).every((p) => p.owner_id === authData.user.id);
  if (!projErr && ownerProjects && ownerProjects.length > 0 && allOwnedByUser) {
    console.log('[PASS] Authenticated user can read only their own projects');
  } else {
    console.log('[FAIL] Authenticated user project isolation failed');
    allPassed = false;
  }

  // Test 6: Authenticated user cannot insert bookings directly
  // (Policy restricts to owner select/update; creation MUST go via submit-booking edge function)
  const { error: directAuthBookingErr } = await authClient
    .from('bookings')
    .insert({
      project_id: ownerProjects?.[0]?.id || '11111111-1111-1111-1111-111111111111',
      customer_name: 'Bypass Test',
      phone: '+919999999999',
      service: 'Direct Table',
      preferred_time: 'Tonight',
      status: 'new',
    });

  if (directAuthBookingErr) {
    console.log('[PASS] Direct booking insert blocked for client role (only submit-booking allowed)');
  } else {
    console.log('[FAIL] Direct client booking insert was permitted!');
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('Result: ALL SECURITY AUDIT CHECKS PASSED');
  } else {
    console.log('Result: SOME SECURITY CHECKS FAILED');
  }
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
}

runSecurityAudit();
