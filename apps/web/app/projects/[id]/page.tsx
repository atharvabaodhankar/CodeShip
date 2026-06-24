'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Terminal, GitBranch, Globe, Settings, 
  Trash2, Loader2, Plus, X, ShieldAlert, Check, RefreshCw 
} from 'lucide-react';

interface EnvVar {
  id?: string;
  key: string;
  value: string;
}

interface Deployment {
  id: string;
  commitHash: string | null;
  status: string;
  logs: string;
  startedAt: string;
  completedAt: string | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  githubRepo: string;
  framework: string;
  status: string;
  containerId: string | null;
  assignedPort: number | null;
  createdAt: string;
  deployments: Deployment[];
}

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // States
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deployments' | 'env' | 'logs' | 'settings'>('deployments');
  
  // Env Vars state
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [savingEnv, setSavingEnv] = useState(false);
  const [envError, setEnvError] = useState('');
  const [envSuccess, setEnvSuccess] = useState(false);

  // Trigger deploy state
  const [deploying, setDeploying] = useState(false);

  // Logs terminal ref
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Fetch project details
  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        router.push('/dashboard');
        return;
      }
      const data = await res.json();
      setProject(data.project);
    } catch (err) {
      console.error('Failed to fetch project:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchProjectDetails();
      setLoading(false);
    }
    init();
  }, [projectId, router]);

  // Fetch Environment Variables for the environment tab
  useEffect(() => {
    if (activeTab === 'env') {
      const fetchEnvVars = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}/env`);
          if (res.ok) {
            const data = await res.json();
            setEnvVars(data.envVars.length > 0 ? data.envVars : [{ key: '', value: '' }]);
          }
        } catch (e) {
          console.error('Failed to fetch env variables:', e);
        }
      };
      fetchEnvVars();
    }
  }, [activeTab, projectId]);

  // Poll project details if project is BUILDING or PENDING
  useEffect(() => {
    if (!project) return;
    
    const isBuilding = project.status === 'BUILDING' || project.status === 'PENDING' || 
      project.deployments.some(d => d.status === 'BUILDING' || d.status === 'PENDING');

    if (!isBuilding) return;

    const interval = setInterval(async () => {
      await fetchProjectDetails();
    }, 2000);

    return () => clearInterval(interval);
  }, [project]);

  // Auto scroll terminal to bottom when logs update
  useEffect(() => {
    if (activeTab === 'logs' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project?.deployments, activeTab]);

  // Handle manual deployment trigger
  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchProjectDetails();
        setActiveTab('logs'); // Switch to logs tab to view build progress
      }
    } catch (e) {
      console.error('Deployment trigger failed:', e);
    } finally {
      setDeploying(false);
    }
  };

  // Env Var CRUD UI Helpers
  const addEnvVarField = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVarField = (index: number) => {
    const updated = [...envVars];
    updated.splice(index, 1);
    setEnvVars(updated.length > 0 ? updated : [{ key: '', value: '' }]);
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  const saveEnvVariables = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEnv(true);
    setEnvError('');
    setEnvSuccess(false);

    // Validate env variables (check duplicate keys)
    const keys = envVars.map(ev => ev.key.trim()).filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      setEnvError('Duplicate keys are not allowed.');
      setSavingEnv(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envVars: envVars.filter(ev => ev.key.trim() !== ''),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save environment variables');
      }

      setEnvSuccess(true);
      setTimeout(() => setEnvSuccess(false), 3000);
    } catch (err: any) {
      setEnvError(err.message || 'An error occurred.');
    } finally {
      setSavingEnv(false);
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    const confirmed = window.confirm(
      `Are you absolutely sure you want to delete "${project?.name}"?\nThis will stop and remove its Docker container and erase all logs.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        alert(`Failed to delete project: ${data.error}`);
      }
    } catch (e) {
      console.error('Deletion error:', e);
      alert('An error occurred while deleting the project.');
    }
  };

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
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING DETAILS...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-black text-white">
        <p className="font-mono text-sm text-neutral-500">Project not found.</p>
      </div>
    );
  }

  const latestDeployment = project.deployments[0];
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
  const projectUrl = baseDomain === 'localhost'
    ? `http://${project.slug}.localhost:${project.assignedPort || '3001'}`
    : `http://${project.slug}.${baseDomain}`;

  return (
    <div className="flex-1 flex flex-col bg-black text-white">
      {/* Header */}
      <header className="border-b border-neutral-900 px-6 py-4 flex justify-between items-center bg-black">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-mono text-xs uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            Back to Projects
          </button>
        </div>

        <span className="font-mono text-xs text-neutral-500 tracking-wider">
          {project.slug}
        </span>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Project Title Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight">{project.name}</h1>
              {getStatusBadge(project.status)}
            </div>
            
            <div className="flex items-center gap-6 text-sm text-neutral-400 font-light flex-wrap">
              <div className="flex items-center gap-1">
                <GitBranch size={14} className="text-neutral-600" />
                <a 
                  href={`https://github.com/${project.githubRepo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs hover:text-white hover:underline"
                >
                  {project.githubRepo}
                </a>
              </div>
              <div>
                <span className="text-neutral-600">Framework: </span>
                <span className="font-mono text-xs text-neutral-300">{getFrameworkLabel(project.framework)}</span>
              </div>
              {project.assignedPort && (
                <div>
                  <span className="text-neutral-600">Local Port: </span>
                  <span className="font-mono text-xs text-neutral-300">{project.assignedPort}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project.status === 'READY' && project.assignedPort && (
              <a
                href={projectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 px-4 py-2 rounded text-sm bg-neutral-950/20 transition-all"
              >
                <Globe size={15} />
                Visit Application
              </a>
            )}

            <button
              onClick={handleDeploy}
              disabled={deploying || project.status === 'BUILDING' || project.status === 'PENDING'}
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded hover:bg-neutral-200 transition-all active:scale-95 text-sm disabled:opacity-50"
            >
              {deploying ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Redeploy
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-neutral-900 flex gap-6 overflow-x-auto">
          {(['deployments', 'env', 'logs', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-medium tracking-wide transition-all border-b-2 capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab === 'env' ? 'Environment Variables' : tab}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="flex-1 flex flex-col">
          
          {/* Tab 1: Deployments History */}
          {activeTab === 'deployments' && (
            <div className="flex flex-col gap-6">
              <h3 className="text-xl font-bold tracking-tight">Deployment History</h3>
              
              {project.deployments.length === 0 ? (
                <div className="border border-neutral-900 bg-neutral-950/20 p-12 text-center rounded">
                  <p className="text-neutral-500 text-sm font-light">No deployments found for this project.</p>
                </div>
              ) : (
                <div className="border border-neutral-900 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-neutral-900 bg-neutral-950/50 text-neutral-400 font-mono text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Deployment ID</th>
                        <th className="px-6 py-4 font-medium">Commit</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Triggered</th>
                        <th className="px-6 py-4 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 bg-neutral-950/10 font-light">
                      {project.deployments.map((deployment) => (
                        <tr 
                          key={deployment.id}
                          onClick={() => {
                            setActiveTab('logs');
                          }}
                          className="hover:bg-neutral-950/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                            {deployment.id.slice(0, 18)}...
                          </td>
                          <td className="px-6 py-4">
                            {deployment.commitHash ? (
                              <span className="font-mono bg-neutral-900 px-2 py-0.5 rounded text-xs text-white border border-neutral-800">
                                {deployment.commitHash}
                              </span>
                            ) : (
                              <span className="text-neutral-600 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                deployment.status === 'READY' ? 'bg-white' :
                                deployment.status === 'BUILDING' ? 'bg-neutral-400 animate-pulse' :
                                deployment.status === 'FAILED' ? 'bg-neutral-700' : 'bg-neutral-600'
                              }`} />
                              <span className="text-xs">{deployment.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-400">
                            {new Date(deployment.startedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-neutral-400">
                            {deployment.completedAt ? (
                              new Date(deployment.completedAt).toLocaleString()
                            ) : (
                              <span className="text-neutral-600 font-mono text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Environment Variables */}
          {activeTab === 'env' && (
            <div className="flex flex-col gap-6 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Environment Variables</h3>
                <p className="text-neutral-500 text-sm font-light mt-1">
                  Variables are encrypted in the database using AES-256-GCM and injected into your Docker containers at runtime.
                </p>
              </div>

              {envError && (
                <div className="border border-neutral-800 bg-neutral-950 px-4 py-3 rounded text-sm text-neutral-300 font-mono">
                  {envError}
                </div>
              )}

              {envSuccess && (
                <div className="border border-white bg-neutral-950 px-4 py-3 rounded text-sm text-white font-mono flex items-center gap-2">
                  <Check size={16} />
                  Environment variables saved. Changes will take effect on the next redeploy.
                </div>
              )}

              <form onSubmit={saveEnvVariables} className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {envVars.map((ev, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="KEY"
                        value={ev.key}
                        onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
                        disabled={savingEnv}
                        className="flex-1 bg-neutral-950 border border-neutral-900 rounded px-4 py-2.5 text-sm focus:border-neutral-700 focus:outline-none transition-colors font-mono uppercase"
                        required={!!ev.value}
                      />
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={ev.value}
                        onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                        disabled={savingEnv}
                        className="flex-1 bg-neutral-950 border border-neutral-900 rounded px-4 py-2.5 text-sm focus:border-neutral-700 focus:outline-none transition-colors font-mono"
                        required={!!ev.key}
                      />
                      <button
                        type="button"
                        onClick={() => removeEnvVarField(index)}
                        disabled={savingEnv}
                        className="p-2.5 border border-neutral-900 hover:border-neutral-700 hover:text-neutral-200 rounded transition-colors text-neutral-500"
                        title="Remove variable"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={addEnvVarField}
                    disabled={savingEnv}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-medium border border-neutral-900 hover:border-neutral-700 px-3 py-2 rounded bg-neutral-950/20 transition-all"
                  >
                    <Plus size={14} />
                    Add Variable
                  </button>

                  <button
                    type="submit"
                    disabled={savingEnv}
                    className="bg-white text-black font-semibold px-5 py-2 rounded hover:bg-neutral-200 transition-all active:scale-95 text-sm disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingEnv && <Loader2 size={15} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3: Build Logs Terminal */}
          {activeTab === 'logs' && (
            <div className="flex flex-col gap-6 flex-1">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Deployment Logs</h3>
                  <p className="text-neutral-500 text-sm font-light mt-1">
                    Real-time compilation and execution logs of the latest deployment.
                  </p>
                </div>
                {latestDeployment && (
                  <span className="font-mono text-xs bg-neutral-950 border border-neutral-900 px-3 py-1 rounded text-neutral-400">
                    ID: {latestDeployment.id.slice(0, 8)} - {latestDeployment.status}
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-[400px] max-h-[600px] bg-black border border-neutral-900 rounded p-6 font-mono text-xs leading-relaxed overflow-y-auto flex flex-col shadow-inner">
                {latestDeployment ? (
                  <pre className="white-space-pre-wrap break-all text-neutral-300 flex-1">
                    {latestDeployment.logs || 'Initializing logs...\n'}
                  </pre>
                ) : (
                  <div className="flex-1 flex justify-center items-center text-neutral-600">
                    No logs available. Deploy the project to generate logs.
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* Tab 4: Project Settings */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-8 max-w-3xl">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Project Settings</h3>
                <p className="text-neutral-500 text-sm font-light mt-1">
                  Manage configuration and project deletion.
                </p>
              </div>

              {/* Project Meta Details Card */}
              <div className="border border-neutral-900 bg-neutral-950/20 p-6 rounded flex flex-col gap-4">
                <h4 className="font-semibold text-base">Configuration Summary</h4>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-mono uppercase">Project ID</span>
                    <span className="font-mono text-neutral-300">{project.id}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-mono uppercase">Docker Container Name</span>
                    <span className="font-mono text-neutral-300">codeship-{project.slug}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-mono uppercase">Assigned Port</span>
                    <span className="font-mono text-neutral-300">{project.assignedPort || 'Not Allocated'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-neutral-500 text-xs font-mono uppercase">Resource Limits</span>
                    <span className="text-neutral-300">512MB Memory, 0.5 CPU</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-neutral-900 rounded overflow-hidden">
                <div className="bg-neutral-950 border-b border-neutral-900 px-6 py-4 flex items-center gap-3 text-neutral-400 font-medium text-sm uppercase font-mono tracking-wider bg-red-950/5">
                  <ShieldAlert className="text-neutral-400" size={18} />
                  Danger Zone
                </div>
                <div className="p-6 bg-black flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                  <div>
                    <h4 className="font-bold text-base">Delete this project</h4>
                    <p className="text-neutral-500 text-xs font-light mt-1 max-w-md">
                      Permanently delete this project, its deployment history, environment variables, 
                      and destroy its running Docker container. This action is irreversible.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteProject}
                    className="inline-flex items-center justify-center gap-2 border border-neutral-900 hover:border-neutral-700 hover:bg-neutral-950 hover:text-white font-semibold px-4 py-2.5 rounded text-sm text-neutral-400 transition-all active:scale-95"
                  >
                    <Trash2 size={15} />
                    Delete Project
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
