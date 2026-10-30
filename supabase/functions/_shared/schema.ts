// ==============================================================================
// PaperSite: Layout JSON Schema & Validator
// File: supabase/functions/_shared/schema.ts
// Validates section types, hex theme color, approved fonts, and 24h opening times.
// ==============================================================================

export const ALLOWED_SECTION_TYPES = [
  'header',
  'hero',
  'menu',
  'services',
  'gallery',
  'about',
  'contact',
  'booking',
  'hours',
  'footer',
] as const;

export type SectionType = typeof ALLOWED_SECTION_TYPES[number];

export const APPROVED_FONTS = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'Outfit',
  'Poppins',
  'Plus Jakarta Sans',
  'Lora',
  'Montserrat',
  'Open Sans',
] as const;

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Strictly enforces 24-hour HH:MM format: 00:00 to 23:59. Rejects "25:99", "12:60", "8:00".
export const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface LayoutItem {
  name: string;
  description?: string;
  price?: string;
  icon?: string;
}

export interface OpeningHourRow {
  day: string;
  open: string;
  close: string;
}

export interface LayoutSection {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  content?: string;
  items?: LayoutItem[];
  hours?: OpeningHourRow[];
  images?: string[];
}

export interface SiteLayout {
  theme: {
    primary: string;
    font: string;
    businessName?: string;
  };
  sections: LayoutSection[];
  opening_hours?: OpeningHourRow[];
}

export function validateLayout(layout: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!layout || typeof layout !== 'object') {
    return { valid: false, errors: ['Layout must be an object'] };
  }

  const obj = layout as Partial<SiteLayout>;

  // 1. Validate theme
  if (!obj.theme || typeof obj.theme !== 'object') {
    errors.push('Missing theme configuration object');
  } else {
    if (!obj.theme.primary || !HEX_COLOR_REGEX.test(obj.theme.primary)) {
      errors.push(`Invalid theme.primary "${obj.theme.primary}". Must be a valid hex color code (e.g. #2563eb).`);
    }

    if (!obj.theme.font || !APPROVED_FONTS.includes(obj.theme.font as any)) {
      errors.push(`Invalid theme.font "${obj.theme.font}". Must be one of: ${APPROVED_FONTS.join(', ')}.`);
    }
  }

  // 2. Validate sections
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    errors.push('Layout must have a non-empty "sections" array');
  } else {
    obj.sections.forEach((sec, idx) => {
      if (!sec || typeof sec !== 'object') {
        errors.push(`Section at index ${idx} is not an object`);
        return;
      }
      if (!sec.id || typeof sec.id !== 'string') {
        errors.push(`Section at index ${idx} is missing a string "id"`);
      }
      if (!sec.type || !ALLOWED_SECTION_TYPES.includes(sec.type as any)) {
        errors.push(`Section "${sec.id || idx}" has invalid type "${sec.type}". Allowed: ${ALLOWED_SECTION_TYPES.join(', ')}`);
      }

      // Check section-level hours if present
      if (sec.hours && Array.isArray(sec.hours)) {
        sec.hours.forEach((h, hIdx) => {
          if (!TIME_24H_REGEX.test(h.open)) {
            errors.push(`Invalid open time "${h.open}" in section "${sec.id}" row ${hIdx}. Must be HH:MM in 24-hour format.`);
          }
          if (!TIME_24H_REGEX.test(h.close)) {
            errors.push(`Invalid close time "${h.close}" in section "${sec.id}" row ${hIdx}. Must be HH:MM in 24-hour format.`);
          }
        });
      }
    });
  }

  // 3. Validate layout-level opening_hours if provided
  if (obj.opening_hours) {
    if (!Array.isArray(obj.opening_hours)) {
      errors.push('opening_hours must be an array of { day, open, close }');
    } else {
      obj.opening_hours.forEach((h, idx) => {
        if (!h.day || typeof h.day !== 'string') {
          errors.push(`opening_hours row ${idx} missing day`);
        }
        if (!h.open || !TIME_24H_REGEX.test(h.open)) {
          errors.push(`Invalid open time "${h.open}" in opening_hours row ${idx}. Must be HH:MM in 24-hour format.`);
        }
        if (!h.close || !TIME_24H_REGEX.test(h.close)) {
          errors.push(`Invalid close time "${h.close}" in opening_hours row ${idx}. Must be HH:MM in 24-hour format.`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
