
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { GoogleGenAI } from "@google/genai";
import AdminSidebar from '../../components/AdminSidebar';

interface Bot {
  id: string;
  name: string;
  niche: string;
  category: string;
  schedule: string;
  status: 'active' | 'paused';
  last_run: string | null;
}

const CATEGORIES = ['Technology', 'Health', 'Business', 'Lifestyle', 'Travel', 'Food', 'General'];
const FREQUENCIES = [
  { id: '6h', label: 'Every 6 Hours' },
  { id: '24h', label: 'Once Daily' },
  { id: '2w', label: 'Twice Weekly' },
  { id: '1w', label: 'Once a Week' },
  { id: '1m', label: 'Once a Month' }
];

const JournalistsView: React.FC = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [moderationEnabled, setModerationEnabled] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    category: 'Technology',
    schedule: '6h'
  });

  useEffect(() => {
    fetchBots();
    fetchModerationStatus();
  }, []);

  const fetchModerationStatus = async () => {
    const { data } = await supabase.from('site_settings').select('content_moderation').eq('id', 1).maybeSingle();
    if (data) setModerationEnabled(data.content_moderation);
  };

  const fetchBots = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('journalists').select('*');
    if (!error && data && data.length > 0) {
      setBots(data);
    } else {
      setBots([
        { id: '1', name: 'TechCruncher-AI', niche: 'Silicon Valley Startups', category: 'Technology', schedule: '12h', status: 'active', last_run: '2023-10-27T10:00:00Z' },
        { id: '2', name: 'Health-Bot', niche: 'Nutrition & Biohacking', category: 'Health', schedule: '24h', status: 'active', last_run: null }
      ]);
    }
    setLoading(false);
  };

  const handleOpenModal = (bot: Bot | null = null) => {
    if (bot) {
      setEditingBot(bot);
      setFormData({
        name: bot.name,
        niche: bot.niche,
        category: bot.category,
        schedule: bot.schedule
      });
    } else {
      setEditingBot(null);
      setFormData({ name: '', niche: '', category: 'Technology', schedule: '6h' });
    }
    setShowConfigModal(true);
  };

  const handleSaveBot = async () => {
    if (!formData.name || !formData.niche) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      ...formData,
      status: editingBot?.status || 'active',
      last_run: editingBot?.last_run || null
    };

    try {
      if (editingBot) {
        const { error } = await supabase.from('journalists').update(payload).eq('id', editingBot.id);
        if (error && error.code !== '42P01') throw error;
        setBots(prev => prev.map(b => b.id === editingBot.id ? { ...b, ...payload } : b));
        alert(`${payload.name} configuration updated.`);
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        const { error } = await supabase.from('journalists').insert({ id: newId, ...payload });
        if (error && error.code !== '42P01') throw error;
        setBots(prev => [...prev, { id: newId, ...payload as any }]);
        alert(`New journalist ${payload.name} activated!`);
      }
      setShowConfigModal(false);
    } catch (err: any) {
      alert("Error saving bot: " + err.message);
    }
  };

  const handleRunBot = async (bot: Bot) => {
    setIsDeploying(bot.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const moderationPrompt = moderationEnabled 
        ? "STRICTLY avoid any adult content, pornography, gambling links, illegal substances, or violence. Content must be suitable for children and professional audiences." 
        : "";

      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Research trending topics about ${bot.niche}. ${moderationPrompt} 
        Write a complete blog post in HTML format. Use <h1> for the title and <p> for paragraphs. 
        Ensure the category is ${bot.category}. Focus on being informative and high-quality.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const fullText = searchResponse.text;
      const title = fullText.match(/<h1>(.*?)<\/h1>/)?.[1] || `${bot.niche} Update`;
      const cleanContent = fullText.replace(/<h1>.*?<\/h1>/, '');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { error: postError } = await supabase.from('posts').insert({
        title,
        content: cleanContent,
        status: 'publish',
        author_id: session.user.id,
        type: 'post',
        category_id: null, // Should link to category ID if available
        slug: title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Date.now()
      });

      if (postError) throw postError;

      const now = new Date().toISOString();
      await supabase.from('journalists').update({ last_run: now }).eq('id', bot.id);
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, last_run: now } : b));

      alert(`Published! "${title}" by ${bot.name}.`);
    } catch (err: any) {
      console.error("Bot Error:", err);
      alert("Bot Execution Error: " + (err.message || "Unknown error"));
    } finally {
      setIsDeploying(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 font-serif">AI Journalists</h1>
            <p className="text-gray-400 text-sm mt-1 italic">Automated content engines powered by Gemini.</p>
            {moderationEnabled && (
              <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded">
                🛡️ Safety Filters: ACTIVE
              </span>
            )}
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-gray-800 text-white px-6 py-2 rounded font-bold shadow-md hover:bg-black transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            Hire New Bot
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 italic font-serif">Accessing newsroom...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map(bot => (
              <div key={bot.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 relative group overflow-hidden hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 p-4">
                  <span className={`w-3 h-3 rounded-full inline-block ${bot.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                </div>
                
                <div className="text-3xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">{bot.name}</h3>
                <p className="text-[10px] text-blue-600 font-black uppercase mb-4 tracking-widest">{bot.niche}</p>
                
                <div className="space-y-2 mb-6 border-y border-gray-50 py-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Category:</span>
                    <span className="font-bold text-gray-700">{bot.category}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Frequency:</span>
                    <span className="font-bold text-gray-700">{FREQUENCIES.find(f => f.id === bot.schedule)?.label || bot.schedule}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => handleRunBot(bot)}
                    disabled={!!isDeploying}
                    className="flex-1 bg-blue-600 text-white py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isDeploying === bot.id ? 'Writing...' : 'Run Now'}
                  </button>
                  <button 
                    onClick={() => handleOpenModal(bot)}
                    className="px-4 py-2 bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
              <h2 className="text-2xl font-bold mb-1 font-serif text-gray-800">
                {editingBot ? 'Edit Journalist' : 'Configure New Bot'}
              </h2>
              <p className="text-gray-400 text-xs mb-6 uppercase font-bold tracking-widest">Bot Intelligence Parameters</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Bot Identity</label>
                  <input 
                    type="text" 
                    className="w-full border p-3 rounded outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-900 bg-[#fdfdfd]" 
                    placeholder="e.g. TrendBot 5000"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Topic Niche</label>
                  <input 
                    type="text" 
                    className="w-full border p-3 rounded outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm text-gray-900 bg-[#fdfdfd]" 
                    placeholder="e.g. Artificial Intelligence"
                    value={formData.niche}
                    onChange={e => setFormData({ ...formData, niche: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Category</label>
                    <select 
                      className="w-full border p-3 rounded text-sm bg-[#fdfdfd] outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-wider">Schedule</label>
                    <select 
                      className="w-full border p-3 rounded text-sm bg-[#fdfdfd] outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      value={formData.schedule}
                      onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    >
                      {FREQUENCIES.map(freq => (
                        <option key={freq.id} value={freq.id}>{freq.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 font-bold text-xs uppercase tracking-widest">
                <button 
                  onClick={() => setShowConfigModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors py-2 px-4"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveBot} 
                  className="bg-[#0073aa] text-white px-8 py-2 rounded hover:bg-[#005a87] transition-all shadow-md active:scale-95"
                >
                  {editingBot ? 'Save Bot' : 'Hire Bot'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalistsView;
