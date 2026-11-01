// ==============================================================================
// PaperSite: Centralized Edge Functions API Client
// File: src/lib/api.ts
// Handles authentication tokens, headers, and uniform error code parsing.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { SiteLayout, SupportedLanguage } from '../types';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, message: string, status: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Core helper that invokes Supabase Edge Functions with caller JWT & error-code handling.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any> = {}
): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!isSupabaseConfigured || !supabaseUrl) {
    throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase credentials are not configured', 503);
  }

  let token = anonKey;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        token = data.session.access_token;
      }
    } catch {
      // Fall back to anon key
    }
  }

  const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
    body: JSON.stringify(body),
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.error) {
    const code = data.error || `HTTP_${response.status}`;
    let message = data.message || data.error || `Error calling ${functionName}`;

    // Friendly error mappings
    if (code === 'OPENROUTER_NOT_CONFIGURED' || code === 'GEMINI_NOT_CONFIGURED') {
      message = 'AI generation is not configured. Please set OPENROUTER_API_KEY in Supabase secrets.';
    } else if (code === 'OPENROUTER_RATE_LIMITED' || code === 'GEMINI_RATE_LIMITED' || response.status === 429) {
      message = 'The free AI model has reached its current request limit. Please try again later.';
    } else if (code === 'OPENROUTER_UNAVAILABLE' || code === 'OPENROUTER_TIMEOUT') {
      message = 'The free AI model is temporarily unavailable. Please try again in a few moments.';
    } else if (
      code === 'OPENROUTER_INVALID_RESPONSE' ||
      code === 'OPENROUTER_INVALID_JSON' ||
      code === 'AI_OUTPUT_VALIDATION_FAILED' ||
      code === 'UPDATED_LAYOUT_VALIDATION_FAILED'
    ) {
      message = 'The AI returned an invalid design response. Please try again.';
    } else if (code.startsWith('UNAUTHORIZED') || response.status === 401) {
      message = 'Session expired. Please log in again.';
    } else if (code === 'INVALID_LAYOUT') {
      message = 'Generated website structure failed schema validation.';
    } else if (code === 'PROJECT_HAS_NO_SAVED_VERSION') {
      message = 'Cannot publish: no generated version found for this site. Please generate your website before publishing.';
    } else if (code === 'PROJECT_NOT_FOUND_OR_UNAUTHORIZED' || response.status === 404) {
      message = data.message || 'Project not found or you do not have permission to publish it.';
    } else if (code === 'INVALID_PROJECT_ID') {
      message = data.message || 'Invalid project identifier.';
    }

    throw new ApiError(code, message, response.status, data.details);
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Typed Edge Function Helpers
// -----------------------------------------------------------------------------

export interface SketchToLayoutPayload {
  imageBase64?: string;
  businessType: string;
  businessName: string;
  language: SupportedLanguage;
  voiceText?: string;
}

export interface LayoutToHtmlPayload {
  layoutJson: SiteLayout;
  language?: SupportedLanguage;
  whatsappNumber?: string;
  projectId?: string;
  address?: string | null;
  openingHours?: any;
}

export interface EditRegionPayload {
  currentLayoutJson: SiteLayout;
  instructionText?: string;
  sectionId?: string | null;
  targetLanguage?: SupportedLanguage;
}

export interface SubmitBookingPayload {
  projectId: string;
  customerName: string;
  phone: string;
  service?: string;
  preferredTime?: string;
  message?: string | null;
  website?: string;
}

export const api = {
  /**
   * Convert sketch + voice instruction to layout JSON via OpenRouter
   */
  async sketchToLayout(payload: SketchToLayoutPayload): Promise<{ success: boolean; layout: SiteLayout }> {
    return invokeEdgeFunction<{ success: boolean; layout: SiteLayout }>('sketch-to-layout', payload);
  },

  /**
   * Compile layout JSON into deterministic, sanitized HTML
   */
  async layoutToHtml(payload: LayoutToHtmlPayload): Promise<{ success: boolean; html: string }> {
    return invokeEdgeFunction<{ success: boolean; html: string }>('layout-to-html', payload);
  },

  /**
   * Edit a specific section or translate entire layout
   */
  async editRegion(payload: EditRegionPayload): Promise<{ success: boolean; layout: SiteLayout }> {
    return invokeEdgeFunction<{ success: boolean; layout: SiteLayout }>('edit-region', payload);
  },

  /**
   * Publish site to public published_sites table
   */
  async publishSite(projectId: string): Promise<{ success: boolean; path: string; slug: string }> {
    return invokeEdgeFunction<{ success: boolean; path: string; slug: string }>('publish-site', { projectId });
  },

  /**
   * Unpublish site and delete public record
   */
  async unpublishSite(projectId: string): Promise<{ success: boolean }> {
    return invokeEdgeFunction<{ success: boolean }>('unpublish-site', { projectId });
  },

  /**
   * Submit a public customer booking
   */
  async submitBooking(payload: SubmitBookingPayload): Promise<{ success: boolean; message: string; bookingId?: string }> {
    return invokeEdgeFunction<{ success: boolean; message: string; bookingId?: string }>('submit-booking', payload);
  },
};
