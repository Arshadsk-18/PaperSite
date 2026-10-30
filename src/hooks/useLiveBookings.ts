// ==============================================================================
// PaperSite: Realtime Bookings Listener [HEART FILE: <= 35 lines of active code]
// File: src/hooks/useLiveBookings.ts
// Subscribes to Supabase Realtime channel for live customer booking pushes.
// ==============================================================================

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Booking } from '../types';

export function useLiveBookings(projectIds: string[], onInsert?: (b: Booking) => void) {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || projectIds.length === 0) return;

    // 1. Initial fetch of newest bookings
    supabase.from('bookings').select('*').in('project_id', projectIds)
      .order('created_at', { ascending: false }).then(({ data }) => data && setBookings(data));

    // 2. Realtime subscription: merges incoming rows and live status updates
    const channel = supabase.channel('live-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const row = payload.new as Booking;
        if (projectIds.includes(row.project_id)) {
          setBookings((prev) => [row, ...prev.filter((b) => b.id !== row.id)]);
          onInsert?.(row);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        const row = payload.new as Booking;
        setBookings((prev) => prev.map((b) => (b.id === row.id ? row : b)));
      })
      .subscribe();

    return () => { supabase?.removeChannel(channel); };
  }, [projectIds.join(','), onInsert]);

  return { bookings, setBookings };
}
