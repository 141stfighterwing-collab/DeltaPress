
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { supabase } from '../services/supabase';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [categoryName, setCategoryName] = useState('General');

  useEffect(() => {
    const fetchCategory = async () => {
      if (post.category_id) {
        const { data } = await supabase.from('categories').select('name').eq('id', post.category_id).maybeSingle();
        if (data) setCategoryName(data.name);
      }
    };
    fetchCategory();
  }, [post.category_id]);

  // Helper to get a preview without breaking HTML media tags
  const getSafePreview = (html: string) => {
    // If the content is short or has media, return more of it to ensure player visibility
    if (html.length < 1000 || html.includes('<audio') || html.includes('<video') || html.includes('<iframe')) {
      return html;
    }
    return html.substring(0, 450) + '...';
  };

  return (
    <article className="mb-24 last:mb-0 group">
      <header className="mb-8">
        <Link to={`/post/${post.slug}`} className="hover:text-[#72aee6] transition-colors">
          <h2 className="text-3xl font-black mb-4 text-gray-900 leading-tight font-serif">
            {post.title}
          </h2>
        </Link>
        <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span className="text-[#72aee6]">{categoryName}</span>
        </div>
      </header>

      {post.featured_image && (
        <div className="mb-8 rounded-sm overflow-hidden border border-gray-100 shadow-sm aspect-video">
           <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
        </div>
      )}

      <div className="wp-entry-content text-gray-800 leading-relaxed font-serif">
        {post.excerpt ? (
          <p>{post.excerpt}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: getSafePreview(post.content) }} />
        )}
      </div>

      <footer className="mt-10 pt-6 border-t border-gray-50">
        <Link to={`/post/${post.slug}`} className="text-[11px] font-black uppercase tracking-widest text-gray-900 hover:text-[#72aee6] transition-colors border-b-2 border-gray-900 hover:border-[#72aee6]">
          Continue Reading &rarr;
        </Link>
      </footer>
    </article>
  );
};

export default PostCard;
