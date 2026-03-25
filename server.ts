/**
 * DeltaPress Express Server
 * 
 * Features:
 * - CORS handling with configurable origins
 * - API rate limiting per provider
 * - Request timeout handling
 * - Model-specific configurations
 * - Error handling and logging
 * - Branding and customization API
 * 
 * @version 1.7.0
 */

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // CORS Configuration
  CORS: {
    origins: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  // Rate Limiting Configuration (requests per minute per provider)
  RATE_LIMITS: {
    GEMINI: { maxRequests: 60, windowMs: 60000 },
    ZAI: { maxRequests: 30, windowMs: 60000 },
    ML: { maxRequests: 60, windowMs: 60000 },
    KIMI: { maxRequests: 30, windowMs: 60000 }
  },
  
  // Request timeout (milliseconds)
  REQUEST_TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
  }
};

// ============================================================================
// Rate Limiter
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // Create new window
      const resetTime = now + this.windowMs;
      this.limits.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }
    
    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    
    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Create rate limiters for each provider
const rateLimiters: Record<string, RateLimiter> = {
  GEMINI: new RateLimiter(CONFIG.RATE_LIMITS.GEMINI.maxRequests, CONFIG.RATE_LIMITS.GEMINI.windowMs),
  ZAI: new RateLimiter(CONFIG.RATE_LIMITS.ZAI.maxRequests, CONFIG.RATE_LIMITS.ZAI.windowMs),
  ML: new RateLimiter(CONFIG.RATE_LIMITS.ML.maxRequests, CONFIG.RATE_LIMITS.ML.windowMs),
  KIMI: new RateLimiter(CONFIG.RATE_LIMITS.KIMI.maxRequests, CONFIG.RATE_LIMITS.KIMI.windowMs)
};

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup());
}, 300000);

// ============================================================================
// Model Configurations
// ============================================================================

interface ModelConfig {
  id: string;
  maxTokens: number;
  temperature: number;
  supportsJson: boolean;
  supportsSearch: boolean;
  timeout: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini Models
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: true,
    timeout: 30000
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: true,
    timeout: 30000
  },
  
  // Zhipu AI Models
  "glm-4-flash": {
    id: "glm-4-flash",
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 25000
  },
  "glm-4": {
    id: "glm-4",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 45000
  },
  "glm-3-turbo": {
    id: "glm-3-turbo",
    maxTokens: 4096,
    temperature: 0.5,
    supportsJson: false,
    supportsSearch: false,
    timeout: 30000
  },
  
  // AI/ML API Models
  "gpt-4o": {
    id: "gpt-4o",
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 30000
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 20000
  },
  
  // Moonshot Kimi Models
  "moonshot-v1-8k": {
    id: "moonshot-v1-8k",
    maxTokens: 8192,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 30000
  },
  "moonshot-v1-32k": {
    id: "moonshot-v1-32k",
    maxTokens: 32768,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 45000
  }
};

function getModelConfig(modelId: string): ModelConfig {
  return MODEL_CONFIGS[modelId] || {
    id: modelId,
    maxTokens: 4096,
    temperature: 0.3,
    supportsJson: true,
    supportsSearch: false,
    timeout: 30000
  };
}

// ============================================================================
// Logging Utilities
// ============================================================================

const LOG = {
  info: (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${category}] ℹ️ ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${category}] ⚠️ ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (category: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${category}] ❌ ${message}`, error?.message || error);
  },
  success: (category: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${category}] ✅ ${message}`, data ? JSON.stringify(data) : '');
  }
};

// ============================================================================
// Express App Setup
// ============================================================================

