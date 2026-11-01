export type SupportedLanguage = 'en' | 'te' | 'hi';

export type BookingStatus = 'new' | 'confirmed' | 'done' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  preferred_language: SupportedLanguage;
  created_at?: string;
}

export interface Project {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  slug: string;
  whatsapp_number: string;
  language: SupportedLanguage;
  is_published: boolean;
  current_version_id: string | null;
  address?: string | null;
  opening_hours?: any;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  project_id: string;
  sketch_url: string | null;
  layout_json: PaperSiteLayout;
  html: string;
  language: SupportedLanguage;
  created_at: string;
}

export interface PublishedSite {
  id: string;
  project_id: string;
  slug: string;
  html: string;
  business_name: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  project_id: string;
  customer_name: string;
  phone: string;
  service: string;
  preferred_time: string;
  message?: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface RateLimit {
  ip: string;
  window_start: string;
  count: number;
}

export type SectionType =
  | 'header'
  | 'hero'
  | 'menu'
  | 'services'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'booking'
  | 'hours'
  | 'footer';

export interface LayoutItem {
  name: string;
  title?: string;
  description?: string;
  price?: string;
  icon?: string;
}

export interface PaperSiteSection {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  content?: string;
  items?: LayoutItem[];
  hours?: Array<{ day: string; open: string; close: string }>;
  images?: string[];
}

export interface PaperSiteLayout {
  theme: {
    primary: string;
    primaryColor?: string;
    font: string;
    businessName: string;
  };
  sections: PaperSiteSection[];
  opening_hours?: Array<{ day: string; open: string; close: string }>;
}

export type SiteLayout = PaperSiteLayout;

export type StandardBusinessCategoryId =
  | 'cafe'
  | 'gym'
  | 'salon'
  | 'shop'
  | 'portfolio'
  | 'healthcare'
  | 'education'
  | 'other';


