
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
  perspective?: number; 
  gender?: 'male' | 'female';
}

const CATEGORIES = ['Politics', 'Economics', 'Technology', 'Health', 'Business', 'Lifestyle', 'Travel', 'Food', 'General'];

const FREQUENCIES = [
  { id: '6h', label: 'Every 6 Hours' },
  { id: '24h', label: 'Once Daily' },
  { id: '2w', label: 'Twice Weekly' },
  { id: '1w', label: 'Once a Week' },
  { id: '1m', label: 'Once a Month' }
];

const SPECTRUM_LABELS: Record<number, string> = {
  [-3]: 'Far Left (Anarchism)',
  [-2]: 'Left (Communism)',
  [-1]: 'Center Left (Socialism)',
  [0]: 'Center (Moderates)',
  [1]: 'Center Right (Democrats)',
  [2]: 'Right (Conservative)',
  [3]: 'Far Right'
};

// Curated professional IDs for Picsum
const AVATAR_URLS = {
  male: 'https://picsum.photos/id/1012/150/150',
  female: 'https://picsum.photos/id/1027/150/150'
};

const JournalistsView: React.FC = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [moderationEnabled, setModerationEnabled] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    category: 'Politics',
    schedule: '6h',
    perspective: 0,
    gender: 'female' as 'male' | 'female'
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
    try {
      const { data, error } = await supabase.from('journalists').select('*');
      if (!error && data && data.length > 0) {
        setBots(data);
      } else {
        setBots([
          { id: '550e8400-e29b-41d4-a716-446655440000', name: 'PolitiBot-Alpha', niche: 'Global Governance', category: 'Politics', schedule: '12h', status: 'active', last_run: '2023-10-27T10:00:00Z', perspective: 0, gender: 'female' },
          { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: 'MarketWatcher', niche: 'Macro Economics', category: 'Economics', schedule: '24h', status: 'active', last_run: null, perspective: 1, gender: 'male' }
        ]);
      }
    } catch (err) {
      console.error("Error fetching bots:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (bot: Bot | null = null) => {
    if (bot) {
      setEditingBot(bot);
      setFormData({
        name: bot.name,
        niche: bot.niche,
        category: bot.category,
        schedule: bot.schedule,
        perspective: bot.perspective ?? 0,
        gender: bot.gender || 'female'
      });
    } else {
      setEditingBot(null);
      setFormData({ name: '', niche: '', category: 'Politics', schedule: '6h', perspective: 0, gender: 'female' });
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
        if (error) throw error;
        setBots(prev => prev.map(b => b.id === editingBot.id ? { ...b, ...payload } : b));
      } else {
        const { data, error } = await supabase.from('journalists').insert([payload]).select().single();
        if (error) throw error;
        if (data) setBots(prev => [...prev, data]);
      }
      setShowConfigModal(false);
    } catch (err: any) {
      alert("Error saving bot: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleRunBot = async (bot: Bot) => {
    setIsDeploying(bot.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const perspectiveText = SPECTRUM_LABELS[bot.perspective ?? 0];
      
      const moderationPrompt = moderationEnabled 
        ? "STRICTLY avoid any adult content, pornography, gambling links, illegal substances, or violence." 
        : "";

      const prompt = `Research current events about ${bot.niche}. 
      CRITICAL INSTRUCTION: Write this entire article strictly from the perspective of ${perspectiveText}. 
      The tone, arguments, and conclusions must reflect this specific political/economic viewpoint.
      ${moderationPrompt} 
      Write a complete blog post in HTML format. Use <h1> for the title and <p> for paragraphs. 
      The category is ${bot.category}.`;

      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const fullText = searchResponse.text;
      const titleMatch = fullText.match(/<h1>(.*?)<\/h1>/);
      const title = titleMatch ? titleMatch[1] : `${bot.niche} Report`;
      const cleanContent = fullText.replace(/<h1>.*?<\/h1>/, '');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { error: postError } = await supabase.from('posts').insert({
        title,
        content: cleanContent,
        status: 'publish',
        author_id: session.user.id,
        journalist_id: bot.id, 
        type: 'post',
        category_id: null,
        slug: title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Date.now().toString().slice(-4)
      });

      if (postError) throw postError;

      const now = new Date().toISOString();
      await supabase.from('journalists').update({ last_run: now }).eq('id', bot.id);
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, last_run: now } : b));

      alert(`Published: "${title}"\nReporter: ${bot.name} (${perspectiveText})`);
    } catch (err: any) {
      console.error("Bot Error:", err);
      alert("Execution Failed: " + (err.message || "Unknown error"));
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
            <p className="text-gray-400 text-sm mt-1 italic uppercase tracking-widest font-bold">Newsroom Automated Intelligence</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#0073aa] text-white px-6 py-2 rounded text-xs font-black uppercase tracking-widest shadow-md hover:bg-[#005a87] transition-all"
          >
            Hire New Bot
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400 italic font-serif">Syncing automated newsroom...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map(bot => (
              <div key={bot.id} className="bg-white border border-gray-200 rounded p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-1.5 h-full ${
                    (bot.perspective ?? 0) < 0 ? 'bg-red-500' : (bot.perspective ?? 0) > 0 ? 'bg-blue-500' : 'bg-gray-300'
                }`}></div>
                
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shrink-0 shadow-sm">
                        <img 
                            src={bot.gender === 'male' ? AVATAR_URLS.male : AVATAR_URLS.female} 
                            alt={bot.name}
                            className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://picsum.photos/150/150';
                            }}
                        />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 leading-tight font-serif">{bot.name}</h3>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{bot.category} Reporter</p>
                    </div>
                </div>

                <div className="mb-6 p-3 bg-gray-50 rounded border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Niche Focus</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{bot.niche}</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => handleRunBot(bot)}
                    disabled={!!isDeploying}
                    className="flex-1 bg-[#1d2327] text-white py-2.5 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all shadow-md active:scale-95"
                  >
                    {isDeploying === bot.id ? 'Deploying...' : 'Run Intelligence'}
                  </button>
                  <button 
                    onClick={() => handleOpenModal(bot)}
                    className="px-4 py-2.5 bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showConfigModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-lg max-w-lg w-full shadow-2xl border-t-8 border-gray-900 animate-in fade-in zoom-in duration-200">
              <h2 className="text-2xl font-bold mb-1 font-serif text-gray-800">Bot Logic Engine</h2>
              <p className="text-gray-400 text-[10px] mb-8 uppercase font-bold tracking-[0.2em]">Neural Network Configuration</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Bot Name</label>
                        <input 
                            type="text" className="w-full border-2 border-gray-100 p-3 rounded outline-none focus:border-blue-500 text-sm font-bold bg-gray-50" 
                            placeholder="e.g. RedBot" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Gender / Avatar</label>
                        <select 
                            className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 font-bold outline-none"
                            value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                        >
                            <option value="female">Female Persona</option>
                            <option value="male">Male Persona</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Category</label>
                    <select 
                      className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 font-bold outline-none"
                      value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Schedule</label>
                    <select 
                      className="w-full border-2 border-gray-100 p-3 rounded text-sm bg-gray-50 font-bold outline-none"
                      value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    >
                      {FREQUENCIES.map(freq => <option key={freq.id} value={freq.id}>{freq.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-2">Focus Niche</label>
                    <input 
                        type="text" className="w-full border-2 border-gray-100 p-3 rounded outline-none focus:border-blue-500 text-sm bg-gray-50" 
                        placeholder="e.g. Tax Reform, Crypto" value={formData.niche} onChange={e => setFormData({ ...formData, niche: e.target.value })}
                    />
                </div>

                <div className="pt-4 pb-2">
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-widest">Political Orientation</label>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                            formData.perspective < 0 ? 'bg-red-600 text-white' : formData.perspective > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                            {SPECTRUM_LABELS[formData.perspective]}
                        </span>
                    </div>
                    <div className="relative pt-1 px-2">
                        <input 
                            type="range" min="-3" max="3" step="1"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                            value={formData.perspective}
                            onChange={e => setFormData({ ...formData, perspective: parseInt(e.target.value) })}
                        />
                        <div className="flex justify-between mt-2 text-[8px] font-black text-gray-300 uppercase">
                            <span>Anarchism</span>
                            <span>Moderate</span>
                            <span>Reactionary</span>
                        </div>
                    </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-50">
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 font-black uppercase text-[10px] tracking-widest px-4">Close</button>
                <button 
                  onClick={handleSaveBot} 
                  className="bg-gray-900 text-white px-10 py-3 rounded font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  {editingBot ? 'Commit Logic' : 'Initiate Bot'}
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
