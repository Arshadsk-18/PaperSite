// ==============================================================================
// PaperSite Edge Function: submit-booking
// File: supabase/functions/submit-booking/index.ts
// Public booking endpoint with honeypot spam protection, IP rate limiting, and service-role insert.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const { projectId, customerName, phone, service, preferredTime, message, website } = body;

    // 1. Silent honeypot check: Bots usually autofill hidden fields named "website"
    if (website && typeof website === 'string' && website.trim().length > 0) {
      console.warn('[SPAM_BLOCKED] Honeypot triggered by submission.');
      return new Response(JSON.stringify({ success: true, message: 'Booking received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate input and length restrictions
    if (!projectId || typeof projectId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid projectId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedName = (customerName || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName || trimmedName.length > 100) {
      return new Response(JSON.stringify({ error: 'Customer name is required (max 100 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!trimmedPhone || trimmedPhone.length > 20 || !/^[0-9+()-\s]{7,20}$/.test(trimmedPhone)) {
      return new Response(JSON.stringify({ error: 'Valid phone number is required (7-20 digits)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Rate limiting by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown-ip';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'BACKEND_NOT_CONFIGURED' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize elevated client with service role key (bypasses RLS for rate_limits and verified booking insert)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Compute start of current 10-minute window
    const windowStartTimestamp = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
    const windowStart = new Date(windowStartTimestamp).toISOString();

    // Check rate_limits table
    const { data: currentLimit } = await adminClient
      .from('rate_limits')
      .select('count')
      .eq('ip', clientIp)
      .eq('window_start', windowStart)
      .maybeSingle();

    const currentCount = currentLimit?.count || 0;
    if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
      return new Response(JSON.stringify({ 
        error: 'Too many booking requests. Please wait a few minutes before trying again.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Increment rate limit counter
    await adminClient
      .from('rate_limits')
      .upsert({
        ip: clientIp,
        window_start: windowStart,
        count: currentCount + 1,
      }, { onConflict: 'ip,window_start' });

    // 4. Verify project is currently published
    const { data: pubSite } = await adminClient
      .from('published_sites')
      .select('project_id')
      .eq('project_id', projectId)
      .maybeSingle();

    const { data: project } = await adminClient
      .from('projects')
      .select('id, is_published')
      .eq('id', projectId)
      .maybeSingle();

    const isPublished = (project && project.is_published) || !!pubSite;

    if (!isPublished) {
      return new Response(JSON.stringify({ error: 'This site is not currently accepting public bookings.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Insert new booking with 'new' status
    const { data: newBooking, error: bookErr } = await adminClient
      .from('bookings')
      .insert({
        project_id: projectId,
        customer_name: trimmedName,
        phone: trimmedPhone,
        service: service ? String(service).slice(0, 100).trim() : null,
        preferred_time: preferredTime ? String(preferredTime).slice(0, 100).trim() : null,
        message: message ? String(message).slice(0, 1000).trim() : null,
        status: 'new',
      })
      .select('id')
      .single();

    if (bookErr) {
      throw new Error(`BOOKING_INSERT_FAILED: ${bookErr.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      bookingId: newBooking?.id,
      message: 'Booking submitted successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
