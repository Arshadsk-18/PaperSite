import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { renderSite } from '../../supabase/functions/_shared/renderSite';
import { sanitizeHtml } from '../../supabase/functions/_shared/sanitize';
import type { SiteLayout, Booking } from '../types';
import { Button, Spinner } from '../components/ui';
import { AlertCircle, Home } from 'lucide-react';

// Fallback demo site for "brew-bay"
const BREW_BAY_LAYOUT: SiteLayout = {
  theme: {
    primary: '#b45309',
    font: 'Inter',
    businessName: 'Brew Bay Café',
  },
  sections: [
    { id: 'header-1', type: 'header' },
    {
      id: 'hero-1',
      type: 'hero',
      title: 'Brew Bay Café',
      subtitle: 'Artisanal Coffee & Freshly Baked Sourdough Pastries in Bandra',
      content: 'Crafted with passion using single-origin beans.',
    },
    {
      id: 'menu-1',
      type: 'menu',
      title: 'Popular Brews',
      subtitle: 'Slow-steeped, pour-overs, and daily morning bakery',
      items: [
        { name: 'Signature Cold Brew', description: 'Steeped for 18 hours with dark chocolate notes', price: '₹220' },
        { name: 'Classic Flat White', description: 'Velvety micro-foam over double ristretto', price: '₹190' },
        { name: 'Almond Croissant', description: 'Twice-baked almond frangipane crust', price: '₹160' },
      ],
    },
    {
      id: 'hours-1',
      type: 'hours',
      title: 'Opening Hours',
      hours: [
        { day: 'Monday - Friday', open: '08:00', close: '22:00' },
        { day: 'Saturday - Sunday', open: '09:00', close: '23:00' },
      ],
    },
    {
      id: 'booking-1',
      type: 'booking',
      title: 'Reserve a Table',
      subtitle: 'Book ahead for cozy corners & weekend brunch',
    },
    {
      id: 'contact-1',
      type: 'contact',
      title: 'Visit Us in Bandra',
    },
    {
      id: 'footer-1',
      type: 'footer',
    },
  ],
};

// Helper to set document title and meta description dynamically
function updateDocumentMetadata(name: string) {
  document.title = `${name} | Online Booking & Menu`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', `Visit ${name}. View menu, reserve tables, and chat directly on WhatsApp.`);
  }
}

export const PublicSitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [siteHtml, setSiteHtml] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPublishedSite() {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setNotFound(false);

      // Check live Supabase published_sites table if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('published_sites')
            .select('*')
            .eq('slug', slug)
            .single();

          if (!error && data && data.html) {
            setSiteHtml(data.html);
            setBusinessName(data.business_name || 'Shop');
            updateDocumentMetadata(data.business_name);
            setIsLoading(false);
            return;
          }
        } catch {
          // Fall through to local fallback
        }
      }

      // Check local storage for user-published sites
      const stored = localStorage.getItem('papersite_projects');
      if (stored) {
        try {
          const projs = JSON.parse(stored);
          const matched = projs.find((p: any) => p.slug === slug);
          if (matched) {
            const versionsKey = `papersite_versions_${matched.id}`;
            const storedVers = localStorage.getItem(versionsKey);
            if (storedVers) {
              const vers = JSON.parse(storedVers);
              const activeVer = vers.find((v: any) => v.id === matched.current_version_id) || vers[0];
              if (activeVer) {
                setSiteHtml(activeVer.html);
                setBusinessName(matched.business_name);
                updateDocumentMetadata(matched.business_name);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // Fall through
        }
      }

      // Demo fallback for brew-bay
      if (slug === 'brew-bay' || slug === 'demo') {
        const demoHtml = sanitizeHtml(
          renderSite(BREW_BAY_LAYOUT, 'en', '+919876543210', {
            projectId: '11111111-1111-1111-1111-111111111111',
            businessPhone: '+919876543210',
            address: 'Shop 4, Promenade Walk, Bandra West, Mumbai',
          })
        );
        setSiteHtml(demoHtml);
        setBusinessName('Brew Bay Café');
        updateDocumentMetadata('Brew Bay Café');
        setIsLoading(false);
        return;
      }

      // Not found
      setNotFound(true);
      setIsLoading(false);
    }

    fetchPublishedSite();
  }, [slug]);

  // Listen for booking submissions from the sandboxed iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'PUBLIC_BOOKING_SUBMITTED') {
        const payload = e.data.payload;
        if (!payload) return;

        // Persist booking to demo store if offline
        const newBooking: Booking = {
          id: `book-${Date.now()}`,
          project_id: payload.projectId || '11111111-1111-1111-1111-111111111111',
          customer_name: payload.customerName,
          phone: payload.phone,
          service: payload.service || 'Appointment',
          preferred_time: payload.preferredTime || 'Preferred Time',
          message: payload.message || null,
          status: 'new',
          created_at: new Date().toISOString(),
        };

        const currentBookings: Booking[] = JSON.parse(
          localStorage.getItem('papersite_demo_bookings') || '[]'
        );
        const updated = [newBooking, ...currentBookings];
        localStorage.setItem('papersite_demo_bookings', JSON.stringify(updated));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
        <Spinner size="lg" color="forest" />
        <p className="text-xs text-[#5E6B63] font-medium mt-3">Loading shop website...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F6F4] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E3E8E4] flex items-center justify-center text-[#C8382F] mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#14221B] mb-2">Shop not found</h1>
        <p className="text-sm text-[#5E6B63] max-w-md mb-6 leading-relaxed">
          The website you are looking for at <code className="bg-white px-2 py-0.5 rounded font-mono text-xs border border-[#E3E8E4]">/site/{slug}</code> has not been published yet or the link is incorrect.
        </p>
        <Link to="/">
          <Button variant="primary" icon={<Home className="w-4 h-4" />}>
            Visit PaperSite home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-white overflow-hidden">
      {/* Full-screen Sandboxed iframe */}
      <iframe
        title={`${businessName} Public Website`}
        sandbox="allow-scripts allow-forms"
        srcDoc={siteHtml || ''}
        className="w-full h-full border-0 flex-1"
      />
    </div>
  );
};
