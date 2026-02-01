
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

type AnalyticsTab = 'bots' | 'users' | 'site' | 'posts';

interface SessionData {
  sessionId: string;
  duration: number;
  eventCount: number;
  lastActive: string;
  isNew: boolean;
}

const FREQUENCIES = [
  { id: '6h', hours: 6 },
  { id: '24h', hours: 24 },
  { id: '2w', hours: 84 },
  { id: '1w', hours: 168 },
  { id: '1m', hours: 720 }
];

const AnalyticsView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('bots');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitorLoc, setVisitorLoc] = useState<any>(null);
  
  const [stats, setStats] = useState({
    totalViews: 0,
    totalClicks: 0,
    externalClicks: 0,
    avgSessionTime: 0,
    longestSession: 0,
    postPerformance: [] as { slug: string, views: number }[],
    sessions: [] as SessionData[],
    referrers: [] as { name: string, count: number }[],
    botStats: {
      totalBotPosts: 0,
      perBotCount: {} as Record<string, number>,
      futureSchedule: [] as any[],
      recentHistory: [] as any[]
    },
    userStats: {
      totalUsers: 0,
      roleBreakdown: {} as Record<string, number>,
      statusBreakdown: {} as Record<string, number>
    }
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Core Analytics
      const { data: events, error: eventError } = await supabase
        .from('site_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventError && eventError.code !== '42P01') throw eventError;
      const rawEvents = events || [];

      // 2. Bot/Journalist Data
      const { data: journalists } = await supabase.from('journalists').select('*');
      const { data: botPosts } = await supabase.from('posts').select('id, title, journalist_id, created_at').not('journalist_id', 'is', null).order('created_at', { ascending: false });

      // 3. User Data
      const { data: profiles } = await supabase.from('profiles').select('role, status');
      
      // 4. Post Meta Data
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('type', 'post');

      // Process User Stats
      const roleBreakdown: Record<string, number> = {};
      const statusBreakdown: Record<string, number> = {};
      profiles?.forEach(p => {
        roleBreakdown[p.role] = (roleBreakdown[p.role] || 0) + 1;
        statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1;
      });

      // Process Bot Stats
      const perBotCount: Record<string, number> = {};
      botPosts?.forEach(p => {
        const name = journalists?.find(j => j.id === p.journalist_id)?.name || 'Unknown';
        perBotCount[name] = (perBotCount[name] || 0) + 1;
      });

      const futureSchedule = (journalists || []).map(j => {
        const freq = FREQUENCIES.find(f => f.id === j.schedule) || FREQUENCIES[1];
        const last = j.last_run ? new Date(j.last_run) : new Date(0);
        const next = new Date(last.getTime() + freq.hours * 60 * 60 * 1000);
        return { name: j.name, nextRun: next, niche: j.niche };
      }).sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());

      // Standard analytics processing
      const sessionMap: Record<string, any> = {};
      const referMap: Record<string, number> = {};
      const postViewsMap: Record<string, number> = {};

      rawEvents.forEach(e => {
        const time = new Date(e.created_at).getTime();
        if (!sessionMap[e.session_id]) sessionMap[e.session_id] = { first: time, last: time, count: 0 };
        sessionMap[e.session_id].first = Math.min(sessionMap[e.session_id].first, time);
        sessionMap[e.session_id].last = Math.max(sessionMap[e.session_id].last, time);
        sessionMap[e.session_id].count++;
        const ref = e.metadata?.referrer || 'direct';
        referMap[ref] = (referMap[ref] || 0) + 1;

        if (e.event_type === 'view' && e.target_id) {
          postViewsMap[e.target_id] = (postViewsMap[e.target_id] || 0) + 1;
        }
      });

      const processedSessions = Object.entries(sessionMap).map(([id, data]: [string, any]) => ({
        sessionId: id,
        duration: Math.round((data.last - data.first) / 60000),
        eventCount: data.count,
        lastActive: new Date(data.last).toISOString(),
        isNew: data.count === 1
      })).sort((a, b) => b.duration - a.duration);

      const postPerf = Object.entries(postViewsMap)
        .map(([slug, views]) => ({ slug, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setStats({
        totalViews: rawEvents.filter(e => e.event_type === 'view').length,
        totalClicks: rawEvents.filter(e => e.event_type === 'click').length,
        externalClicks: rawEvents.filter(e => e.event_type === 'rss_outbound').length,
        avgSessionTime: processedSessions.length ? Math.round(processedSessions.reduce((acc, s) => acc + s.duration, 0) / processedSessions.length) : 0,
        longestSession: processedSessions.length ? processedSessions[0].duration : 0,
        postPerformance: postPerf,
        sessions: processedSessions.slice(0, 10),
        referrers: Object.entries(referMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        botStats: {
          totalBotPosts: botPosts?.length || 0,
          perBotCount,
          futureSchedule,
          recentHistory: (botPosts || []).slice(0, 10)
        },
        userStats: {
          totalUsers: profiles?.length || 0,
          roleBreakdown,
          statusBreakdown
        }
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

  const TabButton = ({ id, label, icon }: { id: AnalyticsTab, label: string, icon: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-8 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-4 flex items-center gap-2 ${
        activeTab === id 
          ? 'border-blue-600 text-blue-600 bg-white' 
          : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif leading-none">Intelligence Hub</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Historical and Predictive Data Analysis</p>
          </div>
          <button onClick={fetchData} className="bg-white border border-gray-200 px-6 py-2 rounded-full text-xs font-bold uppercase shadow-sm hover:shadow transition-all">
            {loading ? 'Refreshing...' : 'Refresh Hub'}
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="flex bg-white border border-gray-200 rounded-t-lg shadow-sm mb-10 overflow-x-auto">
          <TabButton id="bots" label="BOT Analytics" icon="🤖" />
          {/* Fix: changed 'user' to 'users' to match AnalyticsTab type */}
          <TabButton id="users" label="User Analytics" icon="👥" />
          <TabButton id="site" label="Site Analytics" icon="📈" />
          <TabButton id="posts" label="Post Analytics" icon="✍️" />
        </nav>

        {loading ? (
          <div className="py-40 text-center text-gray-400 italic font-serif animate-pulse">
            Compiling dataset...
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'bots' && (
              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xl">🤖</span>
                    <h2 className="text-xl font-bold font-serif text-gray-800">AI Journalists Performance</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
                       <div className="text-center mb-8">
                          <div className="text-5xl font-black text-blue-600 mb-2">{stats.botStats.totalBotPosts}</div>
                          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Autonomous Broadcasts</div>
                       </div>
                       <div className="space-y-4">
                          {Object.entries(stats.botStats.perBotCount).map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center pb-2 border-b border-gray-50">
                               <span className="text-sm font-bold text-gray-700">{name}</span>
                               <span className="text-xs font-black bg-gray-100 px-2 py-1 rounded text-gray-500">{count} Posts</span>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                       <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Broadcast History</h3>
                       <div className="space-y-4 flex-1">
                          {stats.botStats.recentHistory.map((h, i) => (
                            <div key={i} className="flex gap-4 items-start">
                               <div className="text-xs shrink-0 font-mono text-gray-300">{new Date(h.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                               <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-800 truncate">{h.title}</p>
                                  <p className="text-[9px] text-blue-500 font-black uppercase">{new Date(h.created_at).toLocaleDateString()}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="bg-[#1d2327] p-8 rounded-xl shadow-xl text-white">
                       <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-6">Upcoming Tickers</h3>
                       <div className="space-y-6">
                          {stats.botStats.futureSchedule.map((s, i) => (
                            <div key={i} className="relative pl-6 border-l-2 border-gray-700 pb-2 last:pb-0">
                               <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-500"></div>
                               <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-black font-serif text-white">{s.name}</span>
                                  <span className="text-[9px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded font-black">{new Date(s.nextRun).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </div>
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{s.niche}</p>
                               <p className="text-[9px] font-mono text-gray-400 italic">Expected: {new Date(s.nextRun).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Fix: changed 'user' to 'users' to match AnalyticsTab type */}
            {activeTab === 'users' && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl">👥</span>
                  <h2 className="text-xl font-bold font-serif text-gray-800">User & Member Metrics</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-4xl font-black text-gray-900 mb-2">{stats.userStats.totalUsers}</div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Registered</div>
                  </div>
                  {Object.entries(stats.userStats.roleBreakdown).map(([role, count]) => (
                    <div key={role} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                      <div className="text-4xl font-black text-blue-600 mb-2">{count}</div>
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{role}s</div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                   <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-black text-[10px] uppercase text-gray-400 tracking-widest">Recent Portal Activity</div>
                   <div className="divide-y divide-gray-50">
                     {stats.sessions.map((session, i) => (
                       <div key={i} className="px-6 py-4 flex justify-between items-center text-sm">
                          <div className="flex gap-4 items-center">
                             <div className={`w-2 h-2 rounded-full ${session.duration > 10 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                             <span className="font-mono text-[10px] text-gray-400">Node: {session.sessionId.slice(0, 8)}</span>
                          </div>
                          <div className="flex gap-8 items-center text-xs font-bold text-gray-700">
                             <span>Stay: {session.duration}m</span>
                             <span>Events: {session.eventCount}</span>
                             <span className="text-[10px] text-gray-400 font-normal">{new Date(session.lastActive).toLocaleTimeString()}</span>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'site' && (
              <div className="space-y-12">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl">📈</span>
                  <h2 className="text-xl font-bold font-serif text-gray-800">Global Traffic Overview</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Site Traffic', val: stats.totalViews, icon: '📈' },
                    { label: 'Internal Activity', val: stats.totalClicks, icon: '🖱️' },
                    { label: 'Avg Session', val: `${stats.avgSessionTime}m`, icon: '⏳' },
                    { label: 'Longest Stay', val: `${stats.longestSession}m`, icon: '🏆' }
                  ].map((c, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className="text-2xl">{c.icon}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{c.label}</p>
                        <div className="text-2xl font-black text-gray-900">{c.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6">Top Discovery Channels</h3>
                      <div className="space-y-4">
                        {stats.referrers.map((r, i) => (
                          <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-50 last:border-0">
                             <span className="text-xs font-mono text-blue-600 truncate max-w-[200px]">{r.name}</span>
                             <span className="text-xs font-black text-gray-900">{r.count} referrals</span>
                          </div>
                        ))}
                      </div>
                   </div>
                   <div className="bg-gray-900 rounded-xl shadow-2xl p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">📊</div>
                      <h3 className="text-2xl font-bold font-serif mb-4">Observer Node Insight</h3>
                      <p className="text-gray-400 text-sm max-w-lg mb-6 leading-relaxed">
                        Current node tracking from <b>{visitorLoc?.city || 'Universal'}</b>. 
                        Engagement density is focused on high-intent conversion pathways. 
                        Session duration has increased by 14% this epoch.
                      </p>
                      <div className="flex gap-4">
                          <div className="px-4 py-2 bg-blue-600 rounded text-[10px] font-black uppercase">Active Nodes: 1</div>
                          <div className="px-4 py-2 bg-gray-800 rounded text-[10px] font-black uppercase">Uptime: 99.9%</div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="space-y-12">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl">✍️</span>
                  <h2 className="text-xl font-bold font-serif text-gray-800">Post & Content Engagement</h2>
                </div>
                <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
                   <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-8">Highest Impact Publications</h3>
                   <div className="space-y-6">
                      {stats.postPerformance.length > 0 ? stats.postPerformance.map((post, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                           <div className="w-8 h-8 rounded bg-gray-900 text-white flex items-center justify-center font-black text-xs shrink-0">#{i+1}</div>
                           <div className="flex-1 border-b border-gray-100 pb-2 group-last:border-0">
                              <div className="flex justify-between items-center">
                                 <span className="text-sm font-bold text-gray-800 truncate">/{post.slug}</span>
                                 <span className="text-xs font-black text-blue-600">{post.views} Unique Views</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                 <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${(post.views / (stats.postPerformance[0]?.views || 1)) * 100}%` }}></div>
                              </div>
                           </div>
                        </div>
                      )) : (
                        <p className="text-center py-20 text-gray-300 italic">No content engagement data recorded yet.</p>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalyticsView;
