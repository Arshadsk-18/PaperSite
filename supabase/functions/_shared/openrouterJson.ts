// ==============================================================================
// PaperSite: OpenRouter JSON Heart Utility
// File: supabase/functions/_shared/openrouterJson.ts
// Exclusively targets the free NVIDIA vision model: nvidia/nemotron-3.5-super-vl:free
// Zero paid API usage. Strict validation. No paid or provider fallbacks.
// ==============================================================================

export const OPENROUTER_FREE_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 60000; // 60-second network timeout

export interface OpenRouterRequest {
  prompt: string;
  imageBase64?: string;
  systemPrompt?: string;
}

/**
 * Extracts and parses JSON from model responses, handling markdown code fences
 * and leading/trailing conversational text defensively.
 */
export function extractAndParseJson<T = any>(text: string): T {
  let cleaned = (text || '').trim();

  // 1. Check for markdown code fences (```json ... ``` or ``` ...)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // 2. Try direct JSON.parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 3. Fallback: locate outermost { and }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Fall through to error
      }
    }
    throw new Error('OPENROUTER_INVALID_JSON');
  }
}

/**
 * Sanitizes diagnostic log messages to prevent any keys, tokens, or image payloads
 * from being written to server logs. Bounded to 500 chars to avoid CPU spikes or ReDoS.
 */
export function sanitizeLogMessage(msg: string): string {
  if (!msg) return '';
  const bounded = msg.length > 500 ? `${msg.slice(0, 500)}...[TRUNCATED]` : msg;
  return bounded
    .replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-or-[a-zA-Z0-9_-]+/gi, '[REDACTED_API_KEY]')
    .replace(/key=[a-zA-Z0-9_-]+/gi, 'key=[REDACTED]')
    .replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/gi, '[IMAGE_DATA_REDACTED]');
}

/**
 * Supported image MIME types for multimodal vision models.
 */
export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type SupportedImageMimeType = typeof SUPPORTED_IMAGE_MIME_TYPES[number];

/**
 * Validates and normalizes an image payload (either full data URI or raw base64)
 * into a valid data URI matching the actual image MIME type.
 *
 * Supported formats:
 * - JPEG: magic bytes `FF D8 FF` -> base64 starts with `/9j`
 * - PNG:  magic bytes `89 50 4E 47` -> base64 starts with `iVBOR`
 * - WebP: magic bytes `52 49 46 46` -> base64 starts with `UklGR`
 * - GIF:  magic bytes `47 49 46 38` -> base64 starts with `R0lGOD`
 */
export function resolveImageDataUri(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('OPENROUTER_INVALID_RESPONSE: Invalid or empty image payload');
  }

  const raw = rawInput.trim();
  if (!raw) {
    throw new Error('OPENROUTER_INVALID_RESPONSE: Invalid or empty image payload');
  }

  // 1. Check if input is already a data URI: data:[<mediatype>][;base64],<data>
  if (raw.startsWith('data:')) {
    const commaIndex = raw.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('OPENROUTER_INVALID_RESPONSE: Malformed data URI image payload (missing comma)');
    }

    const header = raw.substring(0, commaIndex).toLowerCase();
    const base64Data = raw.substring(commaIndex + 1).trim();

    if (!base64Data) {
      throw new Error('OPENROUTER_INVALID_RESPONSE: Empty base64 image data in data URI');
    }

    // Extract MIME type from header (e.g. "data:image/jpeg;base64" -> "image/jpeg")
    const match = header.match(/^data:([^;]+)(?:;charset=[^;]+)?;base64$/);
    if (!match) {
      throw new Error('OPENROUTER_INVALID_RESPONSE: Malformed data URI scheme or non-base64 encoding');
    }

    let mimeType = match[1].trim();
    // Normalize aliases (e.g. image/jpg -> image/jpeg)
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as SupportedImageMimeType)) {
      throw new Error(
        `OPENROUTER_INVALID_RESPONSE: Unsupported image MIME type "${mimeType}". Supported: ${SUPPORTED_IMAGE_MIME_TYPES.join(', ')}`
      );
    }

    // If normalized alias or already correct, return normalized data URI
    return mimeType === match[1] ? raw : `data:${mimeType};base64,${base64Data}`;
  }

  // 2. Backward compatibility for callers passing raw base64 (without data: prefix)
  // Determine actual image MIME type from binary magic bytes encoded in Base64
  let detectedMime: SupportedImageMimeType | null = null;
  if (raw.startsWith('/9j')) {
    detectedMime = 'image/jpeg';
  } else if (raw.startsWith('iVBOR')) {
    detectedMime = 'image/png';
  } else if (raw.startsWith('UklGR')) {
    detectedMime = 'image/webp';
  } else if (raw.startsWith('R0lGOD')) {
    detectedMime = 'image/gif';
  }

  if (!detectedMime) {
    throw new Error(
      'OPENROUTER_INVALID_RESPONSE: Unsupported or invalid image format. Expected valid JPEG, PNG, WebP, or GIF image data.'
    );
  }

  return `data:${detectedMime};base64,${raw}`;
}

