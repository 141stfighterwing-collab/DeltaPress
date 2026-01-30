
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminSidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: '📊' },
    { label: 'Analytics', path: '/admin/analytics', icon: '📈' },
    { type: 'separator' },
    { label: 'All Posts', path: '/admin/posts', icon: '✍️' },
    { label: 'Add New', path: '/admin/new-post', icon: '➕' },
    { label: 'Categories', path: '/admin/categories', icon: '🏷️' },
    { type: 'separator' },
    { label: 'RSS Feeds', path: '/admin/rss', icon: '📡' },
    { label: 'Journalists', path: '/admin/journalists', icon: '🤖' },
    { label: 'Services', path: '/admin/services', icon: '🛠️' },
    { label: 'Partners', path: '/admin/partners', icon: '👥' },
    { label: 'Members', path: '/admin/members', icon: '👤' },
    { label: 'Projects', path: '/admin/projects', icon: '📋' },
    { label: 'Media', path: '/admin/media', icon: '📷' },
    { label: 'Pages', path: '/admin/pages', icon: '📄' },
    { label: 'Comments', path: '/admin/comments', icon: '💬' },
    { label: 'Contact', path: '/admin/contact', icon: '✉️' },
    { type: 'separator' },
    { label: 'Appearance', path: '/admin/appearance', icon: '🖌️' },
    { label: 'Plugins', path: '/admin/plugins', icon: '🔌' },
    { label: 'Users', path: '/admin/users', icon: '👤' },
    { label: 'Tools', path: '/admin/tools', icon: '🔧' },
    { label: 'Diagnostics', path: '/admin/diagnostics', icon: '🩺' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`${collapsed ? 'w-12' : 'w-52'} bg-[#23282d] text-[#eee] flex flex-col h-screen transition-all duration-200 sticky top-0 overflow-y-auto overflow-x-hidden select-none z-50 shrink-0`}>
      <div className="p-4 bg-[#1d2327] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0073aa] rounded flex items-center justify-center text-white font-bold shrink-0">W</div>
        {!collapsed && <span className="font-semibold text-sm truncate text-white uppercase tracking-tighter">Admin Panel</span>}
      </div>

      <nav className="flex-1 py-1">
        {menuItems.map((item, idx) => {
          if (item.type === 'separator') {
            return <div key={idx} className="h-4 border-b border-[#3c434a] my-2 mx-4 opacity-10" />;
          }

          const isLinkExternal = (item as any).external || item.path.startsWith('http');
          const content = (
            <>
              <span className="text-lg w-6 flex justify-center opacity-80">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isLinkExternal && <span className="ml-auto text-[10px] opacity-30">↗</span>}
            </>
          );

          const className = `flex items-center gap-3 px-3 py-2 hover:bg-[#191e23] hover:text-[#72aee6] transition-colors text-[13px] ${!isLinkExternal && isActive(item.path) ? 'bg-[#0073aa] text-white' : 'text-[#a7aaad]'}`;

          if (isLinkExternal) {
            return (
              <a
                key={idx}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={idx}
              to={item.path}
              className={className}
            >
              {content}
            </Link>
          );
        })}
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
          {!collapsed && <span className="truncate">Collapse Menu</span>}
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
