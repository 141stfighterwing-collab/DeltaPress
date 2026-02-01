
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [navPages, setNavPages] = useState<{title: string, slug: string}[]>([]);
  const [settings, setSettings] = useState({
    title: 'Twenty Ten',
    slogan: 'Just another WordPress theme',
    header_image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=940&h=200',
    header_fit: 'cover' as 'cover' | 'contain' | 'none' | 'scale-down',
    header_pos_x: 50,
    header_pos_y: 50
  });

  useEffect(() => {
    const fetchData = async () => {
      // Auth check
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
        if (profile?.role === 'admin' || profile?.role === 'editor') setIsAdmin(true);
      }

      // Site Settings
      const { data: siteSettings } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (siteSettings) {
        setSettings({
          title: siteSettings.title || 'Twenty Ten',
          slogan: siteSettings.slogan || 'Just another WordPress theme',
          header_image: siteSettings.header_image || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=940&h=200',
          header_fit: siteSettings.header_fit || 'cover',
          header_pos_x: siteSettings.header_pos_x ?? 50,
          header_pos_y: siteSettings.header_pos_y ?? 50
        });
      }

      // Fetch dynamic pages for navbar
      const { data: pages } = await supabase
        .from('posts')
        .select('title, slug')
        .eq('type', 'page')
        .eq('status', 'publish')
        .order('created_at', { ascending: true });
      
      if (pages) setNavPages(pages);
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
        
        {/* User Login Icon - Top Right */}
        <div className="absolute top-6 right-10 z-10">
          <Link 
            to={isLoggedIn ? "/admin" : "/login"} 
            className="group flex flex-col items-center gap-1"
            title={isLoggedIn ? "Access Dashboard" : "Sign In"}
          >
            <div className="w-10 h-10 rounded-full bg-white/50 border border-gray-200 p-1 group-hover:bg-blue-50 transition-all overflow-hidden">
               <img 
                 src="https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTAxL3JtNjA5LXNvbGlkaWNvbi13LTAwMi1wLnBuZw.png" 
                 alt="User Profile" 
                 className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity"
               />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-blue-600">
              {isLoggedIn ? "Dashboard" : "Login"}
            </span>
          </Link>
        </div>

        <header className="p-10 pt-16">
          <Link to="/" className="inline-block group">
            <h1 className="text-4xl font-black text-gray-900 leading-none mb-2 font-serif group-hover:text-blue-700 transition-colors">
              {settings.title}
            </h1>
          </Link>
          <p className="text-xs text-gray-500 italic uppercase tracking-widest font-bold">
            {settings.slogan}
          </p>
        </header>

        <nav className="bg-black border-y border-gray-800">
          <div className="flex flex-wrap">
            <Link to="/" className={getNavClass('/')}>Home</Link>
            <Link to="/news" className={getNavClass('/news')}>News</Link>
            <Link to="/contact" className={getNavClass('/contact')}>Contact</Link>
            
            {navPages.map((page, idx) => (
              <Link 
                key={idx} 
                to={`/post/${page.slug}`} 
                className={getNavClass(`/post/${page.slug}`)}
              >
                {page.title}
              </Link>
            ))}

            {isAdmin && (
              <Link to="/admin" className="px-6 py-4 inline-block text-[13px] font-black uppercase tracking-widest text-yellow-500 hover:bg-[#333]">
                Admin
              </Link>
            )}
          </div>
        </nav>

        <div className="p-6">
          <div className="aspect-[94/20] overflow-hidden bg-gray-100 rounded-sm">
            <img 
              src={settings.header_image} 
              alt="Site Header" 
              className="w-full h-full"
              style={{ 
                objectFit: settings.header_fit, 
                objectPosition: `${settings.header_pos_x}% ${settings.header_pos_y}%` 
              }}
              onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/940x200?text=Header+Image'}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row p-6 lg:p-10 gap-10">
          <main className="flex-1 min-w-0">
            {children}
          </main>
          <aside className="w-full md:w-[240px] shrink-0">
            <Sidebar />
          </aside>
        </div>

        <footer className="mt-20 p-10 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Nathan C &copy; {new Date().getFullYear()}
            </p>
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
