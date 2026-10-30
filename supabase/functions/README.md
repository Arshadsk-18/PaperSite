# PaperSite Edge Functions

All server-side logic, AI interactions, and protected database mutations run inside Supabase Edge Functions (powered by Deno and TypeScript).

## Secrets to Configure

Set the following secrets in your Supabase project before deployment:

```bash
# Set Gemini API Key (from Google AI Studio: aistudio.google.com)
supabase secrets set GEMINI_API_KEY="your-gemini-api-key"

# Set Gemini Model
supabase secrets set GEMINI_MODEL="gemini-1.5-flash"

# Set Supabase Service Role Key (from Supabase Dashboard -> Project Settings -> API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

---

## Deployment Commands

Deploy each of the 6 functions using the Supabase CLI:

```bash
# 1. sketch-to-layout: AI vision prompt for turning sketches into layout JSON
supabase functions deploy sketch-to-layout

# 2. layout-to-html: Deterministic template engine compiler (No AI call)
supabase functions deploy layout-to-html

# 3. edit-region: Targeted section updates or full layout translations
supabase functions deploy edit-region

# 4. publish-site: Copies page to published_sites with live booking endpoint
supabase functions deploy publish-site

# 5. unpublish-site: Removes page from public view
supabase functions deploy unpublish-site

# 6. submit-booking: Public booking endpoint with spam honeypot & IP rate limits
supabase functions deploy submit-booking --no-verify-jwt
```

Alternatively, deploy all functions at once:
```bash
supabase functions deploy
```

---

## Security Architecture

- **AI writes JSON only:** AI is strictly prohibited from generating HTML. The template compiler (`_shared/renderSite.ts`) and sanitizer (`_shared/sanitize.ts`) build clean, safe HTML with sandboxed rules.
- **JWT Protection:** All functions require authenticated user tokens except `submit-booking`, which is publicly open to customers but protected via an IP rate-limit table and hidden honeypot field.
