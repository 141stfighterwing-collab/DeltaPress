
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    posts: 0,
    pages: 0,
    comments: 0,
    pending: 0,
    messages: 0,
    health: 'Good'
  });

  const [branding, setBranding] = useState({
    title: '',
    logo_url: ''
  });

  const fetchStats = async (userRole: string, userId: string) => {
    try {
      // Basic users only see their own stats for comments
      let commentQuery = supabase.from('comments').select('*', { count: 'exact', head: true });
      let pendingQuery = supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      if (['user', 'reviewer'].includes(userRole)) {
        commentQuery = commentQuery.eq('user_id', userId);
        pendingQuery = pendingQuery.eq('user_id', userId);
      }

      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('type', 'post');
      const { count: pageCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('type', 'page');
      const { count: commentCount } = await commentQuery;
      const { count: pendingCount } = await pendingQuery;
      
      // Admins and Editors see total contact messages
      let messageCount = 0;
      if (['admin', 'editor'].includes(userRole)) {
        const { count: msgCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
        messageCount = msgCount || 0;
      }

      setStats({
        posts: postCount || 0,
        pages: pageCount || 0,
        comments: commentCount || 0,
        pending: pendingCount || 0,
        messages: messageCount,
        health: 'Good'
      });

      // Fetch branding
      const { data: siteSettings } = await supabase.from('site_settings').select('title, logo_url').eq('id', 1).maybeSingle();
      if (siteSettings) {
        setBranding({
            title: siteSettings.title,
            logo_url: siteSettings.logo_url
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard telemetry:", err);
      setStats(prev => ({ ...prev, health: 'Degraded' }));
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      
      const userRole = profile?.role || 'user';
      setRole(userRole);
      
      await fetchStats(userRole, session.user.id);
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#f1f1f1] text-gray-400 italic font-serif">Verifying identity...</div>;
  }

  const isStaff = ['admin', 'editor'].includes(role || '');

  return (
    <div className="flex bg-[#f1f1f1] min-h-screen">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 p-6 lg:p-10 max-w-7xl">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">Dashboard</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
               Identity: {role} • {user?.email}
            </p>
          </div>
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 px-6 py-2 rounded shadow-sm hover:shadow transition-all text-blue-600">
            View Live Site
          </Link>
        </header>
        
        {!isStaff && (
          <div className="mb-10 p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg shadow-sm">
            <h3 className="font-black text-blue-900 text-xs uppercase tracking-widest mb-1">Welcome to the Newsroom</h3>
            <p className="text-blue-700 text-[13px] leading-relaxed">
              Your account is active. You can manage your personal comments, update your display appearance, or contact the editorial team. 
              {role === 'reviewer' ? ' You also have read-only access to all published posts.' : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded-lg flex flex-col justify-center">
            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">My Comments</h3>
            <div className="text-4xl font-black text-gray-900">{stats.comments}</div>
          </div>
          
          {isStaff && (
             <Link to="/admin/messages" className="bg-white p-6 border border-gray-200 shadow-sm rounded-lg flex flex-col justify-center hover:bg-gray-50 transition-colors group">
              <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 group-hover:text-blue-600">Contact Messages</h3>
              <div className="text-4xl font-black text-gray-900 group-hover:text-blue-600">{stats.messages}</div>
            </Link>
          )}

          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded-lg flex flex-col justify-center">
            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">Awaiting Reply</h3>
            <div className={`text-4xl font-black ${stats.pending > 0 ? 'text-blue-600' : 'text-gray-200'}`}>{stats.pending}</div>
          </div>
          
          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded-lg flex flex-col justify-center">
            <h3 className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2">Site Status</h3>
            <div className={`text-4xl font-black ${stats.health === 'Good' ? 'text-green-500' : 'text-red-500'}`}>{stats.health}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 font-black text-[10px] uppercase tracking-widest text-gray-500">System Inventory</div>
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">✍️</div>
                   <span className="text-sm font-bold text-gray-800">Total Publications</span>
                </div>
                <span className="font-black text-gray-900 text-lg">{stats.posts}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">📄</div>
                   <span className="text-sm font-bold text-gray-800">Static Pages</span>
                </div>
                <span className="font-black text-gray-900 text-lg">{stats.pages}</span>
              </div>
              <div className="pt-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">
                   Powered by Twenty Ten Blog Engine v1.0
                </p>
              </div>
            </div>
          </div>

          <Link to="/admin/settings" className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 font-black text-[10px] uppercase tracking-widest text-gray-500 flex justify-between">
                <span>Site Identity</span>
                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit &rarr;</span>
            </div>
            <div className="p-8 flex flex-col items-center text-center">
                {branding.logo_url ? (
                    <div className="w-24 h-24 bg-gray-50 rounded-lg border border-gray-100 p-2 mb-4 flex items-center justify-center">
                        <img src={branding.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-4 text-gray-300">🖼️</div>
                )}
                <h4 className="text-lg font-bold text-gray-800 font-serif leading-tight">{branding.title || 'Twenty Ten'}</h4>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-2">Active Branding</p>
            </div>
          </Link>
        </div>

        <div className="mt-8 bg-gray-900 rounded-lg shadow-2xl p-8 flex flex-col justify-center text-white relative overflow-hidden group">
             <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
             <div className="relative z-10">
                <h3 className="text-4xl font-black font-serif mb-4 leading-tight">Ready to join the conversation?</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
                  Visit the comments section to manage your existing thoughts or jump to the Appearance hub to customize your theme experience.
                </p>
                <div className="flex gap-4">
                   <Link to="/admin/comments" className="bg-blue-600 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">Go to Comments</Link>
                   <Link to="/admin/appearance" className="bg-white text-gray-900 px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg active:scale-95">Customizer</Link>
                </div>
             </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
