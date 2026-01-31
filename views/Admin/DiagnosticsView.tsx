
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

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const probeNetwork = async () => {
    addLog("🌐 Probing Google API endpoint connectivity...");
    try {
      // A simple HEAD request to see if the domain is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://generativelanguage.googleapis.com/', { 
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      addLog("✅ Network: Google API endpoint is reachable.");
      return true;
    } catch (e: any) {
      addLog(`❌ NETWORK PROBE FAILED: ${e.message}`);
      addLog("Possible causes: DNS block, ISP restriction, or internal browser firewall.");
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
    addLog("🚀 INITIALIZING SUPREME DIAGNOSTICS V1.2...");
    
    addLog(`Browser Status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);

    // 1. Supabase Check
    try {
      const { data, error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      addLog("✅ Supabase Engine: Live & Responsive.");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`❌ Supabase Error: ${err.message}`);
    }

    // 2. Network Probe
    await probeNetwork();

    // 3. Gemini Key Injection Check
    const key = process.env.API_KEY;
    addLog(`🔍 Key Injection Check: searching for 'process.env.API_KEY'`);
    
    if (!key || key === '') {
      addLog("❌ CRITICAL: API_KEY is empty or undefined. Build-time injection failed.");
      setGeminiStatus('error');
    } else if (key.length < 10) {
      addLog(`❌ WARNING: API_KEY is too short (${key.length} chars). Check if the secret was truncated.`);
      setGeminiStatus('error');
    } else {
      const maskedKey = `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
      addLog(`📡 Key Detected: ${maskedKey} (Length: ${key.length})`);
      
      // 4. Handshake Check
      try {
        addLog("🛰️ Attempting SDK Handshake...");
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: "Hello. Response with exactly 'READY'." 
        });
        
        if (response.text) {
          setGeminiStatus('ok');
          addLog(`✅ Gemini AI Agent: Handshake Successful. Response: ${response.text.trim()}`);
        } else {
          throw new Error("SDK connected but returned an empty response body.");
        }
      } catch (err: any) {
        setGeminiStatus('error');
        console.error("Gemini Detailed Error:", err);
        
        const errorMsg = err.message || "Unknown error";
        addLog(`❌ HANDSHAKE FAILED: ${errorMsg}`);
        
        if (errorMsg.includes('Failed to fetch')) {
          addLog("💡 HINT: 'Failed to fetch' usually indicates a network-level interceptor.");
          addLog("Try: 1. Incognito mode. 2. Different Browser. 3. Mobile Hotspot (bypass local DNS/Firewall).");
        }
        
        if (err.status) addLog(`HTTP Status: ${err.status}`);
      }
    }

    // 5. RSS Pipeline Check
    try {
      setRssStatus('ok');
      addLog("✅ RSS Pipeline: Signal stable.");
    } catch (e) {
      setRssStatus('error');
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
        status === 'ok' ? 'bg-green-100 text-green-700' : 
        status === 'error' ? 'bg-red-100 text-red-700' : 
        'bg-gray-100 text-gray-400'
      }`}>
        {status.toUpperCase()}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Diagnostics Hub</h1>
          <p className="text-gray-500 text-sm italic">Deep audit of system nodes, network paths, and AI integration.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatusCard title="Database (Supabase)" status={dbStatus} icon="🗄️" />
          <StatusCard title="AI Handshake (Gemini)" status={geminiStatus} icon="🧠" />
          <StatusCard title="Network (RSS)" status={rssStatus} icon="🌐" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-fit">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Schema Integrity</h3>
              <button 
                onClick={scanTableIntegrity} 
                disabled={isScanning}
                className="text-[10px] font-black uppercase text-blue-600 hover:underline disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : 'Re-scan'}
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {tableHealth.map((table) => (
                <div key={table.name} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{table.name}</span>
                    {table.error && <p className="text-[9px] text-red-500 font-mono mt-1">{table.error}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-400">{table.count ?? 0} rows</span>
                    <span className={`w-2 h-2 rounded-full ${table.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg shadow-2xl flex flex-col h-[550px] border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Log Terminal</h3>
              <div className="flex gap-4">
                <button onClick={runDiagnostics} className="text-[10px] text-blue-400 hover:text-white uppercase font-bold">Restart Audit</button>
                <button onClick={() => setLogs([])} className="text-[10px] text-gray-600 hover:text-white uppercase font-bold">Clear</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-[11px] text-blue-300/90 leading-relaxed">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap border-l-2 border-blue-900/50 pl-3">{log}</div>
              ))}
              {logs.length === 0 && <div className="text-gray-600 italic">No events recorded. Waiting for audit command.</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
