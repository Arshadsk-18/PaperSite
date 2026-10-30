# PaperSite

> **Draw your shop. Go live in 60 seconds.**

PaperSite is a web platform empowering micro-business owners (cafés, salons, boutique shops, clinics, coaching tutors) to sketch their website layout on an interactive canvas or photograph a paper napkin, speak or type instructions in English, Telugu, or Hindi, and instantly publish a mobile-first website complete with WhatsApp ordering, directions, and live appointment booking.

---

## Architecture Diagram

```text
+--------------------------------------------------------------------------------------------------+
|                                           CLIENT BROWSER                                         |
|                                                                                                  |
|   +-----------------------+     +--------------------------+     +---------------------------+   |
|   |  Excalidraw / Upload  |     |   Voice / Prompt Input   |     |   Live Sandbox Preview    |   |
|   |  (Canvas Sketching)   |     |   (en / te / hi Speech)  |     |   (No allow-same-origin)  |   |
|   +-----------+-----------+     +------------+-------------+     +-------------+-------------+   |
|               |                              |                                 ^                 |
|               v                              v                                 |                 |
|    src/lib/exportSketch.ts (Heart)  src/lib/sketchCache.ts                     |                 |
|    Downscales to 1024px Base64      SHA-256 Hash -> Instant 0ms Hit            |                 |
|               |                                                                |                 |
|               +------------------------------+---------------------------------+                 |
|                                              |                                                   |
|                                              v                                                   |
|                                    src/lib/api.ts (Client)                                       |
|                               (Bearer JWT + Error Handling)                                      |
+----------------------------------------------+---------------------------------------------------+
                                               |
                                     HTTPS / JSON RPC
                                               |
+----------------------------------------------v---------------------------------------------------+
|                                  SUPABASE EDGE FUNCTIONS (Deno)                                  |
|                                                                                                  |
|   +--------------------+     +--------------------+     +------------------------------------+   |
|   |  sketch-to-layout  |     |    layout-to-html  |     |       submit-booking (Public)      |   |
|   |  (Vision Analysis) |     | (Zero-AI Template) |     |   (IP Rate-Limit & Honeypot Guard) |   |
|   +---------+----------+     +---------+----------+     +-----------------+------------------+   |
|             |                          ^                                  |                      |
|             v                          |                                  |                      |
|   _shared/geminiJson.ts (Heart)   _shared/renderSite.ts                   |                      |
|   Google Gemini 3.5 Flash API     Deterministic HTML Engine               |                      |
+-------------+-------------------------------------------------------------+----------------------+
              |                                                             |
              |                                   Database Pool (Postgres)  |
              |                                                             |
+-------------v-------------------------------------------------------------v----------------------+
|                                    SUPABASE DATABASE (Postgres 15)                               |
|                                                                                                  |
|   +---------------------+   +---------------------+   +---------------------+   +------------+   |
|   |      projects       |   |      versions       |   |   published_sites   |   |  bookings  |   |
|   |  (Owner Isolation)  |   | (Version History)   |   |   (Public Read)     |   | (Realtime) |   |
|   +---------------------+   +---------------------+   +---------------------+   +-----+------+   |
|                                                                                       |          |
|   RLS Enforcement: 0002_policies.sql (Heart)                                          |          |
|   - Anon cannot read or insert bookings directly                                      |          |
|   - Only submit-booking Edge Function (elevated service role) can create bookings      |          |
+---------------------------------------------------------------------------------------+----------+
                                                                                        |
                                                       Supabase Realtime Channel        |
                                                       (postgres_changes INSERT/UPDATE) |
                                                                                        |
+---------------------------------------------------------------------------------------v----------+
|                              OWNER BOOKINGS DASHBOARD (/bookings)                                |
|                                                                                                  |
|   src/hooks/useLiveBookings.ts (Heart) <----------------------------------------------+          |
|   - Instant audio chime & live counter badge                                                     |
|   - One-tap WhatsApp confirmation link: https://wa.me/<phone>?text=<encoded>                     |
+--------------------------------------------------------------------------------------------------+
```

---

## Setup Steps

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- Supabase Project (`https://<project-ref>.supabase.co`)
- Google Gemini API key with access to `gemini-3.5-flash`

