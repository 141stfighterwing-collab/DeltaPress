
import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

interface PageLink {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  children?: PageLink[];
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [navPages, setNavPages] = useState<PageLink[]>([]);
  const [settings, setSettings] = useState({
    title: 'Twenty Ten',
    slogan: 'Just another WordPress theme',
    logo_url: '',
    header_image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=940&h=200',
    header_fit: 'cover' as 'cover' | 'contain' | 'none' | 'scale-down',
    header_pos_x: 50,
    header_pos_y: 50
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildNavTree = (flat: any[]) => {
    // 1. De-duplicate hardcoded items (About Us, etc)
    const filtered = flat.filter(p => p.slug !== 'about-us' && p.slug !== 'contact' && p.slug !== 'meet-our-team');
    
    const map: Record<string, PageLink> = {};
    const roots: PageLink[] = [];

    filtered.forEach(p => { map[p.id] = { ...p, children: [] }; });
    filtered.forEach(p => {
      if (p.parent_id && map[p.parent_id]) {
        map[p.parent_id].children?.push(map[p.id]);
      } else {
        roots.push(map[p.id]);
      }
    });
    return roots;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (profile?.role === 'admin' || profile?.role === 'editor') setIsAdmin(true);
      }
      const { data: siteSettings } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (siteSettings) {
        setSettings({
          title: siteSettings.title || 'Twenty Ten',
          slogan: siteSettings.slogan || 'Just another WordPress theme',
          logo_url: siteSettings.logo_url || '',
          header_image: siteSettings.header_image || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=940&h=200',
          header_fit: siteSettings.header_fit || 'cover',
          header_pos_x: siteSettings.header_pos_x ?? 50,
          header_pos_y: siteSettings.header_pos_y ?? 50
        });
      }
      const { data: pages } = await supabase
        .from('posts')
        .select('id, title, slug, parent_id, menu_order')
        .eq('type', 'page')
        .eq('status', 'publish')
        .order('menu_order', { ascending: true });
      
      if (pages) setNavPages(buildNavTree(pages));
    };
    fetchData();
  }, [location.pathname]);

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    const base = "px-6 py-4 inline-block text-[13px] font-black uppercase tracking-widest transition-colors ";
    return isActive 
      ? base + "text-white bg-[#1d2327]" 
      : base + "text-gray-300 hover:text-white hover:bg-[#333]";
  };

  return (
    <div className="min-h-screen bg-[#e9eaee] font-sans text-gray-800">
      <div className="max-w-[940px] mx-auto bg-white shadow-xl min-h-screen border-x border-gray-200 relative">
        
        <header className="p-10 pt-16">
          <Link to="/" className="inline-block group">
            {settings.logo_url ? (
                <div className="mb-2"><img src={settings.logo_url} alt={settings.title} className="max-h-20 w-auto object-contain" /></div>
            ) : (
                <h1 className="text-4xl font-black text-gray-900 leading-none mb-2 font-serif">{settings.title}</h1>
            )}
          </Link>
          <p className="text-xs text-gray-500 italic uppercase tracking-widest font-bold">{settings.slogan}</p>
        </header>

        <nav className="bg-black border-y border-gray-800" ref={dropdownRef}>
          <div className="flex flex-wrap items-center">
            <Link to="/" className={getNavClass('/')}>Home</Link>
            
            <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'about' ? null : 'about')}
                  className={`px-6 py-4 inline-block text-[13px] font-black uppercase tracking-widest transition-colors text-gray-300 hover:text-white hover:bg-[#333] ${activeDropdown === 'about' ? 'bg-[#333] text-white' : ''}`}
                >
                  About Us ▾
                </button>
                {activeDropdown === 'about' && (
                  <div className="absolute left-0 top-full w-48 bg-[#1d2327] z-[100] shadow-2xl border border-gray-800">
                    <Link to="/meet-our-team" onClick={() => setActiveDropdown(null)} className="block px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white border-b border-white/5">Meet our team</Link>
                    <Link to="/contact" onClick={() => setActiveDropdown(null)} className="block px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white">Contact</Link>
                  </div>
                )}
            </div>

            <Link to="/news" className={getNavClass('/news')}>News</Link>
            
            {/* Dynamic Hierarchical Pages */}
            {navPages.map((page) => (
              <div key={page.id} className="relative">
                {page.children && page.children.length > 0 ? (
                  <>
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === page.id ? null : page.id)}
                      className={`px-6 py-4 inline-block text-[13px] font-black uppercase tracking-widest transition-colors text-gray-300 hover:text-white hover:bg-[#333] ${activeDropdown === page.id ? 'bg-[#333] text-white' : ''}`}
                    >
                      {page.title} ▾
                    </button>
                    {activeDropdown === page.id && (
                      <div className="absolute left-0 top-full w-48 bg-[#1d2327] z-[100] shadow-2xl border border-gray-800">
                        {page.children.map(child => (
                          <Link 
                            key={child.id} 
                            to={`/post/${child.slug}`} 
                            onClick={() => setActiveDropdown(null)}
                            className="block px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white border-b border-white/5 last:border-0"
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link to={`/post/${page.slug}`} className={getNavClass(`/post/${page.slug}`)}>{page.title}</Link>
                )}
              </div>
            ))}

            {isAdmin && <Link to="/admin" className="px-6 py-4 inline-block text-[13px] font-black uppercase tracking-widest text-yellow-500 hover:bg-[#333]">Admin</Link>}
          </div>
        </nav>

        <div className="p-6">
          <div className="aspect-[94/20] overflow-hidden bg-gray-100 rounded-sm">
            <img src={settings.header_image} alt="Site Header" className="w-full h-full" style={{ objectFit: settings.header_fit, objectPosition: `${settings.header_pos_x}% ${settings.header_pos_y}%` }} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row p-6 lg:p-10 gap-10">
          <main className="flex-1 min-w-0">{children}</main>
          <aside className="w-full md:w-[240px] shrink-0"><Sidebar /></aside>
        </div>

        <footer className="mt-20 p-10 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Nathan C &copy; {new Date().getFullYear()}</p>
            <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <Link to="/contact" className="hover:text-blue-600">Privacy</Link>
              <Link to="/contact" className="hover:text-blue-600">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
