
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [editItemValue, setEditItemValue] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCommentsTable = table === 'comments' || table === 'news_comments';

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from(table).select('*');
      
      const tablesWithDates = ['posts', 'comments', 'news_comments', 'profiles', 'projects', 'media', 'contacts', 'services', 'partners', 'plugins', 'tools'];
      if (tablesWithDates.includes(table)) {
        query = query.order('created_at', { ascending: false });
      }
      
      if (filterType) {
        query = query.eq('type', filterType);
      }
      
      const { data, error: queryError } = await query;
      
      if (queryError) {
        if (queryError.code === '42P01') {
          setError(`Table "${table}" has not been created in your Supabase database yet.`);
        } else {
          console.warn(`Query error on table ${table}:`, queryError.message);
        }
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

  const handleAddNew = () => {
    if (table === 'posts') {
      navigate('/admin/new-post');
      return;
    }
    setShowAddModal(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditItemValue(item.content || item.name || item.title || '');
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editItemValue || !selectedItem) return;
    setIsSaving(true);
    try {
      const payload: any = {};
      if (isCommentsTable) {
        payload.content = editItemValue;
      } else if (['categories', 'partners', 'plugins'].includes(table)) {
        payload.name = editItemValue;
      } else {
        payload.title = editItemValue;
      }

      const { error: updateError } = await supabase.from(table).update(payload).eq('id', selectedItem.id);
      if (updateError) throw updateError;
      
      setShowEditModal(false);
      fetchItems();
    } catch (err: any) {
      alert("Error updating item: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNewItem = async () => {
    if (!newItemValue) return;
    setIsSaving(true);
    try {
      const payload: any = {};
      
      if (['categories', 'partners', 'plugins'].includes(table)) {
        payload.name = newItemValue;
        if (table === 'categories') {
          payload.slug = newItemValue.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        }
      } else if (['projects', 'services', 'media', 'tools', 'posts'].includes(table)) {
        payload.title = newItemValue;
        if (table === 'tools') payload.url = newItemUrl;
        if (table === 'posts') {
          payload.slug = newItemValue.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
          payload.type = filterType || 'post';
          payload.status = 'publish';
        }
      }

      const { error: insertError } = await supabase.from(table).insert(payload);
      if (insertError) throw insertError;
      
      setNewItemValue('');
      setNewItemUrl('');
      setShowAddModal(false);
      fetchItems();
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
      if (deleteError) throw deleteError;
      fetchItems();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 font-serif">{title}</h1>
          {!isCommentsTable && (
            <button 
              onClick={handleAddNew}
              className="bg-[#0073aa] text-white px-5 py-2 rounded text-sm font-bold shadow-sm hover:bg-[#005177] active:scale-95 transition-all"
            >
              Add New
            </button>
          )}
        </div>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-8 rounded text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-bold mb-2">Database Table Missing</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 text-center text-gray-400 italic">Fetching data...</div>
            ) : items.length === 0 ? (
              <div className="p-20 text-center">
                <div className="text-4xl mb-4 text-gray-200">📭</div>
                <p className="text-gray-400 font-serif">No {title.toLowerCase()} found.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">{isCommentsTable ? 'Comment Content' : 'Name / Title'}</th>
                    <th className="px-6 py-4">{isCommentsTable ? 'Author Profile' : 'Status / Details'}</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        {isCommentsTable ? (
                          <div className="flex gap-4">
                            <span className="text-gray-200 mt-1 shrink-0">💬</span>
                            <div className="text-gray-800 font-serif italic text-[13px] leading-relaxed border-l-2 border-gray-100 pl-4">
                              "{item.content}"
                              {item.article_title && (
                                <div className="text-[9px] text-blue-500 font-sans font-bold uppercase tracking-tighter mt-1 not-italic">
                                  On News: {item.article_title}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="font-bold text-blue-600 hover:underline cursor-pointer">
                            {item.name || item.title || item.subject || 'Untitled'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isCommentsTable ? (
                          <div className="flex flex-col">
                            <div className="font-black text-gray-900 text-xs">{item.author_name}</div>
                            <div className="text-[10px] text-gray-400 font-mono tracking-tighter truncate max-w-[150px]">{item.author_email}</div>
                            <div className="text-[9px] text-gray-300 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                            {item.status || 'Active'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-widest"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-widest"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4 font-serif text-gray-800">Edit {isCommentsTable ? 'Comment' : 'Item'}</h2>
            <textarea 
              className="w-full border border-gray-300 p-4 rounded min-h-[150px] outline-none focus:ring-2 focus:ring-[#0073aa] transition-all font-serif text-gray-800 bg-[#fdfdfd]"
              value={editItemValue}
              onChange={(e) => setEditItemValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
              <button 
                onClick={handleUpdateItem}
                disabled={isSaving}
                className="bg-[#0073aa] text-white px-6 py-2 rounded font-bold hover:bg-[#005a87] disabled:opacity-50 shadow-md transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                {isSaving ? 'Saving...' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showAddModal && !isCommentsTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold mb-4 font-serif text-gray-800">New {title.replace(/s$/, '')}</h2>
            <input 
              type="text" 
              className="w-full border border-gray-300 p-3 rounded outline-none focus:ring-2 focus:ring-[#0073aa] mb-4 text-gray-900" 
              placeholder="Enter name..."
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
              <button 
                onClick={handleSaveNewItem}
                disabled={isSaving || !newItemValue}
                className="bg-[#0073aa] text-white px-6 py-2 rounded font-bold hover:bg-[#005a87] transition-all shadow-md active:scale-95 text-xs uppercase tracking-widest"
              >
                {isSaving ? 'Saving...' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericListView;
