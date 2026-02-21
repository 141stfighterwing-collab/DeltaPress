import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { geminiValidateApiKey } from "../../services/geminiClient";
import AdminSidebar from '../../components/AdminSidebar';

interface TableHealth {
  name: string;
  count: number | null;
  status: 'ok' | 'blocked' | 'missing';
  error?: string;
}

interface ApiHealth {
  keyName: string;
  provider: 'gemini' | 'kimi' | 'aiml';
  status: 'healthy' | 'down' | 'missing';
  detail: string;
}

const DiagnosticsView: React.FC = () => {
  const navigate = useNavigate();
  const [geminiStatus, setGeminiStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [dbStatus, setDbStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [overallStatus, setOverallStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [tableHealth, setTableHealth] = useState<TableHealth[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealth[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const safeEnv = (name: string): string => {
    const viteVal = (import.meta as any)?.env?.[name];
    const procVal = (process as any)?.env?.[name];
    return (viteVal || procVal || '').trim();
  };

  const maskKey = (key: string): string => {
    if (!key) return 'missing';
    if (key.length <= 8) return `${key.slice(0, 2)}***`;
    return `${key.slice(0, 4)}***${key.slice(-4)}`;
  };

  const summarizeGeminiError = (raw?: string) => {
    if (!raw) return 'No error payload returned.';

    try {
      const parsed = JSON.parse(raw);
      const message = parsed?.error?.message || parsed?.message || raw;
      const status = parsed?.error?.status ? ` status=${parsed.error.status};` : '';
      const code = typeof parsed?.error?.code !== 'undefined' ? ` code=${parsed.error.code};` : '';
      return `${code}${status} message=${String(message).replace(/\s+/g, ' ').trim()}`;
    } catch {
      return raw.replace(/\s+/g, ' ').trim();
    }
  };

  const runRepair = async () => {
    setIsRepairing(true);
    addLog("🛠️ STARTING SUPREME SCHEMA REPAIR...");
    try {
      const repairSQL = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#000000';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#f1f1f1';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#111111';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_font TEXT DEFAULT 'serif';

        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now()
        );

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

        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 35;
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS use_current_events BOOLEAN DEFAULT false;
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

        ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES posts(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS journalist_id UUID REFERENCES journalists(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_image TEXT;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'post';
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;

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

  const validateKimiKey = async (key: string): Promise<{ ok: boolean; detail: string }> => {
    try {
      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [{ role: 'user', content: 'Reply with OK' }],
          max_tokens: 5,
          temperature: 0
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return { ok: false, detail: `status=${response.status}; body=${summarizeGeminiError(text)}` };
      }

      return { ok: true, detail: `status=${response.status}` };
    } catch (error: any) {
      return { ok: false, detail: `transport=${error?.message || 'unknown error'}` };
    }
  };

  const validateAimlKey = async (key: string): Promise<{ ok: boolean; detail: string }> => {
    try {
      const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Reply with OK' }],
          max_tokens: 5,
          temperature: 0
        })
      });

      if (!response.ok) {
        const text = await response.text();
        return { ok: false, detail: `status=${response.status}; body=${summarizeGeminiError(text)}` };
      }

      return { ok: true, detail: `status=${response.status}` };
    } catch (error: any) {
      return { ok: false, detail: `transport=${error?.message || 'unknown error'}` };
    }
  };

  const runDiagnostics = async () => {
    setLogs([]);
    addLog("🚀 INITIALIZING DIAGNOSTICS...");

    let dbHealthy = false;

    try {
      const { error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      dbHealthy = true;
      addLog("✅ Supabase Engine: Live.");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`❌ Supabase Error: ${err.message}`);
    }

    const geminiKeys = [
      { keyName: 'API_KEY', value: safeEnv('API_KEY') },
      { keyName: 'GEMINI_API_KEY', value: safeEnv('GEMINI_API_KEY') },
      { keyName: 'VITE_GEMINI_API_KEY', value: safeEnv('VITE_GEMINI_API_KEY') },
      { keyName: 'GEMINI2_API_KEY', value: safeEnv('GEMINI2_API_KEY') },
      { keyName: 'Gemini2_API_KEY', value: safeEnv('Gemini2_API_KEY') }
    ];
    const kimiKey = { keyName: 'KIMI_API_KEY', value: safeEnv('KIMI_API_KEY') };
    const aimlKey = { keyName: 'ML_API_KEY', value: safeEnv('ML_API_KEY') };

    const allApiResults: ApiHealth[] = [];

    addLog('🔎 Running Gemini key validations (3-key round-robin set)...');
    for (const item of geminiKeys) {
      if (!item.value) {
        allApiResults.push({
          keyName: item.keyName,
          provider: 'gemini',
          status: 'missing',
          detail: 'Missing key value'
        });
        addLog(`❌ Gemini key ${item.keyName}: missing.`);
        continue;
      }

      addLog(`ℹ️ Gemini key ${item.keyName} (${maskKey(item.value)}): probing models/endpoints...`);
      const report = await geminiValidateApiKey(item.value);
      const firstSuccess = report.attempts.find(a => a.ok);

      report.attempts.forEach((attempt, idx) => {
        if (attempt.ok) {
          addLog(`✅ [${item.keyName}] Attempt #${idx + 1}: model=${attempt.model}; endpoint=${attempt.baseUrl}; status=${attempt.status}`);
        } else {
          addLog(`❌ [${item.keyName}] Attempt #${idx + 1}: model=${attempt.model}; endpoint=${attempt.baseUrl}; status=${attempt.status || 'transport-error'}; details=${summarizeGeminiError(attempt.error)}`);
        }
      });

      allApiResults.push({
        keyName: item.keyName,
        provider: 'gemini',
        status: report.ok ? 'healthy' : 'down',
        detail: report.ok && firstSuccess
          ? `healthy via ${firstSuccess.model} @ ${firstSuccess.baseUrl}`
          : 'all model/endpoint attempts failed'
      });
    }

    const activeGeminiKeys = geminiKeys.filter((k, idx, arr) => !!k.value && arr.findIndex(other => other.value === k.value) === idx);
    if (activeGeminiKeys.length > 1) {
      addLog(`🔁 Gemini Round-Robin Test: cycling ${activeGeminiKeys.length} configured keys...`);
      for (let i = 0; i < activeGeminiKeys.length; i++) {
        const current = activeGeminiKeys[i];
        const probe = await geminiValidateApiKey(current.value, ['gemini-2.0-flash']);
        addLog(
          probe.ok
            ? `✅ Round-Robin slot #${i + 1}: key=${current.keyName}; selected=gemini-2.0-flash; result=healthy.`
            : `❌ Round-Robin slot #${i + 1}: key=${current.keyName}; selected=gemini-2.0-flash; result=down.`
        );
      }
    } else {
      addLog('⚠️ Gemini Round-Robin Test skipped: need at least 2 configured Gemini keys.');
    }

    if (!kimiKey.value) {
      allApiResults.push({ keyName: kimiKey.keyName, provider: 'kimi', status: 'missing', detail: 'Missing key value' });
      addLog('❌ KIMI_API_KEY: missing.');
    } else {
      addLog(`ℹ️ Kimi key ${kimiKey.keyName} (${maskKey(kimiKey.value)}): validating...`);
      const kimi = await validateKimiKey(kimiKey.value);
      allApiResults.push({ keyName: kimiKey.keyName, provider: 'kimi', status: kimi.ok ? 'healthy' : 'down', detail: kimi.detail });
      addLog(kimi.ok ? `✅ Kimi validation passed: ${kimi.detail}` : `❌ Kimi validation failed: ${kimi.detail}`);
    }

    if (!aimlKey.value) {
      allApiResults.push({ keyName: aimlKey.keyName, provider: 'aiml', status: 'missing', detail: 'Missing key value' });
      addLog('❌ ML_API_KEY (AIML): missing.');
    } else {
      addLog(`ℹ️ AIML key ${aimlKey.keyName} (${maskKey(aimlKey.value)}): validating...`);
      const aiml = await validateAimlKey(aimlKey.value);
      allApiResults.push({ keyName: aimlKey.keyName, provider: 'aiml', status: aiml.ok ? 'healthy' : 'down', detail: aiml.detail });
      addLog(aiml.ok ? `✅ AIML validation passed: ${aiml.detail}` : `❌ AIML validation failed: ${aiml.detail}`);
    }

    setApiHealth(allApiResults);

    const geminiHealthy = allApiResults.some(r => r.provider === 'gemini' && r.status === 'healthy');
    const nonGeminiHealthy = allApiResults
      .filter(r => r.provider !== 'gemini')
      .every(r => r.status === 'healthy');

    setGeminiStatus(geminiHealthy ? 'ok' : 'error');

    const healthy = dbHealthy && geminiHealthy && nonGeminiHealthy;
    setOverallStatus(healthy ? 'ok' : 'error');
    addLog(healthy ? '✅ Overall status: healthy.' : '❌ Overall status: degraded (check failed API keys/components).');

    await scanTableIntegrity();
  };

  useEffect(() => { runDiagnostics(); }, []);

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
            <h3 className="font-bold text-gray-800 text-sm uppercase">Overall</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${overallStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{overallStatus}</div>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">API Key Health (Healthy/Down)</h3>
          </div>
          <div className="divide-y">
            {apiHealth.map((row) => (
              <div key={row.keyName} className="px-6 py-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-bold text-gray-800">{row.keyName} <span className="text-[10px] text-gray-500 uppercase">({row.provider})</span></div>
                <div className="text-xs text-gray-600">{row.detail}</div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${row.status === 'healthy' ? 'text-green-600' : row.status === 'missing' ? 'text-amber-600' : 'text-red-600'}`}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>
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
            {!logs.length && <div>Waiting for diagnostics output...</div>}
            {isScanning && <div className="text-amber-300">Scanning tables...</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
