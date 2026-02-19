const GEMINI_API_BASES = [
  'https://generativelanguage.googleapis.com/v1',
  'https://generativelanguage.googleapis.com/v1beta'
];

const KIMI_CHAT_COMPLETIONS_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';

const REQUEST_TIMEOUT_MS = 30000;

type GeminiRequestBody = {
  contents: unknown;
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: unknown[];
  responseMimeType?: string;
  responseSchema?: unknown;
  imageConfig?: unknown;
};

type GeminiProxyBody = {
  request: GeminiRequestBody;
  modelCandidates: string[];
};

type ProviderTarget =
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'kimi'; apiKey: string };

let roundRobinCounter = 0;

const timeoutSignal = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS);

function listProviderTargets(request: GeminiRequestBody): ProviderTarget[] {
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.Gemini2_API_KEY,
    process.env.API_KEY
  ].filter((key): key is string => Boolean(key && key.trim()));

  const kimiKey = process.env.KIMI_API_KEY?.trim();

  const targets: ProviderTarget[] = geminiKeys.map((apiKey) => ({ provider: 'gemini', apiKey }));

  const requestHasImage = Boolean(request.imageConfig);
  if (!requestHasImage && kimiKey) {
    targets.push({ provider: 'kimi', apiKey: kimiKey });
  }

  if (targets.length <= 1) return targets;

  const offset = roundRobinCounter % targets.length;
  roundRobinCounter += 1;

  return [...targets.slice(offset), ...targets.slice(0, offset)];
}

function extractTextFromGeminiRequest(request: GeminiRequestBody): string {
  const rawContents = request.contents as any;
  const contentList = Array.isArray(rawContents) ? rawContents : [rawContents];

  const text = contentList
    .flatMap((item: any) => {
      if (!item) return [];
      if (typeof item === 'string') return [item];
      if (Array.isArray(item.parts)) return item.parts.map((part: any) => part?.text).filter(Boolean);
      return [];
    })
    .join('\n')
    .trim();

  return text;
}

function toKimiMessages(request: GeminiRequestBody) {
  const systemText = request.systemInstruction?.parts?.map((part) => part.text).join('\n').trim();
  const userText = extractTextFromGeminiRequest(request);

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemText) messages.push({ role: 'system', content: systemText });
  messages.push({ role: 'user', content: userText || 'Continue.' });

  return messages;
}

function toGeminiLikeTextResponse(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }]
        }
      }
    ]
  };
}

async function callGeminiWithKey(apiKey: string, request: GeminiRequestBody, modelCandidates: string[]) {
  let lastError: unknown = null;

  for (const model of modelCandidates) {
    for (const baseUrl of GEMINI_API_BASES) {
      try {
        const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: timeoutSignal()
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Gemini request failed (${response.status}) on ${baseUrl} using ${model}: ${message}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini request failed for all model/endpoint fallbacks.');
}

async function callKimi(apiKey: string, request: GeminiRequestBody) {
  const response = await fetch(KIMI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages: toKimiMessages(request),
      temperature: 0.7
    }),
    signal: timeoutSignal()
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Kimi request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('Kimi response did not include text output.');
  }

  return toGeminiLikeTextResponse(text);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as GeminiProxyBody;
    if (!body?.request || !Array.isArray(body?.modelCandidates) || body.modelCandidates.length === 0) {
      return res.status(400).json({ error: 'Invalid payload.' });
    }

    const targets = listProviderTargets(body.request);
    if (targets.length === 0) {
      return res.status(500).json({ error: 'No AI provider keys are configured (Gemini or Kimi).' });
    }

    let lastError: unknown = null;

    for (const target of targets) {
      try {
        if (target.provider === 'gemini') {
          const data = await callGeminiWithKey(target.apiKey, body.request, body.modelCandidates);
          return res.status(200).json(data);
        }

        const data = await callKimi(target.apiKey, body.request);
        return res.status(200).json(data);
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Provider rotation exhausted.';
    return res.status(502).json({ error: message });
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || 'Gemini proxy request failed.' });
  }
}
