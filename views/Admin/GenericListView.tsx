
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface Props {
  title: string;
  table: string;
  filterType?: string;
}

const GenericListView: React.FC<Props> = ({ title, table, filterType }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editItemValue, setEditItemValue] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCommentsTable = table === 'comments';
  const isContactsTable = table === 'contacts';
  const isPagesView = table === 'posts' && filterType === 'page';

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const userRole = profile?.role || 'user';
      setRole(userRole);

      let query = supabase.from(table).select('*');
      
      if (filterType === 'page') {
        query = query.eq('type', 'page');
      }
      
      // Strict RBAC Filtering:
      // Regular users and reviewers only see their own feedback/messages.
      // Admins and Editors see all records for moderation.
      if ((userRole === 'user' || userRole === 'reviewer') && (isCommentsTable || isContactsTable)) {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error: queryError } = await query.order('created_at', { ascending: false });
      
      if (queryError) {
        setError(queryError.message);
        setItems([]);
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [table, filterType]);

  const handleEdit = (item: any) => {
    // For posts/pages, we use the dedicated editor
    if (table === 'posts') {
      navigate(`/admin/edit-post/${item.id}`);
      return;
    }

    // Only owners or staff (Admins/Editors) can edit
    const isOwner = item.user_id === user?.id;
    const isStaff = ['admin', 'editor'].includes(role);
    
    if (!isOwner && !isStaff) {
      alert("Permission denied. You can only edit your own content.");
      return;
    }

    setSelectedItem(item);
    setEditItemValue(item.content || item.name || item.title || item.message || '');
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editItemValue || !selectedItem) return;
    setIsSaving(true);
    try {
      const payload: any = {};
      if (isCommentsTable) payload.content = editItemValue;
      else if (isContactsTable) payload.message = editItemValue;
      else if (table === 'posts') payload.title = editItemValue;
      else payload.name = editItemValue;

      const { error: updateError } = await supabase.from(table).update(payload).eq('id', selectedItem.id);
      if (updateError) throw updateError;
      
      setShowEditModal(false);
      fetchItems();
    } catch (err: any) {
      alert("Update Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, itemOwnerId: string) => {
    const isOwner = itemOwnerId === user?.id;
    const isStaff = ['admin', 'editor'].includes(role);

    if (!isOwner && !isStaff) {
      alert("Permission denied. You can only delete your own records.");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this record?")) return;
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
      if (deleteError) throw deleteError;
      fetchItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const canCreate = ['admin', 'editor'].includes(role);

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">{title}</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
              {['admin', 'editor'].includes(role) ? 'Global Management View' : 'Personal Records View'}
            </p>
          </div>
          
          {isPagesView && canCreate && (
            <Link 
              to="/admin/new-post?type=page" 
              className="bg-[#0073aa] text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#005a87] transition-all active:scale-95"
            >
              Add New Page
            </Link>
          )}
        </header>
        
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-gray-400 italic font-serif">Syncing protected records...</div>
          ) : items.length === 0 ? (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4 grayscale opacity-20">📭</div>
              <p className="text-gray-400 font-serif italic text-sm mb-6">No {title.toLowerCase()} found in your account.</p>
              {isPagesView && canCreate && (
                <Link 
                  to="/admin/new-post?type=page" 
                  className="inline-block text-[10px] font-black uppercase text-blue-600 border border-blue-100 px-4 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  Create your first page
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data Summary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-gray-800 font-serif italic text-[14px] leading-relaxed max-w-lg">
                        "{item.content || item.message || item.name || item.title || 'No data content'}"
                      </div>
                      <div className="text-[9px] text-gray-400 font-sans mt-2 uppercase font-black tracking-tighter">
                        Created {new Date(item.created_at).toLocaleDateString()} by {item.author_name || item.name || (item.user_id === user?.id ? 'You' : 'Member')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                        {item.status || 'Verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(item)} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Edit</button>
                        <button onClick={() => handleDelete(item.id, item.user_id)} className="text-red-500 font-black uppercase text-[10px] hover:underline">Trash</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-10 max-w-xl w-full shadow-2xl border-t-8 border-gray-900">
            <h2 className="text-2xl font-bold mb-6 font-serif text-gray-900 uppercase tracking-tighter">Modify Record</h2>
            <textarea 
              className="w-full border-2 border-gray-100 p-4 rounded-lg min-h-[200px] outline-none focus:border-[#0073aa] font-serif text-gray-800 text-lg leading-relaxed shadow-inner"
              value={editItemValue}
              onChange={(e) => setEditItemValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">Cancel</button>
              <button 
                onClick={handleUpdateItem}
                disabled={isSaving}
                className="bg-[#0073aa] text-white px-10 py-3 rounded-lg font-black hover:bg-[#005a87] disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                {isSaving ? 'Syncing...' : 'Commit Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericListView;
