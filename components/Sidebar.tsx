
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import CategoryIcon from './CategoryIcon';

interface RecentPost {
  id: string;
  title: string;
  slug: string;
}

interface DynamicCategory {
  id: string;
  name: string;
  count: number;
}

interface MiniNews {
  title: string;
  source: string;
  link: string;
}

const Sidebar: React.FC = () => {
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [miniNews, setMiniNews] = useState<MiniNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Recent Posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, slug')
          .eq('status', 'publish')
          .eq('type', 'post')
          .order('created_at', { ascending: false })
          .limit(5);

        if (postsData) setRecentPosts(postsData);

        // 2. Fetch Categories (Schema Resilient)
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name');

        if (catData && !catError) {
          const { data: postsWithCats } = await supabase
            .from('posts')
            .select('category_id')
            .eq('status', 'publish')
            .eq('type', 'post');

          setCategories(catData.map(cat => ({
            id: cat.id,
            name: cat.name,
            count: postsWithCats?.filter(p => p.category_id === cat.id).length || 0
          })));
        }

        // 3. Fetch RSS Mini News
        const { data: feeds } = await supabase.from('rss_feeds').select('url').limit(1);
        if (feeds && feeds.length > 0) {
          try {
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feeds[0].url)}`);
            const data = await res.json();
            if (data.status === 'ok') {
              setMiniNews(data.items.slice(0, 3).map((it: any) => ({
                title: it.title,
                source: data.feed.title || 'News',
                link: it.link
              })));
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error("Sidebar sync error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSidebarData();
  }, []);

  return (
    <div className="space-y-12 text-sm text-gray-700">
      {/* Search Widget */}
      <section>
        <div className="flex">
          <input 
            type="text" 
            placeholder="Search..." 
            className="flex-1 border border-gray-300 px-3 py-2 focus:outline-none focus:border-gray-500 bg-white text-gray-800"
          />
          <button className="bg-[#e9eaee] border border-gray-300 border-l-0 px-4 py-2 hover:bg-gray-200 transition-colors text-[10px] font-black uppercase">Go</button>
        </div>
      </section>

      {/* Global Pulse Widget */}
      {miniNews.length > 0 && (
        <section className="bg-blue-50/50 p-6 border border-blue-100 rounded-sm">
          <h3 className="font-black border-b border-blue-100 pb-2 mb-4 uppercase tracking-widest text-[10px] text-blue-600">Global Pulse</h3>
          <ul className="space-y-4">
            {miniNews.map((news, i) => (
              <li key={i}>
                <span className="text-[9px] font-black uppercase text-blue-300 block mb-0.5">{news.source}</span>
                <Link 
                   to={`/news/${encodeURIComponent(news.link)}`} 
                   className="text-gray-900 hover:text-blue-700 leading-snug block font-serif italic text-[13px]"
                >
                  {news.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent Posts Widget */}
      <section>
        <h3 className="font-bold border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider text-[11px] text-gray-400">Recent Posts</h3>
        {loading ? (
          <p className="text-gray-400 italic text-xs">Loading posts...</p>
        ) : (
          <ul className="space-y-3">
            {recentPosts.map(post => (
              <li key={post.id}>
                <Link to={`/post/${post.slug}`} className="text-blue-700 hover:text-blue-900 leading-snug block font-medium hover:underline">
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Categories Widget */}
      <section>
        <h3 className="font-bold border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider text-[11px] text-gray-400">Categories</h3>
        <ul className="space-y-3">
          {categories.map(cat => (
            <li key={cat.id} className="flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <CategoryIcon category={cat.name} size={18} color="#3b82f6" className="opacity-70 group-hover:opacity-100 transition-opacity" />
                <Link to="#" className="text-blue-700 hover:text-blue-900 hover:underline font-medium">{cat.name}</Link>
              </div>
              <span className="text-[10px] text-gray-300 font-bold group-hover:text-gray-500">({cat.count})</span>
            </li>
          ))}
          {categories.length === 0 && !loading && <li className="text-gray-400 italic text-xs">No categories found</li>}
        </ul>
      </section>

      {/* Meta Widget */}
      <section>
        <h3 className="font-bold border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider text-[11px] text-gray-400">Meta</h3>
        <ul className="space-y-2">
          <li><Link to="/news" className="text-blue-700 hover:underline font-bold">Newsroom</Link></li>
          <li><Link to="/login" className="text-blue-700 hover:underline">Log in</Link></li>
          <li><a href="#" className="text-blue-700 hover:underline">Entries RSS</a></li>
          <li><a href="#" className="text-blue-700 hover:underline">Comments RSS</a></li>
          <li><a href="https://wordpress.org/" className="text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">WordPress.org</a></li>
        </ul>
      </section>
    </div>
  );
};

export default Sidebar;
