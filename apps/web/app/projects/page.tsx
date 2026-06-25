'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GitBranch, Rocket, Globe, History, Check, 
  RefreshCw, Terminal, Loader2, X, Cpu, AlertTriangle, Plus,
  Search, Link
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

export default function ProjectsDirectory() {
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

  // GitHub Repositories & Framework Detection State
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'url'>('select');
  
  const [detectingFramework, setDetectingFramework] = useState(false);
  const [detectedFramework, setDetectedFramework] = useState<string | null>(null);
  const [detectionReason, setDetectionReason] = useState<string | null>(null);

  // Helper to parse GitHub repository owner/repo
  const parseGitHubRepo = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return '';
    
    const httpsRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/.]+)(?:\.git)?\/?$/i;
    const sshRegex = /^git@github\.com:([^\/]+)\/([^\/.]+)(?:\.git)?$/i;
    const simpleRegex = /^([^\/]+)\/([^\/]+)$/;

    const httpsMatch = trimmed.match(httpsRegex);
    if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

    const sshMatch = trimmed.match(sshRegex);
    if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

    const simpleMatch = trimmed.match(simpleRegex);
    if (simpleMatch) return trimmed;

    return trimmed;
  };

  // Fetch Session and Projects
  useEffect(() => {
    async function init() {
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
        console.error('Projects directory initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Fetch GitHub repos when modal opens
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
      setRepoSearchQuery('');
      setActiveTab('select');
      setDetectedFramework(null);
      setDetectionReason(null);
      setDetectingFramework(false);
    }
  }, [isModalOpen]);

  // Framework Detection
  const detectFrameworkForRepo = async (repoFullName: string) => {
    if (!repoFullName || !repoFullName.includes('/')) return;
    
    setDetectingFramework(true);
    setDetectedFramework(null);
    setDetectionReason(null);
    
    try {
      const res = await fetch(`/api/github/detect-framework?repo=${encodeURIComponent(repoFullName)}`);
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

  const handleSelectRepo = (repo: any) => {
    setGithubRepo(repo.fullName);
    if (!name.trim()) {
      setName(repo.name);
    }
    detectFrameworkForRepo(repo.fullName);
  };

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
      detectFrameworkForRepo(parsed);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const normalizedRepo = parseGitHubRepo(githubRepo);
    
    if (!name.trim() || !normalizedRepo.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, githubRepo: normalizedRepo, framework }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await res.json();
      setProjects([data.project, ...projects]);
      setIsModalOpen(false);
      
      setName('');
      setGithubRepo('');
      setFramework('react-vite');
      
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
      case 'react-vite': return 'React (Vite)';
      case 'static': return 'Static (Vanilla)';
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

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-[#0C0C0E] text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING PROJECTS...</p>
      </div>
    );
  }

  const searchBarElement = (
    <input
      className="bg-[#131316] border border-layout rounded text-body-sm text-primary pl-9 pr-3 py-1.5 focus:outline-none focus:border-primary transition-colors w-64 placeholder:text-neutral-600 placeholder:text-xs text-sm"
      placeholder="Search projects..."
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  );

  return (
    <SidebarLayout 
      user={user} 
      activeLink="projects" 
      searchBar={searchBarElement}
    >
      {/* Title & Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Projects</h1>
          <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">Directory of all connected repositories and build frameworks.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-white text-black font-semibold text-body-sm px-4 py-2 rounded hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Projects List Card */}
      <div className="card-bg border border-layout rounded-lg overflow-hidden mt-2">
        <div className="p-4 border-b border-layout flex justify-between items-center bg-[#131316]/50">
          <h2 className="font-headline-md text-headline-md text-primary font-semibold">Active Projects</h2>
          <span className="text-xs font-mono text-neutral-500">{filteredProjects.length} total</span>
        </div>
        
        <div className="overflow-x-auto w-full">
          {filteredProjects.length === 0 ? (
            <div className="flex-1 border-t border-layout p-12 text-center flex flex-col justify-center items-center">
              <Globe className="text-neutral-700 mb-4" size={40} />
              <h3 className="font-semibold text-lg mb-2">No projects found</h3>
              <p className="text-neutral-500 text-sm max-w-sm mb-6 font-light">
                {searchQuery ? 'Try adjusting your search terms.' : 'Connect a GitHub repository to get started.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#131316]/20">
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Project</th>
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">GitHub Repository</th>
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Framework</th>
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Status</th>
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Live Link</th>
                  <th className="py-2.5 px-4 font-metadata text-metadata text-neutral-500 uppercase font-light border-b border-layout text-xs font-mono">Created</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-[#1E1E22] text-sm">
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

      {/* Copy-pasted Modal for self-containment */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#131316] border border-[#1E1E22] w-full max-w-xl p-8 rounded shadow-2xl relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-col gap-3">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Select Repository Source
                </label>
                <div className="flex border border-[#1E1E22] rounded p-1 bg-black">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('select');
                      setGithubRepo('');
                      setDetectedFramework(null);
                    }}
                    className={`flex-1 py-1.5 text-center text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                      activeTab === 'select'
                        ? 'bg-[#1A1A20] text-primary font-semibold'
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
                        ? 'bg-[#1A1A20] text-primary font-semibold'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    Import URL
                  </button>
                </div>
              </div>

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
                      className="w-full bg-black border border-[#1E1E22] rounded pl-9 pr-3 py-2 text-xs focus:border-neutral-700 focus:outline-none transition-colors text-primary placeholder:text-neutral-600"
                    />
                  </div>

                  <div className="bg-black border border-[#1E1E22] rounded max-h-48 overflow-y-auto divide-y divide-[#1A1A20]">
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
                              className={`p-3 cursor-pointer hover:bg-[#1A1A20] transition-colors flex flex-col gap-1 ${
                                isSelected ? 'bg-[#1A1A20] border-l-2 border-white' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                                  {repo.fullName}
                                </span>
                                <span className="text-[9px] font-mono bg-[#1E1E22] text-neutral-500 px-1 py-0.2 rounded border border-[#222]">
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
                      className="w-full bg-black border border-[#1E1E22] rounded pl-9 pr-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 font-mono text-primary placeholder:text-neutral-700"
                      required
                    />
                  </div>
                </div>
              )}

              {(detectingFramework || detectedFramework) && (
                <div className="p-3 bg-black border border-[#1E1E22] rounded flex items-center justify-between">
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
                  className="bg-black border border-[#1E1E22] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Build Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  disabled={submitting}
                  className="bg-black border border-[#1E1E22] rounded px-4 py-3 text-sm focus:border-neutral-700 focus:outline-none transition-colors disabled:opacity-50 text-primary"
                >
                  <option value="react-vite">React (Vite)</option>
                  <option value="static">Static (Vanilla)</option>
                  <option value="nextjs">Next.js</option>
                  <option value="express">Express.js</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 border-t border-[#1E1E22] pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="border border-[#1E1E22] hover:border-neutral-700 px-5 py-2.5 rounded transition-all text-sm disabled:opacity-50 text-primary hover:bg-[#1A1A20]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !githubRepo.trim()}
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
    </SidebarLayout>
  );
}
