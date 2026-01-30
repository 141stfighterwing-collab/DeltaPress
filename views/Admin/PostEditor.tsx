
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const [featuredImage, setFeaturedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [canPublish, setCanPublish] = useState(false);

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      
      const allowedRoles = ['admin', 'editor'];
      if (profile && allowedRoles.includes(profile.role)) {
        setCanPublish(true);
      } else {
        navigate('/admin');
        return;
      }

      if (id) {
        const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
        if (post) {
          setTitle(post.title);
          setContent(post.content);
          setContentType(post.type || 'post');
          setFeaturedImage(post.featured_image || '');
        }
      }
      setLoading(false);
    };
    checkRoleAndFetch();
  }, [id, navigate]);

  const insertFormatting = (before: string, after: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;
    setContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertAudio = () => {
    const url = prompt("Enter MP3 URL:", "https://example.com/audio.mp3");
    if (url) {
      insertFormatting(`<audio controls preload="none">\n  <source src="${url}" type="audio/mpeg">\n  Your browser does not support the audio element.\n</audio>\n\n`);
    }
  };

  const insertVideo = () => {
    const url = prompt("Enter Video URL (MP4, YouTube, or Vimeo):", "https://www.youtube.com/watch?v=...");
    if (url) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('v=')) {
          videoId = url.split('v=')[1].split('&')[0];
        } else {
          videoId = url.split('/').pop() || '';
        }
        insertFormatting(`<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>\n\n`);
      } else if (url.includes('vimeo.com')) {
        const videoId = url.split('/').pop();
        insertFormatting(`<iframe src="https://player.vimeo.com/video/${videoId}" allowfullscreen></iframe>\n\n`);
      } else {
        insertFormatting(`<video controls>\n  <source src="${url}" type="video/mp4">\n  Your browser does not support the video element.\n</video>\n\n`);
      }
    }
  };

  const handleSave = async () => {
    if (!title || !content) { alert("Title and content required."); return; }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const slug = title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
      const postData: any = {
        title, 
        content, 
        slug, 
        status: 'publish', 
        author_id: session.user.id, 
        type: contentType,
        featured_image: featuredImage
      };
      if (id) postData.id = id;
      
      const { error } = await supabase.from('posts').upsert(postData);
      if (error) throw error;
      navigate(contentType === 'page' ? '/admin/pages' : '/admin/posts');
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#f1f1f1] italic font-serif">Loading Editor...</div>;

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => supabase.auth.signOut().then(() => navigate('/login'))} />

      <main className="flex-1 p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{id ? 'Edit' : 'Create'} {contentType}</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAiModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-purple-700">✨ AI Write</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase tracking-widest hover:bg-[#005a87] disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : 'Publish'}
              </button>
            </div>
          </header>

          <div className="bg-white shadow-sm border border-gray-200 rounded-sm">
            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-100 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
              <button title="Bold" onClick={() => insertFormatting('<b>', '</b>')} className="p-2 hover:bg-gray-200 rounded font-bold">B</button>
              <button title="Italic" onClick={() => insertFormatting('<i>', '</i>')} className="p-2 hover:bg-gray-200 rounded italic font-serif">I</button>
              <button title="Blockquote" onClick={() => insertFormatting('<blockquote>\n', '\n</blockquote>')} className="p-2 hover:bg-gray-200 rounded text-xs font-bold">" "</button>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <button title="Paragraph" onClick={() => insertFormatting('<p>\n', '\n</p>')} className="p-2 hover:bg-gray-200 rounded text-xs font-bold">¶</button>
              <button title="Indent" onClick={() => insertFormatting('    ')} className="p-2 hover:bg-gray-200 rounded text-xs font-bold">→ Indent</button>
              <button title="Double Space" onClick={() => insertFormatting('\n\n')} className="p-2 hover:bg-gray-200 rounded text-xs font-bold">↵ Line</button>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <button title="Insert Audio" onClick={insertAudio} className="p-2 hover:bg-gray-200 rounded text-xs font-bold text-blue-600">🎵 Audio</button>
              <button title="Insert Video" onClick={insertVideo} className="p-2 hover:bg-gray-200 rounded text-xs font-bold text-red-600">🎬 Video</button>
            </div>

            <div className="p-10">
              <input 
                type="text" 
                placeholder="Enter title here" 
                className="w-full text-4xl font-black border-none focus:ring-0 mb-8 font-serif text-gray-900 placeholder-gray-200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea 
                ref={textareaRef}
                className="w-full h-[600px] text-lg focus:outline-none resize-none leading-relaxed text-gray-900 font-serif border-none focus:ring-0 placeholder-gray-300"
                placeholder="Once upon a time..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white p-6 border border-gray-200 rounded-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Post Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Featured Image URL</label>
                <input 
                  type="text" 
                  className="w-full border p-2 text-sm rounded bg-gray-50" 
                  value={featuredImage}
                  onChange={e => setFeaturedImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Content Type</label>
                <select 
                  className="w-full border p-2 text-sm rounded bg-gray-50"
                  value={contentType}
                  onChange={e => setContentType(e.target.value as any)}
                >
                  <option value="post">Blog Post</option>
                  <option value="page">Static Page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2">🤖 AI Ghostwriter</h2>
            <p className="text-gray-500 text-sm mb-6">What should we write about today?</p>
            <input 
              type="text" 
              className="w-full border p-4 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-purple-500" 
              placeholder="e.g. The history of the Gutenberg press..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              disabled={isGenerating}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAiModal(false)} className="text-gray-400 font-bold px-4">Cancel</button>
              <button 
                onClick={async () => {
                  setIsGenerating(true);
                  const res = await generateBlogPostDraft(aiTopic);
                  setContent(res || '');
                  setIsGenerating(false);
                  setShowAiModal(false);
                }}
                disabled={isGenerating}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {isGenerating ? 'Writing...' : 'Generate Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostEditor;