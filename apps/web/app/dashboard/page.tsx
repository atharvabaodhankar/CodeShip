'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, ExternalLink, GitBranch, Terminal, 
  Settings, LogOut, Loader2, Globe, Sparkles 
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

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-white text-white font-medium bg-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Active
          </span>
        );
      case 'BUILDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-neutral-700 text-neutral-300 font-medium bg-neutral-950 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-ping" />
            Building
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-neutral-800 text-neutral-400 font-medium bg-neutral-950">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse-gray" />
            Queued
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-neutral-900 text-neutral-500 font-medium bg-neutral-900">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-neutral-800 text-neutral-400 font-medium">
            {status}
          </span>
        );
    }
  };

  const getFrameworkLabel = (fw: string) => {
    switch (fw) {
      case 'react':
      case 'react-vite':
        return 'React (Vite)';
      case 'nextjs': return 'Next.js';
      case 'express': return 'Express.js';
      default: return fw;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-black text-white">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING CODESHIP...</p>
      </div>
    );
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';

  return (
    <div className="flex-1 flex flex-col bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-900 px-6 py-4 flex justify-between items-center bg-black">
        <div className="flex items-center gap-4">
          <span 
            onClick={() => router.push('/dashboard')}
            className="font-mono text-lg font-bold tracking-wider cursor-pointer select-none"
          >
            [C] CODESHIP
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-8 h-8 rounded border border-neutral-800"
              />
              <span className="text-sm font-medium hidden sm:inline text-neutral-300">
                {user.username}
              </span>
            </div>
            <a
              href="/api/auth/logout"
              className="p-2 border border-neutral-900 hover:border-neutral-700 rounded transition-colors text-neutral-400 hover:text-white"
              title="Sign Out"
            >
              <LogOut size={16} />
            </a>
          </div>
        )}
      </header>

      {/* Content Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Welcome Row */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-neutral-500 text-sm font-light mt-1">
              Deploy and manage your containerized applications.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-white text-black font-medium px-4 py-2.5 rounded hover:bg-neutral-200 transition-all active:scale-95 text-sm"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>

        {/* Search & Actions */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-900 rounded py-3 pl-10 pr-4 text-sm focus:border-neutral-700 focus:outline-none transition-colors"
          />
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex-1 border border-dashed border-neutral-900 rounded-lg p-12 text-center flex flex-col justify-center items-center bg-neutral-950/20">
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
                <Plus size={16} />
                Deploy a Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredProjects.map((project) => {
              const projectUrl = baseDomain === 'localhost'
                ? `http://${project.slug}.localhost:${project.assignedPort || '3001'}`
                : `http://${project.slug}.${baseDomain}`;

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="group border border-neutral-900 hover:border-neutral-700 bg-neutral-950/40 p-6 rounded cursor-pointer transition-all flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <h3 className="font-bold text-xl group-hover:underline decoration-neutral-500 underline-offset-4">
                          {project.name}
                        </h3>
                        <span className="font-mono text-xs text-neutral-500 mt-1">
                          {project.slug}
                        </span>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-neutral-400 font-light">
                      <div className="flex items-center gap-2">
                        <GitBranch size={14} className="text-neutral-600" />
                        <span className="font-mono text-xs">{project.githubRepo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-neutral-600" />
                        <span>{getFrameworkLabel(project.framework)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-900 pt-4 flex justify-between items-center mt-2">
                    {project.status === 'READY' && project.assignedPort ? (
                      <a
                        href={projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white font-medium transition-colors"
                      >
                        <Globe size={14} />
                        Visit App
                        <ExternalLink size={12} className="text-neutral-500" />
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-600">URL not available</span>
                    )}

                    <span className="text-xs text-neutral-500 font-mono">
                      {new Date(project.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-neutral-950 border border-neutral-900 w-full max-w-lg p-8 rounded shadow-2xl relative flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Deploy a New Project</h2>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Configure your project details to build and deploy.
              </p>
            </div>

            {error && (
              <div className="border border-neutral-800 bg-neutral-950 px-4 py-3 rounded text-sm text-neutral-300 font-mono">
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
                  className="bg-black border border-neutral-900 rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  GitHub Repository (owner/repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. vercel/next.js"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-neutral-900 rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 font-mono"
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
                  className="bg-black border border-neutral-900 rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <option value="react-vite">React (Vite)</option>
                  <option value="nextjs">Next.js</option>
                  <option value="express">Express.js</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="border border-neutral-900 hover:border-neutral-700 px-5 py-2.5 rounded transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-white text-black font-semibold px-5 py-2.5 rounded hover:bg-neutral-200 transition-all active:scale-95 text-sm disabled:opacity-50 inline-flex items-center gap-2"
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
