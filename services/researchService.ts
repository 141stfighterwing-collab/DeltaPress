
import { GoogleGenAI } from "@google/genai";

export interface ResearchResult {
  title: string;
  summary: string;
  source: string;
}

const PROVIDERS = [
  { id: 'GEMINI', name: 'Google Gemini' },
  { id: 'KIMI', name: 'Moonshot Kimi' },
  { id: 'ZAI', name: 'Zhipu AI' },
  { id: 'ML', name: 'AI/ML API' }
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
          'moonshot-v1-8k',
          'Moonshot Kimi'
        );
        break;
      case 'ZAI':
        results = await researchWithOpenAICompatible(
          query, 
          'https://open.bigmodel.cn/api/paas/v4/chat/completions', 
          process.env.ZAI_API_KEY || '', 
          'glm-4',
          'Zhipu AI'
        );
        break;
      case 'ML':
        results = await researchWithOpenAICompatible(
          query, 
          'https://api.aimlapi.com/chat/completions', 
          process.env.ML_API_KEY || '', 
          'gpt-4o',
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

  console.log("[Research Service] 📡 Requesting Gemini (gemini-3-flash-preview) with Google Search...");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Fetch and summarize 5 major news topics or articles regarding: "${query}". Return as a JSON array of objects with "title" and "summary" fields.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || '[]');
    return data.map((item: any) => ({
      title: item.title || 'Untitled Research',
      summary: item.summary || 'No summary provided.',
      source: 'Google Search via Gemini'
    }));
  } catch (e: any) {
    console.error("[Research Service] Gemini Search failed, attempting basic generation fallback...", e.message);
    
    // Fallback to basic generation without tools if search fails (common in some restricted environments)
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide a summary of 5 current news topics regarding: "${query}". Return as a JSON array of objects with "title" and "summary" fields.`,
        config: {
          responseMimeType: "application/json"
        }
      });
      const data = JSON.parse(response.text || '[]');
      return data.map((item: any) => ({
        title: item.title || 'Untitled Research',
        summary: item.summary || 'No summary provided.',
        source: 'Gemini (Basic Fallback)'
      }));
    } catch (fallbackErr: any) {
      console.error("[Research Service] Gemini basic fallback also failed:", fallbackErr.message);
      throw fallbackErr;
    }
  }
}

async function researchWithOpenAICompatible(
  query: string, 
  endpoint: string, 
  apiKey: string, 
  model: string,
  providerName: string
): Promise<ResearchResult[]> {
  // Validate key - skip if it looks like a URL or placeholder
  if (!apiKey || apiKey.startsWith('http') || apiKey.includes('console')) {
    console.warn(`[Research Service] ${providerName} API Key is invalid or a placeholder. Skipping.`);
    throw new Error(`${providerName} API Key invalid`);
  }

  console.log(`[Research Service] 📡 Requesting ${providerName} (${model}) at ${endpoint}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'You are a research assistant. Provide a list of 5 current news topics or facts about the requested subject. Return ONLY a JSON array of objects with "title" and "summary" fields. No markdown wrappers.' 
        },
        { 
          role: 'user', 
          content: `Research: ${query}` 
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Research Service] ${providerName} HTTP Error ${response.status}: ${errText}`);
    throw new Error(`${providerName} API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '[]';
  
  console.log(`[Research Service] 📥 Raw response from ${providerName} received.`);

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
