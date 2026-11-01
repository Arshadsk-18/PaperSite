// ==============================================================================
// PaperSite: Business Category System & Guidance
// File: src/lib/businessCategories.ts
// Extensible definition for all standard and custom business categories.
// ==============================================================================

export interface BusinessCategoryDefinition {
  id: string;
  label: string;
  defaultName: string;
  suggestedPrimaryColor: string;
  suggestedFont: string;
  primaryOfferingsType: 'menu' | 'services' | 'catalog' | 'programs';
  defaultSectionTypes: string[];
  designGuidance: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryDefinition[] = [
  {
    id: 'cafe',
    label: 'Café / Restaurant',
    defaultName: 'Brew Bay Café',
    suggestedPrimaryColor: '#b45309',
    suggestedFont: 'Outfit',
    primaryOfferingsType: 'menu',
    defaultSectionTypes: ['header', 'hero', 'menu', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Warm, appetizing, culinary imagery; highlights coffee blends, dishes, seating, dining hours, and table reservations.',
  },
  {
    id: 'gym',
    label: 'Gym / Fitness',
    defaultName: 'IronPulse Fitness Club',
    suggestedPrimaryColor: '#ea580c',
    suggestedFont: 'Montserrat',
    primaryOfferingsType: 'programs',
    defaultSectionTypes: ['header', 'hero', 'services', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Energetic, motivational, high-contrast; highlights workout programs, personal trainers, memberships, gym hours, and free trial session bookings.',
  },
  {
    id: 'salon',
    label: 'Salon / Beauty',
    defaultName: 'Luxe Salon & Spa',
    suggestedPrimaryColor: '#db2777',
    suggestedFont: 'Plus Jakarta Sans',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'services', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Elegant, calm, luxury wellness; highlights hair styling, skincare rituals, spa treatments, stylist availability, and appointment scheduling.',
  },
  {
    id: 'shop',
    label: 'Retail / Shop',
    defaultName: 'Aura Boutique & Retail',
    suggestedPrimaryColor: '#4338ca',
    suggestedFont: 'Inter',
    primaryOfferingsType: 'catalog',
    defaultSectionTypes: ['header', 'hero', 'services', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Modern, clean, curated showcase; highlights featured collections, handcrafted products, pricing, store hours, and trial/pickup reservations.',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    defaultName: 'Studio Canvas Creative',
    suggestedPrimaryColor: '#0f766e',
    suggestedFont: 'Poppins',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'about', 'services', 'booking', 'contact', 'footer'],
    designGuidance: 'Refined, minimalist, showcase-driven; highlights key projects, creative disciplines, client testimonials, and consultation inquiries.',
  },
  {
    id: 'healthcare',
    label: 'Healthcare / Clinic',
    defaultName: 'Apex Wellness Clinic',
    suggestedPrimaryColor: '#0284c7',
    suggestedFont: 'Roboto',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'services', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Trustworthy, clean, professional medical; highlights medical specialties, doctor consultations, clinic timings, and appointment bookings.',
  },
  {
    id: 'education',
    label: 'Education',
    defaultName: 'BrightEdge Academy',
    suggestedPrimaryColor: '#7c3aed',
    suggestedFont: 'Open Sans',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'services', 'hours', 'booking', 'contact', 'footer'],
    designGuidance: 'Inspiring, academic, organized; highlights courses, tutoring subjects, faculty credentials, batch schedules, and demo class registrations.',
  },
  {
    id: 'other',
    label: 'Other',
    defaultName: 'My Business Studio',
    suggestedPrimaryColor: '#1F3D33',
    suggestedFont: 'Inter',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'services', 'booking', 'contact', 'footer'],
    designGuidance: 'Versatile, adaptive design tailored to user custom instructions and sketch structure.',
  },
];

/**
 * Resolves a category definition from standard IDs or generates an extensible
 * fallback definition for any custom category.
 */
export function getCategoryDefinition(categoryId?: string | null): BusinessCategoryDefinition {
  if (!categoryId) return BUSINESS_CATEGORIES[0];
  const normalized = categoryId.toLowerCase().trim();

  // 1. Direct match
  const direct = BUSINESS_CATEGORIES.find((c) => c.id === normalized);
  if (direct) return direct;

  // 2. Fuzzy match
  if (normalized.includes('gym') || normalized.includes('fitness') || normalized.includes('workout') || normalized.includes('crossfit')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'gym')!;
  }
  if (normalized.includes('cafe') || normalized.includes('coffee') || normalized.includes('restaurant') || normalized.includes('bistro') || normalized.includes('food')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'cafe')!;
  }
  if (normalized.includes('salon') || normalized.includes('spa') || normalized.includes('beauty') || normalized.includes('hair')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'salon')!;
  }
  if (normalized.includes('shop') || normalized.includes('retail') || normalized.includes('boutique') || normalized.includes('store')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'shop')!;
  }
  if (normalized.includes('port') || normalized.includes('design') || normalized.includes('photo') || normalized.includes('creative')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'portfolio')!;
  }
  if (normalized.includes('health') || normalized.includes('clinic') || normalized.includes('doctor') || normalized.includes('dental') || normalized.includes('medic')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'healthcare')!;
  }
  if (normalized.includes('edu') || normalized.includes('tutor') || normalized.includes('school') || normalized.includes('academy') || normalized.includes('coach')) {
    return BUSINESS_CATEGORIES.find((c) => c.id === 'education')!;
  }

  // 3. Extensible custom category definition
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return {
    id: normalized,
    label: capitalized,
    defaultName: `${capitalized} Business`,
    suggestedPrimaryColor: '#2F6B4F',
    suggestedFont: 'Inter',
    primaryOfferingsType: 'services',
    defaultSectionTypes: ['header', 'hero', 'services', 'booking', 'contact', 'footer'],
    designGuidance: `Custom tailored design reflecting ${capitalized} industry standards and sketch structure.`,
  };
}

/**
 * Returns human-readable label for a category
 */
export function formatCategoryLabel(categoryId?: string | null): string {
  return getCategoryDefinition(categoryId).label;
}
