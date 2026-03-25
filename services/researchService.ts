
/**
 * Research Service - Multi-Provider Round Robin API Cycling
 * 
 * This service implements a robust round-robin rotation system for AI API providers.
 * Key features:
 * - Cycles through all available providers with valid API keys
 * - Supports multiple API keys per provider for load balancing
 * - Automatic fallback on provider failure
 * - Comprehensive logging for debugging and monitoring
 */

export interface ResearchResult {
  title: string;
  summary: string;
  source: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  endpoint: string;
  models: string[];
  getApiKeys: () => string[];
}

// Round Robin State Manager
class RoundRobinState {
  private providerIndex: number = 0;
  private keyIndices: Map<string, number> = new Map();
  private lastRotationTime: number = Date.now();
  private rotationCount: number = 0;
  private providerStats: Map<string, { success: number; failure: number }> = new Map();

  /**
   * Get next provider index using round-robin algorithm
   */
  getNextProviderIndex(providerCount: number): number {
    if (providerCount === 0) return 0;
    this.providerIndex = (this.providerIndex + 1) % providerCount;
    this.rotationCount++;
    this.lastRotationTime = Date.now();
    return this.providerIndex;
  }

  /**
   * Get current provider index (without advancing)
   */
  getCurrentProviderIndex(): number {
    return this.providerIndex;
  }

  /**
   * Get next API key index for a provider (supports multiple keys per provider)
   */
  getNextKeyIndex(providerId: string, keyCount: number): number {
    if (keyCount === 0) return 0;
    const currentIndex = this.keyIndices.get(providerId) || 0;
    const nextIndex = (currentIndex + 1) % keyCount;
    this.keyIndices.set(providerId, nextIndex);
    return currentIndex;
  }

  /**
   * Record successful API call
   */
  recordSuccess(providerId: string): void {
    const stats = this.providerStats.get(providerId) || { success: 0, failure: 0 };
    stats.success++;
    this.providerStats.set(providerId, stats);
  }

  /**
   * Record failed API call
   */
  recordFailure(providerId: string): void {
    const stats = this.providerStats.get(providerId) || { success: 0, failure: 0 };
    stats.failure++;
    this.providerStats.set(providerId, stats);
  }

  /**
   * Get rotation statistics
   */
  getStats(): {
    totalRotations: number;
    lastRotationTime: number;
    providerStats: Map<string, { success: number; failure: number }>;
  } {
    return {
      totalRotations: this.rotationCount,
      lastRotationTime: this.lastRotationTime,
      providerStats: this.providerStats
    };
  }

  /**
   * Reset state (useful for testing)
   */
  reset(): void {
    this.providerIndex = 0;
    this.keyIndices.clear();
    this.rotationCount = 0;
    this.lastRotationTime = Date.now();
    this.providerStats.clear();
  }
}

// Global round-robin state instance
const roundRobinState = new RoundRobinState();

/**
 * Provider configurations with support for multiple API keys
 */
const createProviderConfigs = (): ProviderConfig[] => [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    endpoint: 'gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    getApiKeys: () => {
      const key = process.env.GEMINI_API_KEY;
      return key && !key.startsWith('http') ? [key] : [];
    }
  },
  {
    id: 'ZAI',
    name: 'Zhipu AI',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4-flash', 'glm-4', 'glm-3-turbo'],
    getApiKeys: () => {
      const keys = process.env.ZAI_API_KEY;
      if (!keys || keys.startsWith('http') || keys.includes('console')) return [];
      // Support comma-separated multiple keys
      return keys.split(',').map(k => k.trim()).filter(k => k.length > 10);
    }
  },
  {
    id: 'ML',
    name: 'AI/ML API',
    endpoint: 'https://api.aimlapi.com/chat/completions',
    models: ['gpt-4o'],
    getApiKeys: () => {
      const keys = process.env.ML_API_KEY;
      if (!keys || keys.startsWith('http')) return [];
      return keys.split(',').map(k => k.trim()).filter(k => k.length > 10);
    }
  },
  {
    id: 'KIMI',
    name: 'Moonshot Kimi',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['moonshot-v1-8k'],
    getApiKeys: () => {
      const keys = process.env.KIMI_API_KEY;
      if (!keys || keys.startsWith('http')) return [];
      return keys.split(',').map(k => k.trim()).filter(k => k.length > 10);
    }
  }
];

/**
 * Get available providers (those with at least one valid API key)
 */
function getAvailableProviders(): { config: ProviderConfig; keyCount: number }[] {
  const configs = createProviderConfigs();
  return configs
    .map(config => ({
      config,
      keyCount: config.getApiKeys().length
    }))
    .filter(provider => provider.keyCount > 0);
}

/**
 * Perform research using Round Robin API cycling
 * This function cycles through providers and their API keys in a fair distribution
 */
export async function performResearch(query: string): Promise<ResearchResult[]> {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    console.error('[Research Service] ❌ No providers with valid API keys available');
    throw new Error('No API providers configured. Please set at least one API key.');
  }

  // Get next provider using round-robin
  const providerIndex = roundRobinState.getNextProviderIndex(availableProviders.length);
  const { config: provider, keyCount } = availableProviders[providerIndex];
  
  // Get API key using round-robin (supports multiple keys per provider)
  const apiKeys = provider.getApiKeys();
  const keyIndex = roundRobinState.getNextKeyIndex(provider.id, keyCount);
  const apiKey = apiKeys[keyIndex];

  console.log(`[Research Service] 🔄 Round Robin Rotation #${roundRobinState.getStats().totalRotations}`);
  console.log(`[Research Service] 🎯 Selected Provider: ${provider.name} (Key ${keyIndex + 1}/${keyCount})`);
  console.log(`[Research Service] 📝 Query: "${query}"`);
  console.log(`[Research Service] 📊 Available Providers: ${availableProviders.map(p => `${p.config.name}(${p.keyCount} keys)`).join(', ')}`);

  try {
    let results: ResearchResult[] = [];

    if (provider.id === 'GEMINI') {
      results = await researchWithGemini(query, apiKey);
    } else {
      results = await researchWithOpenAICompatible(
        query,
        provider.endpoint,
        apiKey,
        provider.models,
        provider.name
      );
    }

    roundRobinState.recordSuccess(provider.id);
    console.log(`[Research Service] ✅ ${provider.name} returned ${results.length} results.`);
    return results;

  } catch (error: any) {
    roundRobinState.recordFailure(provider.id);
    console.error(`[Research Service] ❌ Error with ${provider.name}:`, error.message || error);

    // Fallback: Try remaining providers in order
    const fallbackProviders = availableProviders.filter((_, idx) => idx !== providerIndex);
    
    for (const fallback of fallbackProviders) {
      console.warn(`[Research Service] 🔄 Trying fallback provider: ${fallback.config.name}...`);
      
      try {
        const fallbackKeys = fallback.config.getApiKeys();
        const fallbackKeyIndex = roundRobinState.getNextKeyIndex(fallback.config.id, fallback.keyCount);
        const fallbackKey = fallbackKeys[fallbackKeyIndex];

        let results: ResearchResult[] = [];
        if (fallback.config.id === 'GEMINI') {
          results = await researchWithGemini(query, fallbackKey);
        } else {
          results = await researchWithOpenAICompatible(
            query,
            fallback.config.endpoint,
            fallbackKey,
            fallback.config.models,
            fallback.config.name
          );
        }

        roundRobinState.recordSuccess(fallback.config.id);
        console.log(`[Research Service] ✅ Fallback ${fallback.config.name} succeeded: ${results.length} results.`);
        return results;

      } catch (fallbackError: any) {
        roundRobinState.recordFailure(fallback.config.id);
        console.error(`[Research Service] ❌ Fallback ${fallback.config.name} failed:`, fallbackError.message);
      }
    }

    console.error('[Research Service] 💀 All providers exhausted. No results available.');
    return [];
  }
}

