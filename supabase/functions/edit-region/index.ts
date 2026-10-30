// ==============================================================================
// PaperSite Edge Function: edit-region
// File: supabase/functions/edit-region/index.ts
// Modifies a targeted section or translates the full layout while preserving layout IDs.
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { askGeminiJson } from '../_shared/geminiJson.ts';
import { validateLayout } from '../_shared/schema.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    await requireUser(req);

    const body = await req.json();
    const { currentLayoutJson, instructionText, sectionId, targetLanguage } = body;

    if (!currentLayoutJson) {
      return new Response(JSON.stringify({ error: 'currentLayoutJson is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let prompt = '';

    if (targetLanguage) {
      const langName = targetLanguage === 'te' ? 'Telugu' : targetLanguage === 'hi' ? 'Hindi' : 'English';
      prompt = `You are a regional translation and localization expert for local business websites.
Translate ALL user-facing text (titles, subtitles, content, items name/description, labels) in the provided layout JSON into ${langName} (${targetLanguage}).

CRITICAL PRESERVATION RULES:
1. Return STRICT JSON matching the original layout structure exactly.
2. DO NOT change any "id" fields, section types, hex colors, font names, or array lengths.
3. Keep the JSON structure identical, translating only human text values into authentic, natural ${langName}.

Current Layout JSON:
${JSON.stringify(currentLayoutJson, null, 2)}`;
    } else {
      prompt = `You are an expert web editor for small businesses.
Apply the owner's edit instruction to the provided layout JSON.

INSTRUCTION: "${instructionText || 'Update section'}"
${sectionId ? `TARGET SECTION ID: "${sectionId}" (Modify ONLY this section! Leave all other sections completely untouched)` : 'Modify only the sections referenced by the instruction.'}

CRITICAL RULES:
1. Return the COMPLETE updated layout JSON.
2. Preserve all existing section IDs and layout types.
3. Never write HTML. Return JSON content only.
4. Keep the content realistic for the business.

Current Layout JSON:
${JSON.stringify(currentLayoutJson, null, 2)}`;
    }

    const updatedLayout = await askGeminiJson({ prompt, model: body.model });

    const validation = validateLayout(updatedLayout);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: 'UPDATED_LAYOUT_VALIDATION_FAILED', 
        details: validation.errors, 
        rawLayout: updatedLayout 
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, layout: updatedLayout }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const isConfigError = err.message === 'GEMINI_NOT_CONFIGURED';
    const isRateLimit = err.message === 'GEMINI_RATE_LIMITED';
    const status = isConfigError ? 503 : isRateLimit ? 429 : err.message?.startsWith('UNAUTHORIZED') ? 401 : 500;

    return new Response(JSON.stringify({ 
      error: isConfigError ? 'GEMINI_NOT_CONFIGURED' : isRateLimit ? 'GEMINI_RATE_LIMITED' : err.message 
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