### 2. Frontend Configuration (`.env.local`)
Create `.env.local` in the project root:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
VITE_DEMO_EMAIL=rohanpandey@gmail.com
VITE_DEMO_PASSWORD=<your-demo-password>
```

### 3. Backend Edge Functions Secrets
Set project secrets using the Supabase CLI:
```bash
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
supabase secrets set GEMINI_MODEL=gemini-3.5-flash
```

### 4. Database Migrations
Apply migrations in numerical order:
```bash
# 1. Schema, tables, and publications
supabase db query --linked -f supabase/migrations/0001_schema.sql

# 2. Row Level Security policies (Heart file: <= 35 LOC)
supabase db query --linked -f supabase/migrations/0002_policies.sql

# 3. Storage bucket configuration
supabase db query --linked -f supabase/migrations/0003_storage.sql
```

### 5. Deploy Edge Functions
Deploy all 6 Edge Functions:
```bash
supabase functions deploy sketch-to-layout
supabase functions deploy layout-to-html
supabase functions deploy edit-region
supabase functions deploy publish-site
supabase functions deploy unpublish-site
supabase functions deploy submit-booking --no-verify-jwt
```

### 6. Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5-Step Demo Presentation Order

Use this recommended 60-second sequence for investor and customer demos:

| Step | Action | What to Show |
| :--- | :--- | :--- |
| **1** | **Open / Dashboard** | Navigate to `/dashboard`. Select the pre-seeded **"Brew Bay Café"** or tap **"New site"** to enter the canvas editor. |
| **2** | **Sketch on Canvas** | Draw rough boxes on the Excalidraw canvas (hero, menu, booking block) or click **"Upload photo"** to simulate an on-paper napkin sketch. |
| **3** | **Voice / Text Prompt** | Click the mic icon and speak instructions in **Telugu**, **Hindi**, or **English** (e.g. *"Add specialty brews and table reservation"*). Click the Lime **"Generate"** button. |
| **4** | **Responsive Preview & Publish** | Inspect the instant layout in the phone and desktop iframe views. Click **"Publish"** to generate the live public link, QR code, and printable A4 poster. |
| **5** | **Public Site & Realtime Booking** | Open `/site/brew-bay` on your mobile phone or a new tab. Submit a table booking. Watch it instantly pop up on `/bookings` with a chime! Click **"Confirm"** to launch a pre-filled WhatsApp confirmation message. |

### Demo Safety Features
- **Instant Sketch Cache**: Repeating the same sketch generates in **0ms** without consuming Gemini API tokens.
- **Offline / Free-Tier Guard**: If Wi-Fi drops or the Gemini free-tier rate limit is reached, PaperSite displays a banner **"Using a saved example"** and loads the sample site cleanly.
- **Emergency Demo Reset**: Press <kbd>Shift</kbd> + <kbd>D</kbd> on the dashboard anytime to clear all test bookings and restore the clean seed project.

---

## Verification Test Suites

All tests can be executed locally and against the linked remote database:

```bash
# 1. Verify environment, table permissions, realtime, and Edge Functions
npx tsx scripts/check-setup.ts

# 2. Run full end-to-end user flow with demo account
npx tsx scripts/verify-full-flow.ts

# 3. Verify demo safety (sample-layout.json, sketch cache, offline fallback, Shift+D reset)
npx tsx scripts/verify-demo-safety.ts

# 4. Run database RLS security audit as anon and authenticated roles
npx tsx scripts/run-db-tests.ts
npx supabase db query --linked -f supabase/tests.sql

# 5. TypeScript compilation
npx tsc --noEmit
```

---

## The Four Heart Files (Strict $\le$ 35 Lines of Code)

Each heart file implements a critical architectural subsystem under 35 active code lines:

1. **`src/lib/exportSketch.ts`** (27 LOC): Downscales Excalidraw canvas elements or uploaded sketch photos to maximum 1024px PNG base64 strings.
2. **`supabase/functions/_shared/geminiJson.ts`** (30 LOC): Interacts with Google Gemini 3.5 Flash with structured JSON output, response validation, and automatic retry on 5xx errors.
3. **`supabase/migrations/0002_policies.sql`** (22 LOC): Implements PostgreSQL Row Level Security (RLS) ensuring strict owner isolation, public storefront read access, and blocking direct client booking inserts.
4. **`src/hooks/useLiveBookings.ts`** (28 LOC): Subscribes to Supabase Realtime WebSocket changes to merge new customer bookings and live status updates instantaneously.
