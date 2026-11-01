// ==============================================================================
// PaperSite Edge Function: unpublish-site
// File: supabase/functions/unpublish-site/index.ts
// Removes a published site from public view and toggles is_published to false.
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
      return new Response(JSON.stringify({
        error: 'INVALID_PROJECT_ID',
        message: 'projectId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(projectId)) {
      return new Response(JSON.stringify({
        error: 'INVALID_PROJECT_ID',
        message: `Invalid project ID format "${projectId}". Must be a valid UUID.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Verify ownership
    const { data: project, error: projErr } = await client
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({
        error: 'PROJECT_NOT_FOUND_OR_UNAUTHORIZED',
        message: `Project "${projectId}" not found or unauthorized for authenticated user.`
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Remove published_sites record
    await client
      .from('published_sites')
      .delete()
      .eq('project_id', projectId);

    // 3. Mark project un-published
    await client
      .from('projects')
      .update({ is_published: false })
      .eq('id', projectId);

    return new Response(JSON.stringify({ success: true, message: 'Site unpublished successfully' }), {
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
