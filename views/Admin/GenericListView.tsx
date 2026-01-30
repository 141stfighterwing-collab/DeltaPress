
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { cleanSlug } from '../../services/security';
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
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemValue, setItemValue] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCommentsTable = table === 'comments';
  const isContactsTable = table === 'contacts';

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

      // Attempt 1: Fetch with standard timestamp sorting
      let { data, error: queryError } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      // Fallback: If sorting by created_at fails (missing column), try a basic select
      if (queryError) {
        console.warn(`Sorting by created_at failed for ${table}, attempting fallback...`);
        const fallback = await supabase.from(table).select('*');
        data = fallback.data;
        queryError = fallback.error;
      }

      if (queryError) {
        setError(`${queryError.message} (Code: ${queryError.code})`);
        setItems([]);
      } else if (data) {
        // Apply manual filters in JS if needed to be safe
        let filteredData = data;
        if (filterType === 'page' && table === 'posts') {
          filteredData = data.filter((p: any) => p.type === 'page');
        }
        if ((userRole === 'user' || userRole === 'reviewer') && (isCommentsTable || isContactsTable)) {
           filteredData = data.filter((i: any) => i.user_id === session.user.id);
        }
        setItems(filteredData);
      }
    } catch (err: any) {
      setError(err.message || "Unknown fetching error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [table, filterType]);

  const handleAddNew = () => {
    if (table === 'posts') {
      navigate(`/admin/new-post${filterType === 'page' ? '?type=page' : ''}`);
      return;
    }
    setSelectedItem(null);
    setIsEditing(false);
    setItemValue('');
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    if (table === 'posts') {
      navigate(`/admin/edit-post/${item.id}`);
      return;
    }

    const isOwner = !item.user_id || item.user_id === user?.id;
    const isStaff = ['admin', 'editor'].includes(role);
    
    if (!isOwner && !isStaff) {
      alert("Permission denied. Staff only.");
      return;
    }

    setSelectedItem(item);
    setIsEditing(true);
    setItemValue(item.content || item.name || item.title || item.message || '');
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemValue.trim()) return;
    setIsSaving(true);
    try {
      const payload: any = {};
      
      if (isCommentsTable) payload.content = itemValue;
      else if (isContactsTable) payload.message = itemValue;
      else if (table === 'posts') payload.title = itemValue;
      else {
          payload.name = itemValue;
          payload.slug = cleanSlug(itemValue);
      }

      let res;
      if (isEditing && selectedItem) {
        res = await supabase.from(table).update(payload).eq('id', selectedItem.id);
      } else {
        res = await supabase.from(table).insert([payload]);
      }

      if (res.error) throw res.error;
      
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      alert("Save Failed: " + err.message + "\n\nTip: Go to Diagnostics and run the Supreme Repair script.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, itemOwnerId: string) => {
    const isOwner = !itemOwnerId || itemOwnerId === user?.id;
    const isStaff = ['admin', 'editor'].includes(role);

    if (!isOwner && !isStaff) {
      alert("Permission denied.");
      return;
    }

    if (!window.confirm("Delete this record permanently?")) return;
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
      if (deleteError) throw deleteError;
      fetchItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const canModify = ['admin', 'editor'].includes(role);

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-10">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">{title}</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
              {canModify ? 'Global Management View' : 'Personal Records View'}
            </p>
          </div>
          
          {canModify && !isContactsTable && (
            <button 
              onClick={handleAddNew}
              className="bg-[#0073aa] text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#005a87] transition-all active:scale-95"
            >
              Add New {title.slice(0, -1)}
            </button>
          )}
        </header>

        {error && (
          <div className="mb-8 p-6 bg-red-50 border-l-8 border-red-600 rounded-r shadow-sm">
            <h3 className="text-red-600 font-black uppercase text-[10px] tracking-widest mb-2">Sync Error Detected</h3>
            <p className="text-red-800 font-mono text-xs">{error}</p>
            <div className="mt-4 flex gap-2">
                <Link to="/admin/diagnostics" className="text-[10px] font-black uppercase bg-red-600 text-white px-4 py-2 rounded shadow-sm hover:bg-red-700 transition-colors">Run Schema Repair 🛠️</Link>
                <button onClick={fetchItems} className="text-[10px] font-black uppercase bg-white border border-gray-200 px-4 py-2 rounded shadow-sm hover:bg-gray-50">Retry Fetch</button>
            </div>
          </div>
        )}
        
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-gray-400 italic font-serif">Syncing protected records...</div>
          ) : items.length === 0 && !error ? (
            <div className="p-20 text-center">
              <div className="text-4xl mb-4 grayscale opacity-20 text-gray-400">📭</div>
              <p className="text-gray-400 font-serif italic text-sm mb-6">No {title.toLowerCase()} found.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4">{isContactsTable ? 'Message Content' : 'Identity / Label'}</th>
                  <th className="px-6 py-4">Received</th>
                  <th className="px-6 py-4 text-right">Management</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-gray-800 font-serif italic text-[14px] leading-relaxed max-w-2xl">
                        {item.content || item.message || item.name || item.title || 'Untitled'}
                      </div>
                      <div className="text-[9px] text-gray-400 font-sans mt-2 uppercase font-black tracking-tighter flex flex-wrap items-center gap-2">
                        <span className="text-gray-900 font-black">{item.name || item.author_name || 'Anonymous'}</span>
                        {item.email && <span className="bg-gray-100 px-2 py-0.5 rounded text-blue-600">✉️ {item.email}</span>}
                        {item.phone && <span className="bg-gray-100 px-2 py-0.5 rounded text-green-600">📞 {item.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-10 max-w-xl w-full shadow-2xl border-t-8 border-gray-900">
            <h2 className="text-2xl font-bold mb-1 font-serif text-gray-900 uppercase tracking-tighter">{isEditing ? 'Modify' : 'New'} {title.slice(0, -1)}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Database Record Management</p>
            
            <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase text-gray-500">Value / Name</label>
                <textarea 
                    className="w-full border-2 border-gray-100 p-4 rounded-lg min-h-[120px] outline-none focus:border-[#0073aa] font-serif text-gray-800 text-lg leading-relaxed shadow-inner"
                    value={itemValue}
                    placeholder={`Enter ${title.slice(0, -1).toLowerCase()} details...`}
                    onChange={(e) => setItemValue(e.target.value)}
                    autoFocus
                />
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">Cancel</button>
              <button 
                onClick={handleSaveItem}
                disabled={isSaving}
                className="bg-[#0073aa] text-white px-10 py-3 rounded-lg font-black hover:bg-[#005a87] disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                {isSaving ? 'Syncing...' : (isEditing ? 'Commit Update' : 'Save Record')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericListView;
