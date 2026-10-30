// ==============================================================================
// PaperSite: Gemini JSON Heart File (< 35 lines of active code)
// File: supabase/functions/_shared/geminiJson.ts
// Forces structured JSON generation, validates responses, and retries once on error.
// ==============================================================================

export interface GeminiRequest {
  prompt: string;
  imageBase64?: string;
  schema?: Record<string, unknown>;
  model?: string;
}

export async function askGeminiJson<T = any>(req: GeminiRequest, attempt = 1): Promise<T> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  const envModel = req.model || Deno.env.get('GEMINI_MODEL')?.trim();
  const model = attempt === 1 ? (envModel || 'gemini-3.5-flash') : 'gemini-3.5-flash';
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');
  const parts: any[] = [{ text: req.prompt }];
  if (req.imageBase64) {
    const data = req.imageBase64.includes(',') ? req.imageBase64.split(',')[1] : req.imageBase64;
    parts.unshift({ inlineData: { mimeType: 'image/png', data } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', ...(req.schema ? { responseSchema: req.schema } : {}) } }),
  });
  if (res.status === 429) throw new Error('GEMINI_RATE_LIMITED');
  if (!res.ok) {
    const errText = await res.text();
    if (attempt === 1 && res.status >= 500) return askGeminiJson<T>(req, 2);
    throw new Error(`GEMINI_API_ERROR_${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('EMPTY_GEMINI_RESPONSE');
  try {
    return JSON.parse(text) as T;
  } catch {
    if (attempt === 1) return askGeminiJson<T>(req, 2);
    throw new Error('INVALID_JSON_FROM_GEMINI');
  }
}
