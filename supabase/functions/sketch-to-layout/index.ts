// ==============================================================================
// PaperSite Edge Function: sketch-to-layout
// File: supabase/functions/sketch-to-layout/index.ts
// Converts a drawn/uploaded sketch and optional voice prompt into a structured JSON layout.
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { askOpenRouterJson } from '../_shared/openrouterJson.ts';
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
- Business Category / Type: "${businessType}" (supports: gym, cafe, restaurant, salon, shop, portfolio, healthcare, education, or any custom business category)
- Language: ${langName} (${language})
${voiceText ? `- Additional spoken/text instructions: "${voiceText}"` : ''}

PRIMARY DESIGN PRINCIPLES:
1. SKETCH IS THE PRIMARY STRUCTURAL BLUEPRINT: Carefully inspect the uploaded sketch image. Detect the drawn wireframe sections, order, text boxes, and component cards. The returned layout MUST follow the structural arrangement and section sequence seen in the drawing.
2. CATEGORY CONTEXT GUIDANCE: The business category ("${businessType}") guides the realistic titles, descriptions, offerings, and color theme:
   - Gym / Fitness: Personal training, workout programs, memberships, trial pass booking, facility hours.
   - Café / Restaurant: Signature dishes, brews, tasting menus in "menu", table reservations, dining hours.
   - Salon / Beauty: Hair, skincare rituals, spa treatments in "services", stylist appointment booking, salon hours.
   - Retail / Shop: Curated catalog, product highlights in "services", trial/pickup booking, store hours.
   - Portfolio: Creative disciplines, about the artist/studio, discovery consultation booking.
   - Healthcare / Clinic: Medical consultations, preventive checkup packages, doctor appointment booking, clinic timings.
   - Education: Academic batches, tutoring subjects, faculty guidance, demo class registration, class hours.
   - Other / Custom Category: Tailor offerings, copy, and booking options directly to the provided business details.

CRITICAL RULES:
1. Return STRICT JSON only matching this layout schema.
2. The AI returns JSON content only. Never return HTML tags or markdown formatting.
3. Write realistic, compelling titles, subtitles, and descriptions tailored to this specific business category in ${langName}. DO NOT use any "lorem ipsum".
4. Section types must be chosen from: ["header", "hero", "menu", "services", "about", "contact", "booking", "hours", "footer"].
5. Theme primary color must be a vibrant, beautiful hex code (e.g. "#ea580c" for gym, "#b45309" for cafe, "#0284c7" for healthcare, "#db2777" for salon, "#4338ca" for retail, "#0f766e" for portfolio, "#7c3aed" for education).
6. Theme font must be chosen from: ${JSON.stringify(APPROVED_FONTS)}.
7. All section IDs must be unique strings (e.g. "header-1", "hero-1", "services-1", "booking-1", "contact-1").
8. Always include a "booking" section and a "contact" section. If it is a dining/food business, include a "menu" section. For gyms, salons, clinics, shops, tutors, portfolios, and service businesses, include a "services" section.

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

    const layout = await askOpenRouterJson({
      prompt,
      imageBase64,
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
    const isConfigError = err.message === 'OPENROUTER_NOT_CONFIGURED';
    const isRateLimit = err.message === 'OPENROUTER_RATE_LIMITED';
    const isUnavailable = err.message === 'OPENROUTER_UNAVAILABLE' ||
                          err.message === 'OPENROUTER_TIMEOUT' ||
                          err.message?.startsWith('OPENROUTER_UNAVAILABLE');
    const isInvalidOutput = err.message === 'OPENROUTER_INVALID_JSON' || err.message?.startsWith('OPENROUTER_INVALID_RESPONSE');

    let status = 500;
    if (isConfigError) status = 503;
    else if (isRateLimit) status = 429;
    else if (isUnavailable) status = 503;
    else if (isInvalidOutput) status = 422;
    else if (err.message?.startsWith('UNAUTHORIZED')) status = 401;

    const errorCode = isConfigError ? 'OPENROUTER_NOT_CONFIGURED' :
                      isRateLimit ? 'OPENROUTER_RATE_LIMITED' :
                      isUnavailable ? 'OPENROUTER_UNAVAILABLE' :
                      isInvalidOutput ? 'OPENROUTER_INVALID_RESPONSE' :
                      err.message;

    console.error(JSON.stringify({
      event: 'sketch_to_layout_failure',
      errorCode,
      httpStatus: status,
      rawErrorMessage: err.message?.slice(0, 150),
    }));

    return new Response(JSON.stringify({ error: errorCode }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
