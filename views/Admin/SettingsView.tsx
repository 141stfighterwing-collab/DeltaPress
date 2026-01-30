
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const DEFAULT_HEADERS = [
  { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1200', name: 'Pine Forest' },
  { url: 'https://images.unsplash.com/photo-1488459736882-d7922596f733?auto=format&fit=crop&q=80&w=1200', name: 'Fresh Berries' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200', name: 'Ocean Shore' },
  { url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200', name: 'City Heights' },
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200', name: 'Mountain Range' },
  { url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=1200', name: 'Journalist Desk' }
];

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slogan: '',
    header_image: '',
    banner_text: '',
    content_moderation: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setFormData({
          title: data.title || '',
          slogan: data.slogan || '',
          header_image: data.header_image || DEFAULT_HEADERS[0].url,
          banner_text: data.banner_text || '',
          content_moderation: data.content_moderation || false
        });
      } else {
        setFormData(prev => ({ ...prev, header_image: DEFAULT_HEADERS[0].url }));
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert({
        id: 1,
        title: formData.title,
        slogan: formData.slogan,
        header_image: formData.header_image,
        banner_text: formData.banner_text,
        content_moderation: formData.content_moderation
      }, { onConflict: 'id' });
      
      if (error) throw error;
      alert("Settings updated successfully!");
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectDefaultHeader = (url: string) => {
    setFormData({ ...formData, header_image: url });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold animate-pulse">Loading settings...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-10 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Site Settings</h1>
          <p className="text-gray-600 text-sm italic">Customize your blog's identity and safety features.</p>
        </header>

        <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-black uppercase text-gray-600 mb-2 tracking-widest">Site Title</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-3 rounded text-base font-medium text-gray-900 focus:ring-2 focus:ring-[#0073aa] outline-none bg-[#fdfdfd]" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-gray-600 mb-2 tracking-widest">Tagline</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-3 rounded text-base font-medium text-gray-900 focus:ring-2 focus:ring-[#0073aa] outline-none bg-[#fdfdfd]" 
                  value={formData.slogan}
                  onChange={e => setFormData({...formData, slogan: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase text-gray-600 mb-4 tracking-widest">Safety & Moderation</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Content Moderation</p>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">
                    Automatically filter or flag content inappropriate for children (Porn links, gambling, etc.). Highly recommended for community growth.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.content_moderation}
                    onChange={e => setFormData({...formData, content_moderation: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0073aa]"></div>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-xs font-black uppercase text-gray-600 mb-4 tracking-widest">Header Image Preview</label>
              <div className="mb-6 border border-gray-200 p-2 rounded bg-gray-50 overflow-hidden">
                <img 
                  src={formData.header_image} 
                  alt="Current Header" 
                  className="w-full h-32 object-cover rounded shadow-sm"
                  onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/940x200'}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {DEFAULT_HEADERS.map((header, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDefaultHeader(header.url)}
                    className={`relative rounded overflow-hidden h-20 transition-all border-4 ${formData.header_image === header.url ? 'border-[#0073aa] shadow-md' : 'border-transparent hover:border-gray-200'}`}
                  >
                    <img src={header.url} alt={header.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-gray-100">
              <button 
                disabled={saving}
                className="bg-[#0073aa] text-white px-10 py-4 rounded font-bold uppercase text-xs tracking-[0.2em] hover:bg-[#005177] disabled:opacity-50 transition-all shadow-xl flex items-center gap-2"
              >
                {saving ? 'SAVING...' : 'SAVE SETTINGS'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
