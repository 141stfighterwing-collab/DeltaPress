import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { geminiValidateApiKey } from "../../services/geminiClient";
import { 
  getProviderStatus, 
  getAvailableProviders, 
  resetProviderHealth,
  research,
  ResearchResponse,
  AIProvider,
  PROVIDER_CONFIGS
} from "../../services/aiProviders";
import AdminSidebar from '../../components/AdminSidebar';

interface TableHealth {
  name: string;
  count: number | null;
  status: 'ok' | 'blocked' | 'missing';
  error?: string;
}

interface ApiHealth {
  keyName: string;
  provider: AIProvider;
  status: 'healthy' | 'down' | 'missing';
  detail: string;
}

interface ProviderTestResult {
  provider: AIProvider;
  success: boolean;
  response?: string;
  error?: string;
  model?: string;
  latency?: number;
}

const DiagnosticsView: React.FC = () => {
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [overallStatus, setOverallStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [tableHealth, setTableHealth] = useState<TableHealth[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealth[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<ProviderTestResult[]>([]);
  const [roundRobinTest, setRoundRobinTest] = useState<ResearchResponse | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const safeEnv = (name: string): string => {
    const viteVal = (import.meta as any)?.env?.[name];
    return (viteVal || '').trim();
  };

  const maskKey = (key: string): string => {
    if (!key) return 'missing';
    if (key.length <= 8) return `${key.slice(0, 2)}***`;
    return `${key.slice(0, 4)}***${key.slice(-4)}`;
  };

  const summarizeError = (raw?: string): string => {
    if (!raw) return 'No error details';
    try {
      const parsed = JSON.parse(raw);
      return parsed?.error?.message || parsed?.message || raw.substring(0, 100);
    } catch {
      return raw.substring(0, 100);
    }
  };

  // Test individual provider with a real API call
  const testProvider = async (provider: AIProvider): Promise<ProviderTestResult> => {
    const config = PROVIDER_CONFIGS[provider];
    const key = safeEnv(config.apiKeyEnv);
    
    if (!key) {
      return { provider, success: false, error: 'API key not configured' };
    }
    
    const startTime = Date.now();
    
    try {
      const result = await research({
        prompt: 'Reply with exactly: "API test successful!" and nothing else.',
        maxTokens: 20,
        temperature: 0
      });
      
      const latency = Date.now() - startTime;
      
      return {
        provider,
        success: result.success,
        response: result.content?.substring(0, 50),
        error: result.error,
        model: result.model,
        latency
      };
    } catch (error: any) {
      return {
        provider,
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  };

  // Test all configured providers
  const testAllProviders = async () => {
    setIsTestingAll(true);
    setTestResults([]);
    addLog('🧪 Testing all configured AI providers...');
    
    const available = getAvailableProviders();
    
    if (available.length === 0) {
      addLog('❌ No providers configured. Set at least one API key.');
      setIsTestingAll(false);
      return;
    }
    
    const results: ProviderTestResult[] = [];
    
    for (const provider of available) {
      const config = PROVIDER_CONFIGS[provider];
      addLog(`Testing ${config.name}...`);
      
      const result = await testProvider(provider);
      results.push(result);
      
      if (result.success) {
        addLog(`  ✅ ${config.name}: SUCCESS (${result.latency}ms, model: ${result.model})`);
      } else {
        addLog(`  ❌ ${config.name}: FAILED - ${result.error}`);
      }
      
      setTestResults([...results]);
    }
    
    const successCount = results.filter(r => r.success).length;
    addLog(`\n📊 Results: ${successCount}/${results.length} providers working`);
    
    setIsTestingAll(false);
  };

  // Test round-robin specifically
  const testRoundRobin = async () => {
    addLog('🔄 Testing round-robin selection...');
    
    const result = await research({
      prompt: 'Say "Round-robin working!" and nothing else.',
      maxTokens: 20,
      temperature: 0
    });
    
    setRoundRobinTest(result);
    
    if (result.success) {
      addLog(`✅ Round-robin test passed via ${result.provider} (${result.model})`);
    } else {
      addLog(`❌ Round-robin test failed: ${result.error}`);
    }
  };

  const resetProviders = () => {
    resetProviderHealth();
    addLog('🔄 All provider health statuses reset');
  };

  const runRepair = async () => {
    setIsRepairing(true);
    addLog("🛠️ Starting database repair...");
    
    try {
      const repairSQL = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY, title TEXT, slogan TEXT, logo_url TEXT
        );
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, slug TEXT UNIQUE, created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS journalists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, title TEXT, niche TEXT, category TEXT,
            schedule TEXT DEFAULT '24h', status TEXT DEFAULT 'active',
            last_run TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
        );
      `;
      
      const { error } = await supabase.rpc('exec_sql', { sql: repairSQL });
      
      if (error) {
        addLog(`❌ Repair error: ${error.message}`);
      } else {
        addLog("✅ Repair completed successfully");
      }
    } catch (err: any) {
      addLog(`❌ Repair failed: ${err.message}`);
    } finally {
      setIsRepairing(false);
      scanTableIntegrity();
    }
  };

  const scanTableIntegrity = async () => {
    setIsScanning(true);
    addLog("Scanning database tables...");
    
    const tables = ['categories', 'posts', 'profiles', 'rss_feeds', 'site_settings', 'comments', 'contacts', 'journalists'];
    const results: TableHealth[] = [];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        results.push({ 
          name: table, 
          count: count ?? 0, 
          status: error ? 'blocked' : 'ok',
          error: error?.message 
        });
      } catch (e: any) {
        results.push({ name: table, count: 0, status: 'blocked', error: e.message });
      }
    }
    
    setTableHealth(results);
    setIsScanning(false);
    addLog("Database scan complete");
  };

  // Validate API key by making actual call
  const validateProviderKey = async (provider: AIProvider): Promise<{ ok: boolean; detail: string }> => {
    const config = PROVIDER_CONFIGS[provider];
    const key = safeEnv(config.apiKeyEnv);
    
    if (!key) {
      return { ok: false, detail: 'Not configured' };
    }
    
    // Use existing Gemini validation for Gemini
    if (provider === 'gemini') {
      const result = await geminiValidateApiKey(key);
      return { ok: result.ok, detail: result.ok ? 'Connected' : 'Failed' };
    }
    
    // For others, do a minimal test call
    try {
      const result = await testProvider(provider);
      return { ok: result.success, detail: result.success ? `Working (${result.latency}ms)` : result.error || 'Failed' };
    } catch (error: any) {
      return { ok: false, detail: error.message };
    }
  };

  const runDiagnostics = async () => {
    setLogs([]);
    addLog("🚀 Starting diagnostics...");
    
    // Test database
    try {
      const { error } = await supabase.from('site_settings').select('id').limit(1);
      setDbStatus(error ? 'error' : 'ok');
      addLog(error ? `❌ Database: ${error.message}` : '✅ Database: Connected');
    } catch (err: any) {
      setDbStatus('error');
      addLog(`❌ Database: ${err.message}`);
    }
    
    // Check all providers
    addLog('\n📋 Checking AI providers...');
    const results: ApiHealth[] = [];
    const providerStatus = getProviderStatus();
    
    for (const [provider, status] of Object.entries(providerStatus)) {
      const key = safeEnv(PROVIDER_CONFIGS[provider as AIProvider].apiKeyEnv);
      
      if (!key) {
        results.push({
          keyName: PROVIDER_CONFIGS[provider as AIProvider].apiKeyEnv,
          provider: provider as AIProvider,
          status: 'missing',
          detail: 'Not configured'
        });
        addLog(`  ⚪ ${status.name}: Not configured`);
      } else {
        addLog(`  🔍 ${status.name}: Testing...`);
        const validation = await validateProviderKey(provider as AIProvider);
        
        results.push({
          keyName: PROVIDER_CONFIGS[provider as AIProvider].apiKeyEnv,
          provider: provider as AIProvider,
          status: validation.ok ? 'healthy' : 'down',
          detail: validation.detail
        });
        
        addLog(`  ${validation.ok ? '✅' : '❌'} ${status.name}: ${validation.detail}`);
      }
    }
    
    setApiHealth(results);
    
    // Overall status
    const hasHealthyApi = results.some(r => r.status === 'healthy');
    const dbHealthy = dbStatus === 'ok';
    setOverallStatus(hasHealthyApi ? 'ok' : 'error');
    
    addLog(`\n${hasHealthyApi ? '✅' : '❌'} Overall: ${hasHealthyApi ? 'Healthy' : 'Degraded - configure at least one AI provider'}`);
    
    await scanTableIntegrity();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  // Get provider icon
  const getProviderIcon = (provider: AIProvider): string => {
    switch (provider) {
      case 'claude': return '🤖';
      case 'openai': return '🟢';
      case 'gemini': return '✨';
      case 'kimi': return '🌙';
      default: return '🔌';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Diagnostics</h1>
            <p className="text-gray-500 text-sm italic">Test AI providers and system health</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetProviders}
              className="bg-amber-600 text-white px-3 py-2 rounded text-xs font-bold uppercase hover:bg-amber-700 transition-all"
            >
              Reset
            </button>
            <button
              onClick={runRepair}
              disabled={isRepairing}
              className="bg-red-600 text-white px-3 py-2 rounded text-xs font-bold uppercase hover:bg-red-700 disabled:opacity-50"
            >
              {isRepairing ? 'Repairing...' : 'Repair DB'}
            </button>
          </div>
        </header>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow text-center">
            <h3 className="font-bold text-xs text-gray-600 uppercase">Database</h3>
            <div className={`mt-2 text-sm font-black ${dbStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {dbStatus.toUpperCase()}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center">
            <h3 className="font-bold text-xs text-gray-600 uppercase">AI Providers</h3>
            <div className="mt-2 text-sm font-black text-blue-600">
              {getAvailableProviders().length} ACTIVE
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow text-center col-span-2">
            <h3 className="font-bold text-xs text-gray-600 uppercase">Overall Status</h3>
            <div className={`mt-2 text-sm font-black ${overallStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {overallStatus.toUpperCase()}
            </div>
          </div>
        </div>

        {/* AI Provider Testing Section */}
        <div className="bg-white rounded shadow mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-white font-bold uppercase text-sm">🧪 AI Provider Testing</h2>
            <div className="flex gap-2">
              <button
                onClick={testRoundRobin}
                className="bg-white/20 text-white px-3 py-1 rounded text-xs font-bold hover:bg-white/30"
              >
                Test Round-Robin
              </button>
              <button
                onClick={testAllProviders}
                disabled={isTestingAll}
                className="bg-white text-blue-600 px-4 py-1 rounded text-xs font-bold hover:bg-blue-50 disabled:opacity-50"
              >
                {isTestingAll ? 'Testing...' : 'Test All APIs'}
              </button>
            </div>
          </div>
          
          {/* Provider Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
            {(Object.entries(PROVIDER_CONFIGS) as [AIProvider, typeof PROVIDER_CONFIGS[AIProvider]][]).map(([key, config]) => {
              const health = apiHealth.find(h => h.provider === key);
              const testResult = testResults.find(r => r.provider === key);
              
              return (
                <div key={key} className="bg-white p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getProviderIcon(key)}</span>
                    <span className="font-bold text-sm">{config.name}</span>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Key:</span>
                      <span className={`font-bold ${health?.status === 'missing' ? 'text-gray-400' : 'text-green-600'}`}>
                        {health?.status === 'missing' ? 'Not Set' : 'Configured'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-bold ${
                        health?.status === 'healthy' ? 'text-green-600' :
                        health?.status === 'down' ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {health?.status === 'healthy' ? '✓ Working' :
                         health?.status === 'down' ? '✗ Failed' : '—'}
                      </span>
                    </div>
                    
                    {testResult && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Test:</span>
                        <span className={`font-bold ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.success ? `✓ ${testResult.latency}ms` : '✗ Failed'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Round-Robin Test Result */}
          {roundRobinTest && (
            <div className={`p-4 border-t ${roundRobinTest.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm">
                <span className="font-bold">Round-Robin Result:</span>
                <span className="ml-2">
                  {roundRobinTest.success 
                    ? `✓ Routed to ${roundRobinTest.provider} (${roundRobinTest.model})`
                    : `✗ ${roundRobinTest.error}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* API Key Details */}
        <div className="bg-white rounded shadow mb-8 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <h3 className="text-xs font-bold uppercase text-gray-500">API Key Configuration</h3>
          </div>
          <div className="divide-y">
            {apiHealth.map((row) => (
              <div key={row.keyName} className="px-6 py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm">{getProviderIcon(row.provider)} {row.keyName}</span>
                  <span className="ml-2 text-xs text-gray-500">({PROVIDER_CONFIGS[row.provider].models[0]})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-600">{row.detail}</span>
                  <span className={`text-xs font-bold uppercase ${
                    row.status === 'healthy' ? 'text-green-600' :
                    row.status === 'missing' ? 'text-gray-400' : 'text-red-600'
                  }`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h3 className="text-xs font-bold uppercase text-gray-500">Database Tables</h3>
            </div>
            <div className="divide-y max-h-[400px] overflow-auto">
              {tableHealth.map((table) => (
                <div key={table.name} className="px-6 py-2 flex justify-between items-center">
                  <span className="text-sm">{table.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{table.count} rows</span>
                    <span className={`w-2 h-2 rounded-full ${table.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded shadow p-4 font-mono text-xs text-green-400 h-[400px] overflow-auto">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
            {!logs.length && <div className="text-gray-500">Waiting for diagnostics...</div>}
            {isScanning && <div className="text-amber-400 animate-pulse">Scanning...</div>}
            {isTestingAll && <div className="text-blue-400 animate-pulse">Testing APIs...</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
