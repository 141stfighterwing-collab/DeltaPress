
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const THEME_OPTIONS = [
  { id: 'light', name: 'Light Mode', desc: 'Classic journalistic white-on-gray aesthetic. High readability and professional contrast.' },
  { id: 'dark', name: 'Dark Mode', desc: 'Sleek, high-contrast dark palette for focused reading and modern presentation.' }
];

const AppearanceView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState('light');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase.from('site_settings').select('theme').eq('id', 1).maybeSingle();
      if (data?.theme) setActiveTheme(data.theme === 'default' ? 'light' : data.theme);
    };
    fetchTheme();
  }, []);

  const handleThemeChange = async (themeId: string) => {
    setSaving(true);
    setActiveTheme(themeId);
    try {
      const { error } = await supabase.from('site_settings').upsert({ id: 1, theme: themeId }, { onConflict: 'id' });
      if (error) throw error;
      alert(`Theme "${themeId.toUpperCase()}" deployed successfully.`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10 max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 font-serif leading-none mb-2 uppercase tracking-tighter">Atmosphere Engine</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Global Visual Modality Management</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {THEME_OPTIONS.map(theme => (
            <div 
              key={theme.id}
              className={`p-10 bg-white border-4 rounded-2xl transition-all cursor-pointer shadow-xl flex flex-col items-center text-center ${activeTheme === theme.id ? 'border-blue-600 scale-[1.03] ring-4 ring-blue-50' : 'border-gray-50 hover:border-gray-200 opacity-60 hover:opacity-100 hover:scale-[1.01]'}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner transition-colors ${theme.id === 'dark' ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-900'}`}>
                {theme.id === 'dark' ? '🌙' : '☀️'}
              </div>
              
              <div className="mb-6">
                <h3 className="font-black text-2xl uppercase tracking-tighter mb-3">{theme.name}</h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase leading-relaxed tracking-wider px-4">{theme.desc}</p>
              </div>

              <div className="mt-auto pt-6 border-t border-gray-50 w-full">
                {activeTheme === theme.id ? (
                  <span className="bg-blue-600 text-white text-[10px] px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-lg inline-block">Current Active State</span>
                ) : (
                  <span className="bg-gray-100 text-gray-400 text-[10px] px-8 py-3 rounded-full font-black uppercase tracking-widest inline-block group-hover:bg-blue-600 group-hover:text-white transition-colors">Select Modality</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {saving && (
          <div className="fixed bottom-12 right-12 bg-black text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl animate-bounce">
            Updating Visual Registry...
          </div>
        )}
        
        <div className="mt-20 p-12 bg-gray-900 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
            <div className="relative z-10">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-blue-400">Layout Optimization Notice</h4>
                <p className="text-gray-400 font-serif italic text-xl leading-relaxed mb-6">
                  "The frontend experience is now hardwired to the <b className="text-white">Supreme 1280px Editorial Grid</b>. This eliminates the 'thin' layout issue, ensuring your publications command the full visual attention of your readership."
                </p>
                <div className="w-16 h-1 bg-blue-600"></div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AppearanceView;
