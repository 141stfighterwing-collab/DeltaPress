
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { GoogleGenAI } from "@google/genai";
import AdminSidebar from '../../components/AdminSidebar';

interface Bot {
  id: string;
  name: string;
  title: string;
  niche: string;
  category: string;
  schedule: string;
  status: 'active' | 'paused';
  last_run: string | null;
  perspective: number; 
  gender: 'male' | 'female';
  ethnicity: string;
  hair_color: string;
  avatar_url?: string;
}

const CATEGORIES = ['Politics', 'Economics', 'Technology', 'Health', 'Business', 'Lifestyle', 'Travel', 'Food', 'General'];
const ETHNICITIES = ['Arab', 'Asian', 'Latino', 'White', 'Black', 'Ginger'];
const HAIR_COLORS = ['Blonde', 'Red', 'Black', 'Brunette', 'Blue/Black', 'Bleached', 'Grey'];

const FREQUENCIES = [
  { id: '6h', label: 'Every 6 Hours', hours: 6 },
  { id: '24h', label: 'Once Daily', hours: 24 },
  { id: '2w', label: 'Twice Weekly', hours: 84 },
  { id: '1w', label: 'Once a Week', hours: 168 },
  { id: '2m', label: 'Twice a Month', hours: 360 },
  { id: '1m', label: 'Once a Month', hours: 720 }
];

const SPECTRUM_LABELS: Record<number, string> = {
  [-3]: 'Far Left (Anarchism)',
  [-2]: 'Left (Communist)',
  [-1]: 'Center Left (Socialist)',
  [0]: 'Center (Moderate)',
  [1]: 'Center Right (Liberal)',
  [2]: 'Right (Conservative)',
  [3]: 'Far Right (Full Fascism)'
};

const DEFAULT_AVATAR_URLS = {
  male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
  female: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'
};

