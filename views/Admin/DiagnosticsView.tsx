
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
        -- Ensure Extensions
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
            created_at TIMESTAMPTZ DEFAULT now()
        );

        -- Add missing category_id to journalists if it doesn't exist
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

        -- Site Settings Integrity
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS slogan TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_image TEXT;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_fit TEXT DEFAULT 'cover';
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_pos_x INTEGER DEFAULT 50;
        ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS header_pos_y INTEGER DEFAULT 50;

        -- RLS Policies
        ALTER TABLE journalists ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read journalists" ON journalists;
        CREATE POLICY "Allow public read journalists" ON journalists FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Allow authenticated manage journalists" ON journalists;
        CREATE POLICY "Allow authenticated manage journalists" ON journalists FOR ALL USING (auth.role() = 'authenticated');
        
        -- Fix RLS for Categories
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read categories" ON categories;
        CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
      `;
      
      addLog("📡 Executing Database Realignment...");
      const { error } = await supabase.rpc('exec_sql', { sql: repairSQL });
      
      if (error) {
        if (error.code === '42883') {
          addLog("❌ Error: RPC 'exec_sql' not found. You may need to manually run the SQL in Supabase Dashboard.");
        } else {
          addLog(`❌ REPAIR ERROR: ${error.message}`);
        }
      } else {
        addLog("✅ SUPREME REPAIR SUCCESSFUL: Journalists and Categories tables are now synchronized.");
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
    setGeminiStatus('pending');
    setDbStatus('pending');
    setRssStatus('pending');
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

    const key = process.env.API_KEY;
    if (!key) {
      addLog("❌ CRITICAL: API_KEY is missing.");
      setGeminiStatus('error');
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Handshake" });
        setGeminiStatus('ok');
        addLog("✅ Gemini AI: Connected.");
      } catch (err: any) {
        setGeminiStatus('error');
        addLog(`❌ Gemini Error: ${err.message}`);
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Integrity Report</h3>
            </div>
            <div className="divide-y">
              {tableHealth.map((table) => (
                <div key={table.name} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{table.name}</span>
                    {table.error && <div className="text-[8px] text-red-400 font-mono mt-1">{table.error}</div>}
                  </div>
                  <span className={`w-2 h-2 rounded-full ${table.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded shadow-2xl h-[550px] flex flex-col p-6 font-mono text-[11px] text-blue-300 overflow-y-auto">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
