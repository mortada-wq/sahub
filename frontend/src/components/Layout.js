import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FileText, Megaphone, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/knowledge', label: 'Knowledge', icon: FileText },
    { path: '/updates', label: 'Updates', icon: Megaphone }
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 z-50 px-4 py-3 flex items-center justify-between">
        <h1 className="font-outfit text-2xl font-medium text-zinc-900">sahub</h1>
        <button
          data-testid="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-zinc-100"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Desktop and Mobile */}
      <aside className={`
        w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col fixed h-full z-40 overflow-y-auto
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-zinc-200">
          <h1 className="font-outfit text-3xl font-medium text-zinc-900">sahub</h1>
          <p className="font-plex text-xs text-zinc-500 mt-1">Team Management</p>
        </div>

        <nav data-testid="sidebar-nav" className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-plex text-sm font-medium transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-zinc-200/50 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="bg-white rounded-xl p-4 border border-zinc-200 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-plex font-medium text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-plex text-sm font-medium text-zinc-900 truncate">{user.name}</p>
                <p className="font-plex text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <span
              data-testid="user-role-badge"
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200"
            >
              {user.role}
            </span>
          </div>
          <Button
            data-testid="logout-button"
            onClick={onLogout}
            variant="outline"
            className="w-full rounded-full border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
