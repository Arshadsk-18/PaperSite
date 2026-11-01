// ==============================================================================
// PaperSite: Edge Function Request Protection & Streaming Body Reader
// File: supabase/functions/_shared/requestLimit.ts
// Prevents isolate memory exhaustion (HTTP 546) by enforcing payload bounds
// before and during streaming body ingestion.
// ==============================================================================

// 1. Max raw request body bytes (2.5MB): protects isolate memory BEFORE buffering/parsing
export const MAX_REQUEST_BODY_BYTES = 2.5 * 1024 * 1024;
// 2. Max imageBase64 string length inside JSON (2MB): ample for 1024px compressed sketches
export const MAX_BASE64_LENGTH = 2 * 1024 * 1024;

export class PayloadTooLargeError extends Error {
  statusCode: number;

  constructor(message = 'Payload exceeds maximum allowed size') {
    super(message);
    this.name = 'PayloadTooLargeError';
    this.statusCode = 413;
  }
}

/**
 * Reads and parses JSON with strict byte-counting protection.
 * Rejects requests exceeding maxBytes before reading or buffering excess data.
 * Protects against missing, chunked, or spoofed Content-Length headers.
 */
export async function readJsonWithLimit<T = any>(
  req: Request,
  maxBytes: number = MAX_REQUEST_BODY_BYTES
): Promise<T> {
  // 1. Check Content-Length header if present
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const cl = parseInt(contentLengthHeader, 10);
    if (!isNaN(cl) && cl > maxBytes) {
      throw new PayloadTooLargeError(`Payload of ${cl} bytes exceeds limit of ${maxBytes} bytes`);
    }
  }

  // 2. Stream and count bytes to protect against missing/chunked/spoofed Content-Length
  if (!req.body) {
    return {} as T;
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel('PAYLOAD_TOO_LARGE');
          throw new PayloadTooLargeError(`Payload stream exceeded limit of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8').decode(merged);
  return JSON.parse(text) as T;
}
