
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';

interface RssArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

const Newsroom: React.FC = () => {
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedErrors, setFeedErrors] = useState<string[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [configuredFeeds, setConfiguredFeeds] = useState<number>(0);

  const fetchAllNews = async () => {
    setLoading(true);
    setFeedErrors([]);
    setDbError(null);
    
    try {
      const { data: feeds, error: supabaseError } = await supabase
        .from('rss_feeds')
        .select('url');

      if (supabaseError) throw supabaseError;

      if (!feeds || feeds.length === 0) {
        setArticles([]);
        setConfiguredFeeds(0);
        setLoading(false);
        return;
      }

      setConfiguredFeeds(feeds.length);

      const results = await Promise.allSettled(
        feeds.map(async (feed) => {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
          const data = await res.json();
          if (data.status !== 'ok') throw new Error(data.message || 'Parsing failed');
          
          return data.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...',
            source: data.feed.title || feed.url
          }));
        })
      );

      let all: RssArticle[] = [];
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          all = [...all, ...res.value];
        } else {
          setFeedErrors(prev => [...prev, feeds[idx].url]);
        }
      });

      all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(all);
    } catch (err: any) {
      setDbError(err.message || "Failed to connect to news pipelines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNews();
  }, []);

  return (
    <Layout>
      <header className="mb-12 border-b border-gray-100 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 font-serif mb-2">Newsroom</h1>
          <p className="text-gray-500 italic text-sm">Global perspectives aggregated from your {configuredFeeds} sources.</p>
        </div>
        <button onClick={fetchAllNews} className="text-[10px] font-black uppercase tracking-widest text-[#72aee6] hover:text-blue-800 transition-colors mb-2">🔄 Refresh</button>
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400 italic font-serif">Syncing global feeds...</div>
      ) : dbError ? (
        <div className="py-10 text-center text-red-500 bg-red-50 rounded border border-red-100 p-6">{dbError}</div>
      ) : (
        <div className="space-y-16">
          {articles.map((article, i) => (
            <article key={i} className="group border-b border-gray-50 pb-16 last:border-0">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white px-2 py-0.5 rounded shadow-sm">
                  {article.source}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                  {new Date(article.pubDate).toLocaleDateString()}
                </span>
              </div>
              
              <Link 
                to={`/news/${encodeURIComponent(article.link)}`} 
                state={{ article }}
                className="block group-hover:text-[#72aee6] transition-colors"
              >
                <h2 className="text-3xl font-bold mb-4 leading-tight font-serif text-gray-900">
                  {article.title}
                </h2>
              </Link>
              
              <div className="text-gray-600 text-[15px] leading-relaxed mb-6 font-serif italic opacity-80 line-clamp-3">
                {article.description}
              </div>

              <div className="flex gap-6 items-center">
                <Link 
                  to={`/news/${encodeURIComponent(article.link)}`}
                  state={{ article }}
                  className="text-[11px] font-black uppercase tracking-widest text-[#72aee6] border-b-2 border-transparent hover:border-[#72aee6] transition-all"
                >
                  Join Discussion &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Newsroom;
