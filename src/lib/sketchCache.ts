// ==============================================================================
// PaperSite: Sketch Cache & Hash Utility
// File: src/lib/sketchCache.ts
// Caches AI generated layouts by sketch hash for instant, 0-token repeat generations.
// ==============================================================================

import type { SiteLayout } from '../types';

export interface CachedResult {
  layout: SiteLayout;
  html: string;
  businessType?: string;
  isAiGenerated: boolean;
  timestamp: number;
}

// In-memory runtime cache
const memoryCache = new Map<string, CachedResult>();

// Deterministic cryptographic or fallback string hashing
export async function hashSketch(data: string, businessType: string = 'general'): Promise<string> {
  if (!data) return `empty_sketch_${businessType}`;

  let baseHash = '';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      baseHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fall back to fast DJB2 hash
  }

  if (!baseHash) {
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 33) ^ data.charCodeAt(i);
    }
    baseHash = `sketch_${(hash >>> 0).toString(16)}_${data.length}`;
  }

  return `${businessType}_${baseHash}`;
}

// Retrieve cached result from memory or localStorage
export function getCachedSketchResult(hash: string): CachedResult | null {
  if (!hash) return null;

  // Check memory
  const mem = memoryCache.get(hash);
  if (mem) {
    // Only return genuine AI generations from cache
    if (mem.isAiGenerated !== false) return mem;
    memoryCache.delete(hash);
  }

  // Check localStorage
  try {
    const raw = localStorage.getItem(`papersite_cache_${hash}`);
    if (raw) {
      const parsed: CachedResult = JSON.parse(raw);
      if (parsed && parsed.isAiGenerated !== false) {
        memoryCache.set(hash, parsed);
        return parsed;
      }
      localStorage.removeItem(`papersite_cache_${hash}`);
    }
  } catch {
    // Ignore storage errors
  }

  return null;
}

// Store generated layout and html against sketch hash ONLY if it was truly AI generated
export function setCachedSketchResult(
  hash: string,
  layout: SiteLayout,
  html: string,
  businessType: string = 'general',
  isAiGenerated: boolean = true
): void {
  if (!hash || !isAiGenerated) return; // NEVER cache fallbacks
  const entry: CachedResult = { layout, html, businessType, isAiGenerated: true, timestamp: Date.now() };
  memoryCache.set(hash, entry);

  try {
    localStorage.setItem(`papersite_cache_${hash}`, JSON.stringify(entry));
  } catch {
    // Storage quota or disabled; memory cache still holds it
  }
}
