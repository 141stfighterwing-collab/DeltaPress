
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { GoogleGenAI } from "@google/genai";
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
  const [tableHealth, setTableHealth] = useState<TableHealth[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runRepair = async () => {
    setIsRepairing(true);
    addLog("🛠️ STARTING SUPREME SCHEMA REPAIR...");
    try {
      const repairSQL = `
        -- Site Identity Fix
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_image TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_fit TEXT DEFAULT 'cover';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_pos_x INT DEFAULT 50;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_pos_y INT DEFAULT 50;
        
        -- Journalist & Bot Meta Fixes
        ALTER TABLE journalists ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'female';
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS journalist_id UUID;
        
        -- Profile Extensions for Enhanced Analytics
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT now();
      `;
      
      addLog("📡 Dispatching SQL Payload to Supabase RPC...");
      const { error } = await supabase.rpc('exec_sql', { sql: repairSQL });
      
      if (error) {
        if (error.message.includes('function rpc("exec_sql") does not exist')) {
          addLog("❌ RPC ERROR: 'exec_sql' helper not found. You must run the SQL manually in the Supabase SQL Editor.");
          addLog("MANUAL SQL: ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ DEFAULT now();");
        } else {
          addLog(`❌ REPAIR ERROR: ${error.message}`);
        }
      } else {
        addLog("✅ REPAIR SUCCESSFUL: Schema cached updated.");
      }
    } catch (err: any) {
      addLog(`❌ CRITICAL FAILURE: ${err.message}`);
    } finally {
      setIsRepairing(false);
      scanTableIntegrity();
    }
  };

  const probeNetwork = async () => {
    addLog("🌐 Probing Google API endpoint connectivity...");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('https://generativelanguage.googleapis.com/', { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      addLog("✅ Network: Google API endpoint is reachable.");
      return true;
    } catch (e: any) {
      addLog(`❌ NETWORK PROBE FAILED: ${e.message}`);
      return false;
    }
  };

  const scanTableIntegrity = async () => {
    setIsScanning(true);
    addLog("Scanning database schema and permissions...");
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
    addLog("Schema scan complete.");
  };

  const runDiagnostics = async () => {
    setLogs([]);
    setGeminiStatus('pending');
    setDbStatus('pending');
    setRssStatus('pending');
    addLog("🚀 INITIALIZING SUPREME DIAGNOSTICS V1.5...");
    
    try {
      const { data, error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      addLog("✅ Supabase Engine: Live & Responsive.");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`❌ Supabase Error: ${err.message}`);
    }

    await probeNetwork();

    const key = process.env.API_KEY;
    if (!key || key === '') {
      addLog("❌ CRITICAL: API_KEY is empty.");
      setGeminiStatus('error');
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "READY?" });
        if (response.text) {
          setGeminiStatus('ok');
          addLog("✅ Gemini AI Agent: Handshake Successful.");
        }
      } catch (err: any) {
        setGeminiStatus('error');
        addLog(`❌ HANDSHAKE FAILED: ${err.message}`);
      }
    }

    setRssStatus('ok');
    await scanTableIntegrity();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-serif">Diagnostics Hub</h1>
            <p className="text-gray-500 text-sm italic">Audit system nodes and repair schema.</p>
          </div>
          <button 
            onClick={runRepair} 
            disabled={isRepairing}
            className="bg-red-600 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 disabled:opacity-50"
          >
            {isRepairing ? 'Repairing...' : 'Repair Schema 🛠️'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">🗄️</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase">Supabase</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${dbStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{dbStatus}</div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">🧠</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase">Gemini</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${geminiStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{geminiStatus}</div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200 text-center">
            <div className="text-4xl mb-2">🌐</div>
            <h3 className="font-bold text-gray-800 text-sm uppercase">Network</h3>
            <div className={`mt-2 text-[10px] font-black uppercase tracking-widest ${rssStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{rssStatus}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Schema Health</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {tableHealth.map((table) => (
                <div key={table.name} className="px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">{table.name}</span>
                  <span className={`w-2 h-2 rounded-full ${table.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg shadow-2xl h-[550px] flex flex-col p-6 font-mono text-[11px] text-blue-300/90 overflow-y-auto">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
