/**
 * Research Service - Multi-Provider Round Robin API Cycling
 * 
 * This service implements a robust round-robin rotation system for AI API providers.
 * Key features:
 * - Cycles through all available providers with valid API keys
 * - Supports multiple API keys per provider for load balancing
 * - Automatic fallback on provider failure
 * - Model-specific configurations and handling
 * - Rate limit awareness and retry logic
 * - Comprehensive logging for debugging and monitoring
 * 
 * @version 1.1.0
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
  rateLimit: {
    requestsPerMinute: number;
    cooldownMs: number;
  };
}

export interface ModelConfig {
  id: string;
  maxTokens: number;
  temperature: number;
  supportsJson: boolean;
  timeout: number;
  retryCount: number;
}

// ============================================================================
// Model-Specific Configurations
// ============================================================================

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini Models
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    timeout: 30000,
    retryCount: 2
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    timeout: 30000,
    retryCount: 2
  },
  
  // Zhipu AI Models
  "glm-4-flash": {
    id: "glm-4-flash",
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    timeout: 25000,
    retryCount: 2
  },
  "glm-4": {
    id: "glm-4",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    timeout: 45000,
    retryCount: 1
  },
  "glm-3-turbo": {
    id: "glm-3-turbo",
    maxTokens: 4096,
    temperature: 0.5,
    supportsJson: false,
    timeout: 30000,
    retryCount: 2
  },
  
  // AI/ML API Models
  "gpt-4o": {
    id: "gpt-4o",
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    timeout: 30000,
    retryCount: 2
  },
  
  // Moonshot Kimi Models
  "moonshot-v1-8k": {
    id: "moonshot-v1-8k",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    timeout: 30000,
    retryCount: 2
  }
};

function getModelConfig(modelId: string): ModelConfig {
  return MODEL_CONFIGS[modelId] || {
    id: modelId,
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    timeout: 30000,
    retryCount: 2
  };
}

// ============================================================================
// Round Robin State Manager
// ============================================================================

class RoundRobinState {
  private providerIndex: number = 0;
  private keyIndices: Map<string, number> = new Map();
  private lastRotationTime: number = Date.now();
  private rotationCount: number = 0;
  private providerStats: Map<string, { success: number; failure: number; lastError?: string }> = new Map();
  private cooldownUntil: Map<string, number> = new Map();

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
   * Get next API key index for a provider
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
    stats.lastError = undefined;
    this.providerStats.set(providerId, stats);
    
    // Clear any cooldown on success
    this.cooldownUntil.delete(providerId);
  }

  /**
   * Record failed API call
   */
  recordFailure(providerId: string, error?: string): void {
    const stats = this.providerStats.get(providerId) || { success: 0, failure: 0 };
    stats.failure++;
    stats.lastError = error;
    this.providerStats.set(providerId, stats);
  }

  /**
   * Set cooldown for a provider (after rate limit errors)
   */
  setCooldown(providerId: string, durationMs: number): void {
    this.cooldownUntil.set(providerId, Date.now() + durationMs);
    console.log(`[Research Service] ⏳ Provider ${providerId} in cooldown for ${durationMs}ms`);
  }

  /**
   * Check if provider is in cooldown
   */
  isInCooldown(providerId: string): boolean {
    const cooldownEnd = this.cooldownUntil.get(providerId);
    if (!cooldownEnd) return false;
    
    if (Date.now() < cooldownEnd) {
      return true;
    }
    
    this.cooldownUntil.delete(providerId);
    return false;
  }

  /**
   * Get rotation statistics
   */
  getStats(): {
    totalRotations: number;
    lastRotationTime: number;
    providerStats: Map<string, { success: number; failure: number; lastError?: string }>;
  } {
    return {
      totalRotations: this.rotationCount,
      lastRotationTime: this.lastRotationTime,
      providerStats: this.providerStats
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.providerIndex = 0;
    this.keyIndices.clear();
    this.rotationCount = 0;
    this.lastRotationTime = Date.now();
    this.providerStats.clear();
    this.cooldownUntil.clear();
  }
}

// Global round-robin state instance
const roundRobinState = new RoundRobinState();

// ============================================================================
// Provider Configurations
// ============================================================================

const createProviderConfigs = (): ProviderConfig[] => [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    endpoint: 'gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    rateLimit: { requestsPerMinute: 60, cooldownMs: 60000 },
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
    rateLimit: { requestsPerMinute: 30, cooldownMs: 120000 },
    getApiKeys: () => {
      const keys = process.env.ZAI_API_KEY;
      if (!keys || keys.startsWith('http') || keys.includes('console')) return [];
      return keys.split(',').map(k => k.trim()).filter(k => k.length > 10);
    }
  },
  {
    id: 'ML',
    name: 'AI/ML API',
    endpoint: 'https://api.aimlapi.com/chat/completions',
    models: ['gpt-4o'],
    rateLimit: { requestsPerMinute: 60, cooldownMs: 60000 },
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
    rateLimit: { requestsPerMinute: 30, cooldownMs: 120000 },
    getApiKeys: () => {
      const keys = process.env.KIMI_API_KEY;
      if (!keys || keys.startsWith('http')) return [];
      return keys.split(',').map(k => k.trim()).filter(k => k.length > 10);
    }
  }
];

