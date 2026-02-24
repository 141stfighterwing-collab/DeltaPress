
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

  console.log(`[Research Service] Using provider: ${provider.name} for query: ${query}`);

  try {
    switch (provider.id) {
      case 'GEMINI':
        return await researchWithGemini(query);
      case 'KIMI':
        return await researchWithOpenAICompatible(
          query, 
          'https://api.moonshot.cn/v1/chat/completions', 
          process.env.KIMI_API_KEY || '', 
          'moonshot-v1-8k',
          'Moonshot Kimi'
        );
      case 'ZAI':
        return await researchWithOpenAICompatible(
          query, 
          'https://open.bigmodel.cn/api/paas/v4/chat/completions', 
          process.env.ZAI_API_KEY || '', 
          'glm-4',
          'Zhipu AI'
        );
      case 'ML':
        return await researchWithOpenAICompatible(
          query, 
          'https://api.aimlapi.com/chat/completions', 
          process.env.ML_API_KEY || '', 
          'gpt-4o',
          'AI/ML API'
        );
      default:
        return await researchWithGemini(query);
    }
  } catch (error) {
    console.error(`[Research Service] Error with ${provider.name}:`, error);
    // Fallback to Gemini if one fails
    if (provider.id !== 'GEMINI') {
      console.log(`[Research Service] Falling back to Gemini...`);
      return await researchWithGemini(query);
    }
    return [];
  }
}

async function researchWithGemini(query: string): Promise<ResearchResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Fetch and summarize 5 major news topics or articles regarding: "${query}". Return as a JSON array of objects with "title" and "summary" fields.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });

  try {
    const data = JSON.parse(response.text || '[]');
    return data.map((item: any) => ({
      ...item,
      source: 'Google Search via Gemini'
    }));
  } catch (e) {
    console.error("Failed to parse Gemini research response", e);
    return [];
  }
}

async function researchWithOpenAICompatible(
  query: string, 
  endpoint: string, 
  apiKey: string, 
  model: string,
  providerName: string
): Promise<ResearchResult[]> {
  if (!apiKey) throw new Error(`${providerName} API Key missing`);

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
    throw new Error(`${providerName} API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '[]';
  
  // Clean up potential markdown wrappers
  content = content.replace(/^```json\n?|```$/g, '').trim();

  try {
    const results = JSON.parse(content);
    return results.map((item: any) => ({
      ...item,
      source: providerName
    }));
  } catch (e) {
    console.error(`Failed to parse ${providerName} research response`, e);
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
