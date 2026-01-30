
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';

const SinglePost: React.FC = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('General');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPostAndComments = async () => {
    if (!slug) return;
    try {
      const { data: postData } = await supabase.from('posts').select('*').eq('slug', slug).single();
      if (postData) {
        setPost(postData);
        
        // Fetch Category Name
        if (postData.category_id) {
          const { data: cat } = await supabase.from('categories').select('name').eq('id', postData.category_id).maybeSingle();
          if (cat) setCategoryName(cat.name);
        }

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
    fetchPostAndComments();
  }, [slug]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentText || !commentEmail) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        author_name: commentName,
        author_email: commentEmail,
        content: commentText
      });
      if (error) throw error;
      setCommentText('');
      fetchPostAndComments();
    } catch (err: any) {
      alert("Comment Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="py-20 text-center text-gray-400 font-serif italic">Loading entry...</div></Layout>;
  if (!post) return <Layout><div className="py-20 text-center font-serif italic text-gray-400">Not found.</div></Layout>;

  return (
    <Layout>
      <article>
        <header className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-black mb-6 text-gray-900 leading-tight font-serif">
            {post.title}
          </h1>
          <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span className="text-[#72aee6] font-black">{categoryName}</span>
          </div>
        </header>

        {post.featured_image && <img src={post.featured_image} className="w-full mb-12 shadow-sm rounded-sm" />}

        <div className="wp-entry-content font-serif" dangerouslySetInnerHTML={{ __html: post.content }} />

        <section className="mt-24 border-t border-gray-100 pt-16">
          <h3 className="text-2xl font-bold font-serif mb-10 text-gray-900">{comments.length} Thoughts on this post</h3>
          
          <div className="space-y-8 mb-16">
            {comments.map((c, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center font-bold text-gray-400 shrink-0">
                  {c.author_name[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-tight text-gray-900">{c.author_name}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-700 font-serif bg-white p-4 border border-gray-100 shadow-sm rounded-sm">
                    {c.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-2xl font-bold font-serif mb-6 text-gray-800">Leave a Reply</h3>
          <form onSubmit={handlePostComment} className="bg-[#f9f9f9] p-8 border border-gray-100 rounded-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Name *" 
                required
                className="w-full border border-gray-300 p-3 text-sm focus:border-[#72aee6] outline-none transition-all bg-white text-gray-900"
                value={commentName}
                onChange={e => setCommentName(e.target.value)}
              />
              <input 
                type="email" 
                placeholder="Email *" 
                required
                className="w-full border border-gray-300 p-3 text-sm focus:border-[#72aee6] outline-none transition-all bg-white text-gray-900"
                value={commentEmail}
                onChange={e => setCommentEmail(e.target.value)}
              />
            </div>
            <textarea 
              placeholder="Comment *" 
              required
              className="w-full border border-gray-300 p-4 mb-4 text-sm h-40 focus:border-[#72aee6] outline-none transition-all bg-white text-gray-900 font-serif"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#1d2327] text-white px-8 py-3 font-black uppercase text-[10px] tracking-widest rounded-sm hover:bg-black transition-all shadow active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </section>
      </article>
    </Layout>
  );
};

export default SinglePost;