/**
 * Get available providers (those with at least one valid API key and not in cooldown)
 */
function getAvailableProviders(): { config: ProviderConfig; keyCount: number }[] {
  const configs = createProviderConfigs();
  return configs
    .map(config => ({
      config,
      keyCount: config.getApiKeys().length
    }))
    .filter(provider => 
      provider.keyCount > 0 && 
      !roundRobinState.isInCooldown(provider.config.id)
    );
}

// ============================================================================
// Logging Utilities
// ============================================================================

const LOG = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Research] ℹ️ ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [Research] ⚠️ ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [Research] ❌ ${message}`, error?.message || error);
  },
  success: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Research] ✅ ${message}`, data ? JSON.stringify(data) : '');
  }
};

// ============================================================================
// Main Research Function
// ============================================================================

/**
 * Perform research using Round Robin API cycling
 */
export async function performResearch(query: string): Promise<ResearchResult[]> {
  let availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    LOG.error('No providers with valid API keys available');
    throw new Error('No API providers configured. Please set at least one API key.');
  }

  // Get next provider using round-robin
  const providerIndex = roundRobinState.getNextProviderIndex(availableProviders.length);
  const { config: provider, keyCount } = availableProviders[providerIndex];
  
  // Get API key using round-robin
  const apiKeys = provider.getApiKeys();
  const keyIndex = roundRobinState.getNextKeyIndex(provider.id, keyCount);
  const apiKey = apiKeys[keyIndex];

  LOG.info(`Round Robin Rotation #${roundRobinState.getStats().totalRotations}`);
  LOG.info(`Selected Provider: ${provider.name} (Key ${keyIndex + 1}/${keyCount})`);
  LOG.info(`Query: "${query}"`);

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
    LOG.success(`${provider.name} returned ${results.length} results`);
    return results;

  } catch (error: any) {
    roundRobinState.recordFailure(provider.id, error.message);
    LOG.error(`Error with ${provider.name}`, error);

    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      LOG.warn(`Rate limit hit for ${provider.name}, setting cooldown`);
      roundRobinState.setCooldown(provider.id, provider.rateLimit.cooldownMs);
    }

    // Fallback: Try remaining providers
    return await tryFallbackProviders(query, availableProviders, providerIndex);
  }
}

/**
 * Try fallback providers in order
 */
async function tryFallbackProviders(
  query: string,
  availableProviders: { config: ProviderConfig; keyCount: number }[],
  excludeIndex: number
): Promise<ResearchResult[]> {
  const fallbackProviders = availableProviders.filter((_, idx) => idx !== excludeIndex);
  
  for (const fallback of fallbackProviders) {
    // Skip if in cooldown
    if (roundRobinState.isInCooldown(fallback.config.id)) {
      continue;
    }
    
    LOG.warn(`Trying fallback provider: ${fallback.config.name}`);
    
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
      LOG.success(`Fallback ${fallback.config.name} succeeded: ${results.length} results`);
      return results;

    } catch (fallbackError: any) {
      roundRobinState.recordFailure(fallback.config.id, fallbackError.message);
      LOG.error(`Fallback ${fallback.config.name} failed`, fallbackError);

      // Handle rate limiting for fallback
      if (fallbackError.message?.includes('429') || fallbackError.message?.includes('rate limit')) {
        roundRobinState.setCooldown(fallback.config.id, fallback.config.rateLimit.cooldownMs);
      }
    }
  }

  LOG.error('All providers exhausted. No results available.');
  return [];
}

// ============================================================================
// Gemini Research
// ============================================================================

