
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const THEME_OPTIONS = [
  { id: 'light', name: 'Light Mode', desc: 'Classic journalistic white-on-gray aesthetic. High readability and professional contrast.' },
  { id: 'dark', name: 'Dark Mode', desc: 'Sleek, high-contrast dark palette for focused reading and modern presentation.' }
];

const FONT_OPTIONS = [
  { id: 'serif', name: 'Serif (Classic)', class: 'font-serif' },
  { id: 'sans', name: 'Sans (Modern)', class: 'font-sans' },
  { id: 'mono', name: 'Mono (Technical)', class: 'font-mono' }
];

const AppearanceView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState('light');
  const [saving, setSaving] = useState(false);
  
  // Custom Controls State
  const [customSettings, setCustomSettings] = useState({
    title_color: '#000000',
    bg_color: '#f1f1f1',
    text_color: '#111111',
    header_font: 'serif'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        if (data.theme) setActiveTheme(data.theme === 'default' ? 'light' : data.theme);
        setCustomSettings({
          title_color: data.title_color || '#000000',
          bg_color: data.bg_color || '#f1f1f1',
          text_color: data.text_color || '#111111',
          header_font: data.header_font || 'serif'
        });
      }
    };
    fetchSettings();
  }, []);

  const handleSaveAppearance = async (updates: any) => {
    setSaving(true);
    const newSettings = { ...customSettings, ...updates };
    setCustomSettings(newSettings);
    
    try {
      const { error } = await supabase.from('site_settings').upsert({ 
        id: 1, 
        theme: activeTheme,
        ...newSettings
      }, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setActiveTheme(themeId);
    handleSaveAppearance({ theme: themeId });
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10 max-w-5xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 font-serif leading-none mb-2 uppercase tracking-tighter">Atmosphere Engine</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Global Visual Modality Management</p>
        </header>

        {/* Global Themes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          {THEME_OPTIONS.map(theme => (
            <div 
              key={theme.id}
              className={`p-10 bg-white border-4 rounded-2xl transition-all cursor-pointer shadow-xl flex flex-col items-center text-center ${activeTheme === theme.id ? 'border-blue-600 scale-[1.03] ring-4 ring-blue-50' : 'border-gray-50 hover:border-gray-200 opacity-60 hover:opacity-100 hover:scale-[1.01]'}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner transition-colors ${theme.id === 'dark' ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-900'}`}>
                {theme.id === 'dark' ? '🌙' : '☀️'}
              </div>
              <h3 className="font-black text-2xl uppercase tracking-tighter mb-3">{theme.name}</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase leading-relaxed tracking-wider px-4">{theme.desc}</p>
            </div>
          ))}
        </div>

        {/* Custom Branding & Palette */}
        <section className="bg-white p-12 rounded-2xl shadow-xl border border-gray-200 space-y-12">
            <div>
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Custom Branding & Palette</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Fine-tune the site's unique identity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Font Selection */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Header Font Family</label>
                    <div className="flex flex-col gap-2">
                        {FONT_OPTIONS.map(font => (
                            <button 
                                key={font.id}
                                onClick={() => handleSaveAppearance({ header_font: font.id })}
                                className={`p-4 border-2 rounded-lg text-left transition-all ${customSettings.header_font === font.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                            >
                                <span className={`text-lg font-bold ${font.class}`}>{font.name}</span>
                                <p className="text-[9px] text-gray-400 mt-1 uppercase font-black">Sample: The Quick Brown Fox</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Pickers */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Site Title Color</label>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Sets the color of your brand name</span>
                        </div>
                        <input 
                            type="color" 
                            className="w-12 h-12 rounded cursor-pointer border-none p-0 bg-transparent"
                            value={customSettings.title_color}
                            onChange={(e) => handleSaveAppearance({ title_color: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Global Background</label>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Main container backdrop color</span>
                        </div>
                        <input 
                            type="color" 
                            className="w-12 h-12 rounded cursor-pointer border-none p-0 bg-transparent"
                            value={customSettings.bg_color}
                            onChange={(e) => handleSaveAppearance({ bg_color: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Global Text Color</label>
                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Default readability color</span>
                        </div>
                        <input 
                            type="color" 
                            className="w-12 h-12 rounded cursor-pointer border-none p-0 bg-transparent"
                            value={customSettings.text_color}
                            onChange={(e) => handleSaveAppearance({ text_color: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        </section>

        {saving && (
          <div className="fixed bottom-12 right-12 bg-black text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl animate-bounce z-50">
            Updating Visual Registry...
          </div>
        )}
        
        <div className="mt-20 p-12 bg-gray-900 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
            <div className="relative z-10">
                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-blue-400">Layout Optimization Notice</h4>
                <p className="text-gray-400 font-serif italic text-xl leading-relaxed mb-6">
                  "The frontend experience is now hardwired to the <b className="text-white">Supreme 1280px Editorial Grid</b>. Custom colors and fonts are injected directly into the core theme manifest."
                </p>
                <div className="w-16 h-1 bg-blue-600"></div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AppearanceView;
