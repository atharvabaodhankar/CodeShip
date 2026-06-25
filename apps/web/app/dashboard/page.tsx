'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, GitBranch, Rocket, Globe, Sliders, History, 
  Settings, User, Bell, HelpCircle, Search, Plus, Check, 
  RefreshCw, Terminal, LogOut, Loader2, X, Cpu, HardDrive, AlertTriangle
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  githubRepo: string;
  framework: string;
  status: string;
  assignedPort: number | null;
  createdAt: string;
  deployments: {
    id: string;
    status: string;
    commitHash: string | null;
  }[];
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [framework, setFramework] = useState('react-vite');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Session and Projects
  useEffect(() => {
    async function initDashboard() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.projects || []);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [router]);

  // Poll projects status if any project is BUILDING or PENDING
  useEffect(() => {
    const hasActiveBuilds = projects.some(
      (p) => p.status === 'BUILDING' || p.status === 'PENDING'
    );

    if (!hasActiveBuilds) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error('Failed to poll projects:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !githubRepo.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!githubRepo.includes('/')) {
      setError('GitHub Repository must be in the format "owner/repo" (e.g. facebook/react).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, githubRepo, framework }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await res.json();
      setProjects([data.project, ...projects]);
      setIsModalOpen(false);
      
      // Reset form
      setName('');
      setGithubRepo('');
      setFramework('react-vite');
      
      // Redirect to the new project details page
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.githubRepo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            <span className="font-metadata text-primary text-xs">Ready</span>
          </div>
        );
      case 'BUILDING':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit animate-pulse">
            <RefreshCw size={12} className="text-primary animate-spin" />
            <span className="font-metadata text-primary text-xs">Building</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block animate-pulse"></span>
            <span className="font-metadata text-neutral-400 text-xs">Queued</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit bg-red-950/20 border-red-900/30">
            <AlertTriangle size={12} className="text-red-500" />
            <span className="font-metadata text-red-500 text-xs">Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 border border-layout rounded px-2 py-0.5 w-fit">
            <span className="font-metadata text-neutral-400 text-xs">{status}</span>
          </div>
        );
    }
  };

  const getFrameworkLabel = (fw: string) => {
    switch (fw) {
      case 'react':
      case 'react-vite':
        return 'React (Vite)';
      case 'static':
        return 'Static (Vanilla)';
      case 'nextjs': return 'Next.js';
      case 'express': return 'Express.js';
      default: return fw;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 6000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING CODESHIP...</p>
      </div>
    );
  }

  // Dynamic Metrics Calculations
  const metrics = {
    projects: projects.length,
    deployments: projects.reduce((acc, p) => acc + p.deployments.length, 0),
    containers: projects.filter((p) => p.status === 'READY').length,
    domains: projects.filter((p) => p.status === 'READY').length,
  };

  // Generate dynamic activity items based on latest deployments
  const activityItems = projects
    .filter((p) => p.deployments.length > 0)
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      status: p.deployments[0].status,
      commitHash: p.deployments[0].commitHash || 'N/A',
      createdAt: p.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="font-body-md text-body-md antialiased overflow-hidden selection:bg-surface-variant flex bg-black min-h-screen">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-screen w-sidebar-width border-r border-layout bg-background dark:bg-background text-primary dark:text-primary flex flex-col py-stack-md z-40 hidden md:flex">
        {/* Brand */}
        <div className="px-gutter mb-stack-lg flex items-center gap-3">
          <img src="/logo.png" alt="CodeShip Logo" className="w-8 h-8 rounded object-cover" />
          <div>
            <div className="font-display text-display text-primary uppercase tracking-tighter text-xl font-bold">CodeShip</div>
            <div className="font-metadata text-metadata text-on-surface-variant text-xs text-neutral-500">v2.4.0</div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex-1 overflow-y-auto px-stack-sm space-y-1">
          <a className="flex items-center gap-3 px-3 py-2 rounded bg-surface-container-high text-primary font-bold border-r-2 border-primary transition-colors duration-200 cursor-pointer active:scale-95" href="#">
            <LayoutDashboard size={18} className="text-primary" />
            Dashboard
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <GitBranch size={18} />
            Projects
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <Rocket size={18} />
            Deployments
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <Globe size={18} />
            Domains
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <Sliders size={18} />
            Config
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <History size={18} />
            Activity
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95 text-neutral-400" href="#">
            <Settings size={18} />
            Settings
          </a>
        </div>
        
        {/* Profile / Logout */}
        <div className="px-stack-sm mt-auto pt-stack-md border-t border-layout mx-stack-sm flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded text-neutral-300">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-8 h-8 rounded border border-neutral-800"
              />
              <span className="text-sm font-medium hidden sm:inline truncate max-w-[120px]">
                {user.username}
              </span>
            </div>
          )}
          <a 
            href="/api/auth/logout"
            className="flex items-center gap-3 px-3 py-2 rounded text-neutral-500 hover:text-white hover:bg-surface-container transition-colors duration-200 cursor-pointer active:scale-95"
          >
            <LogOut size={18} />
            Sign Out
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="md:ml-sidebar-width min-h-screen flex flex-col w-full max-w-max-width mx-auto flex-1">
        {/* TopAppBar */}
        <header className="h-16 px-page-padding flex justify-between items-center border-b border-layout bg-background dark:bg-background z-30 sticky top-0 w-full transition-all duration-150">
          <div className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-4">
            <span className="md:hidden flex items-center gap-2">
              <img src="/logo.png" alt="CodeShip Logo" className="w-6 h-6 rounded object-cover" />
              CodeShip
            </span>
            <span className="hidden md:inline font-mono text-sm tracking-widest text-neutral-500">CONTROL PLANE</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                className="bg-[#0B0B0B] border border-layout rounded text-body-sm text-primary pl-9 pr-3 py-1.5 focus:outline-none focus:border-primary transition-colors w-64 placeholder:text-neutral-600 placeholder:text-xs text-sm"
                placeholder="Search projects..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="text-neutral-500 hover:text-white transition-colors" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="text-neutral-500 hover:text-white transition-colors" title="Help">
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main className="flex-grow overflow-y-auto p-6 bg-black w-full flex flex-col gap-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">CodeShip Dashboard</h1>
              <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">Overview of your infrastructure and active deployments.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-black bg-white font-semibold text-body-sm px-4 py-2 rounded hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus size={16} /> New Project
            </button>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-metadata text-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Projects</span>
                <GitBranch size={16} className="text-neutral-700" />
              </div>
              <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.projects}</div>
              <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span> Active on Host
              </div>
            </div>

            <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-metadata text-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Deployments</span>
                <Rocket size={16} className="text-neutral-700" />
              </div>
              <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.deployments}</div>
              <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
                <Check size={12} className="text-neutral-400" /> Database Sync
              </div>
            </div>

            <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-metadata text-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Containers</span>
                <Terminal size={16} className="text-neutral-700" />
              </div>
              <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.containers}</div>
              <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
                Across Single VPS
              </div>
            </div>

            <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className="font-metadata text-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Domains</span>
                <Globe size={16} className="text-neutral-700" />
              </div>
              <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.domains}</div>
              <div className="font-body-sm text-body-sm text-[#71717A] mt-1 flex items-center gap-1 text-xs font-light">
                All SSL verified
              </div>
            </div>
          </div>

          {/* Bento Grid Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Infrastructure Overview (Span 2) */}
            <div className="lg:col-span-2 card-bg border border-layout rounded-lg p-6 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="flex justify-between items-center border-b border-layout pb-3 mb-4">
                  <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 font-semibold">
                    <Cpu size={16} className="text-neutral-400" /> Infrastructure System Monitors
                  </h2>
                  <span className="font-metadata text-metadata text-neutral-500 text-xs font-mono">single-node-vps</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* CPU */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="font-metadata text-neutral-500 uppercase text-xs">CPU Usage</span>
                      <span className="font-code-md text-primary text-xs font-mono">24%</span>
                    </div>
                    <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                      <div className="h-full bg-white w-[24%]"></div>
                    </div>
                  </div>
                  {/* Memory */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="font-metadata text-neutral-500 uppercase text-xs">Memory</span>
                      <span className="font-code-md text-primary text-xs font-mono">62%</span>
                    </div>
                    <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                      <div className="h-full bg-white w-[62%]"></div>
                    </div>
                  </div>
                  {/* Disk */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <span className="font-metadata text-neutral-500 uppercase text-xs">Disk I/O</span>
                      <span className="font-code-md text-primary text-xs font-mono">45%</span>
                    </div>
                    <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                      <div className="h-full bg-white w-[45%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated SVG Graph */}
              <div className="flex-grow bg-[#050505] border border-layout rounded relative overflow-hidden min-h-[160px] flex items-end p-2 opacity-80 mt-2">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,40 T100,50 L100,100 L0,100 Z" fill="url(#grad1)" opacity="0.05"></path>
                  <path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,40 T100,50" fill="none" stroke="#FFFFFF" strokeWidth="0.5" vectorEffect="non-scaling-stroke"></path>
                  <defs>
                    <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }}></stop>
                      <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }}></stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Activity Feed (Span 1) */}
            <div className="card-bg border border-layout rounded-lg p-6 flex flex-col h-[350px]">
              <div className="flex justify-between items-center border-b border-layout pb-3 mb-4">
                <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 font-semibold">
                  <History size={16} className="text-neutral-400" /> Recent Activity
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 select-none">
                {activityItems.length === 0 ? (
                  <div className="text-center text-neutral-600 text-xs py-12 font-light font-mono">NO ACTIVITY YET</div>
                ) : (
                  activityItems.map((item, index) => (
                    <div 
                      key={index}
                      onClick={() => router.push(`/projects/${item.projectId}`)}
                      className="flex gap-3 relative before:absolute before:left-[11px] before:top-6 before:bottom-[-16px] before:w-[1px] before:bg-layout last:before:hidden cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-layout flex items-center justify-center shrink-0 z-10 group-hover:border-neutral-500 transition-colors">
                        {item.status === 'READY' && <Check size={10} className="text-white" />}
                        {item.status === 'BUILDING' && <RefreshCw size={10} className="text-neutral-400 animate-spin" />}
                        {item.status === 'FAILED' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                        {item.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>}
                      </div>
                      
                      <div className="flex flex-col pb-2">
                        <span className="font-body-sm text-body-sm text-primary group-hover:underline decoration-neutral-500">
                          {item.status === 'READY' && 'Deployment Successful'}
                          {item.status === 'BUILDING' && 'Deployment Started'}
                          {item.status === 'FAILED' && 'Deployment Failed'}
                          {item.status === 'PENDING' && 'Deployment Queued'}
                        </span>
                        <span className="font-metadata text-metadata text-neutral-500 text-xs font-light">
                          {item.projectName} • commit <span className="font-mono text-white text-xs">{item.commitHash}</span>
                        </span>
                        <span className="font-metadata text-neutral-600 mt-0.5 text-xs font-light">{getTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Deployments Table (Full Width Bottom) */}
            <div className="lg:col-span-3 card-bg border border-layout rounded-lg overflow-hidden">
              <div className="p-4 border-b border-layout flex justify-between items-center bg-[#0B0B0B]">
                <h2 className="font-headline-md text-headline-md text-primary font-semibold">Active Project Deployments</h2>
                <span className="text-xs font-mono text-neutral-500">{filteredProjects.length} total matching</span>
              </div>
              
              <div className="overflow-x-auto w-full">
                {filteredProjects.length === 0 ? (
                  <div className="flex-1 border-t border-layout p-12 text-center flex flex-col justify-center items-center bg-neutral-950/20">
                    <Globe className="text-neutral-700 mb-4" size={40} />
                    <h3 className="font-semibold text-lg mb-2">No projects found</h3>
                    <p className="text-neutral-500 text-sm max-w-sm mb-6 font-light">
                      {searchQuery ? 'Try adjusting your search terms.' : 'Get started by connecting a repository and deploying your first project.'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 px-5 py-2.5 rounded transition-all bg-black text-sm"
                      >
                        <Plus size={16} /> Deploy a Project
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#050505]">
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Project</th>
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">GitHub Repository</th>
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Framework</th>
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Status</th>
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">URL / Live Link</th>
                        <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Created</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-body-sm divide-y divide-[#1A1A1A] text-sm">
                      {filteredProjects.map((project) => {
                        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
                        const projectUrl = baseDomain === 'localhost'
                          ? `http://${project.slug}.localhost:${project.assignedPort || '3001'}`
                          : `http://${project.slug}.${baseDomain}`;

                        return (
                          <tr 
                            key={project.id}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="hover-bg transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 text-primary font-semibold group-hover:underline decoration-neutral-500">{project.name}</td>
                            <td className="py-3.5 px-4 font-code-sm text-neutral-400 font-mono text-xs">{project.githubRepo}</td>
                            <td className="py-3.5 px-4 text-neutral-400 font-light">{getFrameworkLabel(project.framework)}</td>
                            <td className="py-3.5 px-4">{getStatusBadge(project.status)}</td>
                            <td className="py-3.5 px-4 text-neutral-400">
                              {project.status === 'READY' && project.assignedPort ? (
                                <a 
                                  href={projectUrl}
                                  target="_blank" 
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 hover:text-white transition-colors"
                                >
                                  Visit App
                                </a>
                              ) : (
                                <span className="text-xs text-neutral-600 font-mono">N/A</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-500 font-light">{getTimeAgo(project.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <footer className="mt-auto pt-4 border-t border-layout flex justify-between items-center text-neutral-500 font-metadata text-xs font-light">
            <span>© 2026 CodeShip Inc.</span>
            <div className="flex gap-4">
              <a className="hover:text-white transition-colors" href="https://github.com">Documentation</a>
              <a className="hover:text-white transition-colors" href="https://github.com">Support</a>
            </div>
          </footer>
        </main>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#0B0B0B] border border-[#1A1A1A] w-full max-w-lg p-8 rounded shadow-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">Deploy a New Project</h2>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Configure your project details to compile, build, and deploy.
              </p>
            </div>

            {error && (
              <div className="border border-red-900/30 bg-red-950/10 px-4 py-3 rounded text-sm text-red-400 font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Nextjs App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  GitHub Repository (owner/repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. facebook/react"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 font-mono text-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary"
                >
                  <option value="react-vite">React (Vite)</option>
                  <option value="static">Static (Vanilla)</option>
                  <option value="nextjs">Next.js</option>
                  <option value="express">Express.js</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="border border-[#1A1A1A] hover:border-neutral-700 px-5 py-2.5 rounded transition-all text-sm disabled:opacity-50 text-primary hover:bg-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-black font-semibold px-5 py-2.5 rounded hover:bg-neutral-200 transition-all active:scale-95 text-sm disabled:opacity-50 inline-flex items-center gap-2 bg-white"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Deploy Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
