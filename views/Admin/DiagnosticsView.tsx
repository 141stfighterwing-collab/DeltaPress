
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

  const sqlFix = `-- THE "NUCLEAR" FIX FOR DISAPPEARING DATA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. FORCE CATEGORIES VISIBILITY (Fixes the "0 Rows Seen" issue)
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
GRANT SELECT ON categories TO anon, authenticated;

-- 2. FORCE POSTS VISIBILITY
ALTER TABLE IF EXISTS posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view posts" ON posts;
CREATE POLICY "Public can view posts" ON posts FOR SELECT USING (true);
GRANT SELECT ON posts TO anon, authenticated;

-- 3. FORCE PROFILES VISIBILITY
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles" ON profiles;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
GRANT SELECT ON profiles TO anon, authenticated;

-- 4. ENSURE ADMINS CAN MANAGE EVERYTHING
DROP POLICY IF EXISTS "Admins can manage everything" ON categories;
CREATE POLICY "Admins can manage everything" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);`;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const scanTableIntegrity = async () => {
    setIsScanning(true);
    addLog("Scanning database schema and permissions...");
    const coreTables = ['categories', 'posts', 'profiles', 'rss_feeds', 'site_settings', 'site_analytics', 'comments'];
    const healthResults: TableHealth[] = [];

    for (const table of coreTables) {
      try {
        // We use a select count to verify RLS visibility
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        
        if (error) {
          addLog(`Error on ${table}: ${error.code} - ${error.message}`);
          if (error.code === '42P01') {
            healthResults.push({ name: table, count: 0, status: 'missing', error: "Table doesn't exist" });
          } else if (error.code === '42501') {
            healthResults.push({ name: table, count: 0, status: 'blocked', error: "RLS Policy Blocked" });
          } else {
            healthResults.push({ name: table, count: 0, status: 'blocked', error: error.message });
          }
        } else {
          healthResults.push({ name: table, count: count || 0, status: 'ok' });
          if (count === 0) {
            addLog(`WARNING: Table ${table} is reachable but looks EMPTY (Possible RLS filter).`);
          } else {
            addLog(`Table ${table} is Healthy (${count} rows visible).`);
          }
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
      addLog(`Session Check: ${session ? 'Authenticated as ' + session.user.email : 'Anonymous User'}`);
      
      const { data, error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setDbStatus('ok');
      addLog("Supabase Bridge: SECURE");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`Supabase Bridge: FAILURE (${err.message})`);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Respond with only 'PONG'",
      });
      if (response.text.includes('PONG')) {
        setGeminiStatus('ok');
        addLog("AI Core: RESPONSIVE");
      } else {
        throw new Error("Invalid Pulse");
      }
    } catch (err: any) {
      setGeminiStatus('error');
      addLog(`AI Core: DISCONNECTED (${err.message})`);
    }

    await scanTableIntegrity();
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusCard = ({ title, status, icon }: { title: string, status: 'pending' | 'ok' | 'error', icon: string }) => (
    <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
      <div className={`text-4xl mb-2 ${status === 'pending' ? 'animate-pulse' : ''}`}>{icon}</div>
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tighter">{title}</h3>
      <div className={`mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
        status === 'ok' ? 'bg-green-50 text-green-500' : status === 'error' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
      }`}>
        {status === 'ok' ? 'Active' : status === 'error' ? 'Failed' : 'Pinging...'}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">System Diagnostics</h1>
            <p className="text-gray-400 text-xs italic uppercase font-bold tracking-widest mt-1">Infrastructure & Policy Audit Hub</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSql(!showSql)} className="bg-gray-800 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-black transition-all">
              {showSql ? 'Hide Repair SQL' : 'REPAIR DATA VISIBILITY'}
            </button>
            <button onClick={runDiagnostics} className="bg-[#0073aa] text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#005a87] transition-all">
              Re-Scan Database
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatusCard title="Database Link" status={dbStatus} icon="🔌" />
          <StatusCard title="AI Intelligence" status={geminiStatus} icon="🧠" />
          <StatusCard title="Feed Pipeline" status={rssStatus} icon="📡" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Validation Scan (Visibility Check)</h3>
                {isScanning && <span className="text-[9px] font-bold text-blue-500 animate-pulse">SCANNING...</span>}
            </div>
            <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-50 text-[10px] font-black uppercase text-gray-400">
                    <tr>
                        <th className="px-6 py-4">Table Name</th>
                        <th className="px-6 py-4">Rows Visible</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                    {tableHealth.map((table, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{table.name}</td>
                            <td className={`px-6 py-4 font-black ${table.count === 0 ? 'text-amber-500' : 'text-gray-900'}`}>
                                {table.count}
                            </td>
                            <td className="px-6 py-4">
                                {table.status === 'ok' ? (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${table.count === 0 ? 'text-amber-500' : 'text-green-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${table.count === 0 ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                                        {table.count === 0 ? 'Check RLS' : 'Visible'}
                                    </span>
                                ) : (
                                    <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest flex flex-col">
                                        <span>BLOCKED</span>
                                        <span className="text-[8px] opacity-60 normal-case italic font-normal">{table.error}</span>
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          <div className="space-y-8">
            {showSql ? (
              <div className="bg-white p-6 rounded border-t-4 border-blue-600 shadow-xl">
                <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-blue-600">
                  <span>🛠️</span> SUPABASE PERMISSION REPAIR
                </h3>
                <p className="text-[11px] text-gray-500 mb-6 leading-relaxed bg-blue-50 p-3 rounded border border-blue-100 italic">
                  Run this code in your Supabase SQL Editor. It forces the categories to be visible to the app even if RLS is on.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-[10px] font-mono overflow-x-auto leading-relaxed shadow-inner max-h-[350px]">
                    {sqlFix}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(sqlFix);
                      alert("Fix Script Copied!");
                    }}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded text-[9px] font-bold uppercase border border-white/20"
                  >
                    Copy SQL
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6 rounded shadow-2xl border border-gray-800 h-[450px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span className="ml-2 text-[10px] text-gray-500 uppercase font-black tracking-widest">Integrity_Monitor</span>
                </div>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-[11px]">
                      <span className="text-blue-500 mr-2 opacity-50">→</span>
                      {log}
                    </div>
                  ))}
                  <div className="animate-pulse inline-block w-2 h-4 bg-green-500 ml-1"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
