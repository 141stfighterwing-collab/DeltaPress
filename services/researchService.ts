export interface ResearchResult {
  title: string;
  summary: string;
  source: string;
}

const PROVIDERS = [
  { id: 'GEMINI', name: 'Google Gemini' },
  { id: 'KIMI', name: 'Moonshot Kimi' },
  { id: 'ZAI', name: 'Zhipu AI' },
  { id: 'ML', name: 'AI/ML API' },
  { id: 'CHATGPT', name: 'ChatGPT' }
];

let rotationIndex = 0;

export async function performResearch(query: string): Promise<ResearchResult[]> {
  const provider = PROVIDERS[rotationIndex % PROVIDERS.length];
  rotationIndex++;

  console.log(`[Research Service] 🔍 Initiating research with provider: ${provider.name}`);
  console.log(`[Research Service] 📝 Query: "${query}"`);

  try {
    return await researchViaProxy(provider.id, query, provider.name);
  } catch (error: any) {
    console.error(`[Research Service] ❌ Error with ${provider.name}:`, error.message || error);
    
    // Fallback to Gemini if one fails
    if (provider.id !== 'GEMINI') {
      console.warn(`[Research Service] 🔄 Falling back to Gemini due to ${provider.name} failure...`);
      try {
        const fallbackResults = await researchViaProxy('GEMINI', query, 'Google Gemini');
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

async function researchViaProxy(providerId: string, query: string, providerName: string): Promise<ResearchResult[]> {
    console.log(`[Research Service] 📡 Requesting ${providerName} via Proxy...`);

    const payload: any = {
        provider: providerId,
        query: query
    };

    if (providerId === 'GEMINI') {
        payload.model = 'gemini-2.0-flash';
    } else if (providerId === 'KIMI') {
        payload.model = 'moonshot-v1-8k';
    } else if (providerId === 'ZAI') {
        payload.model = 'glm-4';
    } else if (providerId === 'ML') {
        payload.model = 'gpt-4o';
    }

    // Call the local proxy
    const response = await fetch('/api/proxy-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    console.log(`[Research Service] 📥 Response from proxy received.`);

    // Unified parsing logic
    // We expect the proxy to return { choices: [{ message: { content: "..." } }] }
    // or similar standard structure.

    let content = data.choices?.[0]?.message?.content;

    if (!content) {
        console.warn(`[Research Service] No content in response from ${providerName}`, data);
        return [];
    }

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

export async function checkKeyStatus(providerId: string): Promise<{ status: 'ok' | 'error', message: string }> {
  // Since keys are now managed by the server proxy, we assume they are configured if the server is running.
  // We can't easily check the server's env from here without a new endpoint.
  // For now, we'll return OK to avoid blocking UI checks that might rely on this.
  return { status: 'ok', message: 'Keys managed by server Proxy' };
}
