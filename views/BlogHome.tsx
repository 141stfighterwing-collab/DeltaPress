
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import { Post } from '../types';
import { supabase } from '../services/supabase';

const BlogHome: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Filter by type 'post' to separate blog entries from static pages
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('status', 'publish')
          .eq('type', 'post')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error("Error fetching home posts:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  return (
    <Layout>
      {loading ? (
        <div className="py-20 text-center text-gray-400 italic font-serif animate-pulse">Loading latest thoughts...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 italic font-serif border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <p className="mb-4">No published posts found.</p>
          <p className="text-xs not-italic">Start by writing your first masterpiece in the Admin dashboard!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default BlogHome;
