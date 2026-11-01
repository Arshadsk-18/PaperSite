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
// 7. Deterministic HTML compiler & booking pipeline integrity
// 8. Resource protection & memory optimization (streaming body limits, bounded logs)
// ==============================================================================

import {
  OPENROUTER_FREE_MODEL,
  extractAndParseJson,
  sanitizeLogMessage,
  resolveImageDataUri,
} from '../supabase/functions/_shared/openrouterJson';
import { validateLayout, type SiteLayout } from '../supabase/functions/_shared/schema';
import { renderSite } from '../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../supabase/functions/_shared/sanitize';
import { hashSketch, setCachedSketchResult, getCachedSketchResult } from '../src/lib/sketchCache';
import { buildSamplePage } from '../src/demo/demoService';
import {
  readJsonWithLimit,
  PayloadTooLargeError,
  MAX_REQUEST_BODY_BYTES,
  MAX_BASE64_LENGTH,
} from '../supabase/functions/_shared/requestLimit';

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
  // TEST 7: Resource Protection & Ingestion Limits (HTTP 546 Prevention)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Resource Protection & Ingestion Limits ---');

  assert(
    MAX_REQUEST_BODY_BYTES === 2.5 * 1024 * 1024,
    'Max Request Body Bytes is strictly 2.5MB'
  );
  assert(
    MAX_BASE64_LENGTH === 2 * 1024 * 1024,
    'Max Base64 String Length is strictly 2MB'
  );

  // 7a. Normal JSON request parsing
  const validJsonReq = new Request('https://papersite.dev/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessType: 'gym', businessName: 'IronFit' }),
  });
  const parsedJson = await readJsonWithLimit<{ businessType: string }>(validJsonReq, 1024 * 1024);
  assert(parsedJson.businessType === 'gym', 'readJsonWithLimit parses valid request under limit');

  // 7b. Rejection via Content-Length header before buffering
  const oversizedHeaderReq = new Request('https://papersite.dev/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '10485760', // 10MB Content-Length
    },
    body: JSON.stringify({ dummy: 'data' }),
  });
  let headerRejected = false;
  try {
    await readJsonWithLimit(oversizedHeaderReq, 1024);
  } catch (err: any) {
    if (err instanceof PayloadTooLargeError) headerRejected = true;
  }
  assert(headerRejected, 'readJsonWithLimit immediately rejects oversized Content-Length header without reading body');

  // 7c. Rejection via streaming byte counter when Content-Length is missing or chunked
  const largeChunk = 'A'.repeat(4096);
  const streamedReq = new Request('https://papersite.dev/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, // No Content-Length
    body: JSON.stringify({ large: largeChunk }),
  });
  let streamRejected = false;
  try {
    await readJsonWithLimit(streamedReq, 1024); // Limit is 1KB, payload is ~4.1KB
  } catch (err: any) {
    if (err instanceof PayloadTooLargeError) streamRejected = true;
  }
  assert(streamRejected, 'readJsonWithLimit streams and aborts oversized body when Content-Length is missing');

  // 7d. Bounded log sanitization
  const logWithSensitiveData = 'Error: sk-or-v1-999999999999 occurred with Bearer my-secret-jwt and data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';
  const cleanLog = sanitizeLogMessage(logWithSensitiveData);
  assert(!cleanLog.includes('sk-or-v1'), 'sanitizeLogMessage redacts OpenRouter API keys');
  assert(!cleanLog.includes('my-secret-jwt'), 'sanitizeLogMessage redacts Bearer tokens');
  assert(!cleanLog.includes('iVBORw0KGgoAAAANSUhEUgAA'), 'sanitizeLogMessage redacts base64 image data');

  const massiveLog = 'Z'.repeat(5000);
  const boundedCleanLog = sanitizeLogMessage(massiveLog);
  assert(
    boundedCleanLog.length <= 550 && boundedCleanLog.includes('[TRUNCATED]'),
    'sanitizeLogMessage bounds input length to prevent CPU spikes or ReDoS'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Multimodal Image MIME Type Resolution & Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Multimodal Image MIME Type Resolution & Validation ---');

  // Realistic sample headers in Base64:
  // JPEG magic bytes: FF D8 FF -> Base64 begins with "/9j/"
  const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  // PNG magic bytes: 89 50 4E 47 -> Base64 begins with "iVBORw0KGgo"
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  // WebP magic bytes: 52 49 46 46 (RIFF) -> Base64 begins with "UklGR"
  const sampleWebpBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

  // 8a. JPEG data URI remains JPEG
  const jpegDataUriInput = `data:image/jpeg;base64,${sampleJpegBase64}`;
  const resolvedJpegDataUri = resolveImageDataUri(jpegDataUriInput);
  assert(
    resolvedJpegDataUri === jpegDataUriInput && resolvedJpegDataUri.startsWith('data:image/jpeg;base64,'),
    'JPEG data URI remains JPEG without modification'
  );

  // 8b. PNG data URI remains PNG
  const pngDataUriInput = `data:image/png;base64,${samplePngBase64}`;
  const resolvedPngDataUri = resolveImageDataUri(pngDataUriInput);
  assert(
    resolvedPngDataUri === pngDataUriInput && resolvedPngDataUri.startsWith('data:image/png;base64,'),
    'PNG data URI remains PNG without modification'
  );

  // 8c. Raw JPEG base64 is not mislabeled as PNG
  const resolvedRawJpeg = resolveImageDataUri(sampleJpegBase64);
  assert(
    resolvedRawJpeg.startsWith('data:image/jpeg;base64,') && !resolvedRawJpeg.startsWith('data:image/png;base64,'),
    'Raw JPEG base64 is accurately detected as image/jpeg and NOT mislabeled as PNG'
  );

  // 8d. Existing raw PNG callers still work
  const resolvedRawPng = resolveImageDataUri(samplePngBase64);
  assert(
    resolvedRawPng.startsWith('data:image/png;base64,'),
    'Existing raw PNG callers are accurately detected as image/png'
  );

  // 8e. WebP detection works
  const resolvedRawWebp = resolveImageDataUri(sampleWebpBase64);
  assert(
    resolvedRawWebp.startsWith('data:image/webp;base64,'),
    'Raw WebP base64 is accurately detected as image/webp'
  );

  // 8f. Alias normalization (image/jpg -> image/jpeg)
  const jpgAliasDataUri = `data:image/jpg;base64,${sampleJpegBase64}`;
  const resolvedJpgAlias = resolveImageDataUri(jpgAliasDataUri);
  assert(
    resolvedJpgAlias.startsWith('data:image/jpeg;base64,'),
    'Data URI alias image/jpg is normalized to image/jpeg'
  );

  // 8g. Invalid image data is rejected: Empty string
  let emptyRejected = false;
  try {
    resolveImageDataUri('');
  } catch (err: any) {
    if (err.message.includes('Invalid or empty image payload')) emptyRejected = true;
  }
  assert(emptyRejected, 'Empty image payload is rejected with clear error');

  // 8h. Invalid image data is rejected: Unsupported MIME type (e.g. PDF)
  let unsupportedMimeRejected = false;
  try {
    resolveImageDataUri('data:application/pdf;base64,JVBERi0xLjUKJYCBgoMKMSAwIG9iajw8L0ZpbHRlcg==');
  } catch (err: any) {
    if (err.message.includes('Unsupported image MIME type')) unsupportedMimeRejected = true;
  }
  assert(unsupportedMimeRejected, 'Unsupported image MIME type (application/pdf) is rejected');

  // 8i. Invalid image data is rejected: Non-image arbitrary string
  let malformedDataRejected = false;
  try {
    resolveImageDataUri('THIS_IS_NOT_AN_IMAGE_OR_BASE64_HEADER');
  } catch (err: any) {
    if (err.message.includes('Unsupported or invalid image format')) malformedDataRejected = true;
  }
  assert(malformedDataRejected, 'Arbitrary non-image raw string is rejected with clear error');

  // 8j. Malformed data URI without comma is rejected
  let noCommaRejected = false;
  try {
    resolveImageDataUri('data:image/jpeg;base64');
  } catch (err: any) {
    if (err.message.includes('Malformed data URI')) noCommaRejected = true;
  }
  assert(noCommaRejected, 'Malformed data URI missing comma separator is rejected');

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
