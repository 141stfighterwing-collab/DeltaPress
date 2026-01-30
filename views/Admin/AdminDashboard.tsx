
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quick Draft State
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Dashboard Stats State
  const [stats, setStats] = useState({
    posts: 0,
    pages: 0,
    comments: 0,
    pending: 0,
    health: 'Good'
  });

  const fetchStats = async () => {
    try {
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('type', 'post');
      const { count: pageCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('type', 'page');
      const { count: commentCount } = await supabase.from('comments').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      setStats({
        posts: postCount || 0,
        pages: pageCount || 0,
        comments: commentCount || 0,
        pending: pendingCount || 0,
        health: 'Good'
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats(prev => ({ ...prev, health: 'Needs Attention' }));
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
      
      if (profile) {
        setRole(profile.role);
      }
      
      await fetchStats();
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  const handleSaveDraft = async () => {
    if (!draftTitle.trim()) {
      alert("Please enter a title for your draft.");
      return;
    }

    setIsSavingDraft(true);
    try {
      const slug = draftTitle.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-draft-' + Date.now();
      const { error } = await supabase.from('posts').insert({
        title: draftTitle,
        content: draftContent,
        slug,
        status: 'draft',
        type: 'post',
        author_id: user.id
      });

      if (error) throw error;

      // Clear fields and refresh stats
      setDraftTitle('');
      setDraftContent('');
      await fetchStats();
      alert("Draft saved successfully! You can find it in 'All Posts'.");
    } catch (err: any) {
      alert("Error saving draft: " + err.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#f1f1f1] text-gray-500 italic">Verifying session...</div>;
  }

  return (
    <div className="flex bg-[#f1f1f1] min-h-screen">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 p-6 lg:p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500">Welcome, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}</p>
          </div>
          <Link to="/" className="text-sm bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-50 text-blue-600 font-semibold transition-all">
            Visit Site
          </Link>
        </header>
        
        {role !== 'admin' && (
          <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 text-sm">
            <strong>Limited Access:</strong> You are logged in as a {role}. Only administrators can create or publish content.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded">
            <h3 className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-2">Total Content</h3>
            <div className="text-4xl font-black text-gray-900">{stats.posts + stats.pages}</div>
          </div>
          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded">
            <h3 className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-2">Pending Moderation</h3>
            <div className={`text-4xl font-black ${stats.pending > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{stats.pending}</div>
          </div>
          <div className="bg-white p-6 border border-gray-200 shadow-sm rounded">
            <h3 className="text-xs uppercase font-bold text-gray-400 tracking-widest mb-2">Site Health</h3>
            <div className={`text-4xl font-black ${stats.health === 'Good' ? 'text-green-500' : 'text-red-500'}`}>{stats.health}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">At a Glance</div>
            <div className="p-6 space-y-4 text-sm text-gray-600">
              <p className="flex items-center justify-between">
                <span>Posts</span>
                <span className="font-bold">{stats.posts}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Pages</span>
                <span className="font-bold">{stats.pages}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Comments</span>
                <span className="font-bold">{stats.comments}</span>
              </p>
              <div className="pt-4 mt-4 border-t border-gray-50 text-gray-400 text-xs italic">
                Twenty Ten theme running on WordPress-style Engine.
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">Quick Draft</div>
            <div className="p-6 space-y-4">
              <input 
                type="text" 
                placeholder="Title" 
                className="w-full border border-gray-300 p-3 text-sm focus:border-blue-500 outline-none rounded bg-white text-gray-900 placeholder-gray-400" 
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <textarea 
                placeholder="What's on your mind?" 
                className="w-full border border-gray-300 p-3 text-sm focus:border-blue-500 outline-none rounded bg-white text-gray-900 placeholder-gray-400" 
                rows={4}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              ></textarea>
              <button 
                onClick={handleSaveDraft}
                disabled={role !== 'admin' || isSavingDraft}
                className="bg-[#0073aa] text-white px-6 py-2 text-sm font-bold rounded hover:bg-[#005a87] transition-colors disabled:opacity-50 shadow-md active:scale-95"
              >
                {isSavingDraft ? 'Saving...' : role === 'admin' ? 'Save Draft' : 'Admin Only'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
