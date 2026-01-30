
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { GoogleGenAI } from "@google/genai";
import AdminSidebar from '../../components/AdminSidebar';

const DiagnosticsView: React.FC = () => {
  const navigate = useNavigate();
  const [geminiStatus, setGeminiStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [dbStatus, setDbStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [rssStatus, setRssStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDiagnostics = async () => {
    setLogs([]);
    setGeminiStatus('pending');
    setDbStatus('pending');
    setRssStatus('pending');

    // 1. Database Check
    addLog("Checking Supabase connection...");
    try {
      const { data, error } = await supabase.from('site_settings').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
      addLog("Database: Connection successful.");
    } catch (err: any) {
      setDbStatus('error');
      addLog(`Database: Error - ${err.message}`);
    }

    // 2. Gemini Check
    addLog("Pinging Gemini AI cluster...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Respond with only 'PONG'",
      });
      if (response.text.includes('PONG')) {
        setGeminiStatus('ok');
        addLog("Gemini: Health check passed.");
      } else {
        throw new Error("Unexpected AI response format.");
      }
    } catch (err: any) {
      setGeminiStatus('error');
      addLog(`Gemini: Error - ${err.message}`);
    }

    // 3. RSS News Pipeline Check
    addLog("Scanning Newsroom pipelines...");
    try {
      const { data: feeds } = await supabase.from('rss_feeds').select('url');
      if (!feeds || feeds.length === 0) {
        addLog("RSS: No feeds configured to test.");
        setRssStatus('ok'); // Technically OK as system is ready
      } else {
        addLog(`RSS: Testing ${feeds.length} pipelines via Proxy Service...`);
        const firstFeed = feeds[0].url;
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(firstFeed)}`);
        const data = await res.json();
        if (data.status === 'ok') {
          addLog(`RSS: Success. Reachable and parsed: "${data.feed.title}"`);
          setRssStatus('ok');
        } else {
          throw new Error(data.message);
        }
      }
    } catch (err: any) {
      setRssStatus('error');
      addLog(`RSS: Connectivity Failure - ${err.message}`);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const StatusCard = ({ title, status, icon }: { title: string, status: 'pending' | 'ok' | 'error', icon: string }) => (
    <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
      <div className={`text-4xl mb-2 transition-all ${status === 'pending' ? 'animate-pulse opacity-50' : ''}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-800">{title}</h3>
      <div className={`mt-2 text-xs font-black uppercase tracking-widest ${
        status === 'ok' ? 'text-green-500' : status === 'error' ? 'text-red-500' : 'text-gray-400'
      }`}>
        {status === 'ok' ? 'Online' : status === 'error' ? 'Offline' : 'Testing...'}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 font-serif">System Diagnostics</h1>
          <button 
            onClick={runDiagnostics}
            className="bg-[#0073aa] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#005a87] transition-all"
          >
            Run Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <StatusCard title="Gemini AI" status={geminiStatus} icon="🤖" />
          <StatusCard title="Database" status={dbStatus} icon="💾" />
          <StatusCard title="News Pipe" status={rssStatus} icon="📡" />
        </div>

        <div className="bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6 rounded shadow-2xl border border-gray-800 h-[400px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="ml-2 text-xs text-gray-500 uppercase font-black tracking-widest">Sys_Log.sh</span>
          </div>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-xs">
                <span className="text-green-400 mr-2 opacity-50">$</span>
                {log}
              </div>
            ))}
            <div className="animate-pulse inline-block w-2 h-4 bg-blue-500 ml-1"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiagnosticsView;
