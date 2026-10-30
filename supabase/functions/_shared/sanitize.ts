// ==============================================================================
// PaperSite: HTML Sanitizer
// File: supabase/functions/_shared/sanitize.ts
// Removes arbitrary scripts, malicious on* attributes, javascript: URIs, & iframes.
// Preserves only the Tailwind CDN script and the verified internal booking handler.
// ==============================================================================

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // 1. Remove iframes completely
  sanitized = sanitized.replace(/<iframe\b[^>]*>([\s\S]*?<\/iframe>)?/gi, '');

  // 2. Remove all script tags EXCEPT the Tailwind CDN script and our internal booking script
  sanitized = sanitized.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs) => {
    const isTailwindCdn = /src=["']https:\/\/cdn\.tailwindcss\.com["']/i.test(attrs);
    const isBookingScript = /id=["']ps-booking-script["']/i.test(attrs);

    if (isTailwindCdn || isBookingScript) {
      return match;
    }
    // Discard any foreign or unapproved script
    return '';
  });

  // Also remove standalone self-closing script tags if any
  sanitized = sanitized.replace(/<script\b([^>]*)\/>/gi, (match, attrs) => {
    if (/src=["']https:\/\/cdn\.tailwindcss\.com["']/i.test(attrs)) {
      return match;
    }
    return '';
  });

  // 3. Remove inline event handlers (onclick, onload, onerror, onmouseover, etc.)
  sanitized = sanitized.replace(/\s*on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 4. Neutralize javascript: pseudo-protocol in href, src, or attributes
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');

  return sanitized;
}
