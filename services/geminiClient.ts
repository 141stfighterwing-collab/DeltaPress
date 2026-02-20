const GEMINI_API_BASES = [
  'https://generativelanguage.googleapis.com/v1',
  'https://generativelanguage.googleapis.com/v1beta'
];

const DEFAULT_MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];

const REQUEST_TIMEOUT_MS = 30000;

type GeminiRequestBody = {
  contents: any;
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: any[];
  responseMimeType?: string;
  responseSchema?: unknown;
  imageConfig?: unknown;
};

export async function geminiGenerateContent(
  apiKey: string,
  body: GeminiRequestBody,
  modelCandidates: string[] = DEFAULT_MODEL_CANDIDATES
) {
  if (!apiKey) {
    throw new Error('Gemini API key is missing.');
  }

  let lastError: unknown = null;
  const attemptedFailures: string[] = [];

  for (const model of modelCandidates) {
    for (const baseUrl of GEMINI_API_BASES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        if (!response.ok) {
          const message = await response.text();
          attemptedFailures.push(`${model}@${baseUrl} -> ${response.status}`);
          throw new Error(`Gemini request failed (${response.status}) on ${baseUrl} using ${model}: ${message}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        console.warn(`Gemini transport failed for ${model} at ${baseUrl}, trying fallback...`, error);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  if (lastError instanceof Error) {
    const attemptSummary = attemptedFailures.length > 0
      ? ` Attempted: ${attemptedFailures.join(', ')}.`
      : '';
    throw new Error(`${lastError.message}${attemptSummary}`);
  }

  throw new Error('Failed to generate content with available Gemini model and endpoint fallbacks.');
}

export function extractGeminiText(payload: any): string {
  return payload?.candidates?.[0]?.content?.parts
    ?.filter((part: any) => typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('') || '';
}

export function extractGeminiInlineImageData(payload: any): string | null {
  const imagePart = payload?.candidates?.[0]?.content?.parts?.find((part: any) => part?.inlineData?.data);
  return imagePart?.inlineData?.data || null;
}


export type GeminiValidationAttempt = {
  model: string;
  baseUrl: string;
  ok: boolean;
  status?: number;
  error?: string;
};

export async function geminiValidateApiKey(
  apiKey: string,
  modelCandidates: string[] = DEFAULT_MODEL_CANDIDATES
): Promise<{ ok: boolean; attempts: GeminiValidationAttempt[] }> {
  if (!apiKey) {
    return {
      ok: false,
      attempts: [{ model: 'n/a', baseUrl: 'n/a', ok: false, error: 'Gemini API key is missing.' }]
    };
  }

  const attempts: GeminiValidationAttempt[] = [];

  for (const model of modelCandidates) {
    for (const baseUrl of GEMINI_API_BASES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Return OK' }] }]
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const message = await response.text();
          attempts.push({
            model,
            baseUrl,
            ok: false,
            status: response.status,
            error: message
          });
          continue;
        }

        attempts.push({ model, baseUrl, ok: true, status: response.status });
        return { ok: true, attempts };
      } catch (error: any) {
        attempts.push({
          model,
          baseUrl,
          ok: false,
          error: error?.message || 'Unknown transport error'
        });
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  return { ok: false, attempts };
}
