
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import SEO from '../components/SEO';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  category: string;
  avatar_url?: string;
  gender: 'male' | 'female';
}

const MeetTeam: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { data, error } = await supabase
          .from('journalists')
          .select('id, name, title, category, avatar_url, gender')
          .eq('status', 'active');
        if (!error && data) setMembers(data);
      } catch (err) {} finally { setLoading(false); }
    };
    fetchTeam();
  }, []);

  return (
    <Layout>
      <SEO
        title="Meet Our Team"
        description="The brilliant minds behind our global perspectives—a blend of human leadership and next-generation autonomous editorial intelligence."
        keywords="Team, Authors, Socialist AI, Journalists"
      />
      <header className="mb-16 text-center lg:text-left">
        <h1 className="text-5xl font-black text-gray-900 font-serif mb-4 leading-none tracking-tighter">Meet Our Team</h1>
        <div className="w-20 h-1 bg-gray-900 mb-6 mx-auto lg:mx-0"></div>
        <p className="text-gray-500 font-serif italic text-lg leading-relaxed max-w-2xl">
          The brilliant minds behind our global perspectives—a blend of human leadership and next-generation autonomous editorial intelligence.
        </p>
      </header>

      {/* Director Spotlight */}
      <section className="mb-24 bg-gray-900 text-white p-10 lg:p-16 rounded-sm shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-[120px] leading-none font-serif italic">N</span>
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-full overflow-hidden border-8 border-white/10 shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700">
             <img src="/images/nate.jpg" alt="Socialist Nate" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-center lg:text-left">
             <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">The Founder</span>
             <h2 className="text-4xl lg:text-6xl font-black font-serif mb-4 leading-none">Socialist Nate</h2>
             <p className="text-lg font-bold text-gray-300 mb-8 uppercase tracking-widest font-sans">Owner & Director</p>
             <p className="text-gray-400 font-serif leading-relaxed italic text-lg lg:text-xl border-l-4 border-blue-600 pl-6 lg:max-w-xl">
               "Our mission is to democratize information by combining radical human editorial vision with the tireless analytical power of neural networks."
             </p>
          </div>
        </div>
      </section>

      {/* AI Staff Grid */}
      <section>
        <div className="mb-12 border-b border-gray-100 pb-4 flex items-center gap-4">
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Editorial Staff</h3>
           <div className="flex-1 h-px bg-gray-100"></div>
        </div>
        
        {loading ? (
          <div className="py-20 text-center text-gray-400 font-serif italic">Scanning personnel records...</div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-serif italic bg-gray-50 rounded">
            Our newsroom is currently being initialized. Please check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {members.map(member => (
              <div key={member.id} className="group">
                <div className="aspect-square rounded-sm overflow-hidden mb-6 shadow-md border border-gray-100 relative bg-gray-50">
                   <img 
                    src={member.avatar_url || (member.gender === 'male' ? '/images/male-2.jpg' : '/images/female-2.jpg')}
                    alt={member.name} 
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" 
                   />
                   <div className="absolute inset-0 border-8 border-white/0 group-hover:border-white/20 transition-all pointer-events-none"></div>
                </div>
                <h4 className="text-2xl font-black text-gray-900 font-serif mb-1 group-hover:text-blue-700 transition-colors leading-tight">{member.name}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3">{member.title || `${member.category} Correspondent`}</p>
                <div className="w-8 h-0.5 bg-gray-200 group-hover:w-16 transition-all duration-500"></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-24 pt-12 border-t border-gray-50 text-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">
          Neural-Optimized Staffing • Version 2.0 (Updated {new Date().toLocaleDateString()})
        </p>
      </footer>
    </Layout>
  );
};

export default MeetTeam;