async function researchWithGemini(query: string, apiKey: string): Promise<ResearchResult[]> {
  if (!apiKey) {
    throw new Error("Gemini API Key missing");
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  
  for (const model of models) {
    const modelConfig = getModelConfig(model);
    LOG.info(`Requesting Gemini (${model})`);
    
    // Retry logic
    for (let attempt = 0; attempt <= modelConfig.retryCount; attempt++) {
      try {
        const response = await fetch('/api/proxy-gemini-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, query, apiKey })
        });

        if (!response.ok) {
          const errText = await response.text();
          
          // Rate limit handling
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || '60';
            throw new Error(`Rate limited. Retry after ${retryAfter}s`);
          }
          
          // Model not available, try next model
          if (response.status === 404) {
            LOG.warn(`Gemini model ${model} not found, trying next`);
            break;
          }
          
          throw new Error(`Gemini proxy error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            title: item.title || 'Untitled Research',
            summary: item.summary || 'No summary provided.',
            source: `Google Search via Gemini (${model})`
          }));
        }
        
        return [];
        
      } catch (e: any) {
        LOG.warn(`Gemini (${model}) attempt ${attempt + 1} failed: ${e.message}`);
        
        if (attempt < modelConfig.retryCount) {
          await sleep(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }
  }

  throw new Error("Research failed across all Gemini models. Check API key and network status.");
}

// ============================================================================
// OpenAI-Compatible Research
// ============================================================================

async function researchWithOpenAICompatible(
  query: string,
  endpoint: string,
  apiKey: string,
  models: string[],
  providerName: string
): Promise<ResearchResult[]> {
  // Validate key
  if (!apiKey || apiKey.startsWith('http') || apiKey.includes('console')) {
    throw new Error(`${providerName} API Key invalid`);
  }

  for (const model of models) {
    const modelConfig = getModelConfig(model);
    LOG.info(`Requesting ${providerName} (${model}) via Server Proxy`);

    // Retry logic
    for (let attempt = 0; attempt <= modelConfig.retryCount; attempt++) {
      try {
        const response = await fetch('/api/proxy-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          LOG.error(`Proxy Error for ${providerName}: ${response.status}`);
          
          // Rate limit handling
          if (response.status === 429) {
            throw new Error(`Rate limited from ${providerName}`);
          }
          
          // Zhipu-specific error code for invalid model
          if (providerName === 'Zhipu AI' && errText.includes('1211')) {
            LOG.warn(`${providerName} model ${model} rejected. Trying next model...`);
            break; // Try next model
          }
          
          // Auth error - don't retry
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Invalid API key for ${providerName}`);
          }
          
          throw new Error(`${providerName} Proxy error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '[]';
        
        LOG.info(`Response from ${providerName} (via proxy) received.`);

        // Clean up potential markdown wrappers
        content = content.replace(/^```json\n?|```$/g, '').trim();

        try {
          const results = JSON.parse(content);
          if (!Array.isArray(results)) {
            LOG.warn(`${providerName} did not return an array.`);
            return [];
          }
          return results.map((item: any) => ({
            title: item.title || 'Untitled Research',
            summary: item.summary || 'No summary provided.',
            source: providerName
          }));
        } catch (parseError) {
          LOG.error(`Failed to parse ${providerName} JSON response`);
          return [];
        }
        
      } catch (e: any) {
        LOG.warn(`${providerName} (${model}) attempt ${attempt + 1} failed: ${e.message}`);
        
        if (attempt < modelConfig.retryCount) {
          await sleep(1000 * (attempt + 1));
        }
      }
    }
  }

  throw new Error(`${providerName} failed with all configured models.`);
}

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Exported API Functions
// ============================================================================

/**
 * Check API key status for a provider
 */
export async function checkKeyStatus(providerId: string): Promise<{ status: 'ok' | 'error'; message: string }> {
  const configs = createProviderConfigs();
  const config = configs.find(c => c.id === providerId);
  
  if (!config) {
    return { status: 'error', message: 'Unknown provider' };
  }

  const keys = config.getApiKeys();
  if (keys.length === 0) {
    return { status: 'error', message: 'No valid API keys configured' };
  }

  // Check if in cooldown
  if (roundRobinState.isInCooldown(providerId)) {
    return { status: 'error', message: 'Provider is in cooldown (rate limited)' };
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
  providerStats: Array<{ providerId: string; success: number; failure: number; lastError?: string }>;
  availableProviders: Array<{ id: string; name: string; keyCount: number; inCooldown: boolean }>;
} {
  const stats = roundRobinState.getStats();
  const configs = createProviderConfigs();
  
  const providerStatsArray = Array.from(stats.providerStats.entries()).map(([id, s]) => ({
    providerId: id,
    success: s.success,
    failure: s.failure,
    lastError: s.lastError
  }));

  return {
    totalRotations: stats.totalRotations,
    lastRotationTime: stats.lastRotationTime,
    providerStats: providerStatsArray,
    availableProviders: configs.map(config => {
      const keys = config.getApiKeys();
      return {
        id: config.id,
        name: config.name,
        keyCount: keys.length,
        inCooldown: roundRobinState.isInCooldown(config.id)
      };
    })
  };
}

/**
 * Reset Round Robin state
 */
export function resetRoundRobinState(): void {
  roundRobinState.reset();
  LOG.info('Round Robin state reset');
}

/**
 * Get list of all configured providers with their status
 */
export function getAllProvidersStatus(): Array<{
  id: string;
  name: string;
  hasKeys: boolean;
  keyCount: number;
  inCooldown: boolean;
  models: string[];
}> {
  const configs = createProviderConfigs();
  return configs.map(config => {
    const keys = config.getApiKeys();
    return {
      id: config.id,
      name: config.name,
      hasKeys: keys.length > 0,
      keyCount: keys.length,
      inCooldown: roundRobinState.isInCooldown(config.id),
      models: config.models
    };
  });
}

/**
 * Get model configurations
 */
export function getModelConfigs(): Record<string, ModelConfig> {
  return { ...MODEL_CONFIGS };
}
