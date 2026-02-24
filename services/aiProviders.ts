/**
 * Multi-Provider AI Service with Round-Robin Load Balancing
 * 
 * Supported Providers: Claude, OpenAI, Gemini, Kimi (Moonshot)
 * Only uses providers that have API keys configured.
 */

// Provider configuration types
export type AIProvider = 'claude' | 'openai' | 'gemini' | 'kimi';

export interface AIProviderConfig {
  name: string;
  apiKeyEnv: string;
  baseUrl: string;
  models: string[];
  type: 'openai-compatible' | 'gemini' | 'claude';
}

export interface ResearchRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  useSearch?: boolean;
}

export interface ResearchResponse {
  content: string;
  provider: AIProvider;
  model: string;
  success: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider configurations - only these 4 providers are supported
const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  claude: {
    name: 'Anthropic Claude',
    apiKeyEnv: 'VITE_CLAUDE_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    type: 'claude'
  },
  openai: {
    name: 'OpenAI',
    apiKeyEnv: 'VITE_OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    type: 'openai-compatible'
  },
  gemini: {
    name: 'Google Gemini',
    apiKeyEnv: 'VITE_GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    type: 'gemini'
  },
  kimi: {
    name: 'Moonshot Kimi',
    apiKeyEnv: 'VITE_KIMI_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    type: 'openai-compatible'
  }
};

// Round-robin state - initialized dynamically based on available providers
let currentProviderIndex: number = 0;
let providerHealth: Record<AIProvider, { healthy: boolean; lastCheck: number; consecutiveFailures: number }> = {
  claude: { healthy: true, lastCheck: 0, consecutiveFailures: 0 },
  openai: { healthy: true, lastCheck: 0, consecutiveFailures: 0 },
  gemini: { healthy: true, lastCheck: 0, consecutiveFailures: 0 },
  kimi: { healthy: true, lastCheck: 0, consecutiveFailures: 0 }
};

const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_INTERVAL_MS = 60000; // 1 minute

/**
 * Get API key for a provider - ONLY returns key if explicitly configured
 */
function getApiKey(provider: AIProvider): string | null {
  const config = PROVIDER_CONFIGS[provider];
  
  // Only check for explicitly configured keys for this specific provider
  const envKeys = [
    import.meta.env[config.apiKeyEnv],
    // Also check alternate env names
    import.meta.env[`VITE_${provider.toUpperCase()}_KEY`],
    import.meta.env[`${provider.toUpperCase()}_API_KEY`]
  ];
  
  for (const key of envKeys) {
    if (key && typeof key === 'string' && key.trim().length > 0) {
      return key.trim();
    }
  }
  
  return null;
}

/**
 * Check if a provider is available (has API key configured)
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  return getApiKey(provider) !== null;
}

/**
 * Get list of available providers (only those with configured keys)
 */
export function getAvailableProviders(): AIProvider[] {
  return (Object.keys(PROVIDER_CONFIGS) as AIProvider[]).filter(isProviderAvailable);
}

/**
 * Update provider health status
 */
function updateProviderHealth(provider: AIProvider, success: boolean): void {
  const health = providerHealth[provider];
  if (health) {
    health.lastCheck = Date.now();
    
    if (success) {
      health.healthy = true;
      health.consecutiveFailures = 0;
    } else {
      health.consecutiveFailures++;
      if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        health.healthy = false;
      }
    }
  }
}

/**
 * Get next provider using round-robin with health awareness
 * Only selects from providers that have keys configured
 */
function getNextProvider(): AIProvider | null {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    console.error('No AI providers configured. Please set at least one API key:');
    console.error('  - VITE_CLAUDE_API_KEY');
    console.error('  - VITE_OPENAI_API_KEY');
    console.error('  - VITE_GEMINI_API_KEY');
    console.error('  - VITE_KIMI_API_KEY');
    return null;
  }
  
  // Filter healthy providers from available ones
  const healthyProviders = availableProviders.filter(p => {
    const health = providerHealth[p];
    if (!health) return true;
    if (health.healthy) return true;
    if (Date.now() - health.lastCheck > HEALTH_CHECK_INTERVAL_MS) {
      // Reset health check after interval to give provider another chance
      providerHealth[p].healthy = true;
      providerHealth[p].consecutiveFailures = 0;
      return true;
    }
    return false;
  });
  
  const providers = healthyProviders.length > 0 ? healthyProviders : availableProviders;
  
  // Round-robin selection
  const selectedProvider = providers[currentProviderIndex % providers.length];
  currentProviderIndex = (currentProviderIndex + 1) % providers.length;
  
  return selectedProvider;
}

/**
 * Make request to OpenAI-compatible API (OpenAI, Kimi)
 */
