
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
  const [showSql, setShowSql] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const sqlFix = `-- 🚀 TWENTY TEN - SUPREME SCHEMA REPAIR V9 (ULTIMATE CONTACTS FIX)
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO RESOLVE ALL 'PHONE' COLUMN ERRORS:

-- 1. HARDEN CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HARDEN JOURNALISTS (BOTS)
CREATE TABLE IF NOT EXISTS public.journalists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT,
  category TEXT,
  schedule TEXT,
  status TEXT DEFAULT 'active',
  last_run TIMESTAMPTZ,
  perspective INTEGER DEFAULT 0,
  gender TEXT DEFAULT 'female',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HARDEN POSTS (AUTHORSHIP)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS journalist_id UUID REFERENCES public.journalists(id);

-- 4. NUCLEAR CONTACTS REPAIR
-- This ensures the table and every required column exists.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'contacts') THEN
        CREATE TABLE public.contacts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS message TEXT;
        ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 5. HARDEN SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  title TEXT DEFAULT 'Twenty Ten',
  slogan TEXT DEFAULT 'Just another WordPress theme',
  header_image TEXT,
  header_fit TEXT DEFAULT 'cover',
  header_pos_x INTEGER DEFAULT 50,
  header_pos_y INTEGER DEFAULT 50,
  banner_text TEXT,
  theme TEXT DEFAULT 'default',
  content_moderation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESET PERMISSIONS
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full Access" ON public.categories;
DROP POLICY IF EXISTS "Full Settings Access" ON public.site_settings;
DROP POLICY IF EXISTS "Full Post Access" ON public.posts;
DROP POLICY IF EXISTS "Full Bot Access" ON public.journalists;
DROP POLICY IF EXISTS "Full Contact Access" ON public.contacts;

CREATE POLICY "Full Access" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Settings Access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Post Access" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Bot Access" ON public.journalists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full Contact Access" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- 7. GRANT ACCESS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, postgres, service_role;
GRANT ALL ON SCHEMA public TO anon, authenticated, postgres, service_role;

-- 8. INITIAL DATA SEED
INSERT INTO public.site_settings (id, title, slogan)
VALUES (1, 'Nathan C Vanguard', 'World News & Ideological Analysis')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, slogan = EXCLUDED.slogan;

INSERT INTO public.categories (name, slug)
VALUES ('Politics', 'politics'), ('Economics', 'economics'), ('Technology', 'technology'), ('General', 'general')
ON CONFLICT DO NOTHING;`;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
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
  };

  const runDiagnostics = async () => {
    setLogs([]);
    setGeminiStatus('pending');
    setDbStatus('pending');
    setRssStatus('pending');
    addLog("Initiating system-wide audit...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setDbStatus('ok');
    } catch (err: any) {
      setDbStatus('error');
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "PONG" });
      setGeminiStatus('ok');
    } catch (err: any) {
      setGeminiStatus('error');
    }
    await scanTableIntegrity();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusCard = ({ title, status, icon }: { title: string, status: 'pending' | 'ok' | 'error', icon: string }) => (
    <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
      <div className={`text-4xl mb-2 ${status === 'pending' ? 'animate-pulse' : ''}`}>{icon}</div>
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tighter">{title}</h3>
      <div className={`mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
        status === 'ok' ? 'bg-green-50 text-green-500' : status === 'error' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
      }`}>
        {status === 'ok' ? 'Online' : status === 'error' ? 'Sync Failure' : 'Pinging...'}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">Diagnostics Hub</h1>
            <p className="text-gray-400 text-xs italic uppercase font-bold tracking-widest mt-1">Audit database schema & permissions</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSql(!showSql)} className={`px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md transition-all ${showSql ? 'bg-red-600 text-white' : 'bg-gray-800 text-white hover:bg-black'}`}>
              {showSql ? 'Hide SQL Script' : 'REPAIR SCHEMA 🛠️'}
            </button>
            <button onClick={runDiagnostics} className="bg-[#0073aa] text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#005a87]">
              Re-Scan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatusCard title="Supabase Engine" status={dbStatus} icon="🔌" />
          <StatusCard title="Gemini AI Agent" status={geminiStatus} icon="🧠" />
          <StatusCard title="News Pipeline" status={rssStatus} icon="📡" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Integrity Audit</h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-50 text-[10px] font-black uppercase text-gray-400">
                    <tr><th className="px-6 py-4">Table</th><th className="px-6 py-4">Status</th></tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                    {tableHealth.map((table, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{table.name}</td>
                            <td className="px-6 py-4">
                                {table.status === 'ok' ? (
                                    <span className="text-green-500 text-[10px] font-bold uppercase tracking-widest">● Healthy</span>
                                ) : (
                                    <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest">● Blocked</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          <div className="space-y-8">
            {showSql ? (
              <div className="bg-white p-8 rounded border-t-8 border-red-600 shadow-2xl animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded flex items-center justify-center text-xl">🛠️</div>
                  <div>
                    <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">SUPREME REPAIR V9</h3>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Contacts & Messages System</p>
                  </div>
                </div>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-6 rounded text-[10px] font-mono overflow-x-auto max-h-[400px]">
                    {sqlFix}
                  </pre>
                  <button onClick={() => { navigator.clipboard.writeText(sqlFix); alert("Copied!"); }} className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase shadow-lg">Copy SQL</button>
                </div>
                <div className="mt-6 bg-blue-50 p-4 rounded text-[11px] text-blue-800 leading-relaxed font-bold">
                  <p className="mb-2 uppercase tracking-widest">⚠️ Important instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copy the SQL script above.</li>
                    <li>Go to your Supabase Dashboard &gt; SQL Editor.</li>
                    <li>Paste and Run the script.</li>
                    <li>IMPORTANT: If the 'phone' error persists, wait 60 seconds for the PostgREST cache to refresh.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6 rounded shadow-2xl border border-gray-800 h-[500px] overflow-y-auto">
                {logs.map((log, i) => (
                    <div key={i} className="text-[11px] border-l-2 border-gray-700 pl-2 ml-1 mb-1">{log}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
