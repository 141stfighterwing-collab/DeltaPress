
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { stripAllHtml, isValidUrl } from '../../services/security';
import AdminSidebar from '../../components/AdminSidebar';

const DEFAULT_HEADERS = [
  { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop', name: 'Pine Forest' },
  { url: 'https://images.unsplash.com/photo-1488459736882-d7922596f733?q=80&w=1200&auto=format&fit=crop', name: 'Berries' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop', name: 'Ocean' },
  { url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1200&auto=format&fit=crop', name: 'City' },
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop', name: 'Mountains' },
  { url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1200&auto=format&fit=crop', name: 'Desk' }
];

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isColumnMissing, setIsColumnMissing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slogan: '',
    header_image: '',
    header_fit: 'cover' as 'cover' | 'contain',
    banner_text: '',
    content_moderation: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
        if (data) {
          const columnMissing = typeof data.content_moderation === 'undefined';
          setIsColumnMissing(columnMissing);

          setFormData({
            title: data.title || '',
            slogan: data.slogan || '',
            header_image: data.header_image || DEFAULT_HEADERS[0].url,
            header_fit: data.header_fit || 'cover',
            banner_text: data.banner_text || '',
            content_moderation: !!data.content_moderation
          });
        }
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Security: URL Validation
    if (formData.header_image && !isValidUrl(formData.header_image)) {
      alert("Please provide a valid image URL starting with http:// or https://");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 2. Security: Strip all HTML from identity fields
      const payload: any = {
        id: 1,
        title: stripAllHtml(formData.title),
        slogan: stripAllHtml(formData.slogan),
        header_image: formData.header_image,
        header_fit: formData.header_fit,
        banner_text: stripAllHtml(formData.banner_text),
      };

      if (!isColumnMissing) {
        payload.content_moderation = formData.content_moderation;
      }

      const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
      
      if (error) throw error;
      alert("Site identity verified and updated.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectDefaultHeader = (url: string) => {
    setFormData({ ...formData, header_image: url });
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse font-serif italic">Synchronizing Site Core...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Site Settings</h1>
          <p className="text-gray-600 text-sm italic">Configure your banner, site identity, and safety guards.</p>
        </header>

        <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
          <form onSubmit={handleSave} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Site Title</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-4 rounded text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#0073aa] outline-none bg-white shadow-inner" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Tagline</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 p-4 rounded text-base font-bold text-gray-900 focus:ring-2 focus:ring-[#0073aa] outline-none bg-white shadow-inner" 
                  value={formData.slogan}
                  onChange={e => setFormData({...formData, slogan: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Header Visuals</h3>
              <input 
                type="text" 
                placeholder="https://images.unsplash.com/..."
                className={`w-full border-2 p-4 rounded text-sm font-mono focus:ring-2 outline-none transition-all ${formData.header_image && !isValidUrl(formData.header_image) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                value={formData.header_image}
                onChange={e => setFormData({...formData, header_image: e.target.value})}
              />
              {formData.header_image && !isValidUrl(formData.header_image) && (
                <p className="text-red-500 text-[10px] font-black uppercase mt-2">Invalid URL protocol</p>
              )}
            </div>

            <div className="flex justify-end pt-10 border-t border-gray-100">
              <button 
                disabled={saving}
                className="bg-[#0073aa] text-white px-12 py-5 rounded-sm font-black uppercase text-[12px] tracking-[0.3em] hover:bg-[#005177] disabled:opacity-50 transition-all shadow-xl active:scale-95"
              >
                {saving ? 'Validating...' : 'COMMIT CHANGES'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
