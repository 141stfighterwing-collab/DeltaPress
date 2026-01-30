
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const THEME_OPTIONS = [
  { id: 'default', name: 'Twenty Ten (Default)', desc: 'Clean, professional WordPress look.' },
  { id: 'dark', name: 'Midnight Dark', desc: 'Sleek dark mode for late night reading.' },
  { id: 'sunspot', name: 'Sunspot', desc: 'Warm, golden hues for a cozy blog.' },
  { id: 'moon', name: 'Pale Moon', desc: 'Soft blues and grays, easy on the eyes.' },
  { id: 'neon', name: 'Neon Cyber', desc: 'Loud, vibrant, and futuristic.' },
  { id: 'nuke', name: 'Retro Nuke', desc: 'Classic PHPNuke-style gray aesthetic.' }
];

const AppearanceView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase.from('site_settings').select('theme').eq('id', 1).single();
      if (data?.theme) setActiveTheme(data.theme);
    };
    fetchTheme();
  }, []);

  const handleThemeChange = async (themeId: string) => {
    setSaving(true);
    setActiveTheme(themeId);
    try {
      // Use id: 1 to ensure we are updating the primary settings row
      const { error } = await supabase.from('site_settings').upsert({ id: 1, theme: themeId }, { onConflict: 'id' });
      if (error) throw error;
      alert(`Theme "${themeId}" activated successfully!`);
    } catch (err: any) {
      alert("Error activating theme: " + err.message);
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Manage Themes</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {THEME_OPTIONS.map(theme => (
            <div 
              key={theme.id}
              className={`p-6 bg-white border-2 rounded transition-all cursor-pointer hover:shadow-lg ${activeTheme === theme.id ? 'border-[#0073aa] ring-2 ring-[#0073aa] ring-opacity-20' : 'border-gray-100'}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{theme.name}</h3>
                {activeTheme === theme.id && <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Active</span>}
              </div>
              <p className="text-sm text-gray-500 mb-6">{theme.desc}</p>
              <button 
                className={`w-full py-2 text-sm font-bold rounded ${activeTheme === theme.id ? 'bg-[#0073aa] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {activeTheme === theme.id ? 'Customize' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
        {saving && <p className="mt-4 text-blue-600 font-bold animate-pulse">Applying theme change...</p>}
      </main>
    </div>
  );
};

export default AppearanceView;
