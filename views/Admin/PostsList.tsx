
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Post } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';

const PostsList: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchPostsAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Fetch role strictly from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profile) {
        setRole(profile.role);
        // Access Level: Only Reviewers, Editors, and Admins see this list.
        // Basic users (role 'user') are bounced back to dashboard.
        if (profile.role === 'user') {
          navigate('/admin');
          return;
        }
      } else {
        navigate('/admin');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('type', 'post')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error("Error fetching admin posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPostsAndRole();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    // Double-check permissions before attempting delete
    const canManage = ['admin', 'editor'].includes(role || '');
    if (!canManage) {
      alert("Access Denied: You do not have permission to modify or delete posts.");
      return;
    }
    
    if (!window.confirm("Are you sure you want to move this post to trash?")) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== id));
    } catch (err: any) {
      alert("Error deleting post: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Staff roles (Admin/Editor) can edit. Reviewers are READ-ONLY.
  const canModify = ['admin', 'editor'].includes(role || '');

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 p-6 lg:p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">Posts</h1>
            <p className="text-gray-400 text-xs italic font-bold uppercase tracking-widest mt-1">
               {role === 'reviewer' ? 'Read-Only View Enabled' : 'Manager Access Active'}
            </p>
          </div>
          {canModify && (
            <Link to="/admin/new-post" className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#005a87] transition-all active:scale-95">
              Add New Post
            </Link>
          )}
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-gray-400 italic font-serif">Scanning post registry...</div>
          ) : posts.length === 0 ? (
            <div className="p-20 text-center text-gray-400 italic font-serif">No posts discovered in the newsroom.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Article Title</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-blue-50/20 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 leading-tight mb-1">{post.title}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        Created {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${post.status === 'publish' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canModify ? (
                          <>
                            <Link to={`/admin/edit-post/${post.id}`} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Edit</Link>
                            <button onClick={() => handleDelete(post.id)} className="text-red-500 font-black uppercase text-[10px] hover:underline">Trash</button>
                          </>
                        ) : (
                          <span className="text-gray-300 font-black uppercase text-[9px] tracking-widest italic">Locked (Reviewer)</span>
                        )}
                        <Link to={`/post/${post.slug}`} className="text-gray-400 font-black uppercase text-[10px] hover:underline">View</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default PostsList;
