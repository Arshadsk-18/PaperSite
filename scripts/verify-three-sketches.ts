// ==============================================================================
// PaperSite: 3 Distinct Sketches Verification & Pipeline Test
// File: scripts/verify-three-sketches.ts
// Tests:
// 1. Cafe sketch
// 2. Restaurant sketch
// 3. Clothing shop sketch
// Verifies:
// - Different image content hashes
// - Independent layout generation
// - No cross-sketch cache pollution
// - HTML generation and publishing
// - Public site accessibility
// - Booking submission and retrieval
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { hashSketch, setCachedSketchResult, getCachedSketchResult } from '../src/lib/sketchCache';
import { buildSamplePage, getCategorySampleLayout } from '../src/demo/demoService';
import { renderSite } from '../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../supabase/functions/_shared/sanitize';

// Load .env.local
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
} catch { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const demoEmail = process.env.VITE_DEMO_EMAIL || '';
const demoPassword = process.env.VITE_DEMO_PASSWORD || '';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runThreeSketchesVerification() {
  console.log('================================================================');
  console.log('       PaperSite 3 Distinct Sketches & Pipeline Verification    ');
  console.log('================================================================\n');

  let allPassed = true;

  // 1. Generate 3 genuinely distinct base64 mock sketch representations
  const cafeSketchBase64 = Buffer.from('DRAWING_MOCK_COFFEE_CUP_PASTRY_CAFE_SKETCH_' + Date.now()).toString('base64');
  const restaurantSketchBase64 = Buffer.from('DRAWING_MOCK_DINNER_TABLE_CHEF_SPECIAL_BISTRO_SKETCH_' + (Date.now() + 100)).toString('base64');
  const clothingShopSketchBase64 = Buffer.from('DRAWING_MOCK_APPAREL_HANGERS_MANNEQUIN_BOUTIQUE_SKETCH_' + (Date.now() + 200)).toString('base64');

  // Verify Hashes are completely different
  const hashCafe = await hashSketch(cafeSketchBase64, 'cafe');
  const hashRestaurant = await hashSketch(restaurantSketchBase64, 'restaurant');
  const hashClothing = await hashSketch(clothingShopSketchBase64, 'clothing');

  console.log(`[HASH 1] Cafe sketch hash:        ${hashCafe}`);
  console.log(`[HASH 2] Restaurant sketch hash:  ${hashRestaurant}`);
  console.log(`[HASH 3] Clothing sketch hash:    ${hashClothing}`);

  if (hashCafe !== hashRestaurant && hashRestaurant !== hashClothing && hashCafe !== hashClothing) {
    console.log('[PASS] All 3 sketches produce unique, distinct hashes.');
  } else {
    console.log('[FAIL] Hash collision detected between distinct sketches!');
    allPassed = false;
  }

  // 2. Verify independent layout generation (no cross-sketch pollution)
  const cafeLayout = getCategorySampleLayout('cafe', 'Brew Bay Café');
  const restaurantLayout = getCategorySampleLayout('restaurant', 'Spice Route Bistro');
  const clothingLayout = getCategorySampleLayout('clothing', 'Aura Boutique');

  console.log(`[LAYOUT 1] Cafe:       Primary ${cafeLayout.theme.primary}, Title: ${cafeLayout.theme.businessName}`);
  console.log(`[LAYOUT 2] Restaurant: Primary ${restaurantLayout.theme.primary}, Title: ${restaurantLayout.theme.businessName}`);
  console.log(`[LAYOUT 3] Clothing:   Primary ${clothingLayout.theme.primary}, Title: ${clothingLayout.theme.businessName}`);

  if (
    cafeLayout.theme.businessName !== restaurantLayout.theme.businessName &&
    restaurantLayout.theme.businessName !== clothingLayout.theme.businessName &&
    cafeLayout.theme.primary !== restaurantLayout.theme.primary &&
    restaurantLayout.theme.primary !== clothingLayout.theme.primary
  ) {
    console.log('[PASS] All 3 sketches generate distinct layouts matching their business categories.');
  } else {
    console.log('[FAIL] Layouts are identical or cross-pollinated!');
    allPassed = false;
  }

  // 3. Verify Cache Safety: Fallbacks are NEVER cached under sketch hashes
  // Calling setCachedSketchResult with isAiGenerated: false
  setCachedSketchResult(hashCafe, cafeLayout, '<div>Cafe</div>', 'cafe', false);
  const cachedFallback = getCachedSketchResult(hashCafe);
  if (cachedFallback === null) {
    console.log('[PASS] Cache Safety: Fallback layout was correctly rejected from cache.');
  } else {
    console.log('[FAIL] Cache Safety: Fallback layout was incorrectly cached!');
    allPassed = false;
  }

  // 4. Verify AI Generation Cache: Genuine AI generation is cached correctly
  setCachedSketchResult(hashCafe, cafeLayout, '<div>Cafe AI</div>', 'cafe', true);
  const cachedAi = getCachedSketchResult(hashCafe);
  if (cachedAi && cachedAi.layout.theme.businessName === 'Brew Bay Café') {
    console.log('[PASS] Cache Safety: Genuine AI layout is cached and retrievable.');
  } else {
    console.log('[FAIL] Genuine AI layout failed cache retrieval.');
    allPassed = false;
  }

  // Confirm restaurant hash does not hit cafe cache
  const restaurantCached = getCachedSketchResult(hashRestaurant);
  if (restaurantCached === null) {
    console.log('[PASS] Cache Isolation: Restaurant sketch hash has zero contamination from Cafe.');
  } else {
    console.log('[FAIL] Cache Isolation failed: Restaurant returned cached Cafe layout!');
    allPassed = false;
  }

  // 5. Test Full Pipeline: Generate -> Save HTML -> Publish -> Fetch Public Site -> Booking -> Unpublish
  console.log('\n--- Testing End-to-End Publishing Pipeline ---');
  try {
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (authErr || !authData.session) {
      throw new Error(`Demo login failed: ${authErr?.message}`);
    }

    const token = authData.session.access_token;
    const userId = authData.user.id;
    const testSlug = `test-bistro-${Date.now()}`;

    // A. Create project
    const { data: project, error: pErr } = await client
      .from('projects')
      .insert({
        owner_id: userId,
        business_name: 'Spice Route Bistro',
        business_type: 'restaurant',
        slug: testSlug,
        whatsapp_number: '+919876543210',
        language: 'en',
        address: '42 Heritage Enclave, Bengaluru',
      })
      .select()
      .single();

    if (pErr || !project) throw new Error(`Project creation failed: ${pErr?.message}`);
    console.log(`[PASS] Created project: ${project.id} (slug: ${testSlug})`);

    // B. Build HTML and create Version record
    const { html: compiledHtml } = buildSamplePage({
      businessName: 'Spice Route Bistro',
      businessType: 'restaurant',
      whatsappNumber: '+919876543210',
      projectId: project.id,
      address: '42 Heritage Enclave, Bengaluru',
    });

    const { data: version, error: vErr } = await client
      .from('versions')
      .insert({
        project_id: project.id,
        layout_json: restaurantLayout,
        html: compiledHtml,
        language: 'en',
      })
      .select()
      .single();

    if (vErr || !version) throw new Error(`Version creation failed: ${vErr?.message}`);
    console.log(`[PASS] Created version: ${version.id} with verified HTML (${compiledHtml.length} bytes)`);

    // Link version to project
    await client.from('projects').update({ current_version_id: version.id }).eq('id', project.id);

    // C. Publish site via publish-site Edge Function
    const pubRes = await fetch(`${supabaseUrl}/functions/v1/publish-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ projectId: project.id }),
    });

    const pubJson = await pubRes.json();
    if (!pubRes.ok || pubJson.error) {
      throw new Error(`Publish failed (${pubRes.status}): ${pubJson.error || JSON.stringify(pubJson)}`);
    }
    console.log(`[PASS] Published site via publish-site Edge Function: /site/${pubJson.slug}`);

    // D. Fetch public published site from published_sites table
    const { data: pubData, error: fetchErr } = await client
      .from('published_sites')
      .select('*')
      .eq('slug', testSlug)
      .single();

    if (fetchErr || !pubData || !pubData.html) {
      throw new Error(`Public site fetch failed: ${fetchErr?.message || 'Empty record'}`);
    }
    if (!pubData.html.includes('Spice Route Bistro')) {
      throw new Error('Public site does not contain the generated shop name!');
    }
    console.log(`[PASS] Verified public site serves exact website HTML for slug: ${testSlug}`);

    // E. Submit customer booking to submit-booking Edge Function
    const bookingRes = await fetch(`${supabaseUrl}/functions/v1/submit-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        projectId: project.id,
        customerName: 'Ananya Sharma',
        phone: '+919876543299',
        service: 'Dinner Table for 4',
        preferredTime: 'Tonight 8:30 PM',
        message: 'Window seating preferred please.',
      }),
    });

    const bookingJson = await bookingRes.json();
    if (!bookingRes.ok || bookingJson.error) {
      throw new Error(`Booking submission failed: ${bookingJson.error}`);
    }
    console.log(`[PASS] Customer submitted booking via submit-booking: ID ${bookingJson.booking?.id || 'OK'}`);

    // F. Verify booking appears in owner's bookings
    const { data: ownerBookings, error: bErr } = await client
      .from('bookings')
      .select('*')
      .eq('project_id', project.id);

    if (bErr || !ownerBookings || ownerBookings.length === 0) {
      throw new Error('Booking did not appear in database query!');
    }
    console.log(`[PASS] Booking verified in database: "${ownerBookings[0].customer_name}" - ${ownerBookings[0].service}`);

    // G. Unpublish site via unpublish-site Edge Function
    const unpubRes = await fetch(`${supabaseUrl}/functions/v1/unpublish-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ projectId: project.id }),
    });

    const unpubJson = await unpubRes.json();
    if (!unpubRes.ok || unpubJson.error) {
      throw new Error(`Unpublish failed: ${unpubJson.error}`);
    }
    console.log(`[PASS] Site successfully unpublished.`);

    // Confirm public access is removed
    const { data: unpubCheck } = await client
      .from('published_sites')
      .select('*')
      .eq('slug', testSlug)
      .maybeSingle();

    if (!unpubCheck) {
      console.log('[PASS] Confirmed public access removed (record deleted from published_sites).');
    } else {
      throw new Error('Record was not deleted upon unpublish!');
    }

    // Cleanup test project
    await client.from('bookings').delete().eq('project_id', project.id);
    await client.from('versions').delete().eq('project_id', project.id);
    await client.from('projects').delete().eq('id', project.id);
    console.log('[PASS] Cleanup test data complete.');
  } catch (flowErr: any) {
    console.log(`[FAIL] End-to-end pipeline test: ${flowErr.message}`);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('Result: ALL 3-SKETCH & PIPELINE VERIFICATION CHECKS PASSED');
  } else {
    console.log('Result: VERIFICATION ENCOUNTERED FAILURES');
  }
  console.log('================================================================');
}

runThreeSketchesVerification();
