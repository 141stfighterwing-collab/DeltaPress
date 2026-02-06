
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { supabase } from '../services/supabase';
import { trackEvent } from '../services/analytics';

interface PostCardProps {
  post: Post & { journalist_id?: string };
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [authorInfo, setAuthorInfo] = useState<{ name: string, avatar?: string } | null>(null);
  const [categoryName, setCategoryName] = useState('General');

  useEffect(() => {
    const fetchMetadata = async () => {
      // 1. Fetch Category
      if (post.category_id) {
        const { data } = await supabase.from('categories').select('name').eq('id', post.category_id).maybeSingle();
        if (data) setCategoryName(data.name);
      }

      // 2. Fetch Journalist if exists
      if (post.journalist_id) {
        const { data: bot } = await supabase.from('journalists').select('name, gender, avatar_url').eq('id', post.journalist_id).maybeSingle();
        if (bot) {
          setAuthorInfo({
            name: bot.name,
            avatar: bot.avatar_url || (bot.gender === 'male' 
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' 
              : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop')
          });
        }
      }
    };
    fetchMetadata();
  }, [post.category_id, post.journalist_id]);

  const handleEngagement = () => {
    trackEvent('click', post.slug, { title: post.title });
  };

  const getSafePreview = (html: string) => {
    if (html.length < 1000 || html.includes('<audio') || html.includes('<video') || html.includes('<iframe')) {
      return html;
    }
    return html.substring(0, 450) + '...';
  };

  return (
    <article className="mb-24 last:mb-0 group">
      <header className="mb-8">
        <Link 
          to={`/post/${post.slug}`} 
          onClick={handleEngagement}
          className="hover:text-[#72aee6] transition-colors"
        >
          <h2 className="text-3xl font-black mb-4 text-gray-900 leading-tight font-serif">
            {post.title}
          </h2>
        </Link>
        <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span>•</span>
          {authorInfo ? (
              <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                    <img 
                      src={authorInfo.avatar} 
                      alt={authorInfo.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'; }}
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
        <Link 
          to={`/post/${post.slug}`} 
          onClick={handleEngagement}
          className="text-[11px] font-black uppercase tracking-widest text-gray-900 hover:text-[#72aee6] transition-colors border-b-2 border-gray-900 hover:border-[#72aee6]"
        >
          Continue Reading &rarr;
        </Link>
      </footer>
    </article>
  );
};

export default PostCard;
