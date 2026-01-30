
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { generateBlogPostDraft } from '../../services/gemini';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';

const PostEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'post' | 'page'>('post');
  const [status, setStatus] = useState<'publish' | 'draft'>('publish');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catStatus, setCatStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [catErrorMsg, setCatErrorMsg] = useState('');
  
  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState<{ type: 'audio' | 'video', url: string } | null>(null);
  const [aiTopic, setAiTopic] = useState('');

  const fetchCategories = async () => {
    setCatStatus('loading');
    setCatErrorMsg('');
    try {
      const { data: cats, error } = await supabase.from('categories').select('id, name').order('name');
      
      if (error) {
        setCatStatus('error');
        setCatErrorMsg(`Permission Error: ${error.code}`);
      } else {
        setCategories(cats || []);
        if (cats && cats.length === 0) {
           setCatStatus('error');
           setCatErrorMsg("Connected but returned 0 rows (Check RLS)");
        } else {
           setCatStatus('ok');
        }
      }
    } catch (err: any) {
      setCatStatus('error');
      setCatErrorMsg(err.message || "Unknown Network Error");
    }
  };

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const allowedRoles = ['admin', 'editor'];
      if (!profile || !allowedRoles.includes(profile.role)) {
        // Restricted Access: Reviewers and Users cannot edit.
        navigate('/admin');
        return;
      }

      await fetchCategories();

      if (id) {
        const { data: post, error } = await supabase.from('posts').select('*').eq('id', id).single();
        if (post) {
          setTitle(post.title || '');
          setContent(post.content || '');
          setContentType(post.type || 'post');
          setStatus(post.status || 'publish');
          setFeaturedImage(post.featured_image || '');
          setCategoryId(post.category_id || '');
        }
      }
      setLoading(false);
    };
    checkRoleAndFetch();
  }, [id, navigate]);

  const insertFormatting = (before: string, after: string = '') => {
    const el = textareaRef.current;
    if (!el) {
      setContent(prev => prev + before + after);
      return;
    };
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;
    setContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      el.focus();
      const cursorPos = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursorPos, cursorPos);
    }, 10);
  };

  const handleInsertMedia = () => {
    if (!showMediaModal || !showMediaModal.url) { setShowMediaModal(null); return; }
    let { type, url } = showMediaModal;

    // Dropbox Link Fix: Convert preview link to direct stream link
    if (url.includes('dropbox.com')) {
      url = url.replace(/dl=0$/, 'raw=1').replace(/dl=1$/, 'raw=1');
      if (!url.includes('raw=1')) {
        url = url + (url.includes('?') ? '&raw=1' : '?raw=1');
      }
    }

    if (type === 'audio') {
      // Check for common embed platforms vs direct files
      if (!url.includes('raw=1') && !url.match(/\.(mp3|wav|ogg|m4a|m4b)/i) && (url.includes('soundcloud.com') || url.includes('spotify.com') || url.includes('notebooklm.google.com'))) {
        insertFormatting(`<iframe src="${url}" width="100%" height="166" scrolling="no" frameborder="no"></iframe>\n\n`);
      } else {
        insertFormatting(`<audio controls preload="metadata">\n  <source src="${url}" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>\n\n`);
      }
    } else {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else videoId = url.split('/').pop() || '';
        insertFormatting(`<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>\n\n`);
      } else {
        insertFormatting(`<video controls preload="metadata">\n  <source src="${url}" type="video/mp4">\n  Your browser does not support the video tag.\n</video>\n\n`);
      }
    }
    setShowMediaModal(null);
  };

  const handleSave = async () => {
    if (!title || !content) { alert("Title and content are required."); return; }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      const timestamp = Date.now().toString().slice(-6);
      const baseSlug = title.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
      const slug = id ? baseSlug : `${baseSlug}-${timestamp}`;

      const postData: any = {
        title: title.trim(),
        content,
        slug,
        status,
        author_id: session.user.id,
        type: contentType,
        featured_image: featuredImage.trim() || null,
        category_id: categoryId || null
      };

      let res;
      if (id) {
        res = await supabase.from('posts').update(postData).eq('id', id);
      } else {
        res = await supabase.from('posts').insert([postData]);
      }

      if (res.error) throw res.error;
      navigate(contentType === 'page' ? '/admin/pages' : '/admin/posts');
    } catch (err: any) {
      alert(`Save Error: ${err.message}\n\nHint: Check Diagnostics to repair Database Policies.`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#f1f1f1] italic font-serif text-gray-400">Syncing Editor Environment...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 font-serif">{id ? 'Edit' : 'Create'} {contentType}</h1>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${catStatus === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {catStatus === 'ok' ? 'Connected' : 'DB Sync Blocked'}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAiModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-xs font-black uppercase hover:bg-purple-700 shadow-sm transition-all active:scale-95">✨ AI Draft</button>
              <button 
                type="button" onClick={handleSave} disabled={isSaving} 
                className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase hover:bg-[#005a87] disabled:opacity-50 shadow-sm transition-all active:scale-95"
              >
                {isSaving ? 'Saving...' : 'Publish Content'}
              </button>
            </div>
          </header>

          {/* DOCUMENT SETTINGS PANEL */}
          <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">⚙️ Editor Config</h3>
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={fetchCategories} className="text-[10px] font-bold text-blue-400 hover:text-blue-600 uppercase tracking-tighter transition-colors">Emergency Re-Sync 🔄</button>
                    <Link to="/admin/diagnostics" className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-tighter bg-red-50 px-2 py-1 rounded">
                        Repair Database Errors 🩺
                    </Link>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter">Category Selection</label>
                <select 
                  className={`w-full bg-white border p-3 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold transition-all ${catStatus === 'error' ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                  value={categoryId} 
                  onChange={e => setCategoryId(e.target.value)}
                >
                  <option value="">— Uncategorized —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  {catStatus === 'error' && <option disabled>⚠️ Database Permission Error</option>}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter">Visibility Status</label>
                <select 
                  className="w-full bg-white border border-gray-200 p-3 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                >
                  <option value="publish">Published (Public)</option>
                  <option value="draft">Draft (Private)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter">Entry Type</label>
                <select 
                  className="w-full bg-white border border-gray-200 p-3 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={contentType} 
                  onChange={e => setContentType(e.target.value as any)}
                >
                  <option value="post">Blog Post</option>
                  <option value="page">Static Page</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-tighter">Featured URL</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-gray-200 p-3 rounded text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
                  value={featuredImage} 
                  onChange={e => setFeaturedImage(e.target.value)} 
                  placeholder="https://images.unsplash..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 p-3 flex flex-wrap items-center gap-1 sticky top-0 z-10">
              <button type="button" onClick={() => insertFormatting('<b>', '</b>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded font-bold transition-colors">B</button>
              <button type="button" onClick={() => insertFormatting('<i>', '</i>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded italic font-serif transition-colors">I</button>
              <button type="button" onClick={() => insertFormatting('<blockquote>\n', '\n</blockquote>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded text-xs transition-colors">" "</button>
              <div className="h-6 w-px bg-gray-300 mx-2" />
              <button type="button" onClick={() => setShowMediaModal({ type: 'audio', url: '' })} className="px-4 h-9 flex items-center justify-center hover:bg-blue-600 hover:text-white rounded text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 transition-all">🎵 Audio File</button>
              <button type="button" onClick={() => setShowMediaModal({ type: 'video', url: '' })} className="px-4 h-9 flex items-center justify-center hover:bg-red-600 hover:text-white rounded text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-100 transition-all">🎬 Video File</button>
            </div>

            {/* HIGH CONTRAST EDITOR AREA */}
            <div className="p-10 bg-white min-h-[800px]">
              <input 
                type="text" placeholder="Enter title here" 
                className="w-full text-4xl font-black border-none focus:ring-0 mb-8 font-serif text-[#111] bg-white placeholder-gray-200"
                value={title} onChange={(e) => setTitle(e.target.value)}
              />
              <textarea 
                ref={textareaRef}
                className="w-full h-[700px] text-xl focus:outline-none resize-none leading-relaxed text-[#111] bg-white font-serif border-none focus:ring-0 placeholder-gray-200"
                placeholder="Write your next masterpiece..."
                value={content} onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-xl max-w-lg w-full shadow-2xl border-t-8 border-gray-900">
            <div className="mb-6">
                <h2 className="text-3xl font-bold font-serif text-gray-900">{showMediaModal.type === 'audio' ? '🎵 Audio Block' : '🎬 Video Block'}</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Direct URL (Dropbox, YouTube, etc.)</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Source URL</label>
                    <input 
                    type="url" className="w-full border-2 border-gray-100 p-4 rounded-lg outline-none focus:border-blue-500 text-gray-900 bg-gray-50 font-mono text-sm" 
                    placeholder={showMediaModal.type === 'audio' ? 'https://example.com/audio.mp3' : 'https://example.com/video.mp4'} 
                    value={showMediaModal.url}
                    onChange={(e) => setShowMediaModal({ ...showMediaModal, url: e.target.value })} 
                    autoFocus
                    />
                </div>
                
                {showMediaModal.url.includes('dropbox.com') && (
                  <div className="p-3 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-100">
                    ✨ Dropbox link detected! Converting for direct streaming.
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button type="button" onClick={() => setShowMediaModal(null)} className="text-gray-400 font-bold px-4 uppercase text-[10px] tracking-widest">Cancel</button>
                    <button type="button" onClick={handleInsertMedia} className="bg-gray-900 text-white px-10 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black shadow-xl active:scale-95 transition-all">Insert into post</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 font-serif text-gray-900">🤖 AI Ghostwriter</h2>
            <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest font-black">Synthesizing Creative Drafts</p>
            <input 
              type="text" className="w-full border-2 border-gray-100 p-4 rounded-lg mb-6 outline-none focus:border-purple-500 text-gray-900 bg-white" 
              placeholder="What topic should I write about?" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} disabled={isGenerating}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAiModal(false)} className="text-gray-400 font-bold px-4 uppercase text-[10px] tracking-widest">Cancel</button>
              <button 
                type="button" disabled={isGenerating || !aiTopic}
                onClick={async () => {
                  setIsGenerating(true);
                  const res = await generateBlogPostDraft(aiTopic);
                  if (res) setContent(res);
                  setIsGenerating(false);
                  setShowAiModal(false);
                }}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 disabled:opacity-50 shadow-lg"
              >
                {isGenerating ? 'Synthesizing...' : 'Generate Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEditor;
