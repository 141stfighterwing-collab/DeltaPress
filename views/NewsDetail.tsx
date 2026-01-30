
import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';

const NewsDetail: React.FC = () => {
  const { url } = useParams();
  const location = useLocation();
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const article = location.state?.article || {
    title: "News Story",
    description: "External content discussion thread...",
    source: "News"
  };

  const decodedUrl = url ? decodeURIComponent(url) : '';

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data: comms } = await supabase
        .from('news_comments')
        .select('*')
        .eq('article_url', decodedUrl)
        .order('created_at', { ascending: true });
      
      if (comms) setComments(comms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (decodedUrl) fetchComments();
  }, [decodedUrl]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName || !commentText || !commentEmail) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('news_comments').insert({
        article_url: decodedUrl,
        article_title: article.title,
        author_name: commentName,
        author_email: commentEmail,
        content: commentText
      });
      if (error) throw error;
      
      setCommentText('');
      fetchComments();
    } catch (err: any) {
      alert("Error posting comment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-10">
        <header className="mb-12 border-b border-gray-100 pb-10">
          <Link to="/news" className="text-[10px] font-black uppercase tracking-widest text-[#72aee6] hover:underline mb-6 inline-block">
            &larr; Back to Newsroom
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 font-serif mb-6 leading-tight">
            {article.title}
          </h1>
          <p className="text-lg text-gray-600 font-serif italic mb-8 border-l-4 border-gray-50 pl-6 leading-relaxed">
            {article.description}
          </p>
          <a href={decodedUrl} target="_blank" rel="noopener noreferrer" className="bg-[#1d2327] text-white px-8 py-3 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">
            Read Original Story &rarr;
          </a>
        </header>

        <section className="mt-16">
          <h3 className="text-2xl font-bold font-serif mb-10 text-gray-800">Leave a Reply</h3>
          
          <div className="space-y-8 mb-16">
            {loadingComments ? (
              <p className="text-gray-400 italic text-sm">Loading thoughts...</p>
            ) : comments.map((c, i) => (
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

          <form onSubmit={handleSubmitComment} className="bg-[#f9f9f9] p-8 border border-gray-100 rounded-sm">
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
              placeholder="Your Comment *" 
              required
              className="w-full border border-gray-300 p-4 text-sm h-40 focus:border-[#72aee6] outline-none transition-all mb-4 bg-white text-gray-900 font-serif"
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
      </div>
    </Layout>
  );
};

export default NewsDetail;
