'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, GitBranch, Rocket, Globe, Sliders, History, 
  Settings, LogOut, Bell, HelpCircle, Search, Shield, Menu, X
} from 'lucide-react';

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

interface SidebarLayoutProps {
  user: UserSession | null;
  activeLink: 'dashboard' | 'projects' | 'deployments' | 'domains' | 'config' | 'activity' | 'settings' | 'admin';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex bg-[#0C0C0E] min-h-screen text-white w-full">
      
      {/* Persistent Left Sidebar */}
      <nav className="fixed left-0 top-0 h-screen w-sidebar-width border-r border-layout bg-[#070708] flex flex-col py-stack-md z-40 hidden md:flex">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => router.push('/dashboard')}
          className="px-gutter mb-stack-lg flex items-center gap-3 cursor-pointer select-none"
        >
          <img src="/logo.png" alt="Rovel Logo" className="w-8 h-8 rounded object-cover" />
          <div>
            <div className="font-display text-primary uppercase tracking-tighter text-xl font-bold">Rovel</div>
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

          {user && user.username.toLowerCase() === 'atharvabaodhankar' && (
            <a 
              onClick={() => router.push('/admin')}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors duration-200 cursor-pointer active:scale-95 text-sm ${
                activeLink === 'admin'
                  ? 'bg-surface-container-high text-primary font-bold border-r-2 border-primary'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Shield size={18} className={activeLink === 'admin' ? 'text-primary' : 'text-neutral-400'} />
              Admin Portal
            </a>
          )}
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
          <div className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-neutral-400 hover:text-white transition-colors p-1.5 rounded bg-neutral-950 border border-neutral-900 focus:outline-none cursor-pointer"
              title="Open Menu"
            >
              <Menu size={16} />
            </button>
            {breadcrumbs ? (
              breadcrumbs
            ) : (
              <>
                <span className="md:hidden flex items-center gap-2 text-sm uppercase tracking-wider font-display font-extrabold select-none">
                  <img src="/logo.png" alt="Rovel Logo" className="w-5 h-5 rounded object-cover" />
                  Rovel
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

      {/* Mobile Navigation Drawer */}
      <div 
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Drawer Slide-out Panel */}
        <nav 
          className={`absolute left-0 top-0 h-full w-[260px] bg-[#070708] border-r border-[#121214] flex flex-col py-6 transition-transform duration-300 ease-out transform ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand Logo & Close Button */}
          <div className="px-6 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Rovel Logo" className="w-6 h-6 rounded object-cover" />
              <span className="font-display text-primary uppercase tracking-tighter text-lg font-bold select-none">Rovel</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1">
            <a 
              onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'dashboard'
                  ? 'bg-neutral-900 text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </a>
            
            <a 
              onClick={() => { router.push('/projects'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'projects'
                  ? 'bg-neutral-900 text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <GitBranch size={16} />
              Projects
            </a>
            
            <a 
              onClick={() => { router.push('/deployments'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'deployments'
                  ? 'bg-neutral-900 text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Rocket size={16} />
              Deployments
            </a>
            
            <a 
              onClick={() => { router.push('/domains'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'domains'
                  ? 'bg-neutral-900 text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Globe size={16} />
              Domains
            </a>
            
            <a 
              onClick={() => { router.push('/config'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'config'
                  ? 'bg-neutral-900 text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Sliders size={16} />
              Config
            </a>
            
            <a 
              onClick={() => { router.push('/activity'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'activity'
                  ? 'bg-[#121214] text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <History size={16} />
              Activity
            </a>
            
            <a 
              onClick={() => { router.push('/settings'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                activeLink === 'settings'
                  ? 'bg-[#121214] text-white font-bold border-r-2 border-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Settings size={16} />
              Settings
            </a>

            {user && user.username.toLowerCase() === 'atharvabaodhankar' && (
              <a 
                onClick={() => { router.push('/admin'); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 cursor-pointer text-sm ${
                  activeLink === 'admin'
                    ? 'bg-[#121214] text-white font-bold border-r-2 border-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Shield size={16} />
                Admin Portal
              </a>
            )}
          </div>
          
          {/* Profile & Log Out */}
          <div className="px-4 mt-auto pt-4 border-t border-[#121214] flex flex-col gap-2">
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
              className="flex items-center gap-3 px-3 py-2.5 rounded text-neutral-500 hover:text-white hover:bg-neutral-900 transition-all duration-200 cursor-pointer text-sm font-medium"
            >
              <LogOut size={16} />
              Sign Out
            </a>
          </div>
        </nav>
      </div>

    </div>
  );
}
