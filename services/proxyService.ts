/**
 * DeltaPress Proxy Configuration Service
 * 
 * Supports multiple proxy modes:
 * - onprem: User's own proxy server
 * - corsanywhere: CORS Anywhere proxy
 * - app: Built-in app proxy (default)
 * 
 * @version 1.8.0
 */

export type ProxyMode = 'onprem' | 'corsanywhere' | 'app' | 'none';

export interface ProxyConfig {
  mode: ProxyMode;
  onpremUrl?: string;
  corsanywhereUrl?: string;
  timeout: number;
  retries: number;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  models: string[];
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

// Default proxy configuration
export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  mode: 'app',
  timeout: 30000,
  retries: 3
};

// Default AI providers - NONE enabled by default, user must configure
export const DEFAULT_AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    enabled: false,
    endpoint: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
    rateLimit: { maxRequests: 60, windowMs: 60000 }
  },
  {
    id: 'openai',
    name: 'OpenAI',
    enabled: false,
    endpoint: 'https://api.openai.com',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    rateLimit: { maxRequests: 60, windowMs: 60000 }
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    enabled: false,
    endpoint: 'https://api.anthropic.com',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    rateLimit: { maxRequests: 60, windowMs: 60000 }
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    enabled: false,
    endpoint: 'https://open.bigmodel.cn',
    models: ['glm-4-flash', 'glm-4', 'glm-3-turbo'],
    rateLimit: { maxRequests: 30, windowMs: 60000 }
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    enabled: false,
    endpoint: 'https://api.moonshot.cn',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    rateLimit: { maxRequests: 30, windowMs: 60000 }
  },
  {
    id: 'aiml',
    name: 'AI/ML API',
    enabled: false,
    endpoint: 'https://api.aimlapi.com',
    models: ['gpt-4o', 'gpt-4o-mini'],
    rateLimit: { maxRequests: 60, windowMs: 60000 }
  }
];

/**
 * Proxy Service Class
 */
export class ProxyService {
  private config: ProxyConfig;
  private providers: AIProviderConfig[];

  constructor(config: Partial<ProxyConfig> = {}, providers: AIProviderConfig[] = DEFAULT_AI_PROVIDERS) {
    this.config = { ...DEFAULT_PROXY_CONFIG, ...config };
    this.providers = providers;
  }

  /**
   * Get current proxy configuration
   */
  getConfig(): ProxyConfig {
    return this.config;
  }

  /**
   * Update proxy configuration
   */
  setConfig(updates: Partial<ProxyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get all AI providers
   */
  getProviders(): AIProviderConfig[] {
    return this.providers;
  }

  /**
   * Get enabled providers only
   */
  getEnabledProviders(): AIProviderConfig[] {
    return this.providers.filter(p => p.enabled);
  }

  /**
   * Update provider configuration
   */
  setProvider(providerId: string, updates: Partial<AIProviderConfig>): void {
    const index = this.providers.findIndex(p => p.id === providerId);
    if (index !== -1) {
      this.providers[index] = { ...this.providers[index], ...updates };
    }
  }

  /**
   * Enable a provider
   */
  enableProvider(providerId: string, apiKey?: string, endpoint?: string): void {
    this.setProvider(providerId, { 
      enabled: true, 
      apiKey,
      endpoint: endpoint || this.providers.find(p => p.id === providerId)?.endpoint
    });
  }

  /**
   * Disable a provider
   */
  disableProvider(providerId: string): void {
    this.setProvider(providerId, { enabled: false });
  }

  /**
   * Build proxy URL based on mode
   */
  buildProxyUrl(targetUrl: string): string {
    switch (this.config.mode) {
      case 'onprem':
        if (!this.config.onpremUrl) {
          throw new Error('On-prem proxy URL not configured');
        }
        return `${this.config.onpremUrl}?url=${encodeURIComponent(targetUrl)}`;

      case 'corsanywhere':
        const corsUrl = this.config.corsanywhereUrl || 'https://cors-anywhere.herokuapp.com';
        return `${corsUrl}/${targetUrl}`;

      case 'app':
      case 'none':
      default:
        return targetUrl;
    }
  }

  /**
   * Make a proxied request
   */
  async request(
    providerId: string,
    model: string,
    payload: any
  ): Promise<any> {
    const provider = this.providers.find(p => p.id === providerId);
    
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider '${providerId}' is not enabled. Configure it in settings.`);
    }

    if (!provider.apiKey) {
      throw new Error(`API key not configured for provider '${providerId}'`);
    }

    const endpoint = provider.endpoint || '';
    const url = this.buildProxyUrl(`${endpoint}/v1/chat/completions`);

    // Build request based on provider
    const requestBody = this.buildRequestBody(providerId, model, payload);

    // Make request with retries
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: this.buildHeaders(providerId, provider.apiKey!),
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${errorText}`);
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw error;
        }

        // Wait before retry
        if (attempt < this.config.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Build request body for provider
   */
  private buildRequestBody(providerId: string, model: string, payload: any): any {
    const baseBody = {
      model,
      messages: payload.messages || [],
      temperature: payload.temperature ?? 0.3,
      max_tokens: payload.maxTokens ?? 4096
    };

    // Provider-specific adjustments
    switch (providerId) {
      case 'gemini':
        return {
          contents: baseBody.messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
          })),
          generationConfig: {
            temperature: baseBody.temperature,
            maxOutputTokens: baseBody.max_tokens
          }
        };

      case 'anthropic':
        return {
          model,
          messages: baseBody.messages,
          max_tokens: baseBody.max_tokens,
          anthropic_version: '2023-06-01'
        };

      case 'zhipu':
        return {
          model,
          messages: baseBody.messages,
          max_new_tokens: baseBody.max_tokens,
          temperature: baseBody.temperature
        };

      default:
        // OpenAI-compatible format
        return baseBody;
    }
  }

  /**
   * Build headers for provider
   */
  private buildHeaders(providerId: string, apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    switch (providerId) {
      case 'gemini':
        // Gemini uses query param for key
        return headers;

      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        return headers;

      default:
        headers['Authorization'] = `Bearer ${apiKey}`;
        return headers;
    }
  }
}

// Singleton instance
export const proxyService = new ProxyService();
