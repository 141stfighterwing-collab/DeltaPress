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

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to generate content with available Gemini model and endpoint fallbacks.');
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
