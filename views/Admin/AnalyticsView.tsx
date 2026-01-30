
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface SessionData {
  sessionId: string;
  duration: number;
  eventCount: number;
  lastActive: string;
  isNew: boolean;
}

const AnalyticsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitorLoc, setVisitorLoc] = useState<any>(null);
  
  const [stats, setStats] = useState({
    totalViews: 0,
    totalClicks: 0,
    externalClicks: 0,
    avgSessionTime: 0,
    longestSession: 0,
    postPerformance: [] as any[],
    sessions: [] as SessionData[],
    referrers: [] as { name: string, count: number }[]
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: events, error: eventError } = await supabase
        .from('site_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventError) {
        if (eventError.code === '42P01') { setError('site_analytics'); return; }
        throw eventError;
      }

      const rawEvents = events || [];
      
      // Process Sessions
      const sessionMap: Record<string, { first: number, last: number, count: number, events: any[] }> = {};
      const referMap: Record<string, number> = {};

      rawEvents.forEach(e => {
        const time = new Date(e.created_at).getTime();
        if (!sessionMap[e.session_id]) {
          sessionMap[e.session_id] = { first: time, last: time, count: 0, events: [] };
          const ref = e.metadata?.referrer || 'direct';
          referMap[ref] = (referMap[ref] || 0) + 1;
        }
        sessionMap[e.session_id].first = Math.min(sessionMap[e.session_id].first, time);
        sessionMap[e.session_id].last = Math.max(sessionMap[e.session_id].last, time);
        sessionMap[e.session_id].count++;
        sessionMap[e.session_id].events.push(e);
      });

      const processedSessions = Object.entries(sessionMap).map(([id, data]) => ({
        sessionId: id,
        duration: Math.round((data.last - data.first) / 60000),
        eventCount: data.count,
        lastActive: new Date(data.last).toISOString(),
        isNew: data.count === 1
      })).sort((a, b) => b.duration - a.duration);

      const totalDuration = processedSessions.reduce((acc, s) => acc + s.duration, 0);
      const avgSession = processedSessions.length ? Math.round(totalDuration / processedSessions.length) : 0;

      // Post Metrics
      const postMetrics: Record<string, { views: number, clicks: number, title: string }> = {};
      rawEvents.forEach(e => {
        if (e.event_type === 'view' || e.event_type === 'click') {
          const tid = e.target_id || 'unknown';
          if (!postMetrics[tid]) postMetrics[tid] = { views: 0, clicks: 0, title: e.metadata?.title || tid };
          if (e.event_type === 'view') postMetrics[tid].views++;
          if (e.event_type === 'click') postMetrics[tid].clicks++;
        }
      });

      const performanceArray = Object.entries(postMetrics).map(([slug, m]) => ({
        slug,
        ...m,
        ctr: m.clicks > 0 ? Math.round((m.views / m.clicks) * 100) : 0
      })).sort((a, b) => b.views - a.views);

      const sortedReferrers = Object.entries(referMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalViews: rawEvents.filter(e => e.event_type === 'view').length,
        totalClicks: rawEvents.filter(e => e.event_type === 'click').length,
        externalClicks: rawEvents.filter(e => e.event_type === 'rss_outbound').length,
        avgSessionTime: avgSession,
        longestSession: processedSessions.length ? processedSessions[0].duration : 0,
        postPerformance: performanceArray,
        sessions: processedSessions.slice(0, 10),
        referrers: sortedReferrers.slice(0, 5)
      });

      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) setVisitorLoc(await geoRes.json());
      } catch (err) {}

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (error === 'site_analytics') {
    return (
      <div className="flex min-h-screen bg-[#f1f1f1]">
        <AdminSidebar onLogout={handleLogout} />
        <main className="flex-1 p-10">
          <div className="max-w-3xl mx-auto bg-white border border-red-200 rounded-lg shadow-sm">
            <div className="bg-red-600 text-white px-6 py-4 font-bold">Analytics Table Missing</div>
            <div className="p-8">
              <p className="mb-4">Please run the SQL initialization script provided in the previous turn.</p>
              <button onClick={fetchData} className="bg-black text-white px-6 py-2 rounded">Refresh</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto">
        
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif leading-none">Site Intelligence</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Real-time engagement telemetry</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Current Node</p>
              <p className="text-sm font-mono text-gray-700">{visitorLoc?.ip || 'Detecting...'}</p>
            </div>
            <button onClick={fetchData} className="bg-white border border-gray-200 px-6 py-2 rounded-full text-xs font-bold uppercase shadow-sm hover:shadow transition-all">
              {loading ? 'Syncing...' : 'Refresh Hub'}
            </button>
          </div>
        </header>

        {/* Global Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Views', val: stats.totalViews, sub: 'Page Openings', color: 'bg-blue-600', icon: '📄' },
            { label: 'Feed Clicks', val: stats.totalClicks, sub: 'In-Site Engagement', color: 'bg-emerald-500', icon: '👆' },
            { label: 'Avg Stay', val: `${stats.avgSessionTime}m`, sub: 'Retention Time', color: 'bg-violet-600', icon: '⏱️' },
            { label: 'Outbound', val: stats.externalClicks, sub: 'RSS Link Clicks', color: 'bg-amber-500', icon: '🚀' }
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 transition-transform hover:scale-[1.02]">
              <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-opacity-20`}>{card.icon}</div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                <div className="text-2xl font-black text-gray-900">{card.val}</div>
                <p className="text-[10px] text-gray-400">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Post Performance */}
          <div className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 font-serif">Content Conversion Leaderboard</h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">Ranked by Views</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-white border-b border-gray-50">
                    <tr>
                      <th className="px-6 py-4">Article / Slug</th>
                      <th className="px-6 py-4">Internal Clicks</th>
                      <th className="px-6 py-4">Read Views</th>
                      <th className="px-6 py-4 text-right">Conversion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.postPerformance.length === 0 ? (
                      <tr><td colSpan={4} className="p-12 text-center text-gray-300 italic">No telemetry data available.</td></tr>
                    ) : (
                      stats.postPerformance.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 truncate max-w-[280px]">{p.title}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">/{p.slug}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-400">{p.clicks}</td>
                          <td className="px-6 py-4 text-sm font-black text-gray-800">{p.views}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, p.ctr)}%` }}></div>
                              </div>
                              <span className="text-[11px] font-black text-blue-600">{p.ctr}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Referrers */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Top Traffic Sources</h3>
                <div className="space-y-4">
                  {stats.referrers.map((r, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{r.name}</span>
                      </div>
                      <span className="text-xs font-black text-gray-400">{r.count} hits</span>
                    </div>
                  ))}
                  {stats.referrers.length === 0 && <p className="text-center text-gray-300 italic text-xs">No referrers logged.</p>}
                </div>
              </div>

              {/* Geographic Insight */}
              <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Current Observer</h3>
                <div className="relative z-10">
                  <div className="text-4xl mb-4">🌍</div>
                  <div className="text-xl font-bold">{visitorLoc?.city || 'Universal'}, {visitorLoc?.country_name || 'Earth'}</div>
                  <p className="text-xs text-gray-400 mt-1">Network: {visitorLoc?.org || 'Standard IP'}</p>
                  <div className="mt-4 pt-4 border-t border-gray-800 text-[10px] text-gray-500 uppercase tracking-tighter">
                    UTC Time: {new Date().toUTCString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Session Leaderboard */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Longest Active Sessions</h3>
              </div>
              <div className="p-6 space-y-6">
                {stats.sessions.length === 0 ? (
                  <p className="text-center text-gray-300 italic text-xs">Awaiting traffic...</p>
                ) : (
                  stats.sessions.map((s, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${s.duration > 10 ? 'bg-orange-500' : 'bg-green-400'}`}></span>
                          <span className="text-[10px] font-mono text-gray-400">SESSION: {s.sessionId.slice(-6).toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-gray-400">{new Date(s.lastActive).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-gray-900 leading-none">{s.duration}m</div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mt-1">{s.eventCount} Actions</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white text-center">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Longest Stay Record</h4>
              <div className="text-5xl font-black mb-1">{stats.longestSession}m</div>
              <p className="text-xs font-bold opacity-80">Continuous Reading</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AnalyticsView;
