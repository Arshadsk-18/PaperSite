// ==============================================================================
// PaperSite: Sketch Cache & Hash Utility
// File: src/lib/sketchCache.ts
// Caches AI generated layouts by sketch hash for instant, 0-token repeat generations.
// ==============================================================================

import type { SiteLayout } from '../types';

export interface CachedResult {
  layout: SiteLayout;
  html: string;
  timestamp: number;
}

// In-memory runtime cache
const memoryCache = new Map<string, CachedResult>();

// Deterministic cryptographic or fallback string hashing
export async function hashSketch(data: string): Promise<string> {
  if (!data) return 'empty_sketch';

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fall back to fast DJB2 hash
  }

  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 33) ^ data.charCodeAt(i);
  }
  return `sketch_${(hash >>> 0).toString(16)}_${data.length}`;
}

// Retrieve cached result from memory or localStorage
export function getCachedSketchResult(hash: string): CachedResult | null {
  if (!hash) return null;

  // Check memory
  const mem = memoryCache.get(hash);
  if (mem) return mem;

  // Check localStorage
  try {
    const raw = localStorage.getItem(`papersite_cache_${hash}`);
    if (raw) {
      const parsed: CachedResult = JSON.parse(raw);
      memoryCache.set(hash, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

// Store generated layout and html against sketch hash
export function setCachedSketchResult(hash: string, layout: SiteLayout, html: string): void {
  if (!hash) return;
  const entry: CachedResult = { layout, html, timestamp: Date.now() };
  memoryCache.set(hash, entry);

  try {
    localStorage.setItem(`papersite_cache_${hash}`, JSON.stringify(entry));
  } catch {
    // Storage quota or disabled; memory cache still holds it
  }
}
