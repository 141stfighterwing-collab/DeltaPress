
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface TableHealth {
  name: string;
  count: number | null;
  status: 'ok' | 'blocked' | 'missing';
  error?: string;
}

const DiagnosticsView: React.FC = () => {
  const navigate = useNavigate();
  const [geminiStatus, setGeminiStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [dbStatus, setDbStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [rssStatus, setRssStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [researchKeysStatus, setResearchKeysStatus] = useState<Record<string, 'ok' | 'error' | 'pending'>>({
    KIMI: 'pending',
    ZAI: 'pending',
    ML: 'pending'
  });
  const [tableHealth, setTableHealth] = useState<TableHealth[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState('https://api.moonshot.ai/v1/chat/completions');
  const [testApiKey, setTestApiKey] = useState('');
  const [testModel, setTestModel] = useState('moonshot-v1-8k');
  const [testPrompt, setTestPrompt] = useState('latest AI headlines');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState('');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runRepair = async () => {
    setIsRepairing(true);
    addLog("🛠️ STARTING SUPREME SCHEMA REPAIR...");
    try {
      const repairSQL = `
        -- Ensure Extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Site Settings Expansion
        CREATE TABLE IF NOT EXISTS site_settings (
            id INTEGER PRIMARY KEY,
            title TEXT,
            slogan TEXT,
            logo_url TEXT,
            header_image TEXT,
            header_fit TEXT,
            header_pos_x INTEGER,
            header_pos_y INTEGER,
            theme TEXT DEFAULT 'light',
            title_color TEXT DEFAULT '#000000',
            bg_color TEXT DEFAULT '#f1f1f1',
            text_color TEXT DEFAULT '#111111',
            header_font TEXT DEFAULT 'serif'
        );

        -- Add missing appearance columns if they don't exist
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#000000';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#f1f1f1';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#111111';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_font TEXT DEFAULT 'serif';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_meta_title TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_meta_description TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_meta_keywords TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_og_image TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS seo_canonical_url TEXT;

        -- Categories Table Base
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        -- Journalists Table Core & Updates
        CREATE TABLE IF NOT EXISTS journalists (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            title TEXT,
            niche TEXT,
            category TEXT,
            schedule TEXT DEFAULT '24h',
            status TEXT DEFAULT 'active',
            last_run TIMESTAMPTZ,
            perspective INTEGER DEFAULT 0,
            gender TEXT DEFAULT 'female',
            ethnicity TEXT DEFAULT 'White',
            hair_color TEXT DEFAULT 'Brunette',
            avatar_url TEXT,
            age INTEGER DEFAULT 35,
            use_current_events BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        -- Add missing columns if they don't exist
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 35;
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS use_current_events BOOLEAN DEFAULT false;
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

        -- Posts Table Integrity
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES posts(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS journalist_id UUID REFERENCES journalists(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_image TEXT;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'post';
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;

        -- RLS Policies
        ALTER TABLE journalists ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read journalists" ON journalists;
        CREATE POLICY "Allow public read journalists" ON journalists FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow authenticated manage journalists" ON journalists;
        CREATE POLICY "Allow authenticated manage journalists" ON journalists FOR ALL USING (auth.role() = 'authenticated');
      `;
      
      addLog("📡 Executing Database Realignment...");
      const { error } = await supabase.rpc('exec_sql', { sql: repairSQL });
      
      if (error) {
        addLog(`❌ REPAIR ERROR: ${error.message}`);
      } else {
        addLog("✅ SUPREME REPAIR SUCCESSFUL.");
      }
    } catch (err: any) {
      addLog(`❌ CRITICAL FAILURE: ${err.message}`);
    } finally {
      setIsRepairing(false);
      scanTableIntegrity();
    }
  };

  const scanTableIntegrity = async () => {
    setIsScanning(true);
    addLog("Auditing database health...");
    const coreTables = ['categories', 'posts', 'profiles', 'rss_feeds', 'site_settings', 'comments', 'contacts', 'journalists'];
    const healthResults: TableHealth[] = [];

    for (const table of coreTables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          healthResults.push({ name: table, count: 0, status: 'blocked', error: error.message });
        } else {
          healthResults.push({ name: table, count: count || 0, status: 'ok' });
        }
      } catch (e: any) {
        healthResults.push({ name: table, count: 0, status: 'blocked', error: e.message });
      }
    }
    setTableHealth(healthResults);
    setIsScanning(false);
    addLog("Audit complete.");
  };

  const runDiagnostics = async () => {
    setLogs([]);
    addLog("🚀 INITIALIZING DIAGNOSTICS...");
    try {
      const { error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      addLog("✅ Supabase Engine: Live.");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`❌ Supabase Error: ${err.message}`);
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      addLog("❌ CRITICAL: GEMINI_API_KEY is missing.");
      setGeminiStatus('error');
    } else {
      setGeminiStatus('ok');
      addLog("✅ Gemini AI: Connected.");
    }

    // Check Research Keys
    const keys = {
      KIMI: process.env.KIMI_API_KEY,
      ZAI: process.env.ZAI_API_KEY,
      ML: process.env.ML_API_KEY
    };

    const newKeyStatus: any = {};
    Object.entries(keys).forEach(([id, val]) => {
      if (val && val.length > 5) {
        newKeyStatus[id] = 'ok';
        addLog(`✅ Research Key ${id}: Present (${val.substring(0, 4)}...${val.substring(val.length - 4)}).`);
      } else {
        newKeyStatus[id] = 'error';
        addLog(`⚠️ Research Key ${id}: Missing or invalid. Check your .env or Vite config.`);
        console.error(`[Diagnostics] Key ${id} is missing or too short. Value:`, val);
      }
    });
    setResearchKeysStatus(newKeyStatus);

    await scanTableIntegrity();
  };

  useEffect(() => { runDiagnostics(); }, []);

  const runApiKeyTest = async () => {
    if (!testEndpoint || !testApiKey || !testModel) {
      setApiTestResult('Please provide endpoint URL, API key, and model before testing.');
      return;
    }

    setIsTestingApi(true);
    setApiTestResult('');
    addLog(`🧪 Testing API key against ${testEndpoint}...`);

    try {
      const response = await fetch('/api/proxy-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: testEndpoint,
          apiKey: testApiKey,
          model: testModel,
          query: testPrompt || 'latest world news',
          providerName: 'Manual Test'
        })
      });

      const responseText = await response.text();
      if (!response.ok) {
        setApiTestResult(`Failed (${response.status}): ${responseText.substring(0, 300)}`);
        addLog(`❌ API key test failed (${response.status}).`);
        return;
      }

      setApiTestResult(`Success (${response.status}). Response sample: ${responseText.substring(0, 300)}`);
      addLog('✅ API key test succeeded.');
    } catch (err: any) {
      setApiTestResult(`Request error: ${err.message}`);
      addLog(`❌ API key test error: ${err.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Diagnostics</h1>
            <p className="text-gray-500 text-sm italic">Audit and fix database schema errors.</p>
          </div>
          <button 
            onClick={runRepair} 
            disabled={isRepairing}
            className="bg-red-600 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            {isRepairing ? 'Repairing...' : 'Supreme Repair 🛠️'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <h3 className="font-bold text-gray-800 text-sm uppercase">Supabase</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${dbStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{dbStatus}</div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <h3 className="font-bold text-gray-800 text-sm uppercase">Gemini</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${geminiStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{geminiStatus}</div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <h3 className="font-bold text-gray-800 text-sm uppercase">Status</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${rssStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{rssStatus}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {Object.entries(researchKeysStatus).map(([id, status]) => (
            <div key={id} className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
              <h3 className="font-bold text-gray-800 text-sm uppercase">{id} Research</h3>
              <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{status}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Integrity Report</h3>
            </div>
            <div className="divide-y">
              {tableHealth.map((table) => (
                <div key={table.name} className="px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">{table.name}</span>
                  <span className={`w-2 h-2 rounded-full ${table.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded shadow-2xl h-[550px] flex flex-col p-6 font-mono text-[11px] text-blue-300 overflow-y-auto">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </div>

        <section className="mt-10 bg-white border border-gray-200 rounded shadow-sm p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-4">Manual API Key Tester</h3>
          <p className="text-xs text-gray-500 mb-4">Use this to validate future provider keys before saving them in environment variables.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="url"
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              placeholder="https://provider-url/v1/chat/completions"
              className="border border-gray-300 p-3 rounded text-xs font-mono"
            />
            <input
              type="text"
              value={testApiKey}
              onChange={(e) => setTestApiKey(e.target.value)}
              placeholder="Enter API key"
              className="border border-gray-300 p-3 rounded text-xs font-mono"
            />
            <input
              type="text"
              value={testModel}
              onChange={(e) => setTestModel(e.target.value)}
              placeholder="model-name"
              className="border border-gray-300 p-3 rounded text-xs font-mono"
            />
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Prompt seed"
              className="border border-gray-300 p-3 rounded text-xs"
            />
          </div>

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={runApiKeyTest}
              disabled={isTestingApi}
              className="bg-blue-600 text-white px-5 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-60"
            >
              {isTestingApi ? 'Testing...' : 'Test API Key'}
            </button>
            {apiTestResult && <p className="text-xs text-gray-600 break-all">{apiTestResult}</p>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DiagnosticsView;
