// ==============================================================================
// PaperSite Edge Function: layout-to-html
// File: supabase/functions/layout-to-html/index.ts
// Compiles a layout JSON into sanitized, responsive HTML using fixed templates (Zero AI).
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { validateLayout } from '../_shared/schema.ts';
import { renderSite } from '../_shared/renderSite.ts';
import { sanitizeHtml } from '../_shared/sanitize.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    await requireUser(req);

    const body = await req.json();
    const { layoutJson, language = 'en', whatsappNumber = '', projectId = '', address, openingHours } = body;

    if (!layoutJson) {
      return new Response(JSON.stringify({ error: 'layoutJson is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Validate structure
    const validation = validateLayout(layoutJson);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: 'INVALID_LAYOUT', details: validation.errors }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Render deterministic HTML page from tested templates
    const rawHtml = renderSite(layoutJson, language, whatsappNumber, {
      projectId,
      address,
      openingHours,
    });

    // 3. Final sanitization step
    const cleanHtml = sanitizeHtml(rawHtml);

    return new Response(JSON.stringify({ success: true, html: cleanHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const status = err.message?.startsWith('UNAUTHORIZED') ? 401 : 500;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
