// ==============================================================================
// PaperSite: Demo Safety & Seed Restoration Service
// File: src/demo/demoService.ts
// Handles fallback sample loading, renderSite compilation, and Shift+D demo reset.
// ==============================================================================

import sampleLayoutJson from './sample-layout.json';
import { renderSite } from '../../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../../supabase/functions/_shared/sanitize';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SiteLayout, SupportedLanguage, Project, Version } from '../types';

export const SAMPLE_LAYOUT: SiteLayout = sampleLayoutJson as unknown as SiteLayout;

export interface BuildSampleOptions {
  businessName?: string | null;
  language?: SupportedLanguage | null;
  whatsappNumber?: string | null;
  projectId?: string | null;
  address?: string | null;
  openingHours?: any[] | null;
}

// Builds the sample page HTML using renderSite so it strictly matches real output
export function buildSamplePage(options: BuildSampleOptions = {}): { layout: SiteLayout; html: string } {
  const layout: SiteLayout = JSON.parse(JSON.stringify(SAMPLE_LAYOUT));

  if (options.businessName) {
    layout.theme.businessName = options.businessName;
    if (layout.sections[1]) {
      layout.sections[1].title = options.businessName;
    }
  }

  const lang = (options.language || 'en') as 'en' | 'te' | 'hi';
  const whatsapp = options.whatsappNumber || '+919876543210';
  const rawHtml = renderSite(layout, lang, whatsapp, {
    projectId: options.projectId || '11111111-1111-1111-1111-111111111111',
    address: options.address || 'Shop 4, Promenade Walk, Bandra West, Mumbai',
    openingHours: options.openingHours || [
      { day: 'Monday - Friday', open: '08:00', close: '22:00' },
      { day: 'Saturday - Sunday', open: '09:00', close: '23:00' },
    ],
  });

  const cleanHtml = sanitizeHtml(rawHtml);
  return { layout, html: cleanHtml };
}

// Reset Demo Action (Triggered by Shift+D or the Demo Tips Panel)
// Deletes demo user's bookings and restores the seed project "Brew Bay Café"
export async function resetDemo(userId?: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Reset offline / localStorage records
    const seedOfflineVersionId = '22222222-2222-2222-2222-222222222222';
    const seedOfflineProjId = '11111111-1111-1111-1111-111111111111';
    const { layout: seedLayout, html: seedHtml } = buildSamplePage({
      projectId: seedOfflineProjId,
      businessName: 'Brew Bay Café',
      whatsappNumber: '+919876543210',
    });

    const seedProject: Project = {
      id: seedOfflineProjId,
      owner_id: userId || '00000000-0000-0000-0000-000000000001',
      business_name: 'Brew Bay Café',
      business_type: 'cafe',
      slug: 'brew-bay',
      whatsapp_number: '+919876543210',
      language: 'en',
      is_published: true,
      current_version_id: seedOfflineVersionId,
      address: 'Shop 4, Promenade Walk, Bandra West, Mumbai',
      opening_hours: [
        { day: 'Monday - Friday', open: '08:00', close: '22:00' },
        { day: 'Saturday - Sunday', open: '09:00', close: '23:00' },
      ],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const seedVersion: Version = {
      id: seedOfflineVersionId,
      project_id: seedOfflineProjId,
      sketch_url: null,
      layout_json: seedLayout as any,
      html: seedHtml,
      language: 'en',
      created_at: new Date().toISOString(),
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('papersite_bookings');
      localStorage.setItem('papersite_projects', JSON.stringify([seedProject]));
      localStorage.setItem(`papersite_versions_${seedOfflineProjId}`, JSON.stringify([seedVersion]));
    }

    // 2. If Supabase is connected and user is logged in
    if (isSupabaseConfigured && supabase && userId) {
      // Find all projects belonging to this user
      const { data: userProjects } = await supabase
        .from('projects')
        .select('id, slug')
        .eq('owner_id', userId);

      const projectIds = (userProjects || []).map((p) => p.id);

      // Delete all bookings for user's projects
      if (projectIds.length > 0) {
        await supabase
          .from('bookings')
          .delete()
          .in('project_id', projectIds);
      }

      // Check if brew-bay project exists
      let brewBayProject = (userProjects || []).find((p) => p.slug === 'brew-bay');

      let targetProjectId = brewBayProject?.id;

      if (!targetProjectId) {
        // Create seed project for user
        const { data: newProj, error: createErr } = await supabase
          .from('projects')
          .insert({
            owner_id: userId,
            business_name: 'Brew Bay Café',
            business_type: 'cafe',
            slug: 'brew-bay',
            whatsapp_number: '+919876543210',
            language: 'en',
            is_published: true,
            address: 'Shop 4, Promenade Walk, Bandra West, Mumbai',
            opening_hours: [
              { day: 'Monday - Friday', open: '08:00', close: '22:00' },
              { day: 'Saturday - Sunday', open: '09:00', close: '23:00' },
            ],
          })
          .select()
          .single();

        if (createErr || !newProj) {
          throw new Error(createErr?.message || 'Could not restore seed project');
        }
        targetProjectId = newProj.id;
      }

      // Insert clean sample version
      const { layout: remoteLayout, html: remoteHtml } = buildSamplePage({
        projectId: targetProjectId,
        businessName: 'Brew Bay Café',
        whatsappNumber: '+919876543210',
      });

      const { data: newVer } = await supabase
        .from('versions')
        .insert({
          project_id: targetProjectId,
          layout_json: remoteLayout,
          html: remoteHtml,
          language: 'en',
        })
        .select()
        .single();

      if (newVer) {
        await supabase
          .from('projects')
          .update({
            current_version_id: newVer.id,
            is_published: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetProjectId);
      }

      // Publish in published_sites
      await supabase
        .from('published_sites')
        .upsert(
          {
            project_id: targetProjectId,
            slug: 'brew-bay',
            html: remoteHtml,
            business_name: 'Brew Bay Café',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );
    }

    return {
      success: true,
      message: 'Demo Reset: All test bookings deleted and "Brew Bay Café" seed project restored!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reset demo: ${err.message || 'Unknown error'}`,
    };
  }
}
