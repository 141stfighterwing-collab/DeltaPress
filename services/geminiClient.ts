const GEMINI_PROXY_PATH = '/api/gemini';

const DEFAULT_MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];

const REQUEST_TIMEOUT_MS = 30000;

type GeminiRequestBody = {
  contents: any;
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: any[];
  responseMimeType?: string;
  responseSchema?: unknown;
  imageConfig?: unknown;
};

async function tryProxyRequest(body: GeminiRequestBody, modelCandidates: string[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: body, modelCandidates }),
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Gemini proxy failed (${response.status}): ${message}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function geminiGenerateContent(
  _apiKey: string,
  body: GeminiRequestBody,
  modelCandidates: string[] = DEFAULT_MODEL_CANDIDATES
) {
  return await tryProxyRequest(body, modelCandidates);
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
