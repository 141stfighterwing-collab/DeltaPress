
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
      <tr className={`hover:bg-blue-50/20 group transition-colors ${depth > 0 ? 'bg-gray-50/30' : ''}`}>
        <td className="px-6 py-5">
          <div className="flex items-center gap-3">
            {depth > 0 && (
              <div className="flex items-center gap-1 shrink-0 text-gray-300">
                {[...Array(depth)].map((_, i) => (
                   <span key={i} className="w-6 border-b-2 border-l-2 h-8 -mt-4 border-gray-200 ml-2 rounded-bl"></span>
                ))}
              </div>
            )}
            <div className={depth > 0 ? 'ml-1' : ''}>
              <div className="font-black text-gray-900 leading-tight flex items-center gap-3">
                <span className={depth > 0 ? 'text-gray-600 font-bold' : 'text-lg font-serif'}>{page.title}</span>
                {page.parent_id && <span className="bg-blue-50 text-[8px] px-1.5 py-0.5 rounded text-blue-500 font-black uppercase tracking-widest">Sub-Menu</span>}
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-1">/{page.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-[11px] font-black text-blue-600 bg-blue-100/50 px-3 py-1 rounded-full border border-blue-200">
            {page.menu_order || 0}
          </span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${page.status === 'publish' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            {page.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {['admin', 'editor'].includes(role || '') ? (
              <>
                <Link to={`/admin/edit-post/${page.id}`} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Configure</Link>
                <button onClick={() => handleDelete(page.id)} className="text-red-500 font-black uppercase text-[10px] hover:underline">Trash</button>
              </>
            ) : <span className="text-[9px] text-gray-300 uppercase font-black">Read-Only</span>}
            <Link to={`/post/${page.slug}`} className="text-gray-400 font-black uppercase text-[10px] hover:underline">View</Link>
          </div>
        </td>
      </tr>
      {page.children.map(child => renderPageRow(child, depth + 1))}
    </React.Fragment>
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif leading-none mb-2">Navbar Hierarchy</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Global Site Architecture Management</p>
          </div>
          <Link to="/admin/new-post?type=page" className="bg-[#0073aa] text-white px-8 py-3 rounded text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            Add New Tab
          </Link>
        </header>

        <div className="bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase text-gray-400 font-black tracking-widest">
              <tr>
                <th className="px-6 py-5">Title / Navbar Structure</th>
                <th className="px-6 py-5 text-center">Menu Order</th>
                <th className="px-6 py-5 text-center">Visibility</th>
                <th className="px-6 py-5 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-32 text-center text-gray-400 italic font-serif text-xl animate-pulse">Mapping architectural nodes...</td></tr>
              ) : pages.length === 0 ? (
                <tr><td colSpan={4} className="p-32 text-center">
                    <div className="text-5xl mb-4">🗺️</div>
                    <p className="text-gray-400 font-serif italic text-lg">Your navbar is currently empty. Start by creating a page.</p>
                </td></tr>
              ) : (
                pages.map(p => renderPageRow(p))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-12 p-8 bg-gray-900 rounded-xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-9xl font-serif">?</span>
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-blue-400">Architecture Tutorial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[12px] text-gray-400 leading-relaxed font-bold uppercase tracking-wider">
                <p>Top-level pages with <span className="text-white">Order 0</span> will appear as primary navbar tabs from left to right.</p>
                <p>Assign a <span className="text-white">Parent Page</span> to create automated dropdown menus. This is ideal for sections like "About Us" or "Resources".</p>
            </div>
        </div>
      </main>
    </div>
  );
};

export default PagesListView;