async function callOpenAICompatible(
  provider: AIProvider,
  request: ResearchRequest
): Promise<ResearchResponse> {
  const config = PROVIDER_CONFIGS[provider];
  const apiKey = getApiKey(provider);
  
  if (!apiKey) {
    return {
      content: '',
      provider,
      model: config.models[0],
      success: false,
      error: `API key not configured for ${config.name}. Set ${config.apiKeyEnv} in your environment.`
    };
  }
  
  const model = config.models[0];
  
  try {
    const messages: Array<{ role: string; content: string }> = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${config.name} API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    updateProviderHealth(provider, true);
    
    return {
      content,
      provider,
      model,
      success: true,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  } catch (error: any) {
    updateProviderHealth(provider, false);
    return {
      content: '',
      provider,
      model,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Make request to Claude API (Anthropic)
 */
async function callClaude(request: ResearchRequest): Promise<ResearchResponse> {
  const config = PROVIDER_CONFIGS.claude;
  const apiKey = getApiKey('claude');
  
  if (!apiKey) {
    return {
      content: '',
      provider: 'claude',
      model: config.models[0],
      success: false,
      error: `Claude API key not configured. Set VITE_CLAUDE_API_KEY in your environment.`
    };
  }
  
  const model = config.models[0];
  
  try {
    const body: any = {
      model,
      max_tokens: request.maxTokens || 4096,
      messages: [{
        role: 'user',
        content: request.prompt
      }]
    };
    
    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }
    
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    updateProviderHealth('claude', true);
    
    return {
      content,
      provider: 'claude',
      model,
      success: true,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  } catch (error: any) {
    updateProviderHealth('claude', false);
    return {
      content: '',
      provider: 'claude',
      model,
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Make request to Gemini API
 */
async function callGemini(request: ResearchRequest): Promise<ResearchResponse> {
  const config = PROVIDER_CONFIGS.gemini;
  const apiKey = getApiKey('gemini');
  
  if (!apiKey) {
    return {
      content: '',
      provider: 'gemini',
      model: config.models[0],
      success: false,
      error: 'Gemini API key not configured. Set VITE_GEMINI_API_KEY in your environment.'
    };
  }
  
  // Try each model and base URL
  const baseUrls = [
    'https://generativelanguage.googleapis.com/v1',
    'https://generativelanguage.googleapis.com/v1beta'
  ];
  
  for (const model of config.models) {
    for (const baseUrl of baseUrls) {
      try {
        const requestBody: any = {
          contents: [{
            role: 'user',
            parts: [{ text: request.prompt }]
          }]
        };
        
        if (request.systemPrompt) {
          requestBody.systemInstruction = {
            parts: [{ text: request.systemPrompt }]
          };
        }
        
        if (request.useSearch) {
          requestBody.tools = [{ googleSearch: {} }];
        }
        
        const response = await fetch(
          `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );
        
        if (!response.ok) {
          continue; // Try next model/URL
        }
        
        const data = await response.json();
        
        // Extract text from Gemini response
        const content = data.candidates?.[0]?.content?.parts
          ?.filter((part: any) => typeof part?.text === 'string')
          .map((part: any) => part.text)
          .join('') || '';
        
        updateProviderHealth('gemini', true);
        
        return {
          content,
          provider: 'gemini',
          model,
          success: true
        };
      } catch (error) {
        continue;
      }
    }
  }
  
  updateProviderHealth('gemini', false);
  return {
    content: '',
    provider: 'gemini',
    model: config.models[0],
    success: false,
    error: 'All Gemini models and endpoints failed'
  };
}

/**
 * Main research function using round-robin
 * Only uses providers that have API keys configured
 */
export async function research(request: ResearchRequest): Promise<ResearchResponse> {
  const provider = getNextProvider();
  
  if (!provider) {
    return {
      content: '',
      provider: 'gemini',
      model: '',
      success: false,
      error: 'No AI providers available. Configure at least one: VITE_CLAUDE_API_KEY, VITE_OPENAI_API_KEY, VITE_GEMINI_API_KEY, or VITE_KIMI_API_KEY'
    };
  }
  
  const config = PROVIDER_CONFIGS[provider];
  console.log(`[AI Round-Robin] Using provider: ${config.name}`);
  
  switch (config.type) {
    case 'claude':
      return callClaude(request);
    case 'gemini':
      return callGemini(request);
    default:
      return callOpenAICompatible(provider, request);
  }
}

/**
 * Research with fallback to all configured providers
 */
export async function researchWithFallback(request: ResearchRequest): Promise<ResearchResponse> {
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    return {
      content: '',
      provider: 'gemini',
      model: '',
      success: false,
      error: 'No AI providers available. Configure at least one API key.'
    };
  }
  
  // Try each provider in order
  for (const provider of availableProviders) {
    const config = PROVIDER_CONFIGS[provider];
    console.log(`[AI Fallback] Trying provider: ${config.name}`);
    
    let response: ResearchResponse;
    
    switch (config.type) {
      case 'claude':
        response = await callClaude(request);
        break;
      case 'gemini':
        response = await callGemini(request);
        break;
      default:
        response = await callOpenAICompatible(provider, request);
    }
    
    if (response.success) {
      return response;
    }
    
    console.warn(`[AI Fallback] Provider ${config.name} failed: ${response.error}`);
  }
  
  return {
    content: '',
    provider: availableProviders[0],
    model: '',
    success: false,
    error: 'All configured AI providers failed'
  };
}

/**
 * Journalist research function - optimized for news/article research
 */
export async function journalistResearch(params: {
  journalistName: string;
  category: string;
  niche: string;
  perspective: string;
  topic?: string;
  useCurrentEvents?: boolean;
}): Promise<ResearchResponse> {
  const { journalistName, category, niche, perspective, topic, useCurrentEvents } = params;
  
  const systemPrompt = `You are ${journalistName}, a professional journalist.
Expertise: ${category}.
Editorial Beat: ${niche}.
Political Stance: ${perspective}.
${useCurrentEvents ? 'CRITICAL: Use your knowledge to find and address the latest developments on this topic.' : ''}

Your response should be:
1. Well-researched and factual
2. Balanced but reflecting your stated perspective
3. Written in a professional journalistic style
4. Properly structured with clear sections`;

  const prompt = topic 
    ? `Research and provide comprehensive coverage on: ${topic}. Include key facts, different viewpoints, and potential implications.`
    : `Research and provide an in-depth analysis of current developments in: ${niche}. Include key facts, different viewpoints, and potential implications.`;

  return research({
    prompt,
    systemPrompt,
    maxTokens: 4096,
    temperature: 0.7,
    useSearch: useCurrentEvents
  });
}

/**
 * Generate article draft using round-robin
 */
export async function generateArticleDraft(params: {
  title?: string;
  topic: string;
  style?: string;
  wordCount?: number;
  systemPrompt?: string;
}): Promise<ResearchResponse> {
  const { title, topic, style, wordCount, systemPrompt } = params;
  
  const defaultSystemPrompt = `You are a professional writer and journalist. 
Generate high-quality, engaging content that is well-researched and properly structured.
Format your response in clean HTML using <h1>, <h2>, <h3>, <p>, <blockquote>, and <ul>/<li> tags as appropriate.
Do not include markdown code blocks - return only the HTML content.`;

  const prompt = `Write a ${wordCount || 750}-word article${title ? ` titled "${title}"` : ''} about: ${topic}.
${style ? `Style: ${style}` : ''}
Ensure the content is engaging, informative, and professionally written.
Format: Return ONLY valid HTML. No markdown wrappers.`;

  return research({
    prompt,
    systemPrompt: systemPrompt || defaultSystemPrompt,
    maxTokens: 4096,
    temperature: 0.8
  });
}

/**
 * Get provider status for diagnostics
 * Only returns info for providers, marks unavailable if key not configured
 */
export function getProviderStatus(): Record<AIProvider, {
  name: string;
  available: boolean;
  healthy: boolean;
  consecutiveFailures: number;
}> {
  const status: any = {};
  
  for (const provider of Object.keys(PROVIDER_CONFIGS) as AIProvider[]) {
    const config = PROVIDER_CONFIGS[provider];
    const health = providerHealth[provider];
    const available = isProviderAvailable(provider);
    
    status[provider] = {
      name: config.name,
      available,
      healthy: available && (health?.healthy ?? true),
      consecutiveFailures: health?.consecutiveFailures ?? 0
    };
  }
  
  return status;
}

/**
 * Reset provider health (for admin use)
 */
export function resetProviderHealth(provider?: AIProvider): void {
  if (provider) {
    if (providerHealth[provider]) {
      providerHealth[provider] = { healthy: true, lastCheck: 0, consecutiveFailures: 0 };
    }
  } else {
    for (const p of Object.keys(providerHealth) as AIProvider[]) {
      providerHealth[p] = { healthy: true, lastCheck: 0, consecutiveFailures: 0 };
    }
  }
}

/**
 * Force use of specific provider (bypasses round-robin)
 * Will fail if provider key is not configured
 */
export async function researchWithProvider(
  provider: AIProvider,
  request: ResearchRequest
): Promise<ResearchResponse> {
  if (!isProviderAvailable(provider)) {
    const config = PROVIDER_CONFIGS[provider];
    return {
      content: '',
      provider,
      model: '',
      success: false,
      error: `Provider ${config.name} is not available. Configure ${config.apiKeyEnv} in your environment.`
    };
  }
  
  const config = PROVIDER_CONFIGS[provider];
  
  switch (config.type) {
    case 'claude':
      return callClaude(request);
    case 'gemini':
      return callGemini(request);
    default:
      return callOpenAICompatible(provider, request);
  }
}

// Export configuration for UI
export { PROVIDER_CONFIGS };
