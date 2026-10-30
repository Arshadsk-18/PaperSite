// ==============================================================================
// PaperSite Edge Function: publish-site
// File: supabase/functions/publish-site/index.ts
// Publishes the current version to the public published_sites table with active booking URL.
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user, client } = await requireUser(req);
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Verify user owns the project
    const { data: project, error: projErr } = await client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: 'PROJECT_NOT_FOUND_OR_UNAUTHORIZED' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!project.current_version_id) {
      return new Response(JSON.stringify({ error: 'PROJECT_HAS_NO_SAVED_VERSION' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch the current version
    const { data: version, error: verErr } = await client
      .from('versions')
      .select('*')
      .eq('id', project.current_version_id)
      .single();

    if (verErr || !version || !version.html) {
      return new Response(JSON.stringify({ error: 'VERSION_HTML_NOT_FOUND' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Inject live submit-booking endpoint
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const bookingEndpoint = `${supabaseUrl}/functions/v1/submit-booking`;
    const liveHtml = version.html.replaceAll('__BOOKING_ENDPOINT__', bookingEndpoint);

    // 4. Upsert into published_sites
    const { error: pubErr } = await client
      .from('published_sites')
      .upsert({
        project_id: project.id,
        slug: project.slug,
        html: liveHtml,
        business_name: project.business_name,
        whatsapp_number: project.whatsapp_number,
        language: project.language,
        published_at: new Date().toISOString(),
      }, { onConflict: 'project_id' });

    if (pubErr) {
      throw new Error(`PUBLISH_FAILED: ${pubErr.message}`);
    }

    // 5. Update projects is_published flag
    await client
      .from('projects')
      .update({ is_published: true })
      .eq('id', project.id);

    return new Response(JSON.stringify({ 
      success: true, 
      path: `/site/${project.slug}`, 
      slug: project.slug 
    }), {
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
