
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AdminSidebar from '../../components/AdminSidebar';
import { trackEvent } from '../../services/analytics';

interface RssFeed {
  id: string;
  url: string;
  name?: string;
  created_at: string;
}

interface RssArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
}

const RssFeedsView: React.FC = () => {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'ok' | 'error', message: string } | null>(null);

  const fetchFeeds = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('rss_feeds')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        if (queryError.code === '42P01') {
          setError('rss_feeds');
        } else {
          throw queryError;
        }
      } else if (data) {
        setFeeds(data);
        refreshArticles(data);
      }
    } catch (err: any) {
      console.error("Fetch feeds error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshArticles = async (feedList: RssFeed[]) => {
    if (feedList.length === 0) {
      setArticles([]);
      return;
    }
    
    setIsRefreshing(true);
    const results = await Promise.allSettled(
      feedList.map(async (feed) => {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
        const data = await res.json();
        if (data.status === 'ok') {
          return data.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
            source: data.feed.title || feed.url
          }));
        }
        throw new Error(data.message);
      })
    );

    let all: RssArticle[] = [];
    results.forEach(res => {
      if (res.status === 'fulfilled') all = [...all, ...res.value];
    });

    all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setArticles(all);
    setIsRefreshing(false);
  };

  const testFeed = async () => {
    if (!newFeedUrl) return;
    setTestResult(null);
    setIsAdding(true);
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(newFeedUrl)}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setTestResult({ status: 'ok', message: `Success: Found ${data.items.length} articles from "${data.feed.title}"` });
      } else {
        setTestResult({ status: 'error', message: `Failed: ${data.message || 'Unknown error'}` });
      }
    } catch (e: any) {
      setTestResult({ status: 'error', message: `Network Error: ${e.message}` });
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl) return;
    setIsAdding(true);
    try {
      const { data, error: insertError } = await supabase
        .from('rss_feeds')
        .insert([{ url: newFeedUrl }])
        .select();

      if (insertError) throw insertError;
      
      const newFeeds = [...(data || []), ...feeds];
      setFeeds(newFeeds);
      setNewFeedUrl('');
      setTestResult(null);
      refreshArticles(newFeeds);
    } catch (err: any) {
      alert("Error adding feed: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteFeed = async (id: string) => {
    if (!window.confirm("Remove this RSS feed?")) return;
    try {
      const { error: delError } = await supabase.from('rss_feeds').delete().eq('id', id);
      if (delError) throw delError;
      
      const remainingFeeds = feeds.filter(f => f.id !== id);
      setFeeds(remainingFeeds);
      refreshArticles(remainingFeeds);
    } catch (err: any) {
      alert("Error deleting: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 p-6 lg:p-10">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">RSS Newsroom</h1>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em] mt-1">External Feed Aggregator</p>
          </div>
          <button 
            onClick={() => refreshArticles(feeds)}
            disabled={isRefreshing || !!error}
            className="bg-white border border-gray-300 px-4 py-2 rounded text-xs font-bold uppercase tracking-tight hover:bg-gray-50 disabled:opacity-50"
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh All'}
          </button>
        </header>

        {error === 'rss_feeds' ? (
          <div className="max-w-3xl mx-auto bg-white border border-red-200 rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Database Table Required</h2>
            <p className="text-gray-600 mb-6 text-sm">Please ensure the <code>rss_feeds</code> table exists in Supabase.</p>
            <button onClick={fetchFeeds} className="bg-black text-white px-6 py-2 rounded font-bold">Try Again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded shadow-sm p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 pb-2 border-b">Configure New Source</h3>
                <div className="space-y-4">
                  <input 
                    type="url" 
                    placeholder="Paste RSS/Atom Feed URL..." 
                    className="w-full border p-3 rounded text-sm focus:ring-2 focus:ring-[#0073aa] outline-none font-mono"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                  />
                  
                  {testResult && (
                    <div className={`p-3 rounded text-[10px] font-bold uppercase tracking-tight ${testResult.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {testResult.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={testFeed}
                      disabled={isAdding || !newFeedUrl}
                      className="flex-1 bg-gray-100 text-gray-600 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50"
                    >
                      Test Feed
                    </button>
                    <button 
                      onClick={handleAddFeed}
                      disabled={isAdding || !newFeedUrl}
                      className="flex-1 bg-[#0073aa] text-white py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#005a87] disabled:opacity-50 shadow-md transition-all active:scale-95"
                    >
                      Add & Save
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 italic">Example: https://feeds.bbci.co.uk/news/rss.xml</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Active Pipelines ({feeds.length})</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {feeds.length === 0 ? (
                    <p className="p-10 text-xs text-gray-300 italic text-center">No sources configured.</p>
                  ) : (
                    feeds.map(feed => (
                      <div key={feed.id} className="p-4 group hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-blue-600 truncate">{feed.url}</p>
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-black">Added {new Date(feed.created_at).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteFeed(feed.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-800">Global Feed Sync</h3>
                  {isRefreshing && <span className="text-[10px] text-blue-600 font-bold animate-pulse">SYNCING...</span>}
                </div>
                {articles.length === 0 ? (
                  <div className="p-20 text-center">
                    <div className="text-4xl mb-4 grayscale opacity-20">📡</div>
                    <p className="text-gray-400 font-serif italic text-sm">Awaiting data from configured sources.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[800px] overflow-y-auto">
                    {articles.map((article, idx) => (
                      <div key={idx} className="p-6 hover:bg-blue-50/20 transition-colors group">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white px-2 py-0.5 rounded">
                            {article.source}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(article.pubDate).toLocaleString()}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors mb-2">
                          <a href={article.link} target="_blank" rel="noopener noreferrer">
                            {article.title}
                          </a>
                        </h2>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RssFeedsView;
