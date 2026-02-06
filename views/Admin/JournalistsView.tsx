
import React, { useState, useEffect, useRef } from 'react';
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
  { id: '6h', label: 'Every 6 Hours', hours: 6 },
  { id: '24h', label: 'Once Daily', hours: 24 },
  { id: '2w', label: 'Twice Weekly', hours: 84 },
  { id: '1w', label: 'Once a Week', hours: 168 },
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

const AVATAR_URLS = {
  male: 'https://picsum.photos/id/1012/150/150',
  female: 'https://picsum.photos/id/1027/150/150'
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
  const [now, setNow] = useState(new Date());
  
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    category: 'Politics',
    schedule: '24h',
    perspective: 0,
    gender: 'female' as 'male' | 'female'
  });

  // Ticking countdown effect
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
      if (!error && data && data.length > 0) {
        setBots(data);
        checkAndRunDueBots(data);
      } else {
        setBots([]);
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
    if (diff <= 0) return "00:00:00 (DUE)";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkAndRunDueBots = (botsList: Bot[]) => {
    botsList.forEach(bot => {
      const next = calculateNextRun(bot);
      if (next <= new Date() && bot.status === 'active') {
        handleRunBot(bot, true);
      }
    });
  };

  const handleOpenModal = (bot: Bot | null = null) => {
    if (bot) {
      setEditingBot(bot);
      setFormData({
        name: bot.name, niche: bot.niche, category: bot.category,
        schedule: bot.schedule, perspective: bot.perspective ?? 0, gender: bot.gender || 'female'
      });
    } else {
      setEditingBot(null);
      setFormData({ name: '', niche: '', category: 'Politics', schedule: '24h', perspective: 0, gender: 'female' });
    }
    setShowConfigModal(true);
  };

  const handleSaveBot = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(), niche: formData.niche.trim(),
        category: formData.category, schedule: formData.schedule,
        perspective: formData.perspective, gender: formData.gender, status: editingBot?.status || 'active'
      };
      let res = editingBot ? await supabase.from('journalists').update(payload).eq('id', editingBot.id) : await supabase.from('journalists').insert([payload]);
      if (res.error) throw res.error;
      await fetchBots();
      setShowConfigModal(false);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleRunBot = async (bot: Bot, silent: boolean = false) => {
    setIsDeploying(bot.id);
    setDeploymentStep('Writing Article...');
    try {
      // 1. Resolve Category ID from name
      let categoryId: string | null = null;
      const { data: catData } = await supabase.from('categories').select('id').eq('name', bot.category).maybeSingle();
      if (catData) {
        categoryId = catData.id;
      } else {
        const { data: newCat } = await supabase.from('categories').insert([{ name: bot.category, slug: bot.category.toLowerCase().replace(/ /g, '-') }]).select().single();
        if (newCat) categoryId = newCat.id;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // 2. Generate Text Content
      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a professional ${bot.category} article about ${bot.niche}. Perspective: ${SPECTRUM_LABELS[bot.perspective ?? 0]}. Use HTML formatting. Include a <h1> title.`,
        config: { tools: [{ googleSearch: {} }] }
      });

      const fullText = textResponse.text || '';
      const title = fullText.match(/<h1>(.*?)<\/h1>/)?.[1] || `${bot.niche} Update`;
      const content = fullText.replace(/<h1>.*?<\/h1>/, '');

      // 3. Generate Featured Image
      setDeploymentStep('Generating Image...');
      let featured_image = '';
      try {
        const imageAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const imageResponse = await imageAi.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { 
            parts: [{ text: `A professional, high-quality, cinematic featured image for a news article titled: "${title}". Subject: ${bot.niche}. Wide angle, photography style.` }] 
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData) {
          featured_image = `data:image/png;base64,${imagePart.inlineData.data}`;
        }
      } catch (imgErr) {
        console.warn("AI Image generation failed, using fallback keyword image", imgErr);
        featured_image = `https://source.unsplash.com/featured/1200x675?${encodeURIComponent(bot.niche)}`;
      }

      setDeploymentStep('Publishing to Database...');
      const { data: { session } } = await supabase.auth.getSession();
      const { error: postError } = await supabase.from('posts').insert({
        title, 
        content, 
        status: 'publish', 
        author_id: session?.user?.id,
        journalist_id: bot.id, 
        category_id: categoryId, 
        type: 'post',
        featured_image,
        slug: title.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') + '-' + Date.now().toString().slice(-4)
      });

      if (postError) throw postError;

      const updatedTime = new Date().toISOString();
      await supabase.from('journalists').update({ last_run: updatedTime }).eq('id', bot.id);
      if (!silent) alert(`Success: "${title}" published with AI-generated image.`);
      fetchBots();
    } catch (err: any) { 
      if (!silent) alert(err.message); 
    } finally { 
      setIsDeploying(null); 
      setDeploymentStep('');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f1f1]">
      <AdminSidebar onLogout={() => navigate('/login')} />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 font-serif leading-tight">AI Newsroom</h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Autonomous Editorial Intelligence</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-[#0073aa] text-white px-8 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-lg">Commission Reporter</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bots.map(bot => {
            const nextRun = calculateNextRun(bot);
            const countdown = calculateCountdown(nextRun);
            const isSelfDeploying = isDeploying === bot.id;

            return (
              <div key={bot.id} className="bg-white border rounded shadow-sm flex flex-col group overflow-hidden">
                 <div className="p-8 pb-4 flex items-center gap-5">
                    <img src={bot.gender === 'male' ? AVATAR_URLS.male : AVATAR_URLS.female} className="w-16 h-16 rounded-full object-cover shadow-sm" />
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 font-serif">{bot.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{bot.category} Specialist</p>
                    </div>
                 </div>
                 <div className="p-8 flex-1 space-y-4">
                    <p className="text-sm font-bold text-gray-800 bg-gray-50 p-4 rounded border">Beat: {bot.niche}</p>
                    <div className="bg-[#1d2327] text-white p-5 rounded border-l-4 border-blue-500 shadow-inner">
                        <div className="text-[10px] font-black uppercase text-blue-400 mb-1 tracking-widest">Next Autonomous Broadcast</div>
                        <div className="text-3xl font-mono font-black tracking-tight">{countdown}</div>
                        <div className="text-[9px] text-gray-500 mt-2 font-bold uppercase tracking-widest">Target: {nextRun.toLocaleDateString()} @ {nextRun.toLocaleTimeString()}</div>
                    </div>
                 </div>
                 <div className="p-8 pt-0 flex flex-col gap-2">
                    {isSelfDeploying && (
                      <div className="text-center py-2 animate-pulse">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{deploymentStep}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleRunBot(bot)} disabled={!!isDeploying} className="flex-1 bg-gray-900 text-white py-4 rounded text-[10px] font-black uppercase shadow hover:bg-black disabled:opacity-50 transition-all active:scale-95">{isSelfDeploying ? 'Working...' : 'Deploy'}</button>
                      <button onClick={() => handleOpenModal(bot)} className="px-6 bg-gray-100 rounded text-[10px] font-black uppercase border border-gray-200 hover:bg-gray-200 transition-colors">Edit</button>
                    </div>
                 </div>
              </div>
            );
          })}
          {bots.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-400 italic bg-white border border-dashed rounded-lg">
                No active bot journalists commissioned.
            </div>
          )}
        </div>

        {showConfigModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white p-10 rounded shadow-2xl max-w-lg w-full border-t-8 border-gray-900">
              <h2 className="text-2xl font-black mb-8 font-serif uppercase tracking-tighter">Calibrate Intelligence</h2>
              <div className="space-y-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</label>
                    <input type="text" placeholder="Reporter Name" className="w-full border-2 p-3 font-bold text-sm bg-gray-50 outline-none focus:border-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic / Niche Beat</label>
                    <input type="text" placeholder="Niche Beat" className="w-full border-2 p-3 font-bold text-sm bg-gray-50 outline-none focus:border-blue-500" value={formData.niche} onChange={e => setFormData({ ...formData, niche: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50 outline-none focus:border-blue-500" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Portrait Type</label>
                    <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50 outline-none focus:border-blue-500" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })}><option value="female">Female</option><option value="male">Male</option></select>
                  </div>
                </div>

                {/* Perspective Selection Bar */}
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Political Perspective</label>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{SPECTRUM_LABELS[formData.perspective]}</span>
                    </div>
                    <input 
                      type="range" 
                      min="-3" 
                      max="3" 
                      step="1" 
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900" 
                      value={formData.perspective} 
                      onChange={e => setFormData({ ...formData, perspective: parseInt(e.target.value) })} 
                    />
                    <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        <span>Far Left</span>
                        <span>Center</span>
                        <span>Far Right</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Broadcast Frequency</label>
                    <select className="w-full border-2 p-3 font-bold text-sm bg-gray-50 outline-none focus:border-blue-500" value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })}>{FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-10 pt-6 border-t">
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={handleSaveBot} disabled={isSaving} className="bg-gray-900 text-white px-10 py-3 rounded-sm font-black uppercase text-[10px] tracking-widest shadow-xl">{isSaving ? 'Saving...' : 'Commit'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalistsView;
