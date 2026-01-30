
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

      // Fetch role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profile) setRole(profile.role);

      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
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
    if (role !== 'admin') {
      alert("Only admins can delete posts.");
      return;
    }
    if (!window.confirm("Are you sure you want to trash this post?")) return;
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

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 p-6 lg:p-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Posts</h1>
          {role === 'admin' && (
            <Link to="/admin/new-post" className="bg-[#0073aa] text-white px-5 py-2 text-sm rounded shadow hover:bg-[#005a87] transition-all font-bold">
              Add New
            </Link>
          )}
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400 italic">Loading post records...</div>
          ) : posts.length === 0 ? (
            <div className="p-10 text-center text-gray-400 italic">No posts found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f9f9f9] border-b border-gray-200 text-xs uppercase text-gray-400 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-blue-50/30 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-blue-600 group-hover:underline cursor-pointer">{post.title}</div>
                      <div className="flex gap-2 text-[11px] mt-2 opacity-0 group-hover:opacity-100 transition-all font-semibold">
                        {role === 'admin' ? (
                          <>
                            <Link to={`/admin/edit-post/${post.id}`} className="text-blue-500 hover:text-blue-800">Edit</Link>
                            <span className="text-gray-200">|</span>
                            <button onClick={() => handleDelete(post.id)} className="text-red-400 hover:text-red-700">Trash</button>
                            <span className="text-gray-200">|</span>
                          </>
                        ) : null}
                        <Link to={`/post/${post.slug}`} className="text-gray-400 hover:text-gray-800">View</Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${post.status === 'publish' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(post.created_at).toLocaleDateString()}
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
