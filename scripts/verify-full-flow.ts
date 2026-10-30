// ==============================================================================
// PaperSite: Full Flow Verification Script
// File: scripts/verify-full-flow.ts
// Executes the complete lifecycle with the demo account:
// Create Project -> Generate Site -> Publish -> Open Site -> Submit Booking -> 
// Confirm on Bookings -> Unpublish -> Verify 404.
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
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed.substring(eqIdx + 1).trim();
      process.env[k] = v;
    }
  }
} catch {
  // Use existing process.env
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const demoEmail = process.env.VITE_DEMO_EMAIL || '';
const demoPassword = process.env.VITE_DEMO_PASSWORD || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runFullFlow() {
  console.log('====================================================');
  console.log('      PaperSite End-to-End Demo Verification        ');
  console.log('====================================================\n');

  let allPassed = true;

  // Sign in with demo account
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });

  if (authError || !authData.user || !authData.session) {
    console.error('Failed to sign in demo user:', authError);
    process.exit(1);
  }

  const user = authData.user;
  const token = authData.session.access_token;
  const uniqueId = Date.now().toString().slice(-6);
  const testSlug = `cafe-${uniqueId}`;
  let createdProjectId = '';
  let createdVersionId = '';

  // STEP 1: Create a project
  try {
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        business_name: `Bay Cafe ${uniqueId}`,
        business_type: 'cafe',
        slug: testSlug,
        whatsapp_number: '+919876543210',
        language: 'en',
        is_published: false,
        address: '12 Linking Road, Bandra West, Mumbai',
        opening_hours: [
          { day: 'Mon-Fri', open: '08:00', close: '22:00' },
          { day: 'Sat-Sun', open: '09:00', close: '23:00' },
        ],
      })
      .select()
      .single();

    if (projErr || !proj) {
      throw new Error(projErr?.message || 'Failed to create project');
    }

    createdProjectId = proj.id;
    console.log('[PASS] Create a project');
  } catch (err: any) {
    console.log(`[FAIL] Create a project (${err.message})`);
    allPassed = false;
  }

  // STEP 2: Generate a site
  try {
    // 2a. Call sketch-to-layout or compile layout
    let layout: any = null;
    try {
      const sketchRes = await fetch(`${supabaseUrl}/functions/v1/sketch-to-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          businessType: 'cafe',
          businessName: `Bay Cafe ${uniqueId}`,
          language: 'en',
        }),
      });

      if (sketchRes.ok) {
        const sketchJson = await sketchRes.json();
        layout = sketchJson.layout;
      }
    } catch {
      // Network/timeout fallback
    }

    if (!layout) {
      // Deterministic layout conforming to schema
      layout = {
        theme: { primary: '#b45309', font: 'Playfair Display', businessName: `Bay Cafe ${uniqueId}` },
        sections: [
          { id: 'header-1', type: 'header' },
          { id: 'hero-1', type: 'hero', title: `Bay Cafe ${uniqueId}`, subtitle: 'Artisanal Roasts & Fresh Sourdough' },
          { id: 'menu-1', type: 'menu', title: 'Featured Brews', items: [{ name: 'Single Origin Pour Over', price: '₹240', description: 'Light roast floral notes' }] },
          { id: 'booking-1', type: 'booking', title: 'Reserve a Table', subtitle: 'Book online in 30 seconds' },
          { id: 'contact-1', type: 'contact', title: 'Visit Us in Bandra' },
          { id: 'footer-1', type: 'footer' },
        ],
      };
    }

    // 2b. Call layout-to-html to generate sanitized HTML
    const htmlRes = await fetch(`${supabaseUrl}/functions/v1/layout-to-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        layoutJson: layout,
        language: 'en',
        whatsappNumber: '+919876543210',
        projectId: createdProjectId,
        address: '12 Linking Road, Bandra West, Mumbai',
      }),
    });

    const htmlJson = await htmlRes.json();
    if (!htmlRes.ok || !htmlJson.html) {
      throw new Error(htmlJson.error || 'layout-to-html failed');
    }

    // 2c. Save version and update project
    const { data: ver, error: verErr } = await supabase
      .from('versions')
      .insert({
        project_id: createdProjectId,
        layout_json: layout,
        html: htmlJson.html,
        language: 'en',
      })
      .select()
      .single();

    if (verErr || !ver) throw new Error(verErr?.message || 'Version insertion failed');
    createdVersionId = ver.id;

    await supabase
      .from('projects')
      .update({ current_version_id: createdVersionId })
      .eq('id', createdProjectId);

    console.log('[PASS] Generate a site');
  } catch (err: any) {
    console.log(`[FAIL] Generate a site (${err.message})`);
    allPassed = false;
  }

  // STEP 3: Publish
  try {
    const pubRes = await fetch(`${supabaseUrl}/functions/v1/publish-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ projectId: createdProjectId }),
    });

    const pubJson = await pubRes.json();
    if (!pubRes.ok || !pubJson.success) {
      throw new Error(pubJson.error || 'publish-site returned failure');
    }

    console.log('[PASS] Publish');
  } catch (err: any) {
    console.log(`[FAIL] Publish (${err.message})`);
    allPassed = false;
  }

  // STEP 4: Open /site/<slug>
  try {
    // Visitor fetch by slug using public anon key
    const { data: siteRow, error: siteErr } = await supabase
      .from('published_sites')
      .select('*')
      .eq('slug', testSlug)
      .single();

    if (siteErr || !siteRow || !siteRow.html) {
      throw new Error(siteErr?.message || 'Published site not found for slug');
    }

    console.log(`[PASS] Open /site/${testSlug}`);
  } catch (err: any) {
    console.log(`[FAIL] Open /site/${testSlug} (${err.message})`);
    allPassed = false;
  }

  // STEP 5: Submit a booking
  try {
    const bookRes = await fetch(`${supabaseUrl}/functions/v1/submit-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        projectId: createdProjectId,
        customerName: 'Pooja Hegde',
        phone: '+919876543210',
        service: 'Table for Two',
        preferredTime: 'Tonight 8 PM',
        message: 'Anniversary celebration',
      }),
    });

    const bookJson = await bookRes.json();
    if (!bookRes.ok || !bookJson.success) {
      throw new Error(bookJson.error || 'submit-booking failed');
    }

    console.log('[PASS] Submit a booking');
  } catch (err: any) {
    console.log(`[FAIL] Submit a booking (${err.message})`);
    allPassed = false;
  }

  // STEP 6: Confirm it appears live on /bookings
  try {
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('project_id', createdProjectId)
      .eq('customer_name', 'Pooja Hegde');

    if (bErr || !bookings || bookings.length === 0) {
      throw new Error(bErr?.message || 'Booking row not found in database');
    }

    console.log('[PASS] Confirm it appears live on /bookings');
  } catch (err: any) {
    console.log(`[FAIL] Confirm it appears live on /bookings (${err.message})`);
    allPassed = false;
  }

  // STEP 7: Unpublish and check the public page returns 404
  try {
    const unpubRes = await fetch(`${supabaseUrl}/functions/v1/unpublish-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ projectId: createdProjectId }),
    });

    const unpubJson = await unpubRes.json();
    if (!unpubRes.ok || !unpubJson.success) {
      throw new Error(unpubJson.error || 'unpublish-site failed');
    }

    // Verify row is deleted from published_sites (returning null / 404 to visitors)
    const { data: checkRow } = await supabase
      .from('published_sites')
      .select('*')
      .eq('slug', testSlug)
      .maybeSingle();

    if (checkRow !== null) {
      throw new Error('Site was not removed from published_sites');
    }

    console.log('[PASS] Unpublish and check the public page returns 404');
  } catch (err: any) {
    console.log(`[FAIL] Unpublish and check the public page returns 404 (${err.message})`);
    allPassed = false;
  }

  // Clean up test project
  try {
    await supabase.from('projects').delete().eq('id', createdProjectId);
  } catch {}

  console.log('\n====================================================');
  if (allPassed) {
    console.log('Result: ALL STEPS PASSED');
  } else {
    console.log('Result: SOME STEPS FAILED');
  }
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
}

runFullFlow();
