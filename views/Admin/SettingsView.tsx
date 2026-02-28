
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { stripAllHtml, isValidUrl } from '../../services/security';
import AdminSidebar from '../../components/AdminSidebar';

const DEFAULT_HEADERS = [
  { url: '/images/pine-forest.jpg', name: 'Pine Forest' },
  { url: '/images/berries.jpg', name: 'Berries' },
  { url: '/images/ocean.jpg', name: 'Ocean' }
];

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slogan: '',
    logo_url: '',
    header_image: '',
    header_fit: 'cover' as 'cover' | 'contain' | 'none' | 'scale-down',
    header_pos_x: 50,
    header_pos_y: 50,
    banner_text: '',
    content_moderation: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error: fetchError } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
        if (fetchError) throw fetchError;
        if (data) {
          setFormData({
            title: data.title || '',
            slogan: data.slogan || '',
            logo_url: data.logo_url || '',
            header_image: data.header_image || DEFAULT_HEADERS[0].url,
            header_fit: data.header_fit || 'cover',
            header_pos_x: data.header_pos_x ?? 50,
            header_pos_y: data.header_pos_y ?? 50,
            banner_text: data.banner_text || '',
            content_moderation: !!data.content_moderation
          });
        }
      } catch (err: any) {
        setError("Load Failed: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (formData.header_fit !== 'cover' && formData.header_fit !== 'none') return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setFormData(prev => ({
      ...prev,
      header_pos_x: Math.max(0, Math.min(100, Math.round(x))),
      header_pos_y: Math.max(0, Math.min(100, Math.round(y)))
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.header_image && !isValidUrl(formData.header_image)) {
      alert("Invalid header image URL.");
      return;
    }
    if (formData.logo_url && !isValidUrl(formData.logo_url)) {
      alert("Invalid logo URL.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        id: 1,
        title: stripAllHtml(formData.title),
        slogan: stripAllHtml(formData.slogan),
        logo_url: formData.logo_url,
        header_image: formData.header_image,
        header_fit: formData.header_fit,
        header_pos_x: formData.header_pos_x,
        header_pos_y: formData.header_pos_y,
        banner_text: stripAllHtml(formData.banner_text),
      };

      const { error: upsertError } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
      if (upsertError) throw upsertError;
      alert("Site identity and layout committed.");
    } catch (err: any) {
      setError(err.message || "Unknown error occurred during save.");
      alert(`Commit Failed: ${err.message}\n\nThis usually means your database columns are missing. Please go to Diagnostics and run the Repair Script.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold animate-pulse font-serif italic">Synchronizing Site Core...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">Site Settings</h1>
          <p className="text-gray-600 text-sm italic">Configure your banner, site identity, and branding.</p>
        </header>

        {error && (
            <div className="mb-8 p-6 bg-red-50 border-l-8 border-red-600 rounded shadow-sm">
                <h3 className="text-red-600 font-black uppercase text-[10px] tracking-widest mb-1">Database Error</h3>
                <p className="text-red-800 font-mono text-xs">{error}</p>
                <div className="mt-4">
                    <Link to="/admin/diagnostics" className="text-[10px] font-black uppercase bg-red-600 text-white px-4 py-2 rounded">Repair DB Schema 🛠️</Link>
                </div>
            </div>
        )}

        <section className="mb-10 bg-white p-4 rounded-lg shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Header Workspace Preview</h3>
                <div className="flex gap-4">
                     <div className="text-[9px] font-bold text-blue-500 uppercase">X: {formData.header_pos_x}%</div>
                     <div className="text-[9px] font-bold text-blue-500 uppercase">Y: {formData.header_pos_y}%</div>
                </div>
            </div>
            
            <div 
                ref={previewRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`relative w-full h-[220px] bg-gray-100 overflow-hidden border-4 border-gray-50 rounded select-none ${isDragging ? 'cursor-grabbing' : (formData.header_fit === 'cover' || formData.header_fit === 'none' ? 'cursor-crosshair' : 'cursor-default')}`}
            >
                <img 
                    src={formData.header_image} 
                    alt="Preview" 
                    draggable={false}
                    className="w-full h-full pointer-events-none transition-all duration-75"
                    style={{ 
                        objectFit: formData.header_fit, 
                        objectPosition: `${formData.header_pos_x}% ${formData.header_pos_y}%` 
                    }}
                />
                
                {/* Visual Drag Helper */}
                {(formData.header_fit === 'cover' || formData.header_fit === 'none') && (
                    <div 
                        className="absolute w-8 h-8 border-2 border-white rounded-full bg-blue-500/20 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${formData.header_pos_x}%`, top: `${formData.header_pos_y}%` }}
                    >
                        <div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full"></div>
                    </div>
                )}

                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] text-white font-black uppercase tracking-widest border border-white/20">
                    Live Canvas
                </div>
            </div>
            {(formData.header_fit === 'cover' || formData.header_fit === 'none') && (
                <p className="text-[9px] text-gray-400 italic mt-3 text-center uppercase tracking-tighter">Click and drag above to reposition image focus</p>
            )}
        </section>

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
                <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Site Logo URL</label>
                <div className="flex gap-4 items-center">
                    <input 
                        type="text" 
                        placeholder="https://example.com/logo.png"
                        className={`flex-1 border-2 p-4 rounded text-sm font-mono focus:ring-2 outline-none transition-all ${formData.logo_url && !isValidUrl(formData.logo_url) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                        value={formData.logo_url}
                        onChange={e => setFormData({...formData, logo_url: e.target.value})}
                    />
                    {formData.logo_url && isValidUrl(formData.logo_url) && (
                        <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center p-2">
                            <img src={formData.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                </div>
                <p className="text-[9px] text-gray-400 italic mt-2 uppercase tracking-tighter">If set, this logo will appear in the site header instead of text.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Header Image URL</label>
                    <input 
                        type="text" 
                        placeholder="Paste image URL here..."
                        className={`w-full border-2 p-4 rounded text-sm font-mono focus:ring-2 outline-none transition-all ${formData.header_image && !isValidUrl(formData.header_image) ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                        value={formData.header_image}
                        onChange={e => setFormData({...formData, header_image: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Scale & Alignment</label>
                    <select 
                        className="w-full border border-gray-300 p-4 rounded text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#0073aa] outline-none bg-white"
                        value={formData.header_fit}
                        onChange={e => setFormData({...formData, header_fit: e.target.value as any})}
                    >
                        <option value="cover">Fill & Crop (Zoom)</option>
                        <option value="contain">Fit to Width (Shrink)</option>
                        <option value="none">Original / Center</option>
                        <option value="scale-down">Auto-Shrink only</option>
                    </select>
                </div>
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