/**
 * Sends a structured request to OpenRouter using strictly the free NVIDIA model.
 * Zero paid usage: no fallbacks to paid models or alternative providers.
 */
export async function askOpenRouterJson<T = any>(req: OpenRouterRequest): Promise<T> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();
  if (!apiKey) {
    console.error(JSON.stringify({
      event: 'openrouter_diagnostic',
      category: 'AUTHENTICATION_ERROR',
      model: OPENROUTER_FREE_MODEL,
      message: 'OPENROUTER_API_KEY secret is missing or empty in Supabase environment',
    }));
    throw new Error('OPENROUTER_NOT_CONFIGURED');
  }

  // Build OpenAI-compatible message content
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Handle uploaded image if present
  if (req.imageBase64) {
    const imageUrl = resolveImageDataUri(req.imageBase64);

    userContent.push({
      type: 'image_url',
      image_url: {
        url: imageUrl,
      },
    });
  }

  // Append user prompt instructions
  userContent.push({
    type: 'text',
    text: req.prompt,
  });

  const messages: any[] = [];
  if (req.systemPrompt) {
    messages.push({
      role: 'system',
      content: req.systemPrompt,
    });
  }
  messages.push({
    role: 'user',
    content: userContent,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://papersite.dev',
        'X-Title': 'PaperSite',
      },
      body: JSON.stringify({
        model: OPENROUTER_FREE_MODEL,
        messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error(JSON.stringify({
        event: 'openrouter_diagnostic',
        category: 'TIMEOUT',
        model: OPENROUTER_FREE_MODEL,
        timeoutMs: REQUEST_TIMEOUT_MS,
        message: 'OpenRouter request aborted after 60s timeout',
      }));
      throw new Error('OPENROUTER_TIMEOUT');
    }

    console.error(JSON.stringify({
      event: 'openrouter_diagnostic',
      category: 'NETWORK_ERROR',
      model: OPENROUTER_FREE_MODEL,
      errorName: err.name || 'FetchError',
      message: sanitizeLogMessage(err.message || 'Network connection failed'),
    }));
    throw new Error(`OPENROUTER_UNAVAILABLE: ${err.message || 'Network error'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle non-OK HTTP responses with categorized diagnostic logging
  if (!res.ok) {
    let rawErrorText = '';
    try {
      rawErrorText = await res.text();
    } catch {
      rawErrorText = '(failed to read response body)';
    }

    const sanitizedError = sanitizeLogMessage(rawErrorText.slice(0, 300));
    const status = res.status;

    let category = 'UPSTREAM_SERVER_ERROR';
    if (status === 401 || status === 403) {
      category = 'AUTHENTICATION_ERROR';
    } else if (status === 429) {
      category = 'RATE_LIMIT';
    } else if (status === 502 || status === 503 || status === 504) {
      category = 'UPSTREAM_UNAVAILABLE';
    } else if (status >= 400 && status < 500) {
      category = 'CLIENT_ERROR';
    }

    console.error(JSON.stringify({
      event: 'openrouter_diagnostic',
      category,
      httpStatus: status,
      model: OPENROUTER_FREE_MODEL,
      sanitizedUpstreamError: sanitizedError,
    }));

    if (status === 429) {
      throw new Error('OPENROUTER_RATE_LIMITED');
    }

    if (status === 502 || status === 503 || status === 504) {
      throw new Error('OPENROUTER_UNAVAILABLE');
    }

    if (status === 401 || status === 403) {
      throw new Error('OPENROUTER_AUTH_FAILED');
    }

    throw new Error(`OPENROUTER_API_ERROR_${status}: ${sanitizedError.slice(0, 100)}`);
  }

  let responseData: any;
  try {
    responseData = await res.json();
  } catch {
    console.error(JSON.stringify({
      event: 'openrouter_diagnostic',
      category: 'MALFORMED_RESPONSE',
      model: OPENROUTER_FREE_MODEL,
      message: 'Failed to parse JSON response body from OpenRouter',
    }));
    throw new Error('OPENROUTER_INVALID_RESPONSE: Failed to parse OpenRouter response body');
  }

  const rawContent = responseData?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== 'string') {
    console.error(JSON.stringify({
      event: 'openrouter_diagnostic',
      category: 'MALFORMED_RESPONSE',
      model: OPENROUTER_FREE_MODEL,
      message: 'Response payload is missing choices[0].message.content string',
    }));
    throw new Error('OPENROUTER_INVALID_RESPONSE: Empty response choice from OpenRouter');
  }

  return extractAndParseJson<T>(rawContent);
}
