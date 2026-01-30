
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

  const sqlFix = `-- 🚀 TWENTY TEN - EMERGENCY SCHEMA REPAIR
-- Copy this script and run it in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

-- 1. FIX SITE SETTINGS COLUMNS (Restores Banner URL & Autofit)
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS content_moderation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS header_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS banner_text TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';

-- 2. ENSURE RLS POLCIES ARE OPEN FOR SITE_SETTINGS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view settings" ON site_settings;
CREATE POLICY "Anyone can view settings" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;
CREATE POLICY "Admins can manage settings" ON site_settings FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. FIX NEWS & CATEGORY PERMISSIONS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);

-- 4. FINAL PERMISSIONS GRANT
GRANT SELECT ON site_settings TO anon;
GRANT ALL ON site_settings TO authenticated;
GRANT SELECT ON categories TO anon;`;

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
      addLog(`Session Check: ${session ? 'Authenticated' : 'Anonymous'}`);
      setDbStatus('ok');
    } catch (err: any) {
      setDbStatus('error');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "PONG",
      });
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
            <button onClick={() => setShowSql(!showSql)} className={`px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md transition-all ${showSql ? 'bg-red-600 text-white shadow-red-200' : 'bg-gray-800 text-white hover:bg-black'}`}>
              {showSql ? 'Hide SQL Script' : 'REPAIR SCHEMA 🛠️'}
            </button>
            <button onClick={runDiagnostics} className="bg-[#0073aa] text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#005a87] transition-all">
              Re-Scan Infrastructure
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatusCard title="Supabase Engine" status={dbStatus} icon="🔌" />
          <StatusCard title="Gemini AI Agent" status={geminiStatus} icon="🧠" />
          <StatusCard title="News Pipeline" status={rssStatus} icon="📡" />
        </div>

        {/* PROMINENT REPAIR BLOCK */}
        {tableHealth.some(t => t.status !== 'ok') && !showSql && (
          <div className="mb-10 bg-amber-50 border-l-8 border-amber-400 p-8 rounded shadow-lg animate-pulse">
            <div className="flex items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">Database Schema Mismatch Detected</h2>
                <p className="text-amber-700 text-sm italic">One or more required columns are missing from your database. This will cause "Save Failed" errors in Settings.</p>
                <button 
                  onClick={() => setShowSql(true)}
                  className="mt-4 bg-amber-900 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  Get the SQL Fix Script
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Table Integrity Audit</h3>
            </div>
            <table className="w-full text-left">
                <thead className="bg-white border-b border-gray-50 text-[10px] font-black uppercase text-gray-400">
                    <tr>
                        <th className="px-6 py-4">Table</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-50">
                    {tableHealth.map((table, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-gray-700">{table.name}</td>
                            <td className="px-6 py-4">
                                {table.status === 'ok' ? (
                                    <span className="text-green-500 text-[10px] font-bold uppercase tracking-widest">● Healthy</span>
                                ) : (
                                    <div className="flex flex-col">
                                      <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest">● Mismatched</span>
                                      {table.name === 'site_settings' && <span className="text-[8px] text-red-300 font-black uppercase mt-0.5 tracking-tighter">Fix: content_moderation column missing</span>}
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          <div className="space-y-8">
            {showSql ? (
              <div className="bg-white p-8 rounded border-t-8 border-red-600 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded flex items-center justify-center text-xl">🛠️</div>
                  <div>
                    <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Quick Fix - Paste into Supabase</h3>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">This restores full functionality to Settings</p>
                  </div>
                </div>
                
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-6 rounded text-[10px] font-mono overflow-x-auto leading-relaxed shadow-inner max-h-[400px]">
                    {sqlFix}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(sqlFix);
                      alert("Repair Script Copied to Clipboard!");
                    }}
                    className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    Copy SQL Fix
                  </button>
                </div>
                <p className="mt-6 text-[11px] text-gray-500 leading-relaxed italic border-l-2 border-gray-100 pl-4 font-serif">
                  Paste the above in your <strong>SQL Editor</strong> on the Supabase Dashboard and click <strong>Run</strong>. This will add the missing <code>content_moderation</code> and <code>header_fit</code> columns.
                </p>
              </div>
            ) : (
              <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6 rounded shadow-2xl border border-gray-800 h-[500px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-[10px] text-gray-500 ml-2 uppercase font-black">System Stream</span>
                </div>
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-[11px] border-l-2 border-gray-700 pl-2 ml-1">
                      {log}
                    </div>
                  ))}
                  {logs.length === 0 && <div className="text-gray-600 italic">No logs recorded...</div>}
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
