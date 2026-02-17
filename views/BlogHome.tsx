
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CategoryIcon from '../components/CategoryIcon';
import { Post, Category } from '../types';
import { supabase } from '../services/supabase';

const BlogHome: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Layout>
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
                className="group p-6 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center text-center cursor-pointer"
              >
                <div className="mb-4 p-4 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                  <CategoryIcon 
                    category={cat.name} 
                    size={48} 
                    color="#1e293b" 
                    className="opacity-90 group-hover:scale-110 transition-transform duration-300" 
                  />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 group-hover:text-blue-600">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400 italic font-serif animate-pulse">Loading latest thoughts...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 italic font-serif border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <p className="mb-4">No published posts found.</p>
          <p className="text-xs not-italic">Start by writing your first masterpiece in the Admin dashboard!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 w-full">
          <div className="flex items-center gap-4 mb-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Latest Dispatches</h3>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default BlogHome;
