
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface PageNode {
  id: string;
  title: string;
  slug: string;
  status: string;
  parent_id: string | null;
  menu_order: number;
  created_at: string;
  children: PageNode[];
}

const PagesListView: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const buildTree = (flatPages: any[]): PageNode[] => {
    const map: Record<string, PageNode> = {};
    const roots: PageNode[] = [];

    flatPages.forEach(p => {
      map[p.id] = { ...p, children: [] };
    });

    flatPages.forEach(p => {
      if (p.parent_id && map[p.parent_id]) {
        map[p.parent_id].children.push(map[p.id]);
        map[p.parent_id].children.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));
      } else {
        roots.push(map[p.id]);
      }
    });

    return roots.sort((a, b) => (a.menu_order || 0) - (b.menu_order || 0));
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      setRole(profile?.role || 'user');

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'page')
        .order('menu_order', { ascending: true });

      if (error) throw error;
      setPages(buildTree(data || []));
    } catch (err) {
      console.error("Error fetching pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, [navigate]);

  const handleDelete = async (id: string) => {
    if (!['admin', 'editor'].includes(role || '')) return;
    if (!window.confirm("Trash this page? Child pages will be orphaned.")) return;
    try {
      await supabase.from('posts').delete().eq('id', id);
      fetchPages();
    } catch (err: any) { alert(err.message); }
  };

  const renderPageRow = (page: PageNode, depth = 0) => (
    <React.Fragment key={page.id}>
      <tr className="hover:bg-blue-50/20 group transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {depth > 0 && (
              <div className="flex shrink-0">
                {[...Array(depth)].map((_, i) => (
                  <div key={i} className="w-6 h-6 border-l border-b border-gray-200 -mt-3 ml-1" />
                ))}
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                {page.title}
                {page.parent_id && <span className="bg-gray-100 text-[8px] px-1.5 py-0.5 rounded text-gray-400 font-black">CHILD</span>}
              </div>
              <div className="text-[10px] text-gray-400 font-mono">/{page.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {page.menu_order || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${page.status === 'publish' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {page.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {['admin', 'editor'].includes(role || '') ? (
              <>
                <Link to={`/admin/edit-post/${page.id}`} className="text-blue-600 font-black uppercase text-[10px]">Edit</Link>
                <button onClick={() => handleDelete(page.id)} className="text-red-500 font-black uppercase text-[10px]">Trash</button>
              </>
            ) : <span className="text-[9px] text-gray-300 uppercase">Read-Only</span>}
            <Link to={`/post/${page.slug}`} className="text-gray-400 font-black uppercase text-[10px]">View</Link>
          </div>
        </td>
      </tr>
      {page.children.map(child => renderPageRow(child, depth + 1))}
    </React.Fragment>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">Site Pages</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Hierarchical Structure Management</p>
          </div>
          <Link to="/admin/new-post?type=page" className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase tracking-widest shadow-lg">
            Add New Page
          </Link>
        </header>

        <div className="bg-white border border-gray-200 shadow-sm rounded overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400 font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Title / Hierarchy</th>
                <th className="px-6 py-4 text-center">Order</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">Syncing page tree...</td></tr>
              ) : pages.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">No static pages found.</td></tr>
              ) : (
                pages.map(p => renderPageRow(p))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default PagesListView;