/**
 * Research using Google Gemini API
 */
async function researchWithGemini(query: string, apiKey: string): Promise<ResearchResult[]> {
  if (!apiKey) {
    throw new Error("Gemini API Key missing");
  }

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
    }
  }

  throw new Error("Research failed across all Gemini models. Check API key and network status.");
}

/**
 * Research using OpenAI-compatible API providers
 */
async function researchWithOpenAICompatible(
  query: string,
  endpoint: string,
  apiKey: string,
  models: string[],
  providerName: string
): Promise<ResearchResult[]> {
  if (!apiKey || apiKey.startsWith('http') || apiKey.includes('console')) {
    throw new Error(`${providerName} API Key invalid`);
  }

  for (const model of models) {
    console.log(`[Research Service] 📡 Requesting ${providerName} (${model}) via Server Proxy...`);

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
      
      if (providerName === 'Zhipu AI' && errText.includes('1211')) {
        console.warn(`[Research Service] ${providerName} model ${model} rejected. Trying next model...`);
        continue;
      }
      throw new Error(`${providerName} Proxy error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '[]';
    
    console.log(`[Research Service] 📥 Response from ${providerName} (via proxy) received.`);

    content = content.replace(/^```json\n?|```$/g, '').trim();

    try {
      const results = JSON.parse(content);
      if (!Array.isArray(results)) {
        console.warn(`[Research Service] ${providerName} did not return an array.`);
        return [];
      }
      return results.map((item: any) => ({
        title: item.title || 'Untitled Research',
        summary: item.summary || 'No summary provided.',
        source: providerName
      }));
    } catch (e: any) {
      console.error(`[Research Service] Failed to parse ${providerName} JSON response:`, e.message);
      return [];
    }
  }

  throw new Error(`${providerName} failed with all configured models.`);
}

/**
 * Check API key status for a provider
 */
export async function checkKeyStatus(providerId: string): Promise<{ status: 'ok' | 'error', message: string }> {
  const configs = createProviderConfigs();
  const config = configs.find(c => c.id === providerId);
  
  if (!config) {
    return { status: 'error', message: 'Unknown provider' };
  }

  const keys = config.getApiKeys();
  if (keys.length === 0) {
    return { status: 'error', message: 'No valid API keys configured' };
  }

  return { 
    status: 'ok', 
    message: `${keys.length} API key(s) configured` 
  };
}

/**
 * Get Round Robin statistics for monitoring
 */
export function getRoundRobinStats(): {
  totalRotations: number;
  lastRotationTime: number;
  providerStats: Array<{ providerId: string; success: number; failure: number }>;
  availableProviders: Array<{ id: string; name: string; keyCount: number }>;
} {
  const stats = roundRobinState.getStats();
  const available = getAvailableProviders();
  
  const providerStatsArray = Array.from(stats.providerStats.entries()).map(([id, s]) => ({
    providerId: id,
    ...s
  }));

  return {
    totalRotations: stats.totalRotations,
    lastRotationTime: stats.lastRotationTime,
    providerStats: providerStatsArray,
    availableProviders: available.map(p => ({
      id: p.config.id,
      name: p.config.name,
      keyCount: p.keyCount
    }))
  };
}

/**
 * Reset Round Robin state (useful for testing)
 */
export function resetRoundRobinState(): void {
  roundRobinState.reset();
  console.log('[Research Service] 🔄 Round Robin state reset');
}

/**
 * Get list of all configured providers with their status
 */
export function getAllProvidersStatus(): Array<{
  id: string;
  name: string;
  hasKeys: boolean;
  keyCount: number;
}> {
  const configs = createProviderConfigs();
  return configs.map(config => {
    const keys = config.getApiKeys();
    return {
      id: config.id,
      name: config.name,
      hasKeys: keys.length > 0,
      keyCount: keys.length
    };
  });
}
