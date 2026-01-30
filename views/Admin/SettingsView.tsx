
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
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
          // Detect if the column actually exists in the response
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
        } else {
          setFormData(prev => ({ ...prev, header_image: DEFAULT_HEADERS[0].url }));
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
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        id: 1,
        title: formData.title,
        slogan: formData.slogan,
        header_image: formData.header_image,
        header_fit: formData.header_fit,
        banner_text: formData.banner_text,
      };

      // Only send moderation if the column is detected
      if (!isColumnMissing) {
        payload.content_moderation = formData.content_moderation;
      }

      const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
      
      if (error) {
        if (error.message.includes('content_moderation')) {
          setIsColumnMissing(true);
          throw new Error("Column 'content_moderation' is missing. Please run the SQL Fix in Diagnostics.");
        }
        throw error;
      }
      alert("Settings updated successfully!");
    } catch (err: any) {
      setError(err.message);
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

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse font-serif italic">Synchronizing Site Core...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Site Settings</h1>
          <p className="text-gray-600 text-sm italic">Configure your banner, site identity, and safety guards.</p>
        </header>

        {error && (
          <div className="bg-red-50 border-l-8 border-red-500 p-6 mb-8 rounded shadow-sm">
            <h3 className="text-red-900 font-black mb-1 uppercase text-xs tracking-widest">Database Sync Failure</h3>
            <p className="text-red-700 text-sm mb-4 font-medium">{error}</p>
            <Link to="/admin/diagnostics" className="bg-red-700 text-white px-6 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md inline-block">
              Open Diagnostics Hub 🩺
            </Link>
          </div>
        )}

        <div className="bg-white p-8 rounded shadow-sm border border-gray-200">
          <form onSubmit={handleSave} className="space-y-12">
            {/* Identity Section */}
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

            {/* Visual Section - RESTORED HEADER URL & AUTOFIT */}
            <div className="pt-8 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em]">Header Visuals</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                   <button 
                    type="button" 
                    onClick={() => setFormData({...formData, header_fit: 'cover'})}
                    className={`text-[10px] font-black uppercase px-4 py-2 rounded-md transition-all ${formData.header_fit === 'cover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Fill Width
                   </button>
                   <button 
                    type="button" 
                    onClick={() => setFormData({...formData, header_fit: 'contain'})}
                    className={`text-[10px] font-black uppercase px-4 py-2 rounded-md transition-all ${formData.header_fit === 'contain' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Fit Entire Image
                   </button>
                </div>
              </div>
              
              <div className="mb-10 border-8 border-white shadow-2xl rounded-sm overflow-hidden bg-gray-900">
                <div className="relative aspect-[94/20]">
                  <img 
                    src={formData.header_image} 
                    alt="Current Header" 
                    className={`w-full h-full transition-opacity duration-700 ${formData.header_fit === 'cover' ? 'object-cover' : 'object-contain'}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x300?text=Invalid+Banner+URL';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                    <span className="text-white text-[10px] font-black uppercase tracking-[0.5em] opacity-40 drop-shadow-lg">Active Preview</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-3 tracking-widest">Custom Banner Image URL</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..."
                    className="w-full border-2 border-gray-100 p-4 rounded text-sm font-mono text-blue-600 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#0073aa] outline-none shadow-inner transition-all"
                    value={formData.header_image}
                    onChange={e => setFormData({...formData, header_image: e.target.value})}
                  />
                  <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase italic leading-relaxed">
                    Tip: Paste any direct image link here. High-resolution images (1200px+) look best.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-500 mb-3 tracking-widest">Preset Library</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DEFAULT_HEADERS.map((header, idx) => (
                      <button
                        key={idx}
                        type="button"
                        title={header.name}
                        onClick={() => selectDefaultHeader(header.url)}
                        className={`group relative h-14 rounded-md overflow-hidden border-2 transition-all ${formData.header_image === header.url ? 'border-[#0073aa] scale-105 shadow-md z-10' : 'border-gray-50 hover:border-gray-200'}`}
                      >
                        <img 
                          src={header.url} 
                          alt={header.name} 
                          className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100');
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Section */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase text-gray-400 mb-6 tracking-[0.2em]">Guardians & Safety</h3>
              <div className={`p-6 rounded-lg border transition-all flex items-center justify-between group ${isColumnMissing ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-gray-50 border-gray-200 hover:border-[#0073aa]'}`}>
                <div className="max-w-md">
                  <p className={`font-bold text-sm uppercase ${isColumnMissing ? 'text-red-900' : 'text-gray-900'}`}>
                    {isColumnMissing ? '⚠️ Database Error' : 'Automated Content Guard'}
                  </p>
                  <p className={`text-[11px] mt-1 leading-relaxed ${isColumnMissing ? 'text-red-600' : 'text-gray-500'}`}>
                    {isColumnMissing 
                      ? "Required column 'content_moderation' is missing. The system cannot save safety preferences until this is fixed."
                      : "Uses AI to filter inappropriate links or comments. This feature requires the 'content_moderation' column."}
                  </p>
                </div>
                {isColumnMissing ? (
                  <Link to="/admin/diagnostics" className="text-[10px] font-black uppercase bg-red-600 text-white px-4 py-2 rounded shadow-lg">Fix Now</Link>
                ) : (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.content_moderation}
                      onChange={e => setFormData({...formData, content_moderation: e.target.checked})}
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#0073aa]"></div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-10 border-t border-gray-100">
              <button 
                disabled={saving}
                className="bg-[#0073aa] text-white px-12 py-5 rounded-sm font-black uppercase text-[12px] tracking-[0.3em] hover:bg-[#005177] disabled:opacity-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
              >
                {saving ? 'UPDATING DB...' : 'COMMIT CHANGES'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
