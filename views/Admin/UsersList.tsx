
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const ROLE_ORDER = ['user', 'reviewer', 'editor', 'admin'];

const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('role', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (id: string, newRole: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Error updating role: " + err.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 font-serif">Staff & Members</h1>
          <p className="text-gray-500 text-sm italic">Manage permissions for Admins, Editors, Reviewers, and Users.</p>
        </header>

        <div className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-400 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Change Permissions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{u.display_name || 'Anonymous'}</div>
                    <div className="text-[10px] text-blue-600 font-mono font-bold">@{u.username || 'no_username'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700' : 
                      u.role === 'editor' ? 'bg-blue-100 text-blue-700' : 
                      u.role === 'reviewer' ? 'bg-amber-100 text-amber-700' : 
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <select 
                        className="text-[10px] font-bold uppercase border p-1 rounded bg-gray-50 outline-none"
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button 
                        onClick={() => updateStatus(u.id, u.status === 'banned' ? 'active' : 'banned')}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${u.status === 'banned' ? 'text-green-600 border-green-200' : 'text-red-500 border-red-200'}`}
                      >
                        {u.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-10 text-center text-gray-400 italic">Synchronizing staff registry...</div>}
        </div>
      </main>
    </div>
  );
};

export default UsersList;
