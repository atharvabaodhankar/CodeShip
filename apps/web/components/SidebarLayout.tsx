'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, GitBranch, Rocket, Globe, Sliders, History, 
  Settings, LogOut, Bell, HelpCircle, Search 
} from 'lucide-react';

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

interface SidebarLayoutProps {
  user: UserSession | null;
  activeLink: 'dashboard' | 'projects' | 'deployments' | 'domains' | 'config' | 'activity' | 'settings';
  breadcrumbs?: React.ReactNode;
  searchBar?: React.ReactNode;
  children: React.ReactNode;
}

export default function SidebarLayout({
  user,
  activeLink,
  breadcrumbs,
  searchBar,
  children,
}: SidebarLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex bg-[#0C0C0E] min-h-screen text-white w-full">
      
      {/* Persistent Left Sidebar */}
      <nav className="fixed left-0 top-0 h-screen w-sidebar-width border-r border-layout bg-[#070708] flex flex-col py-stack-md z-40 hidden md:flex">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => router.push('/dashboard')}
          className="px-gutter mb-stack-lg flex items-center gap-3 cursor-pointer select-none"
        >
          <img src="/logo.png" alt="CodeShip Logo" className="w-8 h-8 rounded object-cover" />
          <div>
            <div className="font-display text-primary uppercase tracking-tighter text-xl font-bold">CodeShip</div>
            <div className="font-metadata text-neutral-500 text-xs font-mono">v2.4.0</div>
          </div>
        </div>
        
        {/* Sidebar Navigation Links */}
        <div className="flex-1 overflow-y-auto px-stack-sm space-y-1">
          <a 
            onClick={() => router.push('/dashboard')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'dashboard'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <LayoutDashboard size={18} className={activeLink === 'dashboard' ? 'text-primary' : 'text-neutral-400'} />
            Dashboard
          </a>
          
          <a 
            onClick={() => router.push('/projects')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'projects'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <GitBranch size={18} className={activeLink === 'projects' ? 'text-primary' : 'text-neutral-400'} />
            Projects
          </a>
          
          <a 
            onClick={() => router.push('/deployments')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'deployments'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Rocket size={18} className={activeLink === 'deployments' ? 'text-primary' : 'text-neutral-400'} />
            Deployments
          </a>
          
          <a 
            onClick={() => router.push('/domains')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'domains'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Globe size={18} className={activeLink === 'domains' ? 'text-primary' : 'text-neutral-400'} />
            Domains
          </a>
          
          <a 
            onClick={() => router.push('/config')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'config'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sliders size={18} className={activeLink === 'config' ? 'text-primary' : 'text-neutral-400'} />
            Config
          </a>
          
          <a 
            onClick={() => router.push('/activity')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'activity'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <History size={18} className={activeLink === 'activity' ? 'text-primary' : 'text-neutral-400'} />
            Activity
          </a>
          
          <a 
            onClick={() => router.push('/settings')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
              activeLink === 'settings'
                ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Settings size={18} className={activeLink === 'settings' ? 'text-primary' : 'text-neutral-400'} />
            Settings
          </a>
        </div>
        
        {/* User Session Profile & Log Out */}
        <div className="px-stack-sm mt-auto pt-stack-md border-t border-layout mx-stack-sm flex flex-col gap-2 bg-[#070708]">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded text-neutral-300 select-none">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-8 h-8 rounded border border-neutral-800 object-cover"
              />
              <span className="text-sm font-medium truncate max-w-[130px]" title={user.username}>
                {user.username}
              </span>
            </div>
          )}
          <a 
            href="/api/auth/logout"
            className="flex items-center gap-3 px-3 py-2 rounded text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors duration-200 cursor-pointer active:scale-95 text-sm font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </a>
        </div>
      </nav>

      {/* Main Content Viewport Wrapper */}
      <div className="md:ml-sidebar-width min-h-screen flex flex-col w-full flex-1 transition-all duration-150">
        
        {/* Top Header Bar */}
        <header className="h-16 px-page-padding flex justify-between items-center border-b border-layout bg-[#070708]/85 backdrop-blur-sm z-30 sticky top-0 w-full">
          {/* Breadcrumbs or Title */}
          <div className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-4">
            {breadcrumbs ? (
              breadcrumbs
            ) : (
              <>
                <span className="md:hidden flex items-center gap-2">
                  <img src="/logo.png" alt="CodeShip Logo" className="w-6 h-6 rounded object-cover" />
                  CodeShip
                </span>
                <span className="hidden md:inline font-mono text-xs tracking-widest text-neutral-500 uppercase">CONTROL PLANE</span>
              </>
            )}
          </div>
          
          {/* Top Bar Right Section (Search & Utilities) */}
          <div className="flex items-center gap-4">
            {searchBar && (
              <div className="relative hidden sm:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                {searchBar}
              </div>
            )}
            <button className="text-neutral-500 hover:text-white transition-colors" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="text-neutral-500 hover:text-white transition-colors" title="Help">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Canvas */}
        <main className="flex-grow overflow-y-auto p-6 bg-[#0C0C0E] w-full flex flex-col gap-6">
          {children}
        </main>
      </div>

    </div>
  );
}
