
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { trackEvent } from '../services/analytics';
import { sanitizeHtml, stripAllHtml, isValidEmail, LIMITS, normalizeYouTubeEmbeds } from '../services/security';
import CategoryIcon from '../components/CategoryIcon';
import SEO from '../components/SEO';

const SinglePost: React.FC = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [authorInfo, setAuthorInfo] = useState<{ name: string, avatar?: string } | null>(null);
  const [categoryName, setCategoryName] = useState('General');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user);
        setCommentName(session.user.user_metadata?.display_name || '');
        setCommentEmail(session.user.email || '');
      }
    });
  }, []);

  const fetchPostAndMetadata = async () => {
    if (!slug) return;
    try {
      const { data: postData } = await supabase.from('posts').select('*').eq('slug', slug).single();
      if (postData) {
        setPost(postData);
        
        // Fetch Category
        if (postData.category_id) {
          const { data: cat } = await supabase.from('categories').select('name').eq('id', postData.category_id).maybeSingle();
          if (cat) setCategoryName(cat.name);
        }

        // Fetch Journalist Info
        if (postData.journalist_id) {
            const { data: bot } = await supabase.from('journalists').select('name, gender, avatar_url').eq('id', postData.journalist_id).maybeSingle();
            if (bot) {
                setAuthorInfo({
                    name: bot.name,
                    avatar: bot.avatar_url || (bot.gender === 'male' 
                    ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' 
                    : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop')
                });
            }
        }

        // Fetch Comments
        const { data: comms } = await supabase.from('comments').select('*').eq('post_id', postData.id).order('created_at', { ascending: true });
        if (comms) setComments(comms);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostAndMetadata();
  }, [slug]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentText || !commentEmail) return;
    if (!isValidEmail(commentEmail)) { alert("Please provide a valid email address."); return; }
    if (commentText.length > LIMITS.COMMENT_CONTENT) { alert(`Comment is too long.`); return; }

    setIsSubmitting(true);
    try {
      const safeAuthorName = stripAllHtml(commentName).substring(0, LIMITS.DISPLAY_NAME);
      const safeCommentContent = sanitizeHtml(commentText);

      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: currentUser?.id || null, 
        author_name: safeAuthorName,
        author_email: commentEmail,
        content: safeCommentContent
      });
      if (error) throw error;
      setCommentText('');
      fetchPostAndMetadata();
    } catch (err: any) {
      alert("Submission Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="py-20 text-center text-gray-400 font-serif italic">Loading entry...</div></Layout>;
  if (!post) return <Layout><div className="py-20 text-center font-serif italic text-gray-400">Not found.</div></Layout>;

  const plainExcerpt = post.excerpt ? stripAllHtml(post.excerpt) : stripAllHtml(post.content).substring(0, 160) + '...';

  return (
    <Layout>
      <SEO
        title={post.title}
        description={plainExcerpt}
        type="article"
        image={post.featured_image}
      />
      <article>
        <header className="mb-4">
          <h1 className="text-3xl lg:text-5xl font-black mb-2 text-gray-900 leading-tight font-serif">{post.title}</h1>
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <CategoryIcon category={categoryName} size={16} color="#9ca3af" className="opacity-80" />
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span>•</span>
            {authorInfo ? (
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                        <img 
                          src={authorInfo.avatar} 
                          alt={authorInfo.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100'; }}
                        />
                    </div>
                    <span className="text-[#1d2327] font-black">{authorInfo.name}</span>
                </div>
            ) : (
                <span className="text-[#72aee6] font-black">{categoryName}</span>
            )}
          </div>
        </header>

        {post.featured_image && (
          <div className="mb-6 rounded-sm overflow-hidden shadow-xl border border-gray-100 bg-gray-50">
            <img src={post.featured_image} className="w-full h-auto max-h-[500px] object-cover" alt={post.title} />
          </div>
        )}

        <div className="wp-entry-content font-serif" dangerouslySetInnerHTML={{ __html: normalizeYouTubeEmbeds(post.content) }} />

        <section className="mt-16 border-t border-gray-100 pt-10">
          <h3 className="text-2xl font-bold font-serif mb-6 text-gray-900">{comments.length} Thoughts on this post</h3>
          <div className="space-y-6 mb-12">
            {comments.map((c, i) => (
              <div key={i} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-400 shrink-0">
                  {c.author_name ? c.author_name[0].toUpperCase() : '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-tight text-gray-900">{c.author_name}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-700 font-serif leading-relaxed" dangerouslySetInnerHTML={{ __html: c.content }} />
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-bold font-serif mb-4 text-gray-800">Leave a Reply</h3>
          <form onSubmit={handlePostComment} className="bg-[#f9f9f9] p-6 border border-gray-100 rounded-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="Name *" required className="w-full border border-gray-300 p-3 text-sm focus:border-[#72aee6] outline-none bg-white text-gray-900" value={commentName} onChange={e => setCommentName(e.target.value)} />
              <input type="email" placeholder="Email *" required className="w-full border border-gray-300 p-3 text-sm focus:border-[#72aee6] outline-none bg-white text-gray-900" value={commentEmail} onChange={e => setCommentEmail(e.target.value)} />
            </div>
            <textarea placeholder="Comment *" required className="w-full border border-gray-300 p-4 mb-4 text-sm h-32 focus:border-[#72aee6] outline-none bg-white text-gray-900 font-serif" value={commentText} onChange={e => setCommentText(e.target.value)} />
            <button type="submit" disabled={isSubmitting} className="bg-[#1d2327] text-white px-8 py-3 font-black uppercase text-[10px] tracking-widest rounded-sm hover:bg-black disabled:opacity-50 transition-all active:scale-95 shadow-lg">
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </section>
      </article>
    </Layout>
  );
};

export default SinglePost;
