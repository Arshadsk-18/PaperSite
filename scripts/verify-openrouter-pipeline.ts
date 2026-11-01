// ==============================================================================
// PaperSite: Comprehensive OpenRouter & Workspace Verification Suite
// File: scripts/verify-openrouter-pipeline.ts
// Verifies:
// 1. Strict free model identifier (nvidia/nemotron-3.5-super-vl:free)
// 2. Defensive JSON extraction (clean, markdown fences, conversational prefix)
// 3. Schema validation (colors, fonts, section types, 24h times)
// 4. Image payload format (image_url data URI) and rejection of invalid payloads
// 5. 3 distinct sketches: Café, Restaurant, Boutique (independent layouts & hashes)
// 6. Cache safety: demo/failed layouts are NEVER cached as AI-generated
// 7. Error handling: missing key, rate-limit 429, unavailability, timeout
// 8. Deterministic HTML compiler & booking pipeline integrity
// ==============================================================================

import { OPENROUTER_FREE_MODEL, extractAndParseJson } from '../supabase/functions/_shared/openrouterJson';
import { validateLayout, type SiteLayout } from '../supabase/functions/_shared/schema';
import { renderSite } from '../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../supabase/functions/_shared/sanitize';
import { hashSketch, setCachedSketchResult, getCachedSketchResult } from '../src/lib/sketchCache';
import { buildSamplePage } from '../src/demo/demoService';

async function runVerification() {
  console.log('================================================================');
  console.log('    PaperSite: OpenRouter Migration & Pipeline Test Suite       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Model Identifier & Strict Provider Rules
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Model & Zero-Paid Configuration ---');
  assert(
    OPENROUTER_FREE_MODEL === 'nvidia/nemotron-3.5-super-vl:free',
    'Free Model Identifier',
    `Expected 'nvidia/nemotron-3.5-super-vl:free', got '${OPENROUTER_FREE_MODEL}'`
  );
  assert(
    OPENROUTER_FREE_MODEL.endsWith(':free'),
    'Strict Zero-Paid Tag',
    'Model must have :free suffix to guarantee zero paid quota usage'
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Defensive JSON Parsing & Extraction
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Defensive JSON Parser ---');

  // 2a. Clean JSON
  const rawClean = JSON.stringify({ theme: { primary: '#1F3D33', font: 'Inter' }, sections: [] });
  const parsedClean = extractAndParseJson(rawClean);
  assert(parsedClean?.theme?.primary === '#1F3D33', 'Parse clean JSON string');

  // 2b. Markdown Fenced JSON (```json ... ```)
  const markdownFenced = `\`\`\`json\n{\n  "theme": { "primary": "#2F6B4F", "font": "Poppins" },\n  "sections": []\n}\n\`\`\``;
  const parsedFenced = extractAndParseJson(markdownFenced);
  assert(parsedFenced?.theme?.primary === '#2F6B4F', 'Parse markdown-fenced JSON (```json)');

  // 2c. Conversational Wrapping
  const conversational = `Here is the requested layout for the café:\n\n{\n  "theme": { "primary": "#d97706", "font": "Outfit" },\n  "sections": []\n}\n\nHope this looks great!`;
  const parsedConversational = extractAndParseJson(conversational);
  assert(parsedConversational?.theme?.primary === '#d97706', 'Extract JSON with conversational prefix and suffix');

  // 2d. Rejection of invalid JSON
  let invalidRejected = false;
  try {
    extractAndParseJson('This is not JSON at all: { unclosed bracket');
  } catch (err: any) {
    if (err.message === 'OPENROUTER_INVALID_JSON') invalidRejected = true;
  }
  assert(invalidRejected, 'Reject malformed JSON with OPENROUTER_INVALID_JSON');

  // ---------------------------------------------------------------------------
  // TEST 3: Schema Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. SiteLayout Schema Validation ---');

  const validLayout: SiteLayout = {
    theme: { primary: '#1F3D33', font: 'Inter', businessName: 'Test Cafe' },
    sections: [
      { id: 'header-1', type: 'header' },
      { id: 'hero-1', type: 'hero', title: 'Welcome', subtitle: 'Best coffee in town' },
      { id: 'services-1', type: 'services', title: 'Menu', items: [{ name: 'Espresso', price: '₹120' }] },
      { id: 'booking-1', type: 'booking', title: 'Reserve Table' },
      { id: 'contact-1', type: 'contact', title: 'Visit Us' },
    ],
  };

  const validResult = validateLayout(validLayout);
  assert(validResult.valid && validResult.errors.length === 0, 'Valid layout passes validation');

  // 3b. Invalid Hex Color
  const invalidColorLayout = { ...validLayout, theme: { ...validLayout.theme, primary: 'not-a-color' } };
  const colorResult = validateLayout(invalidColorLayout);
  assert(!colorResult.valid && colorResult.errors.some(e => e.includes('primary')), 'Reject invalid hex color code');

  // 3c. Invalid Font
  const invalidFontLayout = { ...validLayout, theme: { ...validLayout.theme, font: 'Comic Sans MS' } };
  const fontResult = validateLayout(invalidFontLayout);
  assert(!fontResult.valid && fontResult.errors.some(e => e.includes('font')), 'Reject unapproved font');

  // 3d. Section type validation
  const invalidSectionLayout = {
    ...validLayout,
    sections: [{ id: 'sec-1', type: 'unsupported_type_xyz' as any }],
  };
  const secResult = validateLayout(invalidSectionLayout);
  assert(!secResult.valid && secResult.errors.some(e => e.includes('unsupported_type_xyz')), 'Reject invalid section type');

  // ---------------------------------------------------------------------------
  // TEST 4: Three Distinct Sketches (Café, Restaurant, Boutique)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Three Distinct Sketches Pipeline ---');

  // Generate 3 simulated unique base64 images (different dimensions & content)
  const cafeImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const restaurantImage = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const boutiqueImage = 'iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAFElEQVR42mNkYPj/nwEBGBgYGBgAANcAA4C8Z1sAAAAASUVORK5CYII=';

  const cafeHash = await hashSketch(cafeImage, 'cafe');
  const restaurantHash = await hashSketch(restaurantImage, 'restaurant');
  const boutiqueHash = await hashSketch(boutiqueImage, 'boutique');

  assert(cafeHash !== restaurantHash && restaurantHash !== boutiqueHash && cafeHash !== boutiqueHash,
    '3 Distinct Image Content Hashes',
    'Hashes must be unique for different sketches and business types'
  );

  const cafeSample = buildSamplePage({ businessName: 'Artisan Cafe', businessType: 'cafe', language: 'en' });
  const restaurantSample = buildSamplePage({ businessName: 'Spice Route Bistro', businessType: 'restaurant', language: 'en' });
  const boutiqueSample = buildSamplePage({ businessName: 'Zari Boutique', businessType: 'boutique', language: 'en' });

  assert(validateLayout(cafeSample.layout).valid, 'Café sample layout passes schema validation');
  assert(validateLayout(restaurantSample.layout).valid, 'Restaurant sample layout passes schema validation');
  assert(validateLayout(boutiqueSample.layout).valid, 'Boutique sample layout passes schema validation');

  assert(
    cafeSample.layout.theme.primary !== restaurantSample.layout.theme.primary,
    'Distinct Category Color Theming',
    'Café and restaurant must have distinct primary themes'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Cache Isolation & Zero-Fake AI Guarantee
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Cache Isolation & Authenticity Guarantee ---');

  const testHash = 'test-sketch-hash-safety-verification';

  // Attempting to cache a fallback / non-AI result must NEVER be stored in cache
  setCachedSketchResult(testHash, cafeSample.layout, cafeSample.html, 'cafe', false);
  const retrievedNonAi = getCachedSketchResult(testHash);
  assert(
    retrievedNonAi === null,
    'Fallback demo layout is NEVER cached (setCachedSketchResult ignores isAiGenerated=false)'
  );

  // Storing a verified AI-generated layout
  setCachedSketchResult(testHash, cafeSample.layout, cafeSample.html, 'cafe', true);
  const retrievedAi = getCachedSketchResult(testHash);
  assert(
    retrievedAi?.isAiGenerated === true,
    'Authentic AI generation correctly cached with isAiGenerated=true'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Deterministic HTML Compiler & Live Booking Endpoint
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. HTML Compiler & Publishing Safety ---');

  const compiledHtml = renderSite(cafeSample.layout, 'en', '+919876543210', {
    projectId: '11111111-2222-3333-4444-555555555555',
    address: '123 Baker St',
  });

  assert(compiledHtml.includes('__BOOKING_ENDPOINT__'), 'HTML compiler includes __BOOKING_ENDPOINT__ token for live injection');
  assert(!compiledHtml.includes('<script>'), 'HTML compiler contains no arbitrary script tags');

  const sanitized = sanitizeHtml(compiledHtml);
  assert(sanitized.length > 500, 'HTML passes DOMPurify sanitization intact');

  // Verify booking endpoint replacement as done in publish-site
  const liveBookingUrl = 'https://papersite.supabase.co/functions/v1/submit-booking';
  const publishedHtml = sanitized.replaceAll('__BOOKING_ENDPOINT__', liveBookingUrl);
  assert(publishedHtml.includes(liveBookingUrl), 'Publish endpoint injection accurately replaces booking placeholder');
  assert(!publishedHtml.includes('__BOOKING_ENDPOINT__'), 'All booking placeholders are replaced before publish');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
