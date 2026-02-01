
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
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    category: 'Politics',
    schedule: '24h',
    perspective: 0,
    gender: 'female' as 'male' | 'female'
  });

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('journalists').select('*');
      if (!error && data && data.length > 0) {
        setBots(data);
      } else {
        // Humanized Defaults per user request
        setBots([
          { id: 'gemma-bot-uuid', name: 'Gemma', niche: 'Global Governance', category: 'Politics', schedule: '24h', status: 'active', last_run: null, perspective: 0, gender: 'female' },
          { id: 'gary-bot-uuid', name: 'Gary', niche: 'Macro Economics', category: 'Economics', schedule: '24h', status: 'active', last_run: null, perspective: 1, gender: 'male' }
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
      setFormData({ name: '', niche: '', category: 'Politics', schedule: '24h', perspective: 0, gender: 'female' });
    }
    setShowConfigModal(true);
  };

  const handleSaveBot = async () => {
    // VALIDATION
    if (!formData.name.trim() || formData.name.length < 2) {
      alert("Validation Error: Please provide a valid Name for the reporter.");
      return;
    }
    if (!formData.niche.trim() || formData.niche.length < 3) {
      alert("Validation Error: Niche Focus is required to define editorial logic.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        niche: formData.niche.trim(),
        category: formData.category,
        schedule: formData.schedule,
        perspective: formData.perspective,
        gender: formData.gender,
        status: editingBot?.status || 'active'
      };

      let result;
      // If we are editing a MOCK bot, we must INSERT it to create a real DB entry
      const isMockId = editingBot?.id.includes('-bot-uuid');

      if (editingBot && !isMockId) {
        result = await supabase.from('journalists').update(payload).eq('id', editingBot.id);
      } else {
        result = await supabase.from('journalists').insert([payload]);
      }

      if (result.error) throw result.error;

      await fetchBots(); // Refresh state from source of truth
      setShowConfigModal(false);
      alert(`Logic committed: ${formData.name} is now synchronized with the newsroom.`);
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Save Failed: " + (err.message || "Ensure your database has a 'journalists' table with the correct columns."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunBot = async (bot: Bot) => {
    if (bot.id.includes('-bot-uuid')) {
      alert("Configuration Required: This is a demo reporter. Click 'Edit' then 'Commit Logic' to save this reporter to your database before running.");
      return;
    }

    setIsDeploying(bot.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const perspectiveText = SPECTRUM_LABELS[bot.perspective ?? 0];
      
      const prompt = `Research current events about ${bot.niche}. 
      Write a high-quality article strictly from the perspective of ${perspectiveText}. 
      Format: HTML. Use <h1> for title and <p> for body.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });

      const { data: { session } } = await supabase.auth.getSession();
      const fullText = response.text || '';
      const titleMatch = fullText.match(/<h1>(.*?)<\/h1>/);
      const title = titleMatch ? titleMatch[1] : `${bot.niche} Update`;
      const content = fullText.replace(/<h1>.*?<\/h1>/, '');

      const { error: postError } = await supabase.from('posts').insert({
        title,
        content,
        status: 'publish',
        author_id: session?.user?.id,
        journalist_id: bot.id, 
        type: 'post',
        slug: title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Date.now().toString().slice(-4)
      });

      if (postError) throw postError;

      const now = new Date().toISOString();
      await supabase.from('journalists').update({ last_run: now }).eq('id', bot.id);
      setBots(prev => prev.map(b => b.id === bot.id ? { ...b, last_run: now } : b));

      alert(`Published: "${title}" is live.`);
    } catch (err: any) {
      alert("Intelligence Run Failed: " + err.message);
    } finally {
      setIsDeploying(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif">AI Journalists</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Neural Logic Engine</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#0073aa] text-white px-8 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#005a87] transition-all"
          >
            Hire Reporter
          </button>
        </header>

        {loading ? (
          <div className="py-20 text-center text-gray-400 font-serif italic">Syncing newsroom personalities...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bots.map(bot => (
              <div key={bot.id} className="bg-white border border-gray-100 rounded shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col group">
                <div className={`absolute top-0 right-0 w-1.5 h-full ${
                  (bot.perspective ?? 0) < 0 ? 'bg-red-500' : (bot.perspective ?? 0) > 0 ? 'bg-blue-600' : 'bg-gray-300'
                }`}></div>

                <div className="p-8 pb-4 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100 shrink-0">
                    <img 
                      src={bot.gender === 'male' ? AVATAR_URLS.male : AVATAR_URLS.female} 
                      alt={bot.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-gray-900 font-serif leading-none mb-1 truncate">{bot.name}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">
                      {bot.category} Reporter
                    </p>
                  </div>
                </div>

                <div className="px-8 flex-1">
                  <div className="bg-[#f8f9fa] border border-gray-100 rounded p-5 mb-8">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Niche Focus</h4>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{bot.niche}</p>
                  </div>
                </div>

                <div className="p-8 pt-0 flex gap-2">
                  <button 
                    onClick={() => handleRunBot(bot)}
                    disabled={!!isDeploying}
                    className="flex-1 bg-[#1d2327] text-white py-4 rounded text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all shadow-md active:scale-95"
                  >
                    {isDeploying === bot.id ? 'Running Intelligence...' : 'Run Intelligence'}
                  </button>
                  <button 
                    onClick={() => handleOpenModal(bot)}
                    className="px-6 py-4 bg-gray-100 rounded text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showConfigModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white p-10 rounded shadow-2xl max-w-lg w-full border-t-8 border-gray-900 animate-in fade-in zoom-in duration-200">
              <header className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 font-serif leading-none">{editingBot ? 'Edit Reporter' : 'Hire Reporter'}</h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Logic Calibration</p>
              </header>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Public Name</label>
                    <input 
                      type="text" className="w-full border-2 border-gray-50 bg-gray-50 p-3 rounded font-bold text-sm outline-none focus:border-blue-500 transition-all" 
                      placeholder="e.g. Gemma" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Avatar Gender</label>
                    <select 
                      className="w-full border-2 border-gray-50 bg-gray-50 p-3 rounded font-bold text-sm outline-none"
                      value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    >
                      <option value="female">Female Portrait</option>
                      <option value="male">Male Portrait</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Niche Focus</label>
                  <input 
                    type="text" className="w-full border-2 border-gray-50 bg-gray-50 p-3 rounded font-bold text-sm outline-none focus:border-blue-500 transition-all" 
                    placeholder="e.g. Geopolitics" value={formData.niche} onChange={e => setFormData({ ...formData, niche: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Category</label>
                    <select 
                      className="w-full border-2 border-gray-50 bg-gray-50 p-3 rounded font-bold text-sm outline-none"
                      value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Frequency</label>
                    <select 
                      className="w-full border-2 border-gray-50 bg-gray-50 p-3 rounded font-bold text-sm outline-none"
                      value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    >
                      {FREQUENCIES.map(freq => <option key={freq.id} value={freq.id}>{freq.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest">Bias Bias / Perspective</label>
                    <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-full uppercase">
                      {SPECTRUM_LABELS[formData.perspective]}
                    </span>
                  </div>
                  <input 
                    type="range" min="-3" max="3" step="1"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900"
                    value={formData.perspective}
                    onChange={e => setFormData({ ...formData, perspective: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-50">
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest px-4">Cancel</button>
                <button 
                  onClick={handleSaveBot} 
                  disabled={isSaving}
                  className="bg-gray-900 text-white px-10 py-3 rounded-sm font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Commit Logic'}
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
