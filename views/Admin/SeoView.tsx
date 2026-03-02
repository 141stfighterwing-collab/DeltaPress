import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { stripAllHtml, isValidUrl } from '../../services/security';
import AdminSidebar from '../../components/AdminSidebar';

const SeoView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    seo_meta_title: '',
    seo_meta_description: '',
    seo_meta_keywords: '',
    seo_og_image: '',
    seo_canonical_url: ''
  });

  useEffect(() => {
    const loadSeo = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('site_settings')
          .select('seo_meta_title, seo_meta_description, seo_meta_keywords, seo_og_image, seo_canonical_url')
          .eq('id', 1)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (data) {
          setFormData({
            seo_meta_title: data.seo_meta_title || '',
            seo_meta_description: data.seo_meta_description || '',
            seo_meta_keywords: data.seo_meta_keywords || '',
            seo_og_image: data.seo_og_image || '',
            seo_canonical_url: data.seo_canonical_url || ''
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load SEO settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSeo();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.seo_og_image && !isValidUrl(formData.seo_og_image)) {
      alert('OpenGraph image URL is invalid.');
      return;
    }

    if (formData.seo_canonical_url && !isValidUrl(formData.seo_canonical_url)) {
      alert('Canonical URL is invalid.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        id: 1,
        seo_meta_title: stripAllHtml(formData.seo_meta_title),
        seo_meta_description: stripAllHtml(formData.seo_meta_description),
        seo_meta_keywords: stripAllHtml(formData.seo_meta_keywords),
        seo_og_image: formData.seo_og_image,
        seo_canonical_url: formData.seo_canonical_url
      };

      const { error: upsertError } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
      if (upsertError) throw upsertError;

      alert('SEO settings saved.');
    } catch (err: any) {
      setError(err.message || 'Failed to save SEO settings.');
      alert(`SEO save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-400 font-bold animate-pulse font-serif italic">Loading SEO controls...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />
      <main className="flex-1 p-6 lg:p-10 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">SEO Optimization</h1>
          <p className="text-gray-600 text-sm italic">Configure global metadata for search and social previews.</p>
        </header>

        {error && <p className="mb-6 text-sm text-red-600 font-bold">{error}</p>}

        <form onSubmit={handleSave} className="bg-white p-8 rounded shadow-sm border border-gray-200 space-y-6">
          <div>
            <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Meta Title</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-4 rounded text-base"
              value={formData.seo_meta_title}
              onChange={(e) => setFormData({ ...formData, seo_meta_title: e.target.value })}
              placeholder="Site title for search engines"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Meta Description</label>
            <textarea
              className="w-full border border-gray-300 p-4 rounded text-sm"
              rows={4}
              maxLength={160}
              value={formData.seo_meta_description}
              onChange={(e) => setFormData({ ...formData, seo_meta_description: e.target.value })}
              placeholder="Short summary shown in search engine results"
            />
            <p className="text-[10px] text-gray-400 mt-1">Recommended length: up to 160 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Meta Keywords</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-4 rounded text-sm"
              value={formData.seo_meta_keywords}
              onChange={(e) => setFormData({ ...formData, seo_meta_keywords: e.target.value })}
              placeholder="news, media, analysis"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">OpenGraph Image URL</label>
            <input
              type="url"
              className="w-full border border-gray-300 p-4 rounded text-sm font-mono"
              value={formData.seo_og_image}
              onChange={(e) => setFormData({ ...formData, seo_og_image: e.target.value })}
              placeholder="https://example.com/og-image.jpg"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-500 mb-2 tracking-widest">Canonical URL</label>
            <input
              type="url"
              className="w-full border border-gray-300 p-4 rounded text-sm font-mono"
              value={formData.seo_canonical_url}
              onChange={(e) => setFormData({ ...formData, seo_canonical_url: e.target.value })}
              placeholder="https://yourdomain.com"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              disabled={saving}
              className="bg-[#0073aa] text-white px-10 py-4 rounded-sm font-black uppercase text-[11px] tracking-[0.2em] hover:bg-[#005177] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save SEO'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SeoView;
