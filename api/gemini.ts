type GeminiValidationAttempt = {
  model: string;
  baseUrl: string;
  ok: boolean;
  status?: number;
  error?: string;
};

type RequestBody = {
  operation?: 'generate' | 'validate';
  apiKey?: string;
  modelCandidates?: string[];
  body?: Record<string, unknown>;
};

const GEMINI_API_BASES = [
  'https://generativelanguage.googleapis.com/v1',
  'https://generativelanguage.googleapis.com/v1beta'
];

const DEFAULT_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];

function getServerGeminiKeys(): string[] {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GEMINI2_API_KEY,
    process.env.Gemini2_API_KEY
  ].filter((value): value is string => Boolean(value && value.trim()));

  return [...new Set(keys)];
}

async function callGemini(baseUrl: string, model: string, apiKey: string, payload: unknown) {
  const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return response;
}

async function runValidation(apiKey: string, modelCandidates: string[]): Promise<{ ok: boolean; attempts: GeminiValidationAttempt[] }> {
  const attempts: GeminiValidationAttempt[] = [];

  for (const model of modelCandidates) {
    for (const baseUrl of GEMINI_API_BASES) {
      try {
        const response = await callGemini(baseUrl, model, apiKey, {
          contents: [{ role: 'user', parts: [{ text: 'Return OK' }] }]
        });

        if (!response.ok) {
          attempts.push({
            model,
            baseUrl,
            ok: false,
            status: response.status,
            error: await response.text()
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
      }
    }
  }

  return { ok: false, attempts };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { operation = 'generate', apiKey, modelCandidates = DEFAULT_MODELS, body }: RequestBody = req.body || {};

  if (operation === 'validate') {
    const validationKey = apiKey || getServerGeminiKeys()[0];

    if (!validationKey) {
      return res.status(400).json({ ok: false, attempts: [{ model: 'n/a', baseUrl: 'n/a', ok: false, error: 'No Gemini key configured.' }] });
    }

    const validation = await runValidation(validationKey, modelCandidates);
    return res.status(validation.ok ? 200 : 502).json(validation);
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Request body payload is required.' });
  }

  const keysToTry = [...new Set([apiKey, ...getServerGeminiKeys()].filter((value): value is string => Boolean(value && value.trim())))];

  if (keysToTry.length === 0) {
    return res.status(400).json({ ok: false, error: 'No Gemini API keys configured on server.' });
  }

  let lastError = 'Gemini request failed.';

  for (const key of keysToTry) {
    for (const model of modelCandidates) {
      for (const baseUrl of GEMINI_API_BASES) {
        try {
          const response = await callGemini(baseUrl, model, key, body);

          if (response.ok) {
            return res.status(200).json({ ok: true, payload: await response.json(), model, baseUrl });
          }

          const message = await response.text();
          lastError = `${model}@${baseUrl} -> ${response.status}: ${message}`;

          if (response.status === 429) {
            break;
          }
        } catch (error: any) {
          lastError = error?.message || 'Transport error';
        }
      }
    }
  }

  return res.status(502).json({ ok: false, error: lastError });
}
