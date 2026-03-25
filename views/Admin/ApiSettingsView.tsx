/**
 * API Settings View - Admin Panel
 * 
 * Displays CORS configuration, Environment Variables status,
 * and API provider status for administrators.
 * 
 * @version 1.2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';
import { getRolePermissions, UserRole } from '../../services/rbac';

interface ApiProviderStatus {
  id: string;
  name: string;
  hasKeys: boolean;
  keyCount: number;
  inCooldown: boolean;
  models: string[];
  status: 'active' | 'configured' | 'missing' | 'cooldown';
}

interface CorsConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

interface EnvStatus {
  name: string;
  configured: boolean;
  isSecret: boolean;
  preview?: string;
}

interface ApiSettingsData {
  cors: CorsConfig;
  providers: ApiProviderStatus[];
  envStatus: EnvStatus[];
  rateLimits: Record<string, { maxRequests: number; windowMs: number }>;
  modelConfigs: Record<string, any>;
}

const ApiSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('user');
  const [settings, setSettings] = useState<ApiSettingsData | null>(null);
  const [activeTab, setActiveTab] = useState<'cors' | 'api' | 'env' | 'models'>('api');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user role
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUserRole(profile.role as UserRole);
          
          // Check permissions
          const permissions = getRolePermissions(profile.role as UserRole);
          if (!permissions.canViewAPIKeys) {
            setError('Access Denied: Insufficient permissions to view API settings.');
            setLoading(false);
            return;
          }
        }
      }

      // Fetch API settings from server
      const response = await fetch('/api/api-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Use mock data if server endpoint not available
        setSettings(getMockSettings());
      }
    } catch (err: any) {
      console.warn('API settings endpoint not available, using mock data');
      setSettings(getMockSettings());
    } finally {
      setLoading(false);
    }
  };

  const getMockSettings = (): ApiSettingsData => ({
    cors: {
      origins: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400
    },
    providers: [
      { id: 'GEMINI', name: 'Google Gemini', hasKeys: true, keyCount: 1, inCooldown: false, models: ['gemini-2.0-flash', 'gemini-1.5-flash'], status: 'active' },
      { id: 'ZAI', name: 'Zhipu AI', hasKeys: false, keyCount: 0, inCooldown: false, models: ['glm-4-flash', 'glm-4', 'glm-3-turbo'], status: 'missing' },
      { id: 'ML', name: 'AI/ML API', hasKeys: false, keyCount: 0, inCooldown: false, models: ['gpt-4o'], status: 'missing' },
      { id: 'KIMI', name: 'Moonshot Kimi', hasKeys: false, keyCount: 0, inCooldown: false, models: ['moonshot-v1-8k'], status: 'missing' }
    ],
    envStatus: [
      { name: 'GEMINI_API_KEY', configured: true, isSecret: true, preview: '••••••••••' },
      { name: 'ZAI_API_KEY', configured: false, isSecret: true },
      { name: 'ML_API_KEY', configured: false, isSecret: true },
      { name: 'KIMI_API_KEY', configured: false, isSecret: true },
      { name: 'SUPABASE_URL', configured: true, isSecret: false, preview: 'https://xxx.supabase.co' },
      { name: 'SUPABASE_ANON_KEY', configured: true, isSecret: true, preview: '••••••••••' },
      { name: 'CORS_ORIGINS', configured: true, isSecret: false, preview: 'localhost:3000, localhost:5173' },
      { name: 'PORT', configured: true, isSecret: false, preview: '3000' },
      { name: 'NODE_ENV', configured: true, isSecret: false, preview: 'development' }
    ],
    rateLimits: {
      GEMINI: { maxRequests: 60, windowMs: 60000 },
      ZAI: { maxRequests: 30, windowMs: 60000 },
      ML: { maxRequests: 60, windowMs: 60000 },
      KIMI: { maxRequests: 30, windowMs: 60000 }
    },
    modelConfigs: {
      'gemini-2.0-flash': { maxTokens: 8192, temperature: 0.3, supportsJson: true, timeout: 30000 },
      'glm-4-flash': { maxTokens: 4096, temperature: 0.3, supportsJson: true, timeout: 25000 }
    }
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-300',
      configured: 'bg-blue-100 text-blue-700 border-blue-300',
      missing: 'bg-red-100 text-red-700 border-red-300',
      cooldown: 'bg-amber-100 text-amber-700 border-amber-300'
    };
    
    const labels: Record<string, string> = {
      active: '✓ Active',
      configured: '● Configured',
      missing: '✗ Not Configured',
      cooldown: '⏳ Cooldown'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f1f1f1]">
        <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
        <div className="flex-1 p-10 text-center text-gray-400 font-bold animate-pulse font-serif italic">
          Loading API Configuration...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#f1f1f1]">
        <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
        <div className="flex-1 p-10">
          <div className="max-w-lg mx-auto mt-20 p-8 bg-red-50 border-l-8 border-red-600 rounded shadow-sm">
            <h3 className="text-red-600 font-black uppercase text-sm tracking-widest mb-2">Access Denied</h3>
            <p className="text-red-800 text-sm">{error}</p>
            <button 
              onClick={() => navigate('/admin')}
              className="mt-4 text-xs font-black uppercase bg-red-600 text-white px-4 py-2 rounded"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      
      <main className="flex-1 p-6 lg:p-10 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">API Configuration</h1>
          <p className="text-gray-600 text-sm italic mt-1">CORS, Environment Variables, and AI Provider Status</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {(['api', 'cors', 'env', 'models'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === tab 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'api' ? 'AI Providers' : tab === 'cors' ? 'CORS' : tab === 'env' ? 'Environment' : 'Models'}
            </button>
          ))}
        </div>

        {/* API Providers Tab */}
        {activeTab === 'api' && settings && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">AI Provider Status</h3>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-gray-400 font-black tracking-widest bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Provider</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">API Keys</th>
                    <th className="px-6 py-3">Models</th>
                    <th className="px-6 py-3">Rate Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settings.providers.map(provider => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{provider.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{provider.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(provider.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-mono text-sm ${provider.keyCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {provider.keyCount} key{provider.keyCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {provider.models.map(model => (
                            <span key={model} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-mono rounded">
                              {model}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {settings.rateLimits[provider.id] && (
                          <span>
                            {settings.rateLimits[provider.id].maxRequests} req/min
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Round Robin Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Round Robin Cycling</h4>
              <p className="text-blue-700 text-sm">
                API requests are automatically distributed across all configured providers using a round-robin algorithm.
                Multiple API keys per provider are cycled through independently for load balancing.
              </p>
            </div>
          </div>
        )}

        {/* CORS Tab */}
        {activeTab === 'cors' && settings && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-4">CORS Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
                    Allowed Origins
                  </label>
                  <div className="bg-gray-50 rounded p-3 font-mono text-xs space-y-1">
                    {settings.cors.origins.map((origin, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        {origin}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
                    Allowed Methods
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {settings.cors.methods.map(method => (
                      <span key={method} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
                    Allowed Headers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {settings.cors.allowedHeaders.map(header => (
                      <span key={header} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                        {header}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
                    Additional Settings
                  </label>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${settings.cors.credentials ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span>Credentials: <strong>{settings.cors.credentials ? 'Enabled' : 'Disabled'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      <span>Max Age: <strong>{settings.cors.maxAge}s</strong> (preflight cache)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Configuration</h4>
              <p className="text-amber-700 text-sm">
                Set <code className="bg-amber-100 px-1 rounded">CORS_ORIGINS</code> environment variable with comma-separated origins to customize allowed domains.
                Example: <code className="bg-amber-100 px-1 rounded">CORS_ORIGINS=https://app.com,https://admin.app.com</code>
              </p>
            </div>
          </div>
        )}

        {/* Environment Variables Tab */}
        {activeTab === 'env' && settings && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Environment Variables Status</h3>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-gray-400 font-black tracking-widest bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Variable</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {settings.envStatus.map(env => (
                    <tr key={env.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-gray-900">{env.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          env.configured 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {env.configured ? '✓ Set' : '✗ Missing'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs ${env.isSecret ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          {env.isSecret ? '🔒 Secret' : 'Public'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-gray-500">
                          {env.isSecret && env.configured 
                            ? '••••••••••••' 
                            : env.preview || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-red-800 font-black text-xs uppercase tracking-widest mb-2">Security Notice</h4>
              <p className="text-red-700 text-sm">
                Secret values are never exposed in the admin panel. Only configuration status is shown.
                Manage your environment variables securely through your hosting provider's dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && settings && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Model Configurations</h3>
              </div>
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-gray-400 font-black tracking-widest bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Model ID</th>
                    <th className="px-6 py-3">Max Tokens</th>
                    <th className="px-6 py-3">Temperature</th>
                    <th className="px-6 py-3">JSON Support</th>
                    <th className="px-6 py-3">Timeout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(settings.modelConfigs).map(([modelId, config]: [string, any]) => (
                    <tr key={modelId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-gray-900">{modelId}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {config.maxTokens?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {config.temperature}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          config.supportsJson 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {config.supportsJson ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(config.timeout / 1000)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Model-Specific Handling</h4>
              <p className="text-blue-700 text-sm">
                Each model has unique configurations optimized for its capabilities. The system automatically
                adjusts request format, token limits, and timeout values based on the selected model.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ApiSettingsView;
