
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CategoryIcon from '../components/CategoryIcon';
import SEO from '../components/SEO';
import { Post, Category } from '../types';
import { supabase } from '../services/supabase';

const BlogHome: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [{ data: postsData }, { data: catsData }] = await Promise.all([
          supabase
            .from('posts')
            .select('*')
            .eq('status', 'publish')
            .eq('type', 'post')
            .order('created_at', { ascending: false }),
          supabase
            .from('categories')
            .select('*')
            .order('name')
        ]);

        if (postsData) setPosts(postsData);
        if (catsData) setCategories(catsData);
      } catch (err) {
        console.error("Error fetching home data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  const handleCategoryClick = (id: string) => {
    setSelectedCategoryId(prev => prev === id ? null : id);
    // Scroll to the feed when a category is selected for better UX
    const feedElement = document.getElementById('blog-feed-header');
    if (feedElement) {
      feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredPosts = selectedCategoryId 
    ? posts.filter(post => post.category_id === selectedCategoryId)
    : posts;

  const activeCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <Layout>
      <SEO
        title="Home"
        description="Latest insights and perspectives on Socialist and AI topics."
        keywords="Socialist, AI, Socialist AI Blog, AI News, Socialist Perspectives, Technology, Politics"
      />
      {!loading && categories.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Topic Explorer</h3>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => handleCategoryClick(cat.id)}
                className={`group p-6 bg-white border rounded-lg shadow-sm transition-all flex flex-col items-center text-center cursor-pointer ${
                  selectedCategoryId === cat.id 
                  ? 'border-blue-500 ring-2 ring-blue-50 bg-blue-50/10' 
                  : 'border-gray-100 hover:shadow-md hover:border-blue-200'
                }`}
              >
                <div className={`mb-4 p-4 rounded-full transition-colors ${
                  selectedCategoryId === cat.id ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-blue-50'
                }`}>
                  <CategoryIcon 
                    category={cat.name} 
                    size={48} 
                    color={selectedCategoryId === cat.id ? '#2563eb' : '#1e293b'} 
                    className={`transition-transform duration-300 ${selectedCategoryId === cat.id ? 'scale-110' : 'opacity-90 group-hover:scale-110'}`} 
                  />
                </div>
                <span className={`text-xs font-black uppercase tracking-widest transition-colors ${
                  selectedCategoryId === cat.id ? 'text-blue-700' : 'text-gray-600 group-hover:text-blue-600'
                }`}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400 italic font-serif animate-pulse">Loading latest thoughts...</div>
      ) : (
        <div className="divide-y divide-gray-100 w-full">
          <div id="blog-feed-header" className="flex items-center justify-between mb-12 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 whitespace-nowrap">
                {selectedCategoryId ? `Category: ${activeCategory?.name}` : 'Latest Dispatches'}
              </h3>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>
            {selectedCategoryId && (
              <button 
                onClick={() => setSelectedCategoryId(null)}
                className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 px-3 py-1 bg-blue-50 rounded border border-blue-100"
              >
                Clear Filter <span className="text-lg leading-none">×</span>
              </button>
            )}
          </div>

          {filteredPosts.length === 0 ? (
            <div className="py-20 text-center text-gray-400 italic font-serif border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <p className="mb-4">No published posts found in this topic.</p>
              <button 
                onClick={() => setSelectedCategoryId(null)}
                className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline"
              >
                Show All Dispatches
              </button>
            </div>
          ) : (
            filteredPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      )}
    </Layout>
  );
};

export default BlogHome;
