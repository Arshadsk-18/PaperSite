// ==============================================================================
// PaperSite: Verify Oversized Payload Protection on Deployed Edge Function
// File: scripts/test-oversized-payload-remote.ts
// Verifies HTTP 413 response on oversized payload without leaking any secrets.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { URL } from 'url';
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

function postHttps(targetUrl: string, headers: Record<string, string>, bodyStr: string): Promise<{ status: number; bodyText: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const bodyBuf = Buffer.from(bodyStr, 'utf8');

    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': bodyBuf.length.toString(),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, bodyText: data });
      });
    });

    req.on('error', err => {
      reject(err);
    });

    req.write(bodyBuf);
    req.end();
  });
}

async function testOversizedPayload() {
  console.log('================================================================');
  console.log('  PaperSite: Remote Oversized Payload Protection Verification   ');
  console.log('  Function: sketch-to-layout (Deployed Version 18)              ');
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

  // Test A: Image base64 string exceeding MAX_BASE64_LENGTH (2.1MB image)
  console.log('Test A: Sending image base64 exceeding 2MB string limit (2.1MB)...');
  const oversizedBase64 = '/9j/4AAQ' + 'A'.repeat(Math.floor(2.1 * 1024 * 1024));

  const startTimeA = Date.now();
  try {
    const resA = await fetch(`${supabaseUrl}/functions/v1/sketch-to-layout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        businessType: 'cafe',
        businessName: 'Oversized Test Cafe',
        language: 'en',
        imageBase64: oversizedBase64,
      }),
    });

    const durationA = Date.now() - startTimeA;
    const statusA = resA.status;
    const bodyTextA = await resA.text();
    let bodyJsonA: any = {};
    try {
      bodyJsonA = JSON.parse(bodyTextA);
    } catch {}

    console.log('----------------------------------------------------------------');
    console.log('Test A Response Diagnostics:');
    console.log(`  HTTP Status:       ${statusA}`);
    console.log(`  Request Duration:  ${durationA}ms`);
    console.log(`  Error Code:        ${bodyJsonA?.error || 'N/A'}`);
    console.log(`  Message:           ${bodyJsonA?.message || bodyTextA.slice(0, 150)}`);
    console.log('----------------------------------------------------------------');

    // Confirm no secrets leaked in body
    const containsSecret =
      bodyTextA.toLowerCase().includes('sk-or') ||
      bodyTextA.toLowerCase().includes('bearer') ||
      bodyTextA.toLowerCase().includes('secret');

    if (containsSecret) {
      console.error('[FAIL] Sensitive token or secret pattern detected in response!');
      process.exit(1);
    }
    console.log('[PASS] Zero secrets or sensitive tokens exposed in response body.');

    if (statusA === 413 && bodyJsonA?.error === 'PAYLOAD_TOO_LARGE') {
      console.log('[PASS] Deployed Edge Function correctly rejected oversized request with HTTP 413 PAYLOAD_TOO_LARGE!');
      console.log('\n[SUCCESS] Deployed Version 18 successfully enforces payload limits with HTTP 413!');
      process.exit(0);
    } else {
      console.error(`[FAIL] Expected HTTP 413 PAYLOAD_TOO_LARGE, got HTTP ${statusA}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Error:', err.message);
    process.exit(1);
  }
}

testOversizedPayload();
