
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
    header_image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1280&h=240',
    header_fit: 'cover' as 'cover' | 'contain' | 'none' | 'scale-down',
    header_pos_x: 50,
    header_pos_y: 50,
    theme: 'light'
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
    const map: Record<string, PageLink> = {};
    const roots: PageLink[] = [];

    flat.forEach(p => { map[p.id] = { ...p, children: [] }; });
    flat.forEach(p => {
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
          header_image: siteSettings.header_image || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1280&h=240',
          header_fit: siteSettings.header_fit || 'cover',
          header_pos_x: siteSettings.header_pos_x ?? 50,
          header_pos_y: siteSettings.header_pos_y ?? 50,
          theme: siteSettings.theme || 'light'
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

  useEffect(() => {
    document.body.className = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [settings.theme]);

  const getNavClass = (path: string) => {
    const isActive = location.pathname === path;
    const base = "px-8 py-5 inline-block text-[14px] font-black uppercase tracking-widest transition-all ";
    if (settings.theme === 'dark') {
      return isActive 
        ? base + "text-white bg-[#333]" 
        : base + "text-gray-400 hover:text-white hover:bg-[#222]";
    }
    return isActive 
      ? base + "text-white bg-[#1d2327]" 
      : base + "text-gray-300 hover:text-white hover:bg-[#333]";
  };

  const containerClasses = settings.theme === 'dark'
    ? "bg-[#141414] border-gray-800"
    : "bg-white border-gray-200";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500`}>
      <div className={`max-w-7xl mx-auto shadow-2xl min-h-screen border-x relative transition-colors duration-500 ${containerClasses}`}>
        
        <div className="absolute top-8 right-10 z-20">
          <Link to={isLoggedIn ? "/admin" : "/login"} className="group flex flex-col items-center gap-1.5">
            <div className={`w-12 h-12 rounded-full border-2 p-1.5 shadow-sm transition-all flex items-center justify-center overflow-hidden ${settings.theme === 'dark' ? 'bg-[#222] border-gray-700 group-hover:border-blue-500' : 'bg-white border-gray-100 group-hover:border-blue-400'}`}>
               <svg className={`w-full h-full transition-colors ${settings.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} group-hover:text-blue-500`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
               </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-blue-500 transition-colors">
              {isLoggedIn ? "Dashboard" : "Login"}
            </span>
          </Link>
        </div>

        <header className="p-12 pt-20">
          <Link to="/" className="inline-block group">
            {settings.logo_url ? (
                <div className="mb-3"><img src={settings.logo_url} alt={settings.title} className="max-h-24 w-auto object-contain" /></div>
            ) : (
                <h1 className="text-5xl font-black leading-none mb-3 font-serif tracking-tighter text-gray-900 dark:text-white">{settings.title}</h1>
            )}
          </Link>
          <p className="text-sm text-gray-500 italic uppercase tracking-[0.25em] font-black">{settings.slogan}</p>
        </header>

        <nav className={`border-y transition-colors ${settings.theme === 'dark' ? 'bg-black border-gray-800' : 'bg-black border-gray-800'}`} ref={dropdownRef}>
          <div className="flex flex-wrap items-center">
            <Link to="/" className={getNavClass('/')}>Home</Link>
            
            {/* Restored About Us Dropdown */}
            <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'about_core' ? null : 'about_core')}
                  className={`px-8 py-5 inline-block text-[14px] font-black uppercase tracking-widest transition-all ${settings.theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-[#222]' : 'text-gray-300 hover:text-white hover:bg-[#333]'} ${activeDropdown === 'about_core' ? (settings.theme === 'dark' ? 'bg-[#333] text-white' : 'bg-[#333] text-white') : ''}`}
                >
                  About Us <span className="ml-1 text-[10px] opacity-40">▾</span>
                </button>
                {activeDropdown === 'about_core' && (
                  <div className={`absolute left-0 top-full w-56 z-[100] shadow-2xl border transition-all animate-in fade-in slide-in-from-top-1 ${settings.theme === 'dark' ? 'bg-[#111] border-gray-800' : 'bg-[#1d2327] border-gray-800'}`}>
                    <Link to="/meet-our-team" onClick={() => setActiveDropdown(null)} className="block px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white border-b border-white/5">Meet our team</Link>
                    <Link to="/contact" onClick={() => setActiveDropdown(null)} className="block px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white">Contact</Link>
                  </div>
                )}
            </div>

            <Link to="/news" className={getNavClass('/news')}>Newsroom</Link>
            
            {navPages.map((page) => (
              <div key={page.id} className="relative flex items-center">
                {page.children && page.children.length > 0 ? (
                  <>
                    <Link to={`/post/${page.slug}`} className={getNavClass(`/post/${page.slug}`)}>
                      {page.title}
                    </Link>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveDropdown(activeDropdown === page.id ? null : page.id);
                      }}
                      className={`h-full px-2 py-5 transition-all flex items-center justify-center border-l border-white/10 ${settings.theme === 'dark' ? 'hover:bg-[#333] text-white' : 'hover:bg-[#333] text-gray-300'}`}
                    >
                      <span className="text-[10px]">▾</span>
                    </button>
                    {activeDropdown === page.id && (
                      <div className={`absolute left-0 top-full w-56 z-[100] shadow-2xl border transition-all animate-in fade-in slide-in-from-top-1 ${settings.theme === 'dark' ? 'bg-[#111] border-gray-800' : 'bg-[#1d2327] border-gray-800'}`}>
                        {page.children.map(child => (
                          <Link 
                            key={child.id} 
                            to={`/post/${child.slug}`} 
                            onClick={() => setActiveDropdown(null)}
                            className="block px-8 py-4 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-blue-600 hover:text-white border-b border-white/5 last:border-0"
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

            {isAdmin && <Link to="/admin" className="px-8 py-5 inline-block text-[14px] font-black uppercase tracking-widest text-yellow-500 hover:bg-[#333]">Admin</Link>}
          </div>
        </nav>

        <div className="p-8">
          <div className={`aspect-[128/24] overflow-hidden rounded-sm transition-colors shadow-inner ${settings.theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
            <img src={settings.header_image} alt="Site Header" className="w-full h-full" style={{ objectFit: settings.header_fit, objectPosition: `${settings.header_pos_x}% ${settings.header_pos_y}%` }} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row p-8 lg:p-14 gap-16 lg:gap-24">
          <main className="flex-1 min-w-0">
            <div className={`w-full ${settings.theme === 'dark' ? 'prose-invert' : ''}`}>
              {children}
            </div>
          </main>
          <aside className="w-full md:w-[300px] shrink-0">
            <Sidebar />
          </aside>
        </div>

        <footer className={`mt-24 p-12 border-t transition-colors ${settings.theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500">Nathan C &copy; {new Date().getFullYear()}</p>
            <div className="flex gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              <Link to="/contact" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link to="/contact" className="hover:text-blue-600 transition-colors">Editorial Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