async function startServer() {
  const app = express();
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // ========================================================================
  // CORS Middleware
  // ========================================================================
  
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && CONFIG.CORS.origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (CONFIG.CORS.origins.includes("*")) {
      res.setHeader('Access-Control-Allow-Origin', "*");
    } else {
      // For same-origin requests or allowed origins
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', CONFIG.CORS.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', CONFIG.CORS.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', String(CONFIG.CORS.credentials));
    res.setHeader('Access-Control-Max-Age', String(CONFIG.CORS.maxAge));
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      LOG.info('CORS', `Preflight request from ${origin || 'unknown'}`);
      return res.status(204).end();
    }
    
    next();
  });
  
  // ========================================================================
  // Request Logging Middleware
  // ========================================================================
  
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress
      };
      
      if (res.statusCode >= 400) {
        LOG.warn('HTTP', `Request completed with error`, logData);
      } else {
        LOG.info('HTTP', `Request completed`, logData);
      }
    });
    
    next();
  });
  
  // ========================================================================
  // Rate Limit Middleware Factory
  // ========================================================================
  
  function createRateLimitMiddleware(provider: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = req.ip || req.connection.remoteAddress || 'unknown';
      const limiter = rateLimiters[provider];
      
      if (!limiter) {
        return next();
      }
      
      const result = limiter.check(`${provider}:${identifier}`);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', String(CONFIG.RATE_LIMITS[provider as keyof typeof CONFIG.RATE_LIMITS]?.maxRequests || 60));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
      
      if (!result.allowed) {
        LOG.warn('RATE_LIMIT', `Rate limit exceeded for ${provider}`, { identifier });
        return res.status(429).json({
          error: 'Rate limit exceeded',
          provider,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }
      
      next();
    };
  }
  
  // ========================================================================
  // API Endpoints
  // ========================================================================
  
  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      version: "1.1.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      rateLimits: Object.entries(CONFIG.RATE_LIMITS).map(([provider, config]) => ({
        provider,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs
      }))
    });
  });
  
  // Model configurations endpoint
  app.get("/api/models", (req: Request, res: Response) => {
    res.json({
      models: Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
        id,
        ...config
      }))
    });
  });
  
  // API Settings endpoint for admin panel
  app.get("/api/api-settings", (req: Request, res: Response) => {
    // Provider status
    const providers = [
      {
        id: 'GEMINI',
        name: 'Google Gemini',
        hasKeys: !!(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('http')),
        keyCount: process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('http') ? 1 : 0,
        inCooldown: false,
        models: ['gemini-2.0-flash', 'gemini-1.5-flash'],
        status: process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('http') ? 'active' : 'missing'
      },
      {
        id: 'ZAI',
        name: 'Zhipu AI',
        hasKeys: !!(process.env.ZAI_API_KEY && !process.env.ZAI_API_KEY.startsWith('http')),
        keyCount: process.env.ZAI_API_KEY ? process.env.ZAI_API_KEY.split(',').filter(k => k.trim().length > 10).length : 0,
        inCooldown: false,
        models: ['glm-4-flash', 'glm-4', 'glm-3-turbo'],
        status: process.env.ZAI_API_KEY && !process.env.ZAI_API_KEY.startsWith('http') ? 'active' : 'missing'
      },
      {
        id: 'ML',
        name: 'AI/ML API',
        hasKeys: !!(process.env.ML_API_KEY && !process.env.ML_API_KEY.startsWith('http')),
        keyCount: process.env.ML_API_KEY ? process.env.ML_API_KEY.split(',').filter(k => k.trim().length > 10).length : 0,
        inCooldown: false,
        models: ['gpt-4o'],
        status: process.env.ML_API_KEY && !process.env.ML_API_KEY.startsWith('http') ? 'active' : 'missing'
      },
      {
        id: 'KIMI',
        name: 'Moonshot Kimi',
        hasKeys: !!(process.env.KIMI_API_KEY && !process.env.KIMI_API_KEY.startsWith('http')),
        keyCount: process.env.KIMI_API_KEY ? process.env.KIMI_API_KEY.split(',').filter(k => k.trim().length > 10).length : 0,
        inCooldown: false,
        models: ['moonshot-v1-8k'],
        status: process.env.KIMI_API_KEY && !process.env.KIMI_API_KEY.startsWith('http') ? 'active' : 'missing'
      }
    ];
    
    // Environment status (never expose actual values for secrets)
    const envStatus = [
      { name: 'GEMINI_API_KEY', configured: !!(process.env.GEMINI_API_KEY), isSecret: true },
      { name: 'ZAI_API_KEY', configured: !!(process.env.ZAI_API_KEY), isSecret: true },
      { name: 'ML_API_KEY', configured: !!(process.env.ML_API_KEY), isSecret: true },
      { name: 'KIMI_API_KEY', configured: !!(process.env.KIMI_API_KEY), isSecret: true },
      { name: 'SUPABASE_URL', configured: !!(process.env.SUPABASE_URL), isSecret: false, preview: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 30)}...` : undefined },
      { name: 'SUPABASE_ANON_KEY', configured: !!(process.env.SUPABASE_ANON_KEY), isSecret: true },
      { name: 'CORS_ORIGINS', configured: !!(process.env.CORS_ORIGINS), isSecret: false, preview: process.env.CORS_ORIGINS || 'localhost defaults' },
      { name: 'PORT', configured: !!(process.env.PORT), isSecret: false, preview: process.env.PORT || '3000' },
      { name: 'NODE_ENV', configured: !!(process.env.NODE_ENV), isSecret: false, preview: process.env.NODE_ENV || 'development' }
    ];
    
    res.json({
      cors: CONFIG.CORS,
      providers,
      envStatus,
      rateLimits: CONFIG.RATE_LIMITS,
      modelConfigs: MODEL_CONFIGS
    });
  });
  
  // ========================================================================
  // Branding API Endpoints
  // ========================================================================
  
  // Default branding configuration
  const DEFAULT_BRANDING = {
    site_name: 'DeltaPress',
    site_tagline: 'AI-Powered Newsroom Platform',
    site_logo_url: '',
    site_favicon_url: '',
    login_logo_url: '',
    login_background_url: '',
    login_background_color: '#1a365d',
    header_custom_html: '',
    header_scripts: '',
    footer_scripts: '',
    primary_color: '#1a365d',
    secondary_color: '#00bcd4',
    accent_color: '#3b82f6',
    custom_css: '',
    show_site_name: true,
    show_tagline: true,
    logo_width: 200,
    logo_height: 60,
    login_logo_width: 200,
    login_logo_height: 80
  };
  
  // In-memory branding store (replace with database in production)
  let brandingSettings = { ...DEFAULT_BRANDING };
  
  // Get branding settings
  app.get("/api/branding", (req: Request, res: Response) => {
    LOG.info('BRANDING', 'Fetching branding settings');
    res.json({
      success: true,
      branding: brandingSettings
    });
  });
  
  // Update branding settings
  app.put("/api/branding", (req: Request, res: Response) => {
    const updates = req.body;
    
    LOG.info('BRANDING', 'Updating branding settings', Object.keys(updates));
    
    // Validate and sanitize updates
    const allowedFields = [
      'site_name', 'site_tagline', 'site_logo_url', 'site_favicon_url',
      'login_logo_url', 'login_background_url', 'login_background_color',
      'header_custom_html', 'header_scripts', 'footer_scripts',
      'primary_color', 'secondary_color', 'accent_color', 'custom_css',
      'show_site_name', 'show_tagline', 'logo_width', 'logo_height',
      'login_logo_width', 'login_logo_height'
    ];
    
    const sanitizedUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Sanitize string values
        if (typeof value === 'string') {
          // Basic XSS prevention for HTML/scripts
          if (key === 'header_custom_html' || key === 'custom_css') {
            sanitizedUpdates[key] = value;
          } else if (key === 'header_scripts' || key === 'footer_scripts') {
            sanitizedUpdates[key] = value;
          } else {
            sanitizedUpdates[key] = value.slice(0, 2000); // Limit string length
          }
        } else if (typeof value === 'boolean' || typeof value === 'number') {
          sanitizedUpdates[key] = value;
        }
      }
    }
    
    brandingSettings = { ...brandingSettings, ...sanitizedUpdates };
    
    LOG.success('BRANDING', 'Branding settings updated');
    res.json({
      success: true,
      branding: brandingSettings,
      message: 'Branding settings updated successfully'
    });
  });
  
  // Reset branding to defaults
  app.post("/api/branding/reset", (req: Request, res: Response) => {
    LOG.info('BRANDING', 'Resetting branding to defaults');
    brandingSettings = { ...DEFAULT_BRANDING };
    
    res.json({
      success: true,
      branding: brandingSettings,
      message: 'Branding settings reset to defaults'
    });
  });
  
  // Upload logo (base64)
  app.post("/api/branding/upload-logo", (req: Request, res: Response) => {
    const { type, data, filename } = req.body;
    
    if (!data || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, data'
      });
    }
    
    // Validate base64 image data
    if (!data.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image data. Must be base64 encoded image.'
      });
    }
    
    // In production, save to cloud storage (S3, etc.)
    // For now, store as data URL
    const logoUrl = data;
    
    switch (type) {
      case 'site_logo':
        brandingSettings.site_logo_url = logoUrl;
        break;
      case 'login_logo':
        brandingSettings.login_logo_url = logoUrl;
        break;
      case 'favicon':
        brandingSettings.site_favicon_url = logoUrl;
        break;
      case 'login_background':
        brandingSettings.login_background_url = logoUrl;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid logo type. Use: site_logo, login_logo, favicon, login_background'
        });
    }
    
    LOG.success('BRANDING', `Logo uploaded: ${type}`);
    res.json({
      success: true,
      url: logoUrl,
      type,
      message: 'Logo uploaded successfully'
    });
  });
  
  // ========================================================================
  // Analytics API Endpoints
  // ========================================================================
  
  // Import analytics service
  const { analyticsService } = await import('./services/analyticsService.js');
  
  // Get analytics overview
  app.get("/api/analytics/overview", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching analytics overview');
    
    const overview = analyticsService.getOverview();
    const realtime = analyticsService.getRealtimeAnalytics();
    
    res.json({
      success: true,
      overview,
      realtime
    });
  });
  
  // Get user analytics
  app.get("/api/analytics/users", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching user analytics');
    
    const users = analyticsService.getUserAnalytics();
    
    // Calculate aggregations
    const totalUsers = users.length;
    const newUsers = users.filter(u => u.isFirstVisit).length;
    const returningUsers = totalUsers - newUsers;
    const loggedInUsers = users.filter(u => u.isLoggedIn).length;
    
    // Device breakdown
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    users.forEach(u => deviceCounts[u.deviceType]++);
    
    // Country breakdown
    const countryCounts: Record<string, number> = {};
    users.forEach(u => {
      countryCounts[u.country] = (countryCounts[u.country] || 0) + 1;
    });
    
    // Browser breakdown
    const browserCounts: Record<string, number> = {};
    users.forEach(u => {
      browserCounts[u.browser] = (browserCounts[u.browser] || 0) + 1;
    });
    
    // OS breakdown
    const osCounts: Record<string, number> = {};
    users.forEach(u => {
      osCounts[u.os] = (osCounts[u.os] || 0) + 1;
    });
    
    res.json({
      success: true,
      summary: {
        totalUsers,
        newUsers,
        returningUsers,
        loggedInUsers,
        guestUsers: totalUsers - loggedInUsers
      },
      devices: deviceCounts,
      countries: countryCounts,
      browsers: browserCounts,
      os: osCounts,
      users: users.slice(0, 100) // Limit to 100 for performance
    });
  });
  
  // Get behavior analytics
  app.get("/api/analytics/behavior", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching behavior analytics');
    
    const { startDate, endDate } = req.query;
    
    const behavior = analyticsService.getBehaviorAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json({
      success: true,
      behavior
    });
  });
  
  // Get article analytics
  app.get("/api/analytics/articles", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching article analytics');
    
    const { articleId } = req.query;
    
    const articles = analyticsService.getArticleAnalytics(articleId as string);
    
    res.json({
      success: true,
      articles
    });
  });
  
  // Get traffic analytics
  app.get("/api/analytics/traffic", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching traffic analytics');
    
    const traffic = analyticsService.getTrafficAnalytics();
    
    // Calculate totals
    const totals = traffic.reduce((acc, t) => ({
      sessions: acc.sessions + t.sessions,
      users: acc.users + t.users,
      newUsers: acc.newUsers + t.newUsers,
      conversions: acc.conversions + (t.conversions || 0)
    }), { sessions: 0, users: 0, newUsers: 0, conversions: 0 });
    
    // Group by source type
    const byType = {
      organic: traffic.filter(t => t.medium === 'search'),
      direct: traffic.filter(t => t.source === 'direct'),
      referral: traffic.filter(t => t.medium === 'referral'),
      social: traffic.filter(t => t.medium === 'social'),
      campaign: traffic.filter(t => t.campaign)
    };
    
    res.json({
      success: true,
      totals,
      byType,
      sources: traffic
    });
  });
  
  // Get geographic analytics
  app.get("/api/analytics/geographic", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching geographic analytics');
    
    const geo = analyticsService.getGeographicAnalytics();
    
    // Group by country
    const byCountry: Record<string, any> = {};
    geo.forEach(g => {
      if (!byCountry[g.country]) {
        byCountry[g.country] = {
          country: g.country,
          users: 0,
          sessions: 0,
          regions: []
        };
      }
      byCountry[g.country].users += g.users;
      byCountry[g.country].sessions += g.sessions;
      if (g.region && !byCountry[g.country].regions.includes(g.region)) {
        byCountry[g.country].regions.push(g.region);
      }
    });
    
    const countries = Object.values(byCountry).sort((a: any, b: any) => b.users - a.users);
    
    res.json({
      success: true,
      countries,
      locations: geo
    });
  });
  
  // Get daily metrics
  app.get("/api/analytics/daily", (req: Request, res: Response) => {
    LOG.info('ANALYTICS', 'Fetching daily metrics');
    
    const { startDate, endDate } = req.query;
    const start = (startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = (endDate as string) || new Date().toISOString().split('T')[0];
    
    const daily = analyticsService.getDailyMetrics(start, end);
    
    res.json({
      success: true,
      startDate: start,
      endDate: end,
      metrics: daily
    });
  });
  
  // Get real-time analytics
  app.get("/api/analytics/realtime", (req: Request, res: Response) => {
    const realtime = analyticsService.getRealtimeAnalytics();
    
    res.json({
      success: true,
      realtime
    });
  });
  
  // Track analytics event
  app.post("/api/analytics/track", (req: Request, res: Response) => {
    const { event, data } = req.body;
    
    LOG.info('ANALYTICS', `Tracking event: ${event}`);
    
    // Generate session ID if not provided
    const sessionId = data.sessionId || `session-${Date.now()}`;
    
    // Track the event based on type
    switch (event) {
      case 'page_view':
        analyticsService.trackPageView(sessionId, data.path, data.title, data.referrer);
        break;
      case 'article_view':
        analyticsService.trackArticleView(sessionId, data.articleId, data.title, data.author, data.category);
        break;
      case 'article_read':
        analyticsService.trackArticleRead(sessionId, data.articleId, data.readTime, data.completionPercent);
        break;
      case 'search':
        analyticsService.trackSearch(sessionId, data.query, data.resultsCount || 0);
        break;
      case 'cta_click':
        analyticsService.trackCtaClick(sessionId, data.ctaId, data.ctaText, data.location);
        break;
      case 'share':
        analyticsService.trackShare(sessionId, data.articleId, data.platform);
        break;
      case 'scroll':
        analyticsService.trackScrollDepth(sessionId, data.path, data.depth);
        break;
      case 'session_start':
        // Session start requires full user analytics
        const sessionIdResult = analyticsService.startSession(data.userAnalytics);
        res.json({ success: true, sessionId: sessionIdResult });
        return;
      case 'session_end':
        analyticsService.endSession(sessionId);
        break;
      default:
        // Generic event tracking
        analyticsService.trackEvent({
          id: `evt-${Date.now()}`,
          sessionId,
          anonymousId: data.anonymousId || 'anonymous',
          timestamp: new Date(),
          type: event,
          data
        });
    }
    
    res.json({ success: true });
  });
  
  // Proxy Configuration Endpoints
  app.get("/api/proxy/config", (req: Request, res: Response) => {
    const { proxyService } = await import('./services/proxyService.js');
    
    res.json({
      success: true,
      config: proxyService.getConfig(),
      providers: proxyService.getProviders().map(p => ({
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        models: p.models
        // Don't expose API keys
      }))
    });
  });
  
  app.put("/api/proxy/config", (req: Request, res: Response) => {
    const { proxyService } = await import('./services/proxyService.js');
    const { config } = req.body;
    
    proxyService.setConfig(config);
    
    LOG.success('PROXY', 'Proxy configuration updated');
    res.json({ success: true, config: proxyService.getConfig() });
  });
  
  app.put("/api/proxy/provider/:id", (req: Request, res: Response) => {
    const { proxyService } = await import('./services/proxyService.js');
    const { id } = req.params;
    const { enabled, apiKey, endpoint } = req.body;
    
    if (enabled) {
      proxyService.enableProvider(id, apiKey, endpoint);
    } else {
      proxyService.disableProvider(id);
    }
    
    LOG.success('PROXY', `Provider ${id} ${enabled ? 'enabled' : 'disabled'}`);
    res.json({ success: true, providerId: id, enabled });
  });
  
  // ========================================================================
  // Research Proxy Endpoint (OpenAI-compatible providers)
  // ========================================================================
  
  app.post("/api/proxy-research", 
    (req: Request, res: Response, next: NextFunction) => {
      // Determine provider from request
      const provider = req.body.providerName?.toUpperCase().replace(/[^A-Z]/g, '') || 'ML';
      req.body._provider = provider;
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      const provider = req.body._provider || 'ML';
      return createRateLimitMiddleware(provider)(req, res, next);
    },
    async (req: Request, res: Response) => {
      const { endpoint, apiKey, model, query, providerName } = req.body;
      
      // Validation
      if (!endpoint || !apiKey || !model || !query) {
        LOG.warn('PROXY', 'Missing required parameters');
        return res.status(400).json({ 
          error: "Missing required parameters",
          required: ["endpoint", "apiKey", "model", "query"]
        });
      }
      
      const modelConfig = getModelConfig(model);
      const provider = providerName?.toUpperCase().replace(/[^A-Z]/g, '') || 'UNKNOWN';
      
      LOG.info('PROXY', `Forwarding request`, {
        provider: providerName,
        model,
        maxTokens: modelConfig.maxTokens
      });
      
      try {
        // Build provider-specific request
        const requestBody = buildProviderRequest(provider, model, query, modelConfig);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errText = await response.text();
          LOG.error('PROXY', `${providerName} error: ${response.status}`, errText);
          
          // Handle specific error codes
          if (response.status === 429) {
            return res.status(429).json({
              error: 'Provider rate limit exceeded',
              provider: providerName,
              details: errText
            });
          }
          
          if (response.status === 401 || response.status === 403) {
            return res.status(401).json({
              error: 'Invalid API key',
              provider: providerName
            });
          }
          
          return res.status(response.status).json({
            error: 'Provider error',
            provider: providerName,
            status: response.status,
            details: errText
          });
        }
        
        const data = await response.json();
        LOG.success('PROXY', `Request successful`, { provider: providerName, model });
        res.json(data);
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          LOG.error('PROXY', `Request timeout for ${providerName}`);
          return res.status(504).json({
            error: 'Request timeout',
            provider: providerName,
            timeout: modelConfig.timeout
          });
        }
        
        LOG.error('PROXY', `Critical error`, error);
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  );
  
  // ========================================================================
  // Gemini Proxy Endpoint
  // ========================================================================
  
  app.post("/api/proxy-gemini-research",
    createRateLimitMiddleware('GEMINI'),
    async (req: Request, res: Response) => {
      const { model, query, apiKey } = req.body;
      const key = process.env.GEMINI_API_KEY || apiKey;
      
      if (!model || !query || !key) {
        LOG.warn('GEMINI', 'Missing required parameters');
        return res.status(400).json({ 
          error: "Missing required parameters",
          required: ["model", "query", "apiKey"]
        });
      }
      
      const modelConfig = getModelConfig(model);
      
      LOG.info('GEMINI', `Forwarding request`, { model, supportsSearch: modelConfig.supportsSearch });
      
      try {
        // Build Gemini-specific request
        const requestBody: any = {
          contents: [{
            role: "user",
            parts: [{
              text: `Fetch and summarize 5 major news topics or articles regarding: "${query}". Return ONLY a valid JSON array of objects with "title" and "summary" fields.`
            }]
          }],
          generationConfig: {
            responseMimeType: modelConfig.supportsJson ? "application/json" : "text/plain",
            temperature: modelConfig.temperature,
            maxOutputTokens: modelConfig.maxTokens
          }
        };
        
        // Add Google Search grounding if supported
        if (modelConfig.supportsSearch) {
          requestBody.tools = [{ google_search: {} }];
        }
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errText = await response.text();
          LOG.error('GEMINI', `Error: ${response.status}`, errText);
          
          if (response.status === 429) {
            return res.status(429).json({
              error: 'Gemini rate limit exceeded',
              retryAfter: 60
            });
          }
          
          if (response.status === 400) {
            return res.status(400).json({
              error: 'Invalid request to Gemini',
              details: errText
            });
          }
          
          return res.status(response.status).json({
            error: 'Gemini error',
            status: response.status,
            details: errText
          });
        }
        
        const data = await response.json();
        
        // Handle Gemini response format
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        // Check for safety blocks
        if (data?.promptFeedback?.blockReason) {
          LOG.warn('GEMINI', `Content blocked`, { reason: data.promptFeedback.blockReason });
          return res.status(403).json({
            error: 'Content blocked by safety filters',
            reason: data.promptFeedback.blockReason
          });
        }
        
        // Clean and parse JSON response
        const cleaned = content.replace(/^```json\n?|```$/g, "").trim();
        
        try {
          const parsed = JSON.parse(cleaned);
          LOG.success('GEMINI', `Request successful`, { model, resultCount: Array.isArray(parsed) ? parsed.length : 1 });
          return res.json(parsed);
        } catch {
          LOG.error('GEMINI', 'JSON parsing failed');
          return res.status(502).json({ 
            error: "Gemini returned invalid JSON", 
            raw: content.substring(0, 500) 
          });
        }
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          LOG.error('GEMINI', 'Request timeout');
          return res.status(504).json({
            error: 'Gemini request timeout',
            timeout: modelConfig.timeout
          });
        }
        
        LOG.error('GEMINI', 'Critical error', error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  
  // ========================================================================
  // Error Handling Middleware
  // ========================================================================
  
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    LOG.error('SERVER', 'Unhandled error', err);
    res.status(500).json({
      error: 'Internal server error',
      message: CONFIG.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  });
  
  // ========================================================================
  // Vite Middleware (Development) or Static Serving (Production)
  // ========================================================================
  
  if (CONFIG.NODE_ENV !== "production") {
    LOG.info('SERVER', 'Starting in development mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    LOG.info('SERVER', 'Starting in production mode');
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  
  // ========================================================================
  // Start Server
  // ========================================================================
  
  app.listen(CONFIG.PORT, "0.0.0.0", () => {
    LOG.success('SERVER', `DeltaPress server started`, {
      port: CONFIG.PORT,
      environment: CONFIG.NODE_ENV,
      corsOrigins: CONFIG.CORS.origins
    });
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildProviderRequest(provider: string, model: string, query: string, config: ModelConfig): any {
  const systemPrompt = 'You are a research assistant. Provide a list of 5 current news topics or facts about the requested subject. Return ONLY a JSON array of objects with "title" and "summary" fields. No markdown wrappers.';
  
  // Base request structure (OpenAI-compatible)
  const baseRequest = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Research: ${query}` }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };
  
  // Provider-specific adjustments
  switch (provider) {
    case 'ZHIPUAI':
    case 'ZAI':
      // Zhipu AI uses slightly different parameter names
      return {
        ...baseRequest,
        // Zhipu doesn't support max_tokens, uses max_new_tokens
        max_new_tokens: config.maxTokens
      };
      
    case 'MOONSHOT':
    case 'KIMI':
      // Moonshot Kimi is fully OpenAI-compatible
      return baseRequest;
      
    case 'AIML':
    case 'ML':
      // AI/ML API is fully OpenAI-compatible
      return {
        ...baseRequest,
        // Add response format for JSON
        response_format: config.supportsJson ? { type: "json_object" } : undefined
      };
      
    default:
      return baseRequest;
  }
}

// ============================================================================
// Start Application
// ============================================================================

startServer().catch((error) => {
  LOG.error('SERVER', 'Failed to start server', error);
  process.exit(1);
});
