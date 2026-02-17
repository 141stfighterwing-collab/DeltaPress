
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { generateBlogPostDraft } from '../../services/gemini';
import { supabase } from '../../services/supabase';
import { sanitizeHtml, cleanSlug, LIMITS } from '../../services/security';
import AdminSidebar from '../../components/AdminSidebar';

const PostEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'post' | 'page'>('post');
  const [status, setStatus] = useState<'publish' | 'draft'>('publish');
  const [featuredImage, setFeaturedImage] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  
  const [parentId, setParentId] = useState<string | null>(null);
  const [menuOrder, setMenuOrder] = useState(0);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catStatus, setCatStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [catErrorMsg, setCatErrorMsg] = useState('');
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState<{ type: 'audio' | 'video', url: string } | null>(null);
  const [aiTopic, setAiTopic] = useState('');

  const fetchData = async () => {
    setCatStatus('loading');
    try {
      const { data: cats } = await supabase.from('categories').select('id, name').order('name');
      setCategories(cats || []);
      
      let query = supabase.from('posts').select('id, title').eq('type', 'page');
      if (id) query = query.neq('id', id);
      const { data: pgs } = await query;
      setAvailablePages(pgs || []);
      
      setCatStatus('ok');
    } catch (err: any) {
      setCatStatus('error');
      setCatErrorMsg(err.message);
    }
  };

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const allowedRoles = ['admin', 'editor'];
      if (!profile || !allowedRoles.includes(profile.role)) {
        navigate('/admin');
        return;
      }

      await fetchData();

      const params = new URLSearchParams(location.search);
      if (params.get('type') === 'page') {
        setContentType('page');
      }

      if (id) {
        const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
        if (post) {
          setTitle(post.title || '');
          setContent(post.content || '');
          setContentType(post.type || 'post');
          setStatus(post.status || 'publish');
          setFeaturedImage(post.featured_image || '');
          setCategoryId(post.category_id || '');
          setParentId(post.parent_id);
          setMenuOrder(post.menu_order || 0);
        }
      }
      setLoading(false);
    };
    checkRoleAndFetch();
  }, [id, navigate, location.search]);

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

    if (url.includes('dropbox.com')) {
      url = url.replace(/dl=0$/, 'raw=1').replace(/dl=1$/, 'raw=1');
      if (!url.includes('raw=1')) {
        url = url + (url.includes('?') ? '&raw=1' : '?raw=1');
      }
    }

    if (type === 'audio') {
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

  const cleanDocumentWrappers = (html: string) => {
    let clean = html.replace(/<!DOCTYPE html>/gi, '');
    clean = clean.replace(/<html[^>]*>/gi, '');
    clean = clean.replace(/<\/html>/gi, '');
    clean = clean.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    clean = clean.replace(/<body[^>]*>/gi, '');
    clean = clean.replace(/<\/body>/gi, '');
    return clean.trim();
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { 
      alert("Title and content are required."); 
      return; 
    }

    if (title.length > LIMITS.POST_TITLE) {
      alert(`Title exceeds limit of ${LIMITS.POST_TITLE} characters.`);
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session. Please log in again.");

      const fragmentOnly = cleanDocumentWrappers(content);
      const safeContent = sanitizeHtml(fragmentOnly);
      
      const timestamp = Date.now().toString().slice(-6);
      const baseSlug = cleanSlug(title);
      const slug = id ? baseSlug : `${baseSlug}-${timestamp}`;

      const postData: any = {
        title: title.trim(),
        content: safeContent,
        slug,
        status,
        author_id: session.user.id,
        type: contentType,
        featured_image: featuredImage.trim() || null,
        category_id: categoryId && categoryId !== "" ? categoryId : null,
        parent_id: contentType === 'page' && parentId && parentId !== "" ? parentId : null,
        menu_order: contentType === 'page' ? menuOrder : 0
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
      alert(`Publish Failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#f1f1f1] italic font-serif text-gray-400">Syncing Editor...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 font-serif">{id ? 'Edit' : 'Create'} {contentType}</h1>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${catStatus === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {catStatus === 'ok' ? 'Online' : 'Parity Error'}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAiModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-xs font-black uppercase hover:bg-purple-700 shadow-sm transition-all">✨ AI Draft</button>
              <button 
                type="button" onClick={handleSave} disabled={isSaving} 
                className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase hover:bg-[#005a87] disabled:opacity-50 shadow-sm transition-all"
              >
                {isSaving ? 'Saving...' : 'Publish'}
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white shadow-sm border border-gray-200 rounded-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 p-3 flex flex-wrap items-center gap-1 sticky top-0 z-10">
                  <button type="button" onClick={() => insertFormatting('<b>', '</b>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded font-bold">B</button>
                  <button type="button" onClick={() => insertFormatting('<i>', '</i>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded italic font-serif">I</button>
                  <button type="button" onClick={() => insertFormatting('<blockquote>\n', '\n</blockquote>')} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 rounded text-xs">" "</button>
                  <div className="h-6 w-px bg-gray-300 mx-2" />
                  <button type="button" onClick={() => setShowMediaModal({ type: 'audio', url: '' })} className="px-4 h-9 flex items-center justify-center hover:bg-blue-600 hover:text-white rounded text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 transition-all">🎵 Audio</button>
                  <button type="button" onClick={() => setShowMediaModal({ type: 'video', url: '' })} className="px-4 h-9 flex items-center justify-center hover:bg-red-600 hover:text-white rounded text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-100 transition-all">🎬 Video</button>
                </div>

                <div className="p-10 bg-white min-h-[800px]">
                  <input 
                    type="text" placeholder="Enter title here" 
                    className="w-full text-4xl font-black border-none focus:ring-0 mb-8 font-serif text-[#111] bg-white"
                    value={title} onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea 
                    ref={textareaRef}
                    className="w-full h-[700px] text-xl focus:outline-none resize-none leading-relaxed text-[#111] bg-white font-serif border-none focus:ring-0"
                    placeholder="Write your next masterpiece..."
                    value={content} onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {contentType === 'page' && (
                <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 border-b pb-2">Page Attributes</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Parent Page</label>
                      <select 
                        className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 outline-none focus:border-blue-500 font-bold"
                        value={parentId || ''}
                        onChange={e => setParentId(e.target.value || null)}
                      >
                        <option value="">(no parent)</option>
                        {availablePages.map(pg => (
                          <option key={pg.id} value={pg.id}>{pg.title}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-gray-400 italic">Pages with parents appear in dropdown menus.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Menu Order</label>
                      <input 
                        type="number" 
                        className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 outline-none focus:border-blue-500 font-bold"
                        value={menuOrder}
                        onChange={e => setMenuOrder(parseInt(e.target.value) || 0)}
                      />
                      <p className="text-[9px] text-gray-400 italic">Determines the horizontal/vertical sequence (Lower first).</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 border-b pb-2">Publish Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500">Status</label>
                    <select 
                      className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 outline-none focus:border-blue-500 font-bold"
                      value={status} 
                      onChange={e => setStatus(e.target.value as any)}
                    >
                      <option value="publish">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500">Featured Image URL</label>
                    <input 
                      type="text" 
                      className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 outline-none focus:border-blue-500"
                      value={featuredImage} 
                      onChange={e => setFeaturedImage(e.target.value)} 
                      placeholder="https://..."
                    />
                  </div>
                  
                  {contentType === 'post' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-gray-500">Category</label>
                      <select 
                        className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 outline-none focus:border-blue-500 font-bold"
                        value={categoryId} 
                        onChange={e => setCategoryId(e.target.value)}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-xl max-w-lg w-full shadow-2xl border-t-8 border-gray-900">
            <div className="mb-6">
                <h2 className="text-3xl font-bold font-serif text-gray-900">{showMediaModal.type === 'audio' ? '🎵 Audio Block' : '🎬 Video Block'}</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Source URL</p>
            </div>
            <div className="space-y-6">
                <input 
                  type="url" className="w-full border-2 border-gray-100 p-4 rounded-lg outline-none focus:border-blue-500 text-gray-900 bg-gray-50 font-mono text-sm" 
                  placeholder="https://..." value={showMediaModal.url}
                  onChange={(e) => setShowMediaModal({ ...showMediaModal, url: e.target.value })} 
                />
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button type="button" onClick={() => setShowMediaModal(null)} className="text-gray-400 font-bold px-4 uppercase text-[10px] tracking-widest">Cancel</button>
                    <button type="button" onClick={handleInsertMedia} className="bg-gray-900 text-white px-10 py-3 rounded-lg font-black uppercase text-[10px] shadow-xl">Insert</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 font-serif text-gray-900">🤖 AI Ghostwriter</h2>
            <input 
              type="text" className="w-full border-2 border-gray-100 p-4 rounded-lg mb-6 outline-none focus:border-purple-500" 
              placeholder="Draft topic..." value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAiModal(false)} className="text-gray-400 font-bold px-4 uppercase text-[10px]">Cancel</button>
              <button 
                type="button" disabled={isGenerating || !aiTopic}
                onClick={async () => {
                  setIsGenerating(true);
                  const res = await generateBlogPostDraft(aiTopic + " (Note: Do NOT include <html> or <body> tags, just provide inner article HTML fragments)");
                  if (res) {
                      const cleaned = cleanDocumentWrappers(res);
                      setContent(cleaned);
                  }
                  setIsGenerating(false);
                  setShowAiModal(false);
                }}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-black uppercase text-[10px]"
              >
                {isGenerating ? 'Drafting...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEditor;