const JournalistsView: React.FC = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [now, setNow] = useState(new Date());
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    niche: '',
    category: 'Politics',
    schedule: '24h',
    perspective: 0,
    gender: 'female' as 'male' | 'female',
    ethnicity: 'White',
    hair_color: 'Brunette',
    avatar_url: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('journalists').select('*');
      if (!error && data) {
        setBots(data);
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const calculateNextRun = (bot: Bot) => {
    if (!bot.last_run) return new Date();
    const freq = FREQUENCIES.find(f => f.id === bot.schedule) || FREQUENCIES[1];
    const last = new Date(bot.last_run);
    return new Date(last.getTime() + freq.hours * 60 * 60 * 1000);
  };

  const calculateCountdown = (nextRun: Date) => {
    const diff = nextRun.getTime() - now.getTime();
    if (diff <= 0) return "DUE";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const generateAIAvatar = async () => {
    if (!formData.name) return;
    setIsGeneratingAvatar(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `A professional, realistic studio headshot of a ${formData.ethnicity} ${formData.gender} news journalist with ${formData.hair_color} hair. High fashion cinematic lighting. Specializing in ${formData.category}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        setFormData(prev => ({ ...prev, avatar_url: `data:image/png;base64,${imagePart.inlineData.data}` }));
      }
    } catch (err) {} finally { setIsGeneratingAvatar(false); }
  };

  const handleOpenModal = (bot: Bot | null = null) => {
    if (bot) {
      setEditingBot(bot);
      setFormData({
        name: bot.name, 
        title: bot.title || '',
        niche: bot.niche, 
        category: bot.category,
        schedule: bot.schedule || '24h', 
        perspective: bot.perspective, 
        gender: bot.gender,
        ethnicity: bot.ethnicity || 'White',
        hair_color: bot.hair_color || 'Brunette',
        avatar_url: bot.avatar_url || ''
      });
    } else {
      setEditingBot(null);
      setFormData({ 
        name: '', title: '', niche: '', category: 'Politics', schedule: '24h', 
        perspective: 0, gender: 'female', ethnicity: 'White', hair_color: 'Brunette', avatar_url: '' 
      });
    }
    setShowConfigModal(true);
  };

  const handleSaveBot = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name, 
        title: formData.title,
        niche: formData.niche,
        category: formData.category, 
        schedule: formData.schedule,
        perspective: formData.perspective, 
        gender: formData.gender, 
        ethnicity: formData.ethnicity,
        hair_color: formData.hair_color,
        avatar_url: formData.avatar_url,
        status: editingBot?.status || 'active'
      };
      const res = editingBot ? await supabase.from('journalists').update(payload).eq('id', editingBot.id) : await supabase.from('journalists').insert([payload]);
      if (res.error) throw res.error;
      await fetchBots();
      setShowConfigModal(false);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleRunBot = async (bot: Bot) => {
    setIsDeploying(bot.id);
    setDeploymentStep('Drafting...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a 500-word ${bot.category} article about ${bot.niche}. Tone: ${SPECTRUM_LABELS[bot.perspective]}. HTML format.`,
        config: { tools: [{ googleSearch: {} }] }
      });
      const fullText = textResponse.text || '';
      const title = fullText.match(/<h1>(.*?)<\/h1>/)?.[1] || `${bot.niche} Update`;
      const content = fullText.replace(/<h1>.*?<\/h1>/, '').trim();

      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('posts').insert({
        title, content, status: 'publish', author_id: session?.user?.id, journalist_id: bot.id, type: 'post',
        slug: title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Date.now().toString().slice(-4)
      });
      await supabase.from('journalists').update({ last_run: new Date().toISOString() }).eq('id', bot.id);
      fetchBots();
    } catch (err) {} finally { setIsDeploying(null); }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif">Newsroom AI</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Autonomous Staff Registry</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-[#0073aa] text-white px-8 py-3 rounded text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700">New Agent</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bots.map(bot => (
            <div key={bot.id} className="bg-white border rounded shadow-sm flex flex-col group overflow-hidden">
               <div className="p-8 pb-4 flex items-center gap-5">
                  <img src={bot.avatar_url || (bot.gender === 'male' ? DEFAULT_AVATAR_URLS.male : DEFAULT_AVATAR_URLS.female)} className="w-16 h-16 rounded-full object-cover border" />
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 font-serif leading-none">{bot.name}</h3>
                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">{bot.title || bot.category}</p>
                  </div>
               </div>
               <div className="p-8 pt-0 flex-1 space-y-4">
                  <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-[10px] font-black uppercase text-gray-400">Beat Coverage</p>
                    <p className="text-sm font-bold text-gray-800">{bot.niche}</p>
                  </div>
                  <div className="bg-[#1d2327] text-white p-5 rounded border-l-4 border-blue-500">
                      <div className="text-[10px] font-black uppercase text-blue-400 mb-1">Status</div>
                      <div className="text-3xl font-mono font-black">{isDeploying === bot.id ? 'BUSY' : calculateCountdown(calculateNextRun(bot))}</div>
                  </div>
               </div>
               <div className="p-8 pt-0 flex gap-2">
                  <button onClick={() => handleRunBot(bot)} disabled={!!isDeploying} className="flex-1 bg-gray-900 text-white py-4 rounded text-[10px] font-black uppercase hover:bg-black disabled:opacity-50">{isDeploying === bot.id ? 'Working...' : 'Manual Deploy'}</button>
                  <button onClick={() => handleOpenModal(bot)} className="px-6 bg-gray-100 rounded text-[10px] font-black uppercase border hover:bg-gray-200">Edit</button>
               </div>
            </div>
          ))}
        </div>

        {showConfigModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white p-10 rounded shadow-2xl max-w-2xl w-full border-t-8 border-gray-900 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black mb-8 font-serif uppercase tracking-tighter">Calibrate Intelligence</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400">Name</label>
                    <input type="text" className="w-full border-2 p-3 font-bold text-sm bg-gray-50 focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400">Professional Title</label>
                    <input type="text" placeholder="e.g. Senior Food Consultant" className="w-full border-2 p-3 font-bold text-sm bg-gray-50 focus:border-blue-500 outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400">Beat / Topic</label>
                    <input type="text" className="w-full border-2 p-3 font-bold text-sm bg-gray-50 focus:border-blue-500 outline-none" value={formData.niche} onChange={e => setFormData({ ...formData, niche: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400">Post Frequency</label>
                    <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50 focus:border-blue-500 outline-none" value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })}>
                        {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                  
                  {/* Perspective Slider */}
                  <div className="space-y-2 pt-2 pb-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-gray-400">Political Perspective</label>
                        <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{SPECTRUM_LABELS[formData.perspective]}</span>
                    </div>
                    <input 
                      type="range" min="-3" max="3" step="1"
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                      value={formData.perspective}
                      onChange={e => setFormData({ ...formData, perspective: parseInt(e.target.value) })}
                    />
                    <div className="flex justify-between text-[8px] font-bold text-gray-300 uppercase">
                        <span>Far Left</span>
                        <span>Neutral</span>
                        <span>Far Right</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400">Gender</label>
                        <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}><option value="female">Female</option><option value="male">Male</option></select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400">Ethnicity</label>
                        <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50" value={formData.ethnicity} onChange={e => setFormData({ ...formData, ethnicity: e.target.value })}>{ETHNICITIES.map(et => <option key={et} value={et}>{et}</option>)}</select>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-6 rounded border flex flex-col items-center gap-6">
                    <div className="w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                        {formData.avatar_url && <img src={formData.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <button onClick={generateAIAvatar} disabled={isGeneratingAvatar || !formData.name} className="w-full py-3 bg-white border border-gray-200 rounded text-[10px] font-black uppercase hover:bg-gray-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                        {isGeneratingAvatar ? 'Synthesizing...' : '✨ Sync Portrait'}
                    </button>
                    <div className="w-full space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400">Hair Style</label>
                        <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50" value={formData.hair_color} onChange={e => setFormData({ ...formData, hair_color: e.target.value })}>{HAIR_COLORS.map(hc => <option key={hc} value={hc}>{hc}</option>)}</select>
                    </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 font-bold uppercase text-[10px]">Cancel</button>
                <button onClick={handleSaveBot} disabled={isSaving} className="bg-gray-900 text-white px-10 py-3 rounded font-black uppercase text-[10px] shadow-xl hover:bg-black">{isSaving ? 'Saving...' : 'Commit'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalistsView;
