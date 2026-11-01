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
 * from being written to server logs.
 */
function sanitizeLogMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-or-[a-zA-Z0-9_-]+/gi, '[REDACTED_API_KEY]')
    .replace(/key=[a-zA-Z0-9_-]+/gi, 'key=[REDACTED]')
    .replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/gi, '[IMAGE_DATA_REDACTED]');
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
    let cleanBase64 = req.imageBase64.trim();
    let mimeType = 'image/png';

    if (cleanBase64.startsWith('data:')) {
      const match = cleanBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = cleanBase64.substring(match[0].length);
      }
    }

    if (!cleanBase64) {
      throw new Error('OPENROUTER_INVALID_RESPONSE: Invalid or empty image payload');
    }

    // Format as standard data URI for vision models
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${cleanBase64}`,
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
