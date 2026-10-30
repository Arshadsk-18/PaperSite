import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLiveBookings } from '../hooks/useLiveBookings';
import { playNotificationChime } from '../lib/chime';
import type { Booking, BookingStatus, Project } from '../types';
import {
  Button,
  Pill,
  EmptyState,
  ErrorBanner,
  Toast,
  Skeleton,
} from '../components/ui';
import {
  Calendar,
  Phone,
  MessageCircle,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

const DEMO_BOOKINGS: Booking[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    project_id: '11111111-1111-1111-1111-111111111111',
    customer_name: 'Aarav Sharma',
    phone: '+919876543210',
    service: 'Reserved Table for 4',
    preferred_time: 'Today 6:00 PM',
    message: 'Window seating preferred if available',
    status: 'confirmed',
    created_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    project_id: '11111111-1111-1111-1111-111111111111',
    customer_name: 'Priya Patel',
    phone: '+919876543211',
    service: 'Brew Tasting Session',
    preferred_time: 'Tomorrow 4:00 PM',
    message: 'Bringing two friends for the roast tour',
    status: 'new',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    project_id: '11111111-1111-1111-1111-111111111111',
    customer_name: 'Rahul Verma',
    phone: '+919876543212',
    service: 'Cold Brew Growler Pickup',
    preferred_time: 'Today 5:30 PM',
    message: 'Hazelnut roast',
    status: 'done',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export const BookingsPage: React.FC = () => {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sound Mute Toggle
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('papersite_bookings_muted') === 'true';
  });

  // Highlighted Row IDs (fade yellow highlight after arrival)
  const [highlightedRowIds, setHighlightedRowIds] = useState<Set<string>>(new Set());

  // Toast notifications for incoming bookings
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Projects to get project IDs and names
  useEffect(() => {
    async function loadProjects() {
      setIsLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        const stored = localStorage.getItem('papersite_projects');
        if (stored) {
          try {
            setProjects(JSON.parse(stored));
          } catch {
            setProjects([]);
          }
        } else {
          setProjects([
            {
              id: '11111111-1111-1111-1111-111111111111',
              owner_id: user?.id || 'demo-owner',
              business_name: 'Brew Bay Café',
              business_type: 'cafe',
              slug: 'brew-bay',
              whatsapp_number: '+919876543210',
              language: 'en',
              is_published: true,
              current_version_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  // Handle incoming new booking in real-time
  const handleNewBookingArrival = useCallback((newBooking: Booking) => {
    // 1. Play soft chime
    playNotificationChime(isMuted);

    // 2. Add to highlighted set for fading yellow background
    setHighlightedRowIds((prev) => new Set([...prev, newBooking.id]));

    // 3. Trigger toast
    setToastMessage(`New booking from ${newBooking.customer_name}`);

    // Remove highlight after 4 seconds
    setTimeout(() => {
      setHighlightedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(newBooking.id);
        return next;
      });
    }, 4000);
  }, [isMuted]);

  // Supabase Realtime Hook (Heart File)
  const { bookings: liveBookings, setBookings } = useLiveBookings(
    projectIds,
    handleNewBookingArrival
  );

  // Initialize or fallback offline bookings
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem('papersite_demo_bookings');
      if (stored) {
        try {
          setBookings(JSON.parse(stored));
        } catch {
          setBookings(DEMO_BOOKINGS);
        }
      } else {
        setBookings(DEMO_BOOKINGS);
        localStorage.setItem('papersite_demo_bookings', JSON.stringify(DEMO_BOOKINGS));
      }
    }
  }, [setBookings]);

  // Project map for easy lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    if (selectedProjectId === 'all') return liveBookings;
    return liveBookings.filter((b) => b.project_id === selectedProjectId);
  }, [liveBookings, selectedProjectId]);

  // Counter: "N today"
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return filteredBookings.filter((b) => {
      return new Date(b.created_at).toDateString() === today;
    }).length;
  }, [filteredBookings]);

  // Update Booking Status Handler
  const updateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    // Optimistic update
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) {
        setErrorMessage(`Failed to update status: ${error.message}`);
      }
    } else {
      const updated = liveBookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b));
      localStorage.setItem('papersite_demo_bookings', JSON.stringify(updated));
    }
  };

  // WhatsApp Confirm Handler
  const handleConfirmViaWhatsApp = async (booking: Booking) => {
    const digits = booking.phone.replace(/\D/g, '');
    if (digits.length < 10) return;

    const proj = projectMap.get(booking.project_id);
    const businessName = proj?.business_name || 'Our Shop';
    const customerName = booking.customer_name || 'Customer';
    const preferredTime = booking.preferred_time || 'your requested time';

    // Message format: "Hi <name>, your booking at <business name> is confirmed for <preferred time>."
    // Encode every part properly
    const rawMessage = `Hi ${customerName}, your booking at ${businessName} is confirmed for ${preferredTime}.`;
    const encodedText = encodeURIComponent(rawMessage);
    const waUrl = `https://wa.me/${digits}?text=${encodedText}`;

    // Update status to confirmed
    await updateStatus(booking.id, 'confirmed');

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Simulate arrival for offline demo testing
  const simulateNewBooking = () => {
    const randomNames = ['Vikram Seth', 'Meera Rao', 'Sameer Khan', 'Kavita Reddy'];
    const randomServices = ['Reserved Table for 2', 'Salon Appointment', 'Private Consultation', 'Lunch Tasting'];
    const chosenName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const chosenService = randomServices[Math.floor(Math.random() * randomServices.length)];

    const simBooking: Booking = {
      id: `sim-${Date.now()}`,
      project_id: projects[0]?.id || '11111111-1111-1111-1111-111111111111',
      customer_name: chosenName,
      phone: '+919876543299',
      service: chosenService,
      preferred_time: 'Tomorrow 5:00 PM',
      message: 'Looking forward to visiting!',
      status: 'new',
      created_at: new Date().toISOString(),
    };

    setBookings((prev) => [simBooking, ...prev]);
    handleNewBookingArrival(simBooking);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('papersite_bookings_muted', String(next));
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 bg-[#F4F6F4]/40 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <Toast
            type="success"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Header: Bookings + Live Indicator + Counter + Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#E3E8E4]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-[#14221B] tracking-tight">
              Bookings
            </h1>
            {/* Green Pulsing Live Indicator */}
            <span data-testid="live-indicator" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#1F8A4C] animate-ping" />
              <span>Live</span>
            </span>
          </div>
          <p className="text-sm text-[#5E6B63] mt-1">
            Customer appointment and reservation requests update automatically without refreshing.
          </p>
        </div>

        {/* Counter and Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* "N today" counter */}
          <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8E4] text-xs font-semibold text-[#14221B] shadow-2xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D6F26B]" />
            <span>
              <strong>{todayCount}</strong> {todayCount === 1 ? 'booking' : 'bookings'} today
            </span>
          </div>

          {/* Project Filter */}
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-[#E3E8E4] rounded-xl px-2.5 py-1 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-[#5E6B63]" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-xs font-medium text-[#14221B] bg-transparent focus:outline-none py-1 pr-2"
                aria-label="Filter bookings by shop project"
              >
                <option value="all">All shops ({liveBookings.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.business_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mute Chime Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition-colors shadow-2xs ${
              isMuted
                ? 'bg-gray-100 text-[#5E6B63] border-[#E3E8E4]'
                : 'bg-white text-[#1F3D33] border-[#E3E8E4] hover:bg-gray-50'
            }`}
            title={isMuted ? 'Notification sound muted' : 'Notification sound active'}
            aria-label={isMuted ? 'Unmute chime' : 'Mute chime'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#2F6B4F]" />}
          </button>

          {/* Simulate New Booking (Helpful for demo/evaluation) */}
          <Button
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-[#2F6B4F]" />}
            onClick={simulateNewBooking}
            title="Simulate incoming real-time customer submission"
          >
            <span className="hidden sm:inline">Simulate</span>
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mt-6">
          <ErrorBanner
            title="Notice"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        </div>
      )}

      {/* Bookings List */}
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-5 rounded-2xl border border-[#E3E8E4]">
                <div className="flex items-center gap-4">
                  <Skeleton width="44px" height="44px" rounded="full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton width="30%" height="18px" />
                    <Skeleton width="60%" height="14px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-7 h-7 text-[#2F6B4F]" />}
            title="No bookings yet"
            description="Share your QR code to get your first one. When customers book, their appointment pops up right here."
            action={{
              label: 'Go to projects',
              onClick: () => {
                window.location.href = '/dashboard';
              },
              variant: 'accent',
            }}
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredBookings.map((b) => {
                const proj = projectMap.get(b.project_id);
                const isNewHighlight = highlightedRowIds.has(b.id);
                const digits = (b.phone || '').replace(/\D/g, '');
                const hasValidPhone = digits.length >= 10;
                const initial = (b.customer_name || '?').charAt(0).toUpperCase();

                const statusColorConfig = {
                  new: 'lime',
                  confirmed: 'green',
                  done: 'surface',
                  cancelled: 'danger',
                } as const;

                return (
                  <motion.div
                    key={b.id}
                    data-testid="booking-row"
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-2xl border transition-all duration-700 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isNewHighlight
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300'
                        : 'bg-white border-[#E3E8E4] hover:border-[#2F6B4F]/30'
                    }`}
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Avatar initial */}
                      <div className="w-11 h-11 rounded-2xl bg-[#1F3D33] text-[#D6F26B] font-extrabold flex items-center justify-center text-base shrink-0 shadow-2xs">
                        {initial}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-[#14221B] leading-tight">
                            {b.customer_name}
                          </h3>

                          {proj && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F4F6F4] text-[#5E6B63] border border-[#E3E8E4]">
                              {proj.business_name}
                            </span>
                          )}

                          <span className="text-xs text-[#5E6B63] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#5E6B63]" />
                            <span>{formatTimeAgo(b.created_at)}</span>
                          </span>
                        </div>

                        {/* Service and Preferred Time */}
                        <div className="text-xs sm:text-sm text-[#14221B] font-medium flex flex-wrap items-center gap-2">
                          {b.service && (
                            <span className="text-[#2F6B4F] font-semibold">{b.service}</span>
                          )}
                          {b.service && b.preferred_time && <span>•</span>}
                          {b.preferred_time && (
                            <span className="text-[#5E6B63] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#5E6B63]" />
                              <span>{b.preferred_time}</span>
                            </span>
                          )}
                        </div>

                        {/* Customer Message */}
                        {b.message && (
                          <p className="text-xs text-[#5E6B63] italic bg-[#F4F6F4] px-2.5 py-1 rounded-md border border-[#E3E8E4]/60 max-w-xl">
                            "{b.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Phone link + Confirm via WhatsApp + Status Pill */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-[#E3E8E4] shrink-0 justify-between md:justify-end">
                      {/* Tap to Call */}
                      {digits && (
                        <a
                          href={`tel:${digits}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4F6F4] hover:bg-gray-200 text-[#14221B] text-xs font-semibold transition"
                          title="Call customer directly"
                        >
                          <Phone className="w-3 h-3 text-[#2F6B4F]" />
                          <span>{b.phone}</span>
                        </a>
                      )}

                      {/* WhatsApp Confirm Button (Shows only when phone has >=10 digits) */}
                      {hasValidPhone && (
                        <button
                          type="button"
                          onClick={() => handleConfirmViaWhatsApp(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:brightness-105 active:brightness-95 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                          title="Confirm and send instant WhatsApp confirmation"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>Confirm</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Status Selector / Pill */}
                      <div className="relative">
                        <select
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value as BookingStatus)}
                          className="text-xs font-semibold rounded-full px-3 py-1 bg-white border border-[#E3E8E4] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] shadow-2xs cursor-pointer capitalize"
                          aria-label={`Change status for ${b.customer_name}`}
                        >
                          <option value="new">● New</option>
                          <option value="confirmed">● Confirmed</option>
                          <option value="done">● Done</option>
                          <option value="cancelled">● Cancelled</option>
                        </select>
                      </div>

                      <Pill variant={statusColorConfig[b.status] || 'surface'} size="sm" className="hidden sm:inline-flex capitalize">
                        {b.status}
                      </Pill>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
