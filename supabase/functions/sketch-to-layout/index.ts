// ==============================================================================
// PaperSite Edge Function: sketch-to-layout
// File: supabase/functions/sketch-to-layout/index.ts
// Converts a drawn/uploaded sketch and optional voice prompt into a structured JSON layout.
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { askGeminiJson } from '../_shared/geminiJson.ts';
import { validateLayout, APPROVED_FONTS } from '../_shared/schema.ts';

const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // 10MB limit

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    await requireUser(req);

    const body = await req.json();
    const { imageBase64, businessType, businessName, language = 'en', voiceText } = body;

    if (!businessType || !businessName) {
      return new Response(JSON.stringify({ error: 'businessType and businessName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (imageBase64 && imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: 'Image file size exceeds the 10MB limit' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const langName = language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English';

    const prompt = `You are an expert web designer assisting local small businesses.
Analyze this layout sketch (if provided) and user instructions to create a structured website layout for:
- Business Name: "${businessName}"
- Business Type: "${businessType}" (e.g. cafe, salon, tutor, restaurant, shop)
- Language: ${langName} (${language})
${voiceText ? `- Additional spoken/text instructions: "${voiceText}"` : ''}

CRITICAL RULES:
1. Return STRICT JSON only matching this layout schema.
2. The AI returns JSON content only. Never return HTML tags or markdown formatting.
3. Write realistic, compelling titles, subtitles, and descriptions tailored to this specific business type in ${langName}. DO NOT use any "lorem ipsum".
4. Section types must be chosen from: ["header", "hero", "menu", "services", "about", "contact", "booking", "hours", "footer"].
5. Theme primary color must be a vibrant, beautiful hex code (e.g. "#d97706" for cafe, "#0284c7" for services, "#db2777" for salon).
6. Theme font must be chosen from: ${JSON.stringify(APPROVED_FONTS)}.
7. All section IDs must be unique strings (e.g. "header-1", "hero-1", "services-1", "booking-1", "contact-1").
8. Always include a "booking" section and a "contact" section. If it is a cafe or restaurant, include a "menu" section. If a salon or tutor, include "services".

Output JSON format:
{
  "theme": {
    "primary": "#hexcode",
    "font": "Inter",
    "businessName": "${businessName}"
  },
  "sections": [
    {
      "id": "hero-1",
      "type": "hero",
      "title": "Welcome to ${businessName}",
      "subtitle": "Short tagline in ${langName}",
      "content": "Short description in ${langName}"
    },
    {
      "id": "services-1",
      "type": "services",
      "title": "Our Offerings",
      "items": [
        { "name": "Item Name", "description": "Details", "price": "₹XXX" }
      ]
    },
    {
      "id": "booking-1",
      "type": "booking",
      "title": "Book an Appointment",
      "subtitle": "Easy reservations"
    },
    {
      "id": "contact-1",
      "type": "contact",
      "title": "Contact Us"
    }
  ]
}`;

    const layout = await askGeminiJson({
      prompt,
      imageBase64,
      model: body.model,
    });

    const validation = validateLayout(layout);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: 'AI_OUTPUT_VALIDATION_FAILED', 
        details: validation.errors,
        rawLayout: layout 
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, layout }), {
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
