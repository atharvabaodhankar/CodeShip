'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GitBranch, Rocket, Globe, History, Check, 
  RefreshCw, Terminal, Loader2, X, Cpu, AlertTriangle, Plus,
  Search, Link, ChevronDown
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

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
  
  // Real Host System Stats State
  const [systemStats, setSystemStats] = useState({ cpu: 0, memory: 0, disk: 0 });
  const [cpuHistory, setCpuHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [framework, setFramework] = useState('react-vite');
  const [rootDirectory, setRootDirectory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // GitHub Repositories & Framework Detection State
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'url'>('select');
  
  const [detectingFramework, setDetectingFramework] = useState(false);
  const [detectedFramework, setDetectedFramework] = useState<string | null>(null);
  const [detectionReason, setDetectionReason] = useState<string | null>(null);

  // Directory selection states
  const [repoDirs, setRepoDirs] = useState<{ path: string; label: string; isProject: boolean }[]>([]);
  const [loadingDirs, setLoadingDirs] = useState(false);
  const [isDirDropdownOpen, setIsDirDropdownOpen] = useState(false);
  const [isFrameworkDropdownOpen, setIsFrameworkDropdownOpen] = useState(false);

  // Helper to parse GitHub repository owner/repo from various formats
  const parseGitHubRepo = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    
    const httpsRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/.]+)(?:\.git)?\/?$/i;
    const sshRegex = /^git@github\.com:([^\/]+)\/([^\/.]+)(?:\.git)?$/i;
    const simpleRegex = /^([^\/]+)\/([^\/]+)$/;

    const httpsMatch = trimmed.match(httpsRegex);
    if (httpsMatch) {
      return `${httpsMatch[1]}/${httpsMatch[2]}`;
    }

    const sshMatch = trimmed.match(sshRegex);
    if (sshMatch) {
      return `${sshMatch[1]}/${sshMatch[2]}`;
    }

    const simpleMatch = trimmed.match(simpleRegex);
    if (simpleMatch) {
      return trimmed;
    }

    return trimmed;
  };

  // Fetch user's GitHub repositories when modal opens
  useEffect(() => {
    if (isModalOpen) {
      async function fetchGithubRepos() {
        setLoadingRepos(true);
        try {
          const res = await fetch('/api/github/repos');
          if (res.ok) {
            const data = await res.json();
            setGithubRepos(data.repos || []);
          }
        } catch (err) {
          console.error('Failed to fetch GitHub repos:', err);
        } finally {
          setLoadingRepos(false);
        }
      }
      fetchGithubRepos();
    } else {
      // Reset modal detection states on close
      setRepoSearchQuery('');
      setActiveTab('select');
      setDetectedFramework(null);
      setDetectionReason(null);
      setDetectingFramework(false);
      setRepoDirs([]);
      setLoadingDirs(false);
    }
  }, [isModalOpen]);

  // Framework Auto-Detection API trigger
  const detectFrameworkForRepo = async (repoFullName: string, path: string = '') => {
    if (!repoFullName || !repoFullName.includes('/')) return;
    
    setDetectingFramework(true);
    setDetectedFramework(null);
    setDetectionReason(null);
    
    try {
      const res = await fetch(`/api/github/detect-framework?repo=${encodeURIComponent(repoFullName)}&path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.framework) {
          setFramework(data.framework);
          setDetectedFramework(data.framework);
          setDetectionReason(data.reason);
        }
      }
    } catch (err) {
      console.error('Failed to detect framework:', err);
    } finally {
      setDetectingFramework(false);
    }
  };

  // Fetch directory list for a repository
  const fetchRepoDirectories = async (repoFullName: string) => {
    if (!repoFullName || !repoFullName.includes('/')) return;
    setLoadingDirs(true);
    setRepoDirs([]);
    try {
      const res = await fetch(`/api/github/dirs?repo=${encodeURIComponent(repoFullName)}`);
      if (res.ok) {
        const data = await res.json();
        setRepoDirs(data.directories || []);
      }
    } catch (err) {
      console.error('Failed to fetch repo directories:', err);
    } finally {
      setLoadingDirs(false);
    }
  };

  // Handle repository selection from list
  const handleSelectRepo = (repo: any) => {
    setGithubRepo(repo.fullName);
    if (!name.trim()) {
      setName(repo.name);
    }
    setRootDirectory(''); // Reset directory on new selection
    detectFrameworkForRepo(repo.fullName, '');
    fetchRepoDirectories(repo.fullName);
  };

  // Handle URL input blur/normalization
  const handleRepoUrlBlur = () => {
    const parsed = parseGitHubRepo(githubRepo);
    if (parsed && parsed !== githubRepo) {
      setGithubRepo(parsed);
    }
    
    if (parsed && parsed.includes('/')) {
      const repoName = parsed.split('/')[1];
      if (!name.trim()) {
        setName(repoName);
      }
      setRootDirectory(''); // Reset directory on new selection
      detectFrameworkForRepo(parsed, '');
      fetchRepoDirectories(parsed);
    }
  };

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

  // Poll system stats from host VPS
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/system/stats');
        if (res.ok) {
          const data = await res.json();
          setSystemStats(data.stats);
          setCpuHistory((prev) => [...prev.slice(1), data.stats.cpu]);
        }
      } catch (err) {
        console.error('Failed to fetch system stats:', err);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

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
    
    const normalizedRepo = parseGitHubRepo(githubRepo);
    
    if (!name.trim() || !normalizedRepo.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!normalizedRepo.includes('/')) {
      setError('GitHub Repository must be in the format "owner/repo" (e.g. facebook/react).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, githubRepo: normalizedRepo, framework, rootDirectory }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await res.json();
      const newProject = {
        ...data.project,
        deployments: data.deployment ? [data.deployment] : [],
      };
      setProjects([newProject, ...projects]);
      setIsModalOpen(false);
      
      // Reset form
      setName('');
      setGithubRepo('');
      setFramework('react-vite');
      setRootDirectory('');
      
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
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Generate dynamic path for CPU sparkline (real-time CPU history)
  const generateSparkline = () => {
    const points = cpuHistory.map((val, index) => {
      const x = index * (100 / 9);
      // Map val (0-100) to y (10-90) to leave breathing room
      const y = 90 - (val / 100) * 80;
      return { x, y };
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPath = `${linePath} L 100,100 L 0,100 Z`;
    return { linePath, fillPath };
  };

  const { linePath, fillPath } = generateSparkline();

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING ROVEL...</p>
      </div>
    );
  }

  // Dynamic Metrics Calculations
  const metrics = {
    projects: projects.length,
    deployments: projects.reduce((acc, p) => acc + (p.deployments?.length || 0), 0),
    containers: projects.filter((p) => p.status === 'READY').length,
    domains: projects.filter((p) => p.status === 'READY').length,
  };

  // Generate dynamic activity items based on latest deployments
  const activityItems = projects
    .filter((p) => p.deployments && p.deployments.length > 0)
    .map((p) => ({
      projectId: p.id,
      projectName: p.name,
      status: p.deployments[0].status,
      commitHash: p.deployments[0].commitHash || 'N/A',
      createdAt: p.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';

  // Search input to pass to Header
  const searchBarElement = (
    <input
      className="bg-[#0B0B0B] border border-layout rounded text-body-sm text-primary pl-9 pr-3 py-1.5 focus:outline-none focus:border-primary transition-colors w-64 placeholder:text-neutral-600 placeholder:text-xs text-sm"
      placeholder="Search projects..."
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );

  return (
    <SidebarLayout 
      user={user} 
      activeLink="dashboard" 
      searchBar={searchBarElement}
    >
      
      {/* Title & Actions Row */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Rovel Dashboard</h1>
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
            <span className="font-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Projects</span>
            <GitBranch size={16} className="text-neutral-700" />
          </div>
          <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.projects}</div>
          <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span> Active on Host
          </div>
        </div>

        <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="font-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Deployments</span>
            <Rocket size={16} className="text-neutral-700" />
          </div>
          <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.deployments}</div>
          <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
            <Check size={12} className="text-neutral-400" /> Database Sync
          </div>
        </div>

        <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="font-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Containers</span>
            <Terminal size={16} className="text-neutral-700" />
          </div>
          <div className="font-headline-lg text-2xl font-bold text-primary">{metrics.containers}</div>
          <div className="font-body-sm text-body-sm text-neutral-500 mt-1 flex items-center gap-1 text-xs font-light">
            Across Single VPS
          </div>
        </div>

        <div className="card-bg border border-layout rounded-lg p-4 flex flex-col justify-between hover-bg transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="font-metadata text-neutral-500 uppercase tracking-wider text-xs font-mono">Domains</span>
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
              <span className="font-metadata text-neutral-500 text-xs font-mono uppercase">
                {process.platform === 'win32' ? 'windows-host' : 'single-node-vps'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* CPU */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="font-metadata text-neutral-500 uppercase text-xs">CPU Usage</span>
                  <span className="font-code-md text-primary text-xs font-mono">{systemStats.cpu}%</span>
                </div>
                <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.cpu}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Memory */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="font-metadata text-neutral-500 uppercase text-xs">Memory</span>
                  <span className="font-code-md text-primary text-xs font-mono">{systemStats.memory}%</span>
                </div>
                <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.memory}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Disk */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="font-metadata text-neutral-500 uppercase text-xs">Disk Space</span>
                  <span className="font-code-md text-primary text-xs font-mono">{systemStats.disk}%</span>
                </div>
                <div className="h-1 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.disk}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Graph (Real-time moving CPU sparkline) */}
          <div className="flex-grow bg-[#050505] border border-layout rounded relative overflow-hidden min-h-[160px] flex items-end p-2 opacity-80 mt-2">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:linear-gradient(to_bottom,transparent,black)]"></div>
            
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Filled Area */}
              {cpuHistory.some(v => v > 0) && (
                <path 
                  d={fillPath} 
                  fill="url(#grad1)" 
                  opacity="0.05"
                  className="transition-all duration-500"
                ></path>
              )}
              {/* Sparkline Stroke */}
              <path 
                d={linePath} 
                fill="none" 
                stroke="#FFFFFF" 
                strokeWidth="0.75" 
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-500"
              ></path>
              <defs>
                <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }}></stop>
                  <stop offset="100%" style={{ stopColor: '#FFFFFF', stopOpacity: 0 }}></stop>
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute bottom-2 right-2 font-mono text-[10px] text-neutral-600 select-none">
              LIVE RESOURCE EXHAUSTION GRAPH
            </div>
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
                      {item.projectName} • commit <span className="font-mono text-white text-xs">{item.commitHash.slice(0, 7)}</span>
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

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#0B0B0B] border border-[#1A1A1A] w-full max-w-xl p-8 rounded shadow-2xl relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
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
                Import from GitHub to compile, build, and deploy.
              </p>
            </div>

            {error && (
              <div className="border border-red-900/30 bg-red-950/10 px-4 py-3 rounded text-sm text-red-400 font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="flex flex-col gap-5">
              
              {/* Repository Source Tabs */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Select Repository Source
                </label>
                <div className="flex border border-[#1A1A1A] rounded p-1 bg-black">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('select');
                      setGithubRepo('');
                      setDetectedFramework(null);
                    }}
                    className={`flex-1 py-1.5 text-center text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'select'
                        ? 'bg-[#111111] text-primary font-semibold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    My Repositories
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('url');
                      setGithubRepo('');
                      setDetectedFramework(null);
                    }}
                    className={`flex-1 py-1.5 text-center text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'url'
                        ? 'bg-[#111111] text-primary font-semibold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Import URL
                  </button>
                </div>
              </div>

              {/* Tab Content: My Repositories List */}
              {activeTab === 'select' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-neutral-600" size={14} />
                    <input
                      type="text"
                      placeholder="Search public repositories..."
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      disabled={submitting}
                      className="w-full bg-black border border-[#1A1A1A] rounded pl-9 pr-3 py-2 text-xs focus:border-neutral-700 focus:outline-none transition-colors text-primary placeholder:text-neutral-600"
                    />
                  </div>

                  <div className="bg-black border border-[#1A1A1A] rounded max-h-48 overflow-y-auto divide-y divide-[#111111]">
                    {loadingRepos ? (
                      <div className="flex justify-center items-center py-8 gap-2">
                        <Loader2 className="animate-spin text-neutral-500" size={16} />
                        <span className="text-xs font-mono text-neutral-500 uppercase">Fetching repositories...</span>
                      </div>
                    ) : githubRepos.length === 0 ? (
                      <div className="text-center text-neutral-600 text-xs py-8 font-light font-mono uppercase">
                        No public repositories found
                      </div>
                    ) : (
                      (() => {
                        const filtered = githubRepos.filter(repo => 
                          repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
                          (repo.description && repo.description.toLowerCase().includes(repoSearchQuery.toLowerCase()))
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center text-neutral-600 text-xs py-8 font-light font-mono uppercase">
                              No matching repositories
                            </div>
                          );
                        }

                        return filtered.map((repo) => {
                          const isSelected = githubRepo === repo.fullName;
                          return (
                            <div
                              key={repo.fullName}
                              onClick={() => !submitting && handleSelectRepo(repo)}
                              className={`p-3 cursor-pointer hover:bg-[#050505] transition-colors flex flex-col gap-1 ${
                                isSelected ? 'bg-[#0F0F0F] border-l-2 border-white' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                                  {repo.fullName}
                                </span>
                                <span className="text-[9px] font-mono bg-[#1A1A1A] text-neutral-500 px-1 py-0.2 rounded border border-[#222]">
                                  {repo.defaultBranch}
                                </span>
                              </div>
                              {repo.description && (
                                <p className="text-[10px] text-neutral-500 line-clamp-1 font-light">
                                  {repo.description}
                                </p>
                              )}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content: Import via URL Input */}
              {activeTab === 'url' && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Link className="absolute left-3 top-3.5 text-neutral-600" size={14} />
                    <input
                      type="text"
                      placeholder="https://github.com/owner/repository"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      onBlur={handleRepoUrlBlur}
                      disabled={submitting}
                      className="w-full bg-black border border-[#1A1A1A] rounded pl-9 pr-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 font-mono text-primary placeholder:text-neutral-700"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-neutral-600 font-mono leading-normal">
                    Accepts full links (e.g. `https://github.com/owner/repo`) or simple path (`owner/repo`). We'll extract and normalize it.
                  </p>
                </div>
              )}

              {/* Framework Auto-Detection Feedback Panel */}
              {(detectingFramework || detectedFramework) && (
                <div className="p-3 bg-[#050505] border border-[#1A1A1A] rounded flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    {detectingFramework ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-neutral-500" />
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Analyzing project dependencies...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} className="text-white" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono text-white font-semibold uppercase tracking-wider">
                            Detected: {getFrameworkLabel(detectedFramework || '')}
                          </span>
                          {detectionReason && (
                            <span className="text-[10px] text-neutral-500 font-mono">{detectionReason}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {!detectingFramework && (
                    <span className="text-[9px] font-mono bg-white text-black px-1.5 py-0.5 rounded font-bold uppercase">
                      AUTO
                    </span>
                  )}
                </div>
              )}

              {/* Project Name Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. my-app"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary"
                  required
                />
              </div>

              {/* Root Directory Field */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    Root Directory
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono font-light">Optional</span>
                </div>

                {githubRepo && (
                  <div className="flex flex-col gap-1.5">
                    {loadingDirs ? (
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono py-1">
                        <Loader2 size={12} className="animate-spin text-neutral-500" />
                        <span>Scanning repository folders...</span>
                      </div>
                    ) : repoDirs.length > 0 ? (
                      <div className="relative flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => !submitting && setIsDirDropdownOpen(!isDirDropdownOpen)}
                          className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary font-mono flex justify-between items-center w-full text-left cursor-pointer"
                          disabled={submitting}
                        >
                          <span className="truncate pr-4">
                            {repoDirs.find(d => d.path === rootDirectory)?.label || rootDirectory || 'Root Directory (/)'}
                          </span>
                          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${isDirDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDirDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDirDropdownOpen(false)} />
                            <div className="absolute top-[105%] left-0 w-full bg-[#131316] border border-[#1E1E22] rounded shadow-2xl z-50 py-1 max-h-48 overflow-y-auto divide-y divide-[#1E1E22]/30 font-mono text-xs">
                              {repoDirs.map((dir) => (
                                <div
                                  key={dir.path}
                                  onClick={() => {
                                    setRootDirectory(dir.path);
                                    setIsDirDropdownOpen(false);
                                    detectFrameworkForRepo(parseGitHubRepo(githubRepo), dir.path);
                                  }}
                                  className={`px-4 py-2.5 cursor-pointer hover:bg-[#1A1A20] hover:text-white transition-colors flex items-center justify-between ${
                                    rootDirectory === dir.path ? 'bg-[#1A1A20] text-white font-bold' : 'text-neutral-400'
                                  }`}
                                >
                                  <span className="truncate">{dir.label}</span>
                                  {rootDirectory === dir.path && <Check size={12} className="text-white" />}
                                </div>
                              ))}
                              <div
                                onClick={() => {
                                  setRootDirectory('__custom__');
                                  setIsDirDropdownOpen(false);
                                }}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-[#1A1A20] hover:text-white transition-colors flex items-center justify-between ${
                                  rootDirectory === '__custom__' ? 'bg-[#1A1A20] text-white font-bold' : 'text-neutral-400'
                                }`}
                              >
                                <span>-- Enter custom path --</span>
                                {rootDirectory === '__custom__' && <Check size={12} className="text-white" />}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {(!githubRepo || !repoDirs.length || rootDirectory === '__custom__' || !repoDirs.some(d => d.path === rootDirectory)) && (
                  <input
                    type="text"
                    placeholder="e.g. frontend or apps/web (leave blank if at root)"
                    value={rootDirectory === '__custom__' ? '' : rootDirectory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRootDirectory(val);
                    }}
                    onBlur={() => {
                      const parsed = parseGitHubRepo(githubRepo);
                      if (parsed && rootDirectory && rootDirectory !== '__custom__') {
                        detectFrameworkForRepo(parsed, rootDirectory);
                      }
                    }}
                    disabled={submitting}
                    className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary font-mono"
                  />
                )}
              </div>

              {/* Custom Build Framework Dropdown */}
              <div className="relative flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Build Framework
                </label>
                <button
                  type="button"
                  onClick={() => !submitting && setIsFrameworkDropdownOpen(!isFrameworkDropdownOpen)}
                  className="bg-black border border-[#1A1A1A] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary font-mono flex justify-between items-center w-full text-left cursor-pointer"
                  disabled={submitting}
                >
                  <span>{getFrameworkLabel(framework)}</span>
                  <ChevronDown size={14} className={`text-neutral-500 transition-transform ${isFrameworkDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isFrameworkDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFrameworkDropdownOpen(false)} />
                    <div className="absolute top-[105%] left-0 w-full bg-[#131316] border border-[#1E1E22] rounded shadow-2xl z-50 py-1 divide-y divide-[#1E1E22]/30 font-mono text-xs">
                      {[
                        { value: 'react-vite', label: 'React (Vite)' },
                        { value: 'static', label: 'Static (Vanilla)' },
                        { value: 'nextjs', label: 'Next.js' },
                        { value: 'express', label: 'Express.js' },
                      ].map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setFramework(opt.value);
                            setIsFrameworkDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-[#1A1A20] hover:text-white transition-colors flex items-center justify-between ${
                            framework === opt.value ? 'bg-[#1A1A20] text-white font-bold' : 'text-neutral-400'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {framework === opt.value && <Check size={12} className="text-white" />}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[10px] text-neutral-600 font-mono">
                  You can manually override the auto-detected framework if needed.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 border-t border-[#1A1A1A] pt-4">
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
                  disabled={submitting || !githubRepo.trim()}
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
    </SidebarLayout>
  );
}
