
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

interface BrandingSettings {
  site_name: string;
  site_tagline: string;
  site_logo_url: string;
  site_favicon_url: string;
  login_logo_url: string;
  login_background_url: string;
  login_background_color: string;
  header_custom_html: string;
  header_scripts: string;
  footer_scripts: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string;
  show_site_name: boolean;
  show_tagline: boolean;
  logo_width: number;
  logo_height: number;
  login_logo_width: number;
  login_logo_height: number;
}

const DEFAULT_BRANDING: BrandingSettings = {
  site_name: 'DeltaPress',
  site_tagline: 'AI-Powered Newsroom Platform',
  site_logo_url: '',
  site_favicon_url: '',
  login_logo_url: '',
  login_background_url: '',
  login_background_color: '#1a365d',
  header_custom_html: '',
  header_scripts: '',
  footer_scripts: '',
  primary_color: '#1a365d',
  secondary_color: '#00bcd4',
  accent_color: '#3b82f6',
  custom_css: '',
  show_site_name: true,
  show_tagline: true,
  logo_width: 200,
  logo_height: 60,
  login_logo_width: 200,
  login_logo_height: 80
};

const BrandingView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'branding' | 'logos' | 'headers' | 'colors' | 'css'>('branding');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchBrandingSettings();
  }, []);

  const fetchBrandingSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/branding');
      const data = await response.json();
      if (data.success && data.branding) {
        setSettings({ ...DEFAULT_BRANDING, ...data.branding });
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<BrandingSettings>) => {
    setSaving(true);
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    try {
      const response = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (type: string, file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }
    
    setSaving(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        const response = await fetch('/api/branding/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data: dataUrl, filename: file.name })
        });
        
        const data = await response.json();
        if (data.success) {
          setSettings(prev => ({ ...prev, [`${type}_url`]: data.url }));
        } else {
          throw new Error(data.error || 'Upload failed');
        }
        setSaving(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert("Error: " + error.message);
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all branding settings to defaults?')) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/branding/reset', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSettings(data.branding);
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Site Branding', icon: '🏠' },
    { id: 'logos', label: 'Logos & Images', icon: '🖼️' },
    { id: 'headers', label: 'Custom Headers', icon: '📝' },
    { id: 'colors', label: 'Colors', icon: '🎨' },
    { id: 'css', label: 'Custom CSS', icon: '💻' }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f1f1f1]">
        <AdminSidebar onLogout={() => navigate('/login')} />
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Branding Settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10 max-w-6xl">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 font-serif leading-none mb-2 uppercase tracking-tighter">Branding & Customization</h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Configure your site's visual identity</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-lg ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Site Branding Tab */}
        {activeTab === 'branding' && (
          <section className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200 space-y-8">
            <div>
              <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Site Identity</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Basic site information and display options</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Site Name</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 p-4 rounded-lg font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={settings.site_name}
                  onChange={(e) => handleSave({ site_name: e.target.value })}
                  placeholder="Your Site Name"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Site Tagline</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 p-4 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={settings.site_tagline}
                  onChange={(e) => handleSave({ site_tagline: e.target.value })}
                  placeholder="Your site's tagline"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-700 block">Show Site Name</label>
                  <span className="text-[9px] text-gray-400">Display site name in header</span>
                </div>
                <button
                  onClick={() => handleSave({ show_site_name: !settings.show_site_name })}
                  className={`w-14 h-8 rounded-full transition-all ${settings.show_site_name ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all ${settings.show_site_name ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-700 block">Show Tagline</label>
                  <span className="text-[9px] text-gray-400">Display tagline below site name</span>
                </div>
                <button
                  onClick={() => handleSave({ show_tagline: !settings.show_tagline })}
                  className={`w-14 h-8 rounded-full transition-all ${settings.show_tagline ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all ${settings.show_tagline ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Logos & Images Tab */}
        {activeTab === 'logos' && (
          <section className="space-y-8">
            {/* Site Logo */}
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Site Logo</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Upload your main website logo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                    {settings.site_logo_url ? (
                      <div className="relative">
                        <img 
                          src={settings.site_logo_url} 
                          alt="Site Logo" 
                          className="max-h-24 mx-auto mb-4 object-contain"
                          style={{ maxWidth: settings.logo_width, maxHeight: settings.logo_height }}
                        />
                        <button
                          onClick={() => handleSave({ site_logo_url: '' })}
                          className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline"
                        >
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center text-3xl">🖼️</div>
                        <p className="text-gray-500 text-sm mb-4">No logo uploaded</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('site_logo', e.target.files?.[0]!)}
                      className="hidden"
                      id="site-logo-upload"
                    />
                    <label
                      htmlFor="site-logo-upload"
                      className="inline-block px-6 py-3 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      Upload Logo
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Width (px)</label>
                      <input
                        type="number"
                        className="w-full border-2 border-gray-200 p-2 rounded text-sm"
                        value={settings.logo_width}
                        onChange={(e) => handleSave({ logo_width: parseInt(e.target.value) || 200 })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest block mb-1">Height (px)</label>
                      <input
                        type="number"
                        className="w-full border-2 border-gray-200 p-2 rounded text-sm"
                        value={settings.logo_height}
                        onChange={(e) => handleSave({ logo_height: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Or enter logo URL</label>
                  <input
                    type="url"
                    className="w-full border-2 border-gray-200 p-4 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.site_logo_url}
                    onChange={(e) => handleSave({ site_logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-[10px] font-black uppercase text-blue-700 tracking-widest mb-2">Recommended</h4>
                    <ul className="text-[11px] text-blue-600 space-y-1">
                      <li>• PNG or SVG format</li>
                      <li>• Max 2MB file size</li>
                      <li>• Transparent background</li>
                      <li>• Height: 40-80px</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Page Logo */}
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Login Page Logo</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Customize the login page branding</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                    {settings.login_logo_url ? (
                      <div className="relative">
                        <img 
                          src={settings.login_logo_url} 
                          alt="Login Logo" 
                          className="max-h-20 mx-auto mb-4 object-contain"
                        />
                        <button
                          onClick={() => handleSave({ login_logo_url: '' })}
                          className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline"
                        >
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center text-3xl">🔐</div>
                        <p className="text-gray-500 text-sm mb-4">Using site logo</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('login_logo', e.target.files?.[0]!)}
                      className="hidden"
                      id="login-logo-upload"
                    />
                    <label
                      htmlFor="login-logo-upload"
                      className="inline-block px-6 py-3 bg-gray-800 text-white text-[11px] font-black uppercase tracking-widest rounded-lg cursor-pointer hover:bg-black transition-colors"
                    >
                      Upload Login Logo
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Login Background Color</label>
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="color"
                      className="w-12 h-12 rounded cursor-pointer border-none"
                      value={settings.login_background_color}
                      onChange={(e) => handleSave({ login_background_color: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 border-2 border-gray-200 p-3 rounded-lg font-mono text-sm"
                      value={settings.login_background_color}
                      onChange={(e) => handleSave({ login_background_color: e.target.value })}
                    />
                  </div>

                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Background Image URL</label>
                  <input
                    type="url"
                    className="w-full border-2 border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={settings.login_background_url}
                    onChange={(e) => handleSave({ login_background_url: e.target.value })}
                    placeholder="https://example.com/background.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Favicon */}
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Favicon</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Browser tab icon (32x32 or 16x16 pixels)</p>
              </div>

              <div className="flex items-center gap-8">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                  {settings.site_favicon_url ? (
                    <img src={settings.site_favicon_url} alt="Favicon" className="w-8 h-8 mx-auto" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded mx-auto"></div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload('favicon', e.target.files?.[0]!)}
                    className="hidden"
                    id="favicon-upload"
                  />
                  <label
                    htmlFor="favicon-upload"
                    className="inline-block px-6 py-3 bg-gray-800 text-white text-[11px] font-black uppercase tracking-widest rounded-lg cursor-pointer hover:bg-black transition-colors"
                  >
                    Upload Favicon
                  </label>
                  <p className="text-gray-400 text-[10px] mt-2">Recommended: ICO, PNG, or SVG format</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Custom Headers Tab */}
        {activeTab === 'headers' && (
          <section className="space-y-8">
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Custom Header HTML</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Add custom HTML to the site header</p>
              </div>

              <textarea
                className="w-full h-40 border-2 border-gray-200 p-4 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={settings.header_custom_html}
                onChange={(e) => handleSave({ header_custom_html: e.target.value })}
                placeholder={'<!-- Custom header content -->\n<div class="custom-banner">...</div>'}
              />

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-[11px] text-yellow-700">
                  <strong>⚠️ Note:</strong> Custom HTML will be inserted at the top of the page body. Use with caution.
                </p>
              </div>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Header Scripts</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">JavaScript to run in the &lt;head&gt; section</p>
              </div>

              <textarea
                className="w-full h-40 border-2 border-gray-200 p-4 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-900 text-green-400"
                value={settings.header_scripts}
                onChange={(e) => handleSave({ header_scripts: e.target.value })}
                placeholder={'// Analytics, tracking codes, etc.\n<script>\n  console.log("Header script loaded");\n</script>'}
              />

              <p className="text-gray-400 text-[10px] mt-2">Useful for: Google Analytics, Facebook Pixel, custom tracking codes</p>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Footer Scripts</h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">JavaScript to run before &lt;/body&gt;</p>
              </div>

              <textarea
                className="w-full h-40 border-2 border-gray-200 p-4 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-900 text-green-400"
                value={settings.footer_scripts}
                onChange={(e) => handleSave({ footer_scripts: e.target.value })}
                placeholder={'// Footer scripts\n<script>\n  // Your code here\n</script>'}
              />
            </div>
          </section>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <section className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
            <div className="mb-8">
              <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Color Scheme</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Define your brand colors</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-gray-200 rounded-xl">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-3">Primary Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    className="w-16 h-16 rounded-lg cursor-pointer border-none shadow-inner"
                    value={settings.primary_color}
                    onChange={(e) => handleSave({ primary_color: e.target.value })}
                  />
                  <div>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 p-2 rounded font-mono text-sm"
                      value={settings.primary_color}
                      onChange={(e) => handleSave({ primary_color: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1">Main brand color</p>
                  </div>
                </div>
                <div 
                  className="mt-4 h-8 rounded-lg"
                  style={{ backgroundColor: settings.primary_color }}
                ></div>
              </div>

              <div className="p-6 border border-gray-200 rounded-xl">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-3">Secondary Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    className="w-16 h-16 rounded-lg cursor-pointer border-none shadow-inner"
                    value={settings.secondary_color}
                    onChange={(e) => handleSave({ secondary_color: e.target.value })}
                  />
                  <div>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 p-2 rounded font-mono text-sm"
                      value={settings.secondary_color}
                      onChange={(e) => handleSave({ secondary_color: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1">Accent/highlights</p>
                  </div>
                </div>
                <div 
                  className="mt-4 h-8 rounded-lg"
                  style={{ backgroundColor: settings.secondary_color }}
                ></div>
              </div>

              <div className="p-6 border border-gray-200 rounded-xl">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-3">Accent Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    className="w-16 h-16 rounded-lg cursor-pointer border-none shadow-inner"
                    value={settings.accent_color}
                    onChange={(e) => handleSave({ accent_color: e.target.value })}
                  />
                  <div>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 p-2 rounded font-mono text-sm"
                      value={settings.accent_color}
                      onChange={(e) => handleSave({ accent_color: e.target.value })}
                    />
                    <p className="text-[9px] text-gray-400 mt-1">Links/buttons</p>
                  </div>
                </div>
                <div 
                  className="mt-4 h-8 rounded-lg"
                  style={{ backgroundColor: settings.accent_color }}
                ></div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h4 className="text-[11px] font-black uppercase text-gray-600 tracking-widest mb-4">Color Preview</h4>
              <div className="flex gap-4">
                <button 
                  className="px-6 py-3 rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  Primary Button
                </button>
                <button 
                  className="px-6 py-3 rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: settings.secondary_color }}
                >
                  Secondary Button
                </button>
                <button 
                  className="px-6 py-3 rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: settings.accent_color }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Custom CSS Tab */}
        {activeTab === 'css' && (
          <section className="bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-black font-serif uppercase tracking-tighter mb-2">Custom CSS</h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Add custom styles to override defaults</p>
            </div>

            <textarea
              className="w-full h-80 border-2 border-gray-200 p-4 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-900 text-green-400"
              value={settings.custom_css}
              onChange={(e) => handleSave({ custom_css: e.target.value })}
              placeholder={`/* Custom CSS */
:root {
  --custom-primary: #1a365d;
}

.header {
  /* Your custom styles */
}

.login-page {
  /* Login page customization */
}`}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-[10px] font-black uppercase text-blue-700 tracking-widest mb-2">Common Selectors</h4>
                <ul className="text-[11px] text-blue-600 space-y-1 font-mono">
                  <li>• .header - Site header</li>
                  <li>• .login-page - Login screen</li>
                  <li>• .admin-sidebar - Admin panel</li>
                  <li>• .post-card - Blog cards</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest mb-2">CSS Variables</h4>
                <ul className="text-[11px] text-gray-600 space-y-1 font-mono">
                  <li>• --primary-color</li>
                  <li>• --secondary-color</li>
                  <li>• --accent-color</li>
                  <li>• --site-bg-color</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Action Bar */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={handleReset}
            className="px-6 py-3 border-2 border-red-200 text-red-600 text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-red-50 transition-colors"
          >
            Reset to Defaults
          </button>

          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-8 py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
          >
            {previewMode ? 'Close Preview' : 'Preview Changes'}
          </button>
        </div>

        {/* Saving Indicator */}
        {saving && (
          <div className="fixed bottom-12 right-12 bg-black text-white px-10 py-5 rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl animate-bounce z-50">
            Saving Changes...
          </div>
        )}

        {/* Preview Modal */}
        {previewMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-black text-xl">Preview</h3>
                <button onClick={() => setPreviewMode(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-8">
                <div className="text-center p-8 border-b">
                  {settings.site_logo_url ? (
                    <img src={settings.site_logo_url} alt="Logo" className="max-h-20 mx-auto" />
                  ) : (
                    <h1 className="text-4xl font-black" style={{ color: settings.primary_color }}>{settings.site_name}</h1>
                  )}
                  {settings.show_tagline && (
                    <p className="text-gray-500 text-sm mt-2">{settings.site_tagline}</p>
                  )}
                </div>
                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm">Preview of header branding</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BrandingView;
