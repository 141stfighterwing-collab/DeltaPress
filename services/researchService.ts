
export interface ResearchResult {
  title: string;
  summary: string;
  source: string;
}

const PROVIDERS = [
  { id: 'GEMINI', name: 'Google Gemini' },
  { id: 'ZAI', name: 'Zhipu AI' },
  { id: 'ML', name: 'AI/ML API' },
  { id: 'KIMI', name: 'Moonshot Kimi' }
];

let rotationIndex = 0;

export async function performResearch(query: string): Promise<ResearchResult[]> {
  const provider = PROVIDERS[rotationIndex % PROVIDERS.length];
  rotationIndex++;

  console.log(`[Research Service] 🔍 Initiating research with provider: ${provider.name}`);
  console.log(`[Research Service] 📝 Query: "${query}"`);

  try {
    let results: ResearchResult[] = [];
    switch (provider.id) {
      case 'GEMINI':
        results = await researchWithGemini(query);
        break;
      case 'KIMI':
        results = await researchWithOpenAICompatible(
          query, 
          'https://api.moonshot.cn/v1/chat/completions', 
          process.env.KIMI_API_KEY || '', 
          ['moonshot-v1-8k'],
          'Moonshot Kimi'
        );
        break;
      case 'ZAI':
        results = await researchWithOpenAICompatible(
          query, 
          'https://open.bigmodel.cn/api/paas/v4/chat/completions', 
          process.env.ZAI_API_KEY || '', 
          ['glm-4-flash', 'glm-4', 'glm-3-turbo'],
          'Zhipu AI'
        );
        break;
      case 'ML':
        results = await researchWithOpenAICompatible(
          query, 
          'https://api.aimlapi.com/chat/completions', 
          process.env.ML_API_KEY || '', 
          ['gpt-4o'],
          'AI/ML API'
        );
        break;
      default:
        results = await researchWithGemini(query);
    }
    
    console.log(`[Research Service] ✅ ${provider.name} returned ${results.length} results.`);
    return results;
  } catch (error: any) {
    console.error(`[Research Service] ❌ Error with ${provider.name}:`, error.message || error);
    
    // Fallback to Gemini if one fails
    if (provider.id !== 'GEMINI') {
      console.warn(`[Research Service] 🔄 Falling back to Gemini due to ${provider.name} failure...`);
      try {
        const fallbackResults = await researchWithGemini(query);
        console.log(`[Research Service] ✅ Gemini fallback successful: ${fallbackResults.length} results.`);
        return fallbackResults;
      } catch (geminiError: any) {
        console.error(`[Research Service] 💀 Gemini fallback also failed:`, geminiError.message || geminiError);
        return [];
      }
    }
    return [];
  }
}

async function researchWithGemini(query: string): Promise<ResearchResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Research Service] Gemini API Key missing.");
    throw new Error("Gemini API Key missing");
  }

  // Use server proxy to avoid browser-side protocol/CORS limitations and stabilize search grounding.
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  
  for (const model of models) {
    console.log(`[Research Service] 📡 Requesting Gemini (${model})...`);
    try {
      const response = await fetch('/api/proxy-gemini-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          query,
          apiKey
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini proxy error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      return data.map((item: any) => ({
        title: item.title || 'Untitled Research',
        summary: item.summary || 'No summary provided.',
        source: `Google Search via Gemini (${model})`
      }));
    } catch (e: any) {
      console.warn(`[Research Service] Gemini (${model}) failed:`, e.message);
      // Continue to next model
    }
  }

  // Final Fallback: If all AI attempts failed, we throw an error instead of using mock data
  console.error("[Research Service] 💀 All research providers failed. No data available.");
  throw new Error("Research failed across all providers. Check API keys and network status.");
}

async function researchWithOpenAICompatible(
  query: string, 
  endpoint: string, 
  apiKey: string, 
  models: string[],
  providerName: string
): Promise<ResearchResult[]> {
  // Validate key - skip if it looks like a URL or placeholder
  if (!apiKey || apiKey.startsWith('http') || apiKey.includes('console')) {
    console.warn(`[Research Service] ${providerName} API Key is invalid or a placeholder. Skipping.`);
    throw new Error(`${providerName} API Key invalid`);
  }

  for (const model of models) {
    console.log(`[Research Service] 📡 Requesting ${providerName} (${model}) via Server Proxy...`);

    // Use the server-side proxy to avoid CORS and browser-level protocol errors
    const response = await fetch('/api/proxy-research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint,
        apiKey,
        model,
        query,
        providerName
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Research Service] Proxy Error for ${providerName}: ${response.status} ${errText}`);
      // Zhipu returns code 1211 when a model name is invalid. Try the next model automatically.
      if (providerName === 'Zhipu AI' && errText.includes('1211')) {
        console.warn(`[Research Service] ${providerName} model ${model} rejected. Trying next model...`);
        continue;
      }
      throw new Error(`${providerName} Proxy error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '[]';
    
    console.log(`[Research Service] 📥 Response from ${providerName} (via proxy) received.`);

    // Clean up potential markdown wrappers
    content = content.replace(/^```json\n?|```$/g, '').trim();

    try {
      const results = JSON.parse(content);
      if (!Array.isArray(results)) {
        console.warn(`[Research Service] ${providerName} did not return an array. Content:`, content);
        return [];
      }
      return results.map((item: any) => ({
        title: item.title || 'Untitled Research',
        summary: item.summary || 'No summary provided.',
        source: providerName
      }));
    } catch (e: any) {
      console.error(`[Research Service] Failed to parse ${providerName} JSON response:`, e.message);
      console.debug(`[Research Service] Content that failed parsing:`, content);
      return [];
    }
  }

  throw new Error(`${providerName} failed with all configured models.`);
}

export async function checkKeyStatus(providerId: string): Promise<{ status: 'ok' | 'error', message: string }> {
  const keyMap: Record<string, string | undefined> = {
    'GEMINI': process.env.GEMINI_API_KEY,
    'KIMI': process.env.KIMI_API_KEY,
    'ZAI': process.env.ZAI_API_KEY,
    'ML': process.env.ML_API_KEY
  };

  const key = keyMap[providerId];
  if (!key) {
    return { status: 'error', message: 'Key missing in environment' };
  }

  // Basic format check
  if (key.length < 10) {
    return { status: 'error', message: 'Key appears invalid (too short)' };
  }

  return { status: 'ok', message: 'Key present and formatted' };
}
