
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  role: 'admin' | 'editor' | 'reviewer' | 'user';
  status: 'active' | 'banned' | 'suspended';
  suspended_until?: string;
  created_at: string;
}

const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (id: string, newRole: string) => {
    if (id === currentUser?.id) {
      alert("Security: You cannot demote your own account. Ask another admin.");
      return;
    }

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Permission Error: " + err.message);
    }
  };

  const handleSuspend24h = async (id: string) => {
    if (id === currentUser?.id) return;
    
    const until = new Date();
    until.setHours(until.getHours() + 24);
    
    try {
      const { error } = await supabase.from('profiles').update({ 
        status: 'suspended',
        suspended_until: until.toISOString()
      }).eq('id', id);
      
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Action Failed: " + err.message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (id === currentUser?.id) return;

    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      const { error } = await supabase.from('profiles').update({ 
        status: newStatus,
        suspended_until: null 
      }).eq('id', id);
      
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Action Failed: " + err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif leading-none">Members Registry</h1>
            <p className="text-gray-500 text-sm mt-2 italic font-serif">Staff promotion, demotion, and security enforcement.</p>
          </div>
          
          <div className="w-full md:w-80">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full bg-white border border-gray-300 p-3 pl-10 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span>
            </div>
          </div>
        </header>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase text-gray-400 font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Access Level</th>
                <th className="px-6 py-4">Status / Visibility</th>
                <th className="px-6 py-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/80 transition-colors ${u.status !== 'active' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center font-black text-gray-400 border border-gray-200">
                        {u.display_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-base leading-none mb-1">{u.display_name}</div>
                        <div className="text-[10px] text-blue-600 font-mono font-bold uppercase tracking-tighter">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        u.role === 'admin' ? 'bg-red-600 text-white' : 
                        u.role === 'editor' ? 'bg-blue-600 text-white' : 
                        u.role === 'reviewer' ? 'bg-amber-500 text-white' : 
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        u.status === 'active' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {u.status}
                      </span>
                      {u.status === 'suspended' && u.suspended_until && (
                        <span className="text-[9px] text-gray-400 font-mono">Until: {new Date(u.suspended_until).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end items-center gap-4">
                      {/* Promotion / Demotion */}
                      <select 
                        disabled={u.id === currentUser?.id}
                        className="text-[10px] font-black uppercase border border-gray-200 p-2 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30"
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>

                      <div className="h-6 w-px bg-gray-200 mx-1"></div>

                      {/* Security Actions */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSuspend24h(u.id)}
                          disabled={u.id === currentUser?.id || u.status === 'suspended'}
                          title="Suspend for 24 hours"
                          className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 disabled:opacity-30 transition-all"
                        >
                          Suspend 24h
                        </button>
                        <button 
                          onClick={() => toggleStatus(u.id, u.status)}
                          disabled={u.id === currentUser?.id}
                          className={`px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest border transition-all ${
                            u.status === 'banned' 
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {u.status === 'banned' ? 'Restore' : 'Ban'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="p-20 text-center text-gray-400 italic font-serif">
              <span className="animate-pulse">Accessing Member Database...</span>
            </div>
          )}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-20 text-center text-gray-400 font-serif italic">
              No members found matching your search.
            </div>
          )}
        </div>
        
        <footer className="mt-10 bg-gray-900 text-white p-6 rounded-lg shadow-xl">
           <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60">Security Protocol</h4>
           <ul className="text-[11px] text-gray-400 space-y-2 list-disc pl-5 leading-relaxed">
             <li>Admins have full write access to posts, settings, and the newsroom.</li>
             <li>Editors can manage all posts and categories but cannot change site settings.</li>
             <li>Reviewers have <b>Read-Only</b> access to all administrative data but cannot publish or delete.</li>
             <li>Suspended users are automatically locked out for 24 hours from their local time.</li>
           </ul>
        </footer>
      </main>
    </div>
  );
};

export default UsersList;
