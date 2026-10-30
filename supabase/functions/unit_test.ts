// ==============================================================================
// PaperSite: Edge Functions Unit Checks
// File: supabase/functions/unit_test.ts
// Tests:
// 1. Escaping / removal of malicious <script> in titles through renderSite + sanitize.
// 2. Presence of Call and Directions buttons when address is provided.
// 3. Proper URL encoding and escaping of quotes and angle brackets in directions link.
// 4. Strict rejection of invalid 24-hour opening times such as "25:99".
// ==============================================================================

import { validateLayout, type SiteLayout } from './_shared/schema.ts';
import { renderSite } from './_shared/renderSite.ts';
import { sanitizeHtml } from './_shared/sanitize.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

async function runTests() {
  console.log('--- Running Edge Functions Unit Checks ---\n');

  // TEST 1: Malicious <script> in title must come out escaped or removed
  const xssLayout: SiteLayout = {
    theme: {
      primary: '#2563eb',
      font: 'Inter',
      businessName: '<script>alert("hacked-name")</script>',
    },
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        title: '<script>alert("hacked-title")</script>Safe Title',
        subtitle: 'Safe subtitle',
      },
      {
        id: 'booking-1',
        type: 'booking',
        title: 'Book Now',
      },
    ],
  };

  const renderedXss = renderSite(xssLayout, 'en', '+919876543210');
  const sanitizedXss = sanitizeHtml(renderedXss);

  // Raw unescaped <script>alert must NOT exist in the output
  assert(!sanitizedXss.includes('<script>alert'), 'Unescaped <script> tag was not present in sanitized output');
  assert(sanitizedXss.includes('&lt;script&gt;alert') || !sanitizedXss.includes('alert("hacked'), 'Title script was properly escaped as HTML entities or removed');
  
  // Tailwind CDN and booking script must remain intact
  assert(sanitizedXss.includes('https://cdn.tailwindcss.com'), 'Tailwind CDN script preserved');
  assert(sanitizedXss.includes('id="ps-booking-script"'), 'Internal booking script preserved');

  // TEST 2: Layout with address shows both Call button and Directions link
  const addressLayout: SiteLayout = {
    theme: {
      primary: '#10b981',
      font: 'Inter',
      businessName: 'Coastal Cafe',
    },
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        title: 'Coastal Cafe',
      },
    ],
  };

  const renderedWithAddress = renderSite(addressLayout, 'en', '+919876543210', {
    businessPhone: '+919876543210',
    address: '42 Marine Drive, Mumbai',
  });

  assert(renderedWithAddress.includes('tel:919876543210'), 'Call button with tel: link is rendered');
  assert(renderedWithAddress.includes('https://www.google.com/maps/search/?api=1&query='), 'Directions link with Google Maps search is rendered');
  assert(renderedWithAddress.includes('42%20Marine%20Drive%2C%20Mumbai'), 'Address query is properly URL encoded');

  // TEST 3: Directions link escapes quote and angle bracket in address
  const trickyAddress = '42 "Sunset" Point <Bandra>';
  const renderedTricky = renderSite(addressLayout, 'en', '+919876543210', {
    address: trickyAddress,
  });

  const encodedTricky = encodeURIComponent(trickyAddress);
  assert(renderedTricky.includes(encodedTricky), 'Tricky address with quotes and angle brackets is properly encoded in maps URL');
  assert(!renderedTricky.includes('query=42 "Sunset"'), 'Unencoded quotes do not appear in query URL');
  assert(!renderedTricky.includes('query=42 <Bandra>'), 'Unencoded angle brackets do not appear in query URL');

  // TEST 4: Opening time "25:99" must be rejected
  const invalidTimeLayout: any = {
    theme: {
      primary: '#d97706',
      font: 'Inter',
      businessName: 'Night Diner',
    },
    sections: [
      {
        id: 'hours-1',
        type: 'hours',
        title: 'Hours',
        hours: [
          { day: 'Monday', open: '25:99', close: '18:00' },
        ],
      },
    ],
  };

  const validationResult = validateLayout(invalidTimeLayout);
  assert(!validationResult.valid, 'validateLayout correctly marked "25:99" as invalid');
  assert(
    validationResult.errors.some(err => err.includes('25:99')),
    'Validation errors specifically report "25:99"'
  );

  // Also test valid hours
  const validTimeLayout: any = {
    theme: {
      primary: '#d97706',
      font: 'Inter',
      businessName: 'Night Diner',
    },
    sections: [
      {
        id: 'hours-1',
        type: 'hours',
        title: 'Hours',
        hours: [
          { day: 'Monday', open: '08:00', close: '22:00' },
        ],
      },
    ],
  };
  const validResult = validateLayout(validTimeLayout);
  assert(validResult.valid, 'validateLayout accepts valid 24h format "08:00" and "22:00"');

  console.log('\n--- ALL UNIT CHECKS PASSED SUCCESSFULLY ---');
}

runTests().catch(err => {
  console.error('\n❌ UNIT CHECK FAILED:', err);
  process.exit(1);
});
