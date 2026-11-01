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
  businessType?: string | null;
  language?: SupportedLanguage | null;
  whatsappNumber?: string | null;
  projectId?: string | null;
  address?: string | null;
  openingHours?: any[] | null;
}

// Category-specific fallback layout templates
export function getCategorySampleLayout(businessType?: string | null, businessName?: string | null): SiteLayout {
  const type = (businessType || 'cafe').toLowerCase();
  const name = businessName || (type === 'restaurant' ? 'Spice Route Bistro' : type === 'shop' || type === 'clothing' ? 'Aura Boutique' : type === 'salon' ? 'Luxe Salon & Spa' : 'Brew Bay Café');

  if (type.includes('restaurant') || type.includes('bistro') || type.includes('dine') || type.includes('food')) {
    return {
      theme: {
        primary: '#b91c1c',
        font: 'Outfit',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Authentic Regional Delicacies & Fine Dining Experience',
          content: 'Savor masterfully crafted culinary wonders prepared with organic local ingredients.',
        },
        {
          id: 'menu-1',
          type: 'menu',
          title: 'Signature Dining Menu',
          subtitle: 'Curated seasonal tasting dishes and chef specialties',
          items: [
            { name: 'Dum Pukht Biryani', description: 'Slow-cooked fragrant basmati with royal whole spices', price: '₹420' },
            { name: 'Paneer Makhani Platter', description: 'Charred cottage cheese in creamy velvet tomato gravy', price: '₹340' },
            { name: 'Tandoori Smoked Platter', description: 'Marinated in Kashmiri chili, yogurt and roasted cumin', price: '₹390' },
            { name: 'Saffron Pistachio Kulfi', description: 'Traditional slow-reduced milk infused with saffron', price: '₹180' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Dining Hours',
          hours: [
            { day: 'Lunch', open: '12:00', close: '15:30' },
            { day: 'Dinner', open: '19:00', close: '23:30' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Reserve a Dining Table',
          subtitle: 'Reserve your dining table online. Instant confirmation via WhatsApp.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Location & Reservations',
          content: '42 Heritage Enclave, MG Road, Bengaluru, Karnataka 560001',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('cloth') || type.includes('shop') || type.includes('boutique') || type.includes('apparel') || type.includes('fashion') || type.includes('store')) {
    return {
      theme: {
        primary: '#4338ca',
        font: 'Inter',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Contemporary Fashion, Handloom Silks & Bespoke Tailoring',
          content: 'Discover handpicked sustainable garments crafted by master artisans.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Featured Collection & Catalog',
          subtitle: 'New arrivals in contemporary ethnic & modern casual wear',
          items: [
            { name: 'Hand-block Printed Linen Shirt', description: '100% pure breathable organic linen', price: '₹1,450' },
            { name: 'Chanderi Silk Festive Kurta', description: 'Hand-woven with delicate zari border detailing', price: '₹2,890' },
            { name: 'Custom Fit Tailoring Session', description: 'Personalized measurements and designer consultation', price: '₹600' },
            { name: 'Signature Brass Accent Dupatta', description: 'Artisan hand-dyed natural indigo finish', price: '₹1,200' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Boutique Store Hours',
          hours: [
            { day: 'Monday - Saturday', open: '10:30', close: '21:00' },
            { day: 'Sunday', open: '11:00', close: '20:00' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book a Personal Styling Trial',
          subtitle: 'Reserve our private fitting room and complimentary personal stylist.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Visit Our Boutique',
          content: 'Plot 18, Commercial Row, Jubilee Hills, Hyderabad, Telangana 500033',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('salon') || type.includes('spa') || type.includes('beauty') || type.includes('hair')) {
    return {
      theme: {
        primary: '#be185d',
        font: 'Plus Jakarta Sans',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Premium Hair Care, Luxury Facials & Wellness Spa',
          content: 'Rejuvenate your senses with bespoke luxury beauty therapies.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Salon & Spa Services',
          subtitle: 'Individual care designed by experienced senior stylists',
          items: [
            { name: 'Creative Haircut & Blowdry', description: 'Personalized styling consultation and wash', price: '₹850' },
            { name: 'Botanical Hair Spa Ritual', description: 'Deep conditioning scalp nourishment treatment', price: '₹1,500' },
            { name: 'Radiance Glow Facial', description: 'Hydrating collagen treatment with organic serums', price: '₹2,200' },
            { name: 'Aroma Relaxation Massage', description: '60 minutes soothing essential oil therapy', price: '₹2,800' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Salon Hours',
          hours: [
            { day: 'Tuesday - Sunday', open: '09:30', close: '20:30' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book an Appointment',
          subtitle: 'Schedule your haircut or spa session. We confirm immediately on WhatsApp.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Studio Location',
          content: 'Suite 201, Crystal Plaza, Indiranagar, Bengaluru, Karnataka 560038',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('gym') || type.includes('fitness') || type.includes('workout') || type.includes('crossfit') || type.includes('training')) {
    return {
      theme: {
        primary: '#ea580c',
        font: 'Montserrat',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Strength Conditioning, Functional Fitness & Personal Coaching',
          content: 'Transform your health and athletic performance with certified coaches and modern equipment.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Training Programs & Memberships',
          subtitle: 'Flexible membership tiers designed for all fitness levels',
          items: [
            { name: '1-on-1 Personal Training Session', description: 'Custom workout plan with dedicated strength coach', price: '₹1,200' },
            { name: 'Monthly All-Access Gym Pass', description: 'Unlimited access to cardio, free weights & machines', price: '₹2,500' },
            { name: 'HIIT & Functional Bootcamp', description: 'High-energy small group conditioning batch', price: '₹1,800' },
            { name: 'Nutrition & Body Composition Review', description: 'Personalized macros assessment and diet guide', price: '₹950' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Facility Hours',
          hours: [
            { day: 'Monday - Saturday', open: '06:00', close: '22:00' },
            { day: 'Sunday', open: '07:00', close: '14:00' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book a Free Trial Session',
          subtitle: 'Claim your complimentary 1-day pass and fitness assessment. Confirm via WhatsApp.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Gym Location',
          content: '3rd Floor, Velocity Tower, Outer Ring Road, Bengaluru, Karnataka 560103',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('health') || type.includes('clinic') || type.includes('doctor') || type.includes('dental') || type.includes('medic') || type.includes('wellness')) {
    return {
      theme: {
        primary: '#0284c7',
        font: 'Roboto',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Comprehensive Family Healthcare, Diagnostics & Preventive Medicine',
          content: 'Dedicated to compassionate, patient-centered clinical care with modern diagnostic facilities.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Medical Services & Specialities',
          subtitle: 'Consultations and preventive health checkups by experienced physicians',
          items: [
            { name: 'General Physician Consultation', description: 'Primary health evaluation and clinical diagnosis', price: '₹600' },
            { name: 'Complete Executive Health Checkup', description: 'Full metabolic blood panel, ECG & vitals screen', price: '₹2,200' },
            { name: 'Preventive Dental Assessment', description: 'Comprehensive oral examination and scaling', price: '₹800' },
            { name: 'Pediatric Care & Vaccination Review', description: 'Child developmental monitoring and immunization', price: '₹750' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Clinic Timings',
          hours: [
            { day: 'Monday - Friday', open: '08:30', close: '20:00' },
            { day: 'Saturday', open: '09:00', close: '17:00' },
            { day: 'Sunday', open: '09:00', close: '13:00' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book Doctor Consultation',
          subtitle: 'Schedule an in-person or video consultation. Confirmed directly via WhatsApp.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Clinic Location',
          content: 'Plot 7A, Green View Avenue, Koramangala, Bengaluru, Karnataka 560034',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('port') || type.includes('design') || type.includes('photo') || type.includes('creative')) {
    return {
      theme: {
        primary: '#0f766e',
        font: 'Poppins',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Brand Strategy, Digital Product Design & Creative Direction',
          content: 'Crafting thoughtful digital experiences, identities, and bespoke visual systems for ambitious brands.',
        },
        {
          id: 'about-1',
          type: 'about',
          title: 'About the Studio',
          content: 'Over eight years collaborating with high-growth companies to create meaningful, enduring brand equity through design.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Core Creative Capabilities',
          subtitle: 'Selected disciplines and design consulting packages',
          items: [
            { name: 'Brand Identity & Visual System', description: 'Logomark, typography, color palette & guidelines', price: 'Custom' },
            { name: 'Web & Product UI/UX Design', description: 'High-converting interactive digital experiences', price: 'Custom' },
            { name: 'Design Sprint & Consultation', description: '3-day rapid discovery and product prototyping', price: '₹18,000' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book a Discovery Call',
          subtitle: 'Schedule a 30-minute introductory call to explore project fit and timeline.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Connect & Inquire',
          content: 'Available for select worldwide freelance and agency engagements.',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  if (type.includes('edu') || type.includes('tutor') || type.includes('school') || type.includes('academy') || type.includes('coach')) {
    return {
      theme: {
        primary: '#7c3aed',
        font: 'Open Sans',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: 'Concept-Driven Coaching, Academic Excellence & Test Prep',
          content: 'Empowering students to achieve peak potential through structured pedagogy and personal mentorship.',
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Academic Batches & Subjects',
          subtitle: 'Interactive small-batch learning with doubt-clearing sessions',
          items: [
            { name: 'Foundation Mathematics & Physics', description: 'Grades 9-10 conceptual building and problem sets', price: '₹3,000/mo' },
            { name: 'Advanced Competitive Entrance Prep', description: 'Intensive mock testing and speed optimization', price: '₹4,500/mo' },
            { name: '1-on-1 Personalized Mentoring', description: 'Custom-paced academic review and exam strategy', price: '₹900/hr' },
          ],
        },
        {
          id: 'hours-1',
          type: 'hours',
          title: 'Batch Schedule',
          hours: [
            { day: 'Monday - Friday (Batches)', open: '15:00', close: '20:30' },
            { day: 'Saturday (Doubt Clearing)', open: '10:00', close: '16:00' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Register for Free Demo Class',
          subtitle: 'Reserve a seat in our upcoming demo lecture. WhatsApp notification sent immediately.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Campus Center',
          content: '2nd Floor, Vidya Bhavan, Near City Library, Pune, Maharashtra 411004',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  // Universal adaptive layout for any custom category (preserves domain context)
  if (type !== 'cafe' && type !== 'coffee' && type !== 'default') {
    const formattedCategory = type.charAt(0).toUpperCase() + type.slice(1);
    return {
      theme: {
        primary: '#1F3D33',
        font: 'Inter',
        businessName: name,
      },
      sections: [
        { id: 'header-1', type: 'header' },
        {
          id: 'hero-1',
          type: 'hero',
          title: name,
          subtitle: `Professional ${formattedCategory} Services & Quality Craftsmanship`,
          content: `Delivering outstanding ${formattedCategory.toLowerCase()} solutions tailored to your unique requirements.`,
        },
        {
          id: 'services-1',
          type: 'services',
          title: 'Our Featured Services',
          subtitle: `Reliable ${formattedCategory.toLowerCase()} offerings and consultations`,
          items: [
            { name: `Standard ${formattedCategory} Consultation`, description: 'Comprehensive initial evaluation and custom quote', price: '₹500' },
            { name: `Premium ${formattedCategory} Service Package`, description: 'Complete end-to-end execution with satisfaction guarantee', price: '₹2,500' },
            { name: 'Express Priority Service', description: 'Expedited turnaround with dedicated support', price: '₹1,200' },
          ],
        },
        {
          id: 'booking-1',
          type: 'booking',
          title: 'Book an Appointment',
          subtitle: 'Reserve your time slot online. We confirm immediately via WhatsApp.',
        },
        {
          id: 'contact-1',
          type: 'contact',
          title: 'Get In Touch',
          content: 'Contact us directly on WhatsApp or phone for immediate inquiries.',
        },
        { id: 'footer-1', type: 'footer' },
      ],
    };
  }

  // Default to Cafe
  const cafeLayout: SiteLayout = JSON.parse(JSON.stringify(SAMPLE_LAYOUT));
  cafeLayout.theme.businessName = name;
  if (cafeLayout.sections[1]) cafeLayout.sections[1].title = name;
  return cafeLayout;
}

// Builds the sample page HTML using renderSite so it strictly matches real output
export function buildSamplePage(options: BuildSampleOptions = {}): { layout: SiteLayout; html: string } {
  const layout = getCategorySampleLayout(options.businessType, options.businessName);

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
