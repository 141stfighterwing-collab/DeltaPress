
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AdminSidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) setRole(profile.role);
      }
      setLoading(false);
    };
    fetchRole();
  }, []);

  // Strict Permission Schema
  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊', roles: ['admin', 'editor', 'reviewer', 'user'] },
    { label: 'Analytics', path: '/admin/analytics', icon: '📈', roles: ['admin', 'editor'] },
    { type: 'separator' },
    { label: 'All Posts', path: '/admin/posts', icon: '✍️', roles: ['admin', 'editor', 'reviewer'] },
    { label: 'Add New', path: '/admin/new-post', icon: '➕', roles: ['admin', 'editor'] },
    { label: 'Categories', path: '/admin/categories', icon: '🏷️', roles: ['admin', 'editor'] },
    { type: 'separator' },
    { label: 'RSS Feeds', path: '/admin/rss', icon: '📡', roles: ['admin'] },
    { label: 'Journalists', path: '/admin/journalists', icon: '🤖', roles: ['admin'] },
    { label: 'Services', path: '/admin/services', icon: '🛠️', roles: ['admin'] },
    { label: 'Partners', path: '/admin/partners', icon: '👥', roles: ['admin'] },
    { label: 'Members', path: '/admin/members', icon: '👤', roles: ['admin'] },
    { label: 'Projects', path: '/admin/projects', icon: '📋', roles: ['admin'] },
    { label: 'Media', path: '/admin/media', icon: '📷', roles: ['admin', 'editor'] },
    { label: 'Pages', path: '/admin/pages', icon: '📄', roles: ['admin', 'editor'] },
    { label: 'Comments', path: '/admin/comments', icon: '💬', roles: ['admin', 'editor', 'reviewer', 'user'] },
    { label: 'Contact', path: '/admin/contact', icon: '✉️', roles: ['admin', 'editor', 'reviewer', 'user'] },
    { type: 'separator' },
    { label: 'Appearance', path: '/admin/appearance', icon: '🖌️', roles: ['admin', 'editor', 'reviewer', 'user'] },
    { label: 'Plugins', path: '/admin/plugins', icon: '🔌', roles: ['admin'] },
    { label: 'Users', path: '/admin/users', icon: '👤', roles: ['admin'] },
    { label: 'Tools', path: '/admin/tools', icon: '🔧', roles: ['admin'] },
    { label: 'Diagnostics', path: '/admin/diagnostics', icon: '🩺', roles: ['admin'] },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️', roles: ['admin'] },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Filter items strictly based on the user's role
  const filteredItems = menuItems.filter(item => {
    if (item.type === 'separator') return true;
    return (item as any).roles.includes(role);
  }).filter((item, index, self) => {
    // Prevent double separators or separators as first item
    if (item.type === 'separator' && (index === 0 || self[index-1]?.type === 'separator')) return false;
    return true;
  });

  return (
    <div className={`${collapsed ? 'w-12' : 'w-52'} bg-[#23282d] text-[#eee] flex flex-col h-screen transition-all duration-200 sticky top-0 overflow-y-auto overflow-x-hidden select-none z-50 shrink-0`}>
      <div className="p-4 bg-[#1d2327] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0073aa] rounded flex items-center justify-center text-white font-bold shrink-0">W</div>
        {!collapsed && <span className="font-semibold text-sm truncate text-white uppercase tracking-tighter">Admin Panel</span>}
      </div>

      <nav className="flex-1 py-1">
        {loading ? (
          <div className="px-4 py-10 opacity-20 animate-pulse space-y-4">
            <div className="h-4 bg-gray-500 rounded w-full"></div>
            <div className="h-4 bg-gray-500 rounded w-full"></div>
            <div className="h-4 bg-gray-500 rounded w-full"></div>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            if (item.type === 'separator') {
              return <div key={idx} className="h-4 border-b border-[#3c434a] my-2 mx-4 opacity-10" />;
            }

            const className = `flex items-center gap-3 px-3 py-2 hover:bg-[#191e23] hover:text-[#72aee6] transition-colors text-[13px] ${isActive(item.path!) ? 'bg-[#0073aa] text-white font-bold' : 'text-[#a7aaad]'}`;

            return (
              <Link key={idx} to={item.path!} className={className}>
                <span className="text-lg w-6 flex justify-center opacity-80">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })
        )}
      </nav>

      <div className="mt-auto border-t border-[#3c434a] bg-[#1d2327]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-900 text-red-200 text-[11px] uppercase font-bold transition-colors"
        >
          <span className="text-lg w-6 flex justify-center">🚪</span>
          {!collapsed && <span className="truncate">Log out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#191e23] text-[#a7aaad] text-[11px] uppercase font-bold transition-colors border-t border-[#3c434a]"
        >
          <span className="text-lg w-6 flex justify-center">{collapsed ? '▶' : '◀'}</span>
          {!collapsed && <span className="truncate">Collapse</span>}
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
