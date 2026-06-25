'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Terminal, GitBranch, Globe, Settings, 
  Trash2, Loader2, Plus, X, ShieldAlert, Check, RefreshCw,
  Cpu, HardDrive, AlertTriangle, Copy, Maximize2, Minimize2
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

// Monochrome Confetti Particle Component
function MonochromeConfetti({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#71717A', '#3F3F46'];
    const particleCount = 100;
    const particles: {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 3 - 1.5,
        speedY: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 3 - 1.5,
      });
    }

    const startTime = Date.now();
    const duration = 5000; // 5 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        onComplete();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// Build Logs Syntax Highlighter Helper
const formatLogLine = (line: string, index: number) => {
  const trimmed = line.trim();
  if (!trimmed) return <div key={index} className="h-4" />;

  // 1. Error lines (High priority)
  if (
    /failed/i.test(line) ||
    /error/i.test(line) ||
    /invalid reference/i.test(line) ||
    /exit code/i.test(line) ||
    /exception/i.test(line)
  ) {
    return (
      <div key={index} className="text-red-400 font-mono text-xs">
        <span className="text-red-500 font-bold mr-2">●</span>
        {line}
      </div>
    );
  }

  // 2. Success lines
  if (
    /successfully/i.test(line) ||
    /successful/i.test(line) ||
    /success/i.test(line) ||
    /ready/i.test(line) ||
    /completed/i.test(line)
  ) {
    return (
      <div key={index} className="text-green-400 font-mono text-xs font-semibold">
        <span className="text-green-500 font-bold mr-2">✓</span>
        {line}
      </div>
    );
  }

  // 3. Command lines (starts with $ or sudo or docker run)
  if (line.startsWith('$') || line.startsWith('  $') || /^\s*\$\s+/.test(line) || line.includes('docker run') || line.includes('docker build')) {
    return (
      <div key={index} className="text-white font-bold font-mono text-xs py-1.5 border-t border-b border-[#1E1E22] my-2 bg-[#0A0A0B] px-3 rounded flex items-center gap-2">
        <span className="text-neutral-600 font-bold select-none">$</span>
        <span>{line.replace(/^\s*\$\s*/, '')}</span>
      </div>
    );
  }

  // 4. Docker build step logs (e.g., #12 DONE, #12 CACHED, #12 [builder 2/6])
  const dockerStepMatch = line.match(/^#(\d+)\s+(.*)$/);
  if (dockerStepMatch) {
    const stepNum = dockerStepMatch[1];
    const rest = dockerStepMatch[2];
    
    let restColor = 'text-neutral-500';
    if (rest.includes('DONE')) {
      restColor = 'text-green-400/90 font-medium';
    } else if (rest.includes('CACHED')) {
      restColor = 'text-neutral-600 font-light';
    } else if (rest.includes('transferring') || rest.includes('resolve')) {
      restColor = 'text-neutral-500 italic';
    } else {
      restColor = 'text-neutral-300';
    }

    return (
      <div key={index} className="font-mono text-xs flex gap-2 leading-relaxed">
        <span className="text-neutral-600 font-semibold shrink-0 select-none">#{stepNum}</span>
        <span className={restColor}>{rest}</span>
      </div>
    );
  }

  // 5. Framework and tool build outputs (Vite/Next/npm)
  if (/vite/i.test(line) || /transforming/i.test(line) || /built in/i.test(line) || /rendering chunks/i.test(line)) {
    return (
      <div key={index} className="text-purple-400 font-mono text-xs">
        <span className="text-purple-600 mr-2 select-none">⚡</span>
        {line}
      </div>
    );
  }

  // 6. Warnings
  if (/warning/i.test(line) || /notice/i.test(line)) {
    return (
      <div key={index} className="text-yellow-400/90 font-mono text-xs">
        <span className="text-yellow-500 mr-2 select-none">⚠</span>
        {line}
      </div>
    );
  }

  // 7. File outputs or port mappings (e.g. dist/index.html 0.46 kB)
  if (/dist\//.test(line) || /index\.html/.test(line) || /assets\//.test(line) || /\d+\s*kB/.test(line)) {
    return (
      <div key={index} className="text-neutral-500 font-mono pl-5 text-[11px] leading-relaxed">
        {line}
      </div>
    );
  }

  // Default fallback line
  return (
    <div key={index} className="text-neutral-400 font-mono text-xs leading-relaxed">
      {line}
    </div>
  );
};

const formatLogs = (logs: string) => {
  if (!logs) return <div className="text-neutral-600 font-mono text-xs">Initializing logs...</div>;
  const lines = logs.split('\n');
  return lines.map((line, index) => formatLogLine(line, index));
};

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
  rootDirectory: string;
  status: string;
  containerId: string | null;
  assignedPort: number | null;
  createdAt: string;
  deployments: Deployment[];
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // States
  const [user, setUser] = useState<UserSession | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deployments' | 'history' | 'env' | 'settings'>('deployments');
  
  // Deployment Success Notification & Confetti States
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  
  // Interactive historic deployment inspection
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);
  
  // Terminal utility states
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);

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
      
      // Fetch user session
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
        }
      } catch (err) {
        console.error('Failed to fetch user session:', err);
      }

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

  // Status transition listener to trigger notification and confetti on success
  useEffect(() => {
    if (project) {
      if (lastStatus && (lastStatus === 'BUILDING' || lastStatus === 'PENDING') && project.status === 'READY') {
        setShowSuccessNotification(true);
        setTriggerConfetti(true);
        // Automatically hide notification after 6 seconds
        const timer = setTimeout(() => {
          setShowSuccessNotification(false);
        }, 6000);
        return () => clearTimeout(timer);
      }
      setLastStatus(project.status);
    }
  }, [project?.status, lastStatus]);

  // Auto scroll terminal to bottom when logs update
  useEffect(() => {
    if (activeTab === 'deployments' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project?.deployments, activeTab, selectedDeploymentId]);

  // Handle manual deployment trigger
  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: 'POST',
      });
      if (res.ok) {
        setSelectedDeploymentId(null); // Reset selection to view latest
        await fetchProjectDetails();
        setActiveTab('deployments'); // Ensure we are on deployments tab to view progress
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

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING DETAILS...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <p className="font-mono text-sm text-neutral-500">Project not found.</p>
      </div>
    );
  }

  const latestDeployment = project.deployments[0];
  const activeDeployment = project.deployments.find(d => d.id === selectedDeploymentId) || latestDeployment;
  
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
  const projectUrl = baseDomain === 'localhost'
    ? `http://${project.slug}.localhost:${project.assignedPort || '3001'}`
    : `http://${project.slug}.${baseDomain}`;

  // Copy build logs helper
  const handleCopyLogs = () => {
    if (!activeDeployment) return;
    navigator.clipboard.writeText(activeDeployment.logs || '');
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Breadcrumbs element to pass to TopAppBar
  const breadcrumbsElement = (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-mono text-xs uppercase tracking-wider"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      <span className="hidden md:inline font-mono text-xs tracking-widest text-neutral-500 uppercase">/ {project.slug}</span>
    </div>
  );

  return (
    <SidebarLayout 
      user={user} 
      activeLink="projects" 
      breadcrumbs={breadcrumbsElement}
    >
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-layout pb-6">
        <div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-extrabold text-primary tracking-tight flex items-center gap-2.5">
            {project.name}
            {project.status === 'READY' && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-layout bg-[#0B0B0B]">
                <Check className="text-[14px] text-white" size={12} />
              </span>
            )}
          </h2>
          <p className="font-body-md text-body-md text-neutral-500 text-sm font-light mt-1">
            {project.status === 'READY' && latestDeployment
              ? `Active production deployment completed ${getTimeAgo(latestDeployment.completedAt)}`
              : project.status === 'BUILDING'
              ? 'Active production deployment building now...'
              : project.status === 'PENDING'
              ? 'Deployment queued and waiting to build...'
              : project.status === 'FAILED'
              ? 'Last production deployment failed.'
              : 'No active deployments yet.'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <a
            href={project.status === 'READY' && project.assignedPort ? projectUrl : undefined}
            target="_blank"
            rel="noreferrer"
            className={`px-4 py-2 bg-transparent border border-layout rounded text-primary hover:bg-[#111111] transition-colors font-body-sm text-body-sm flex items-center gap-2 ${
              project.status === 'READY' && project.assignedPort ? '' : 'opacity-40 cursor-not-allowed pointer-events-none'
            }`}
          >
            <Globe size={16} />
            Visit URL
          </a>
          <button
            onClick={handleDeploy}
            disabled={deploying || project.status === 'BUILDING' || project.status === 'PENDING'}
            className="px-4 py-2 bg-primary text-black rounded hover:bg-gray-200 transition-colors font-body-sm text-body-sm font-semibold flex items-center gap-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deploying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Redeploy
          </button>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="border-b border-layout flex gap-6 overflow-x-auto">
        {(['deployments', 'history', 'env', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-1 text-sm font-medium tracking-wide transition-all border-b-2 capitalize whitespace-nowrap font-mono text-xs uppercase ${
              activeTab === tab
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab === 'deployments' ? 'Deployments' : tab === 'env' ? 'Environment Variables' : tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 flex flex-col">
        
        {/* Tab 1: Bento Overview Grid */}
        {activeTab === 'deployments' && (
          <div className="flex flex-col gap-6">
            
            {/* Historic deployment banner */}
            {selectedDeploymentId && selectedDeploymentId !== latestDeployment?.id && activeDeployment && (
              <div className="border border-layout bg-[#0B0B0B] px-4 py-3 rounded flex justify-between items-center text-sm font-light">
                <div className="flex items-center gap-2 text-neutral-400">
                  <AlertTriangle size={15} className="text-neutral-500" />
                  <span>
                    Viewing logs and metadata for historic deployment{' '}
                    <span className="font-mono text-white text-xs bg-neutral-900 border border-layout px-1.5 py-0.5 rounded">
                      {activeDeployment.id.slice(0, 8)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDeploymentId(null)}
                  className="text-white hover:underline text-xs font-mono"
                >
                  [View Active Deployment]
                </button>
              </div>
            )}

            {project.deployments.length === 0 ? (
              <div className="border border-layout bg-[#0B0B0B] p-12 text-center rounded flex flex-col items-center justify-center gap-3">
                <Terminal size={32} className="text-neutral-700" />
                <p className="text-neutral-500 text-sm font-light">No deployments found for this project.</p>
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="mt-2 bg-white text-black font-semibold text-xs px-4 py-2 rounded hover:bg-neutral-200 transition-all"
                >
                  Trigger Initial Build
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Metadata & Container Info */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                  
                  {/* Metadata Card */}
                  <div className="bg-[#0B0B0B] border border-layout rounded-lg p-6 flex flex-col gap-4">
                    <h3 className="font-headline-md text-primary uppercase text-xs tracking-wider text-neutral-500 font-mono">
                      Deployment Metadata
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-metadata text-neutral-500 uppercase text-[10px] font-mono">Project</span>
                        <span className="font-body-sm text-primary text-sm font-medium">{project.name}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-metadata text-neutral-500 uppercase text-[10px] font-mono">Branch</span>
                        <span className="font-body-sm text-primary text-sm flex items-center gap-1">
                          <GitBranch size={12} className="text-neutral-400" />
                          main
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-metadata text-neutral-500 uppercase text-[10px] font-mono">Commit</span>
                        {activeDeployment.commitHash ? (
                          <a
                            href={`https://github.com/${project.githubRepo}/commit/${activeDeployment.commitHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-code-sm text-primary hover:underline flex items-center gap-1 font-mono text-xs text-white"
                          >
                            <Terminal size={12} className="text-neutral-400" />
                            {activeDeployment.commitHash.slice(0, 7)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-neutral-500">N/A</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-metadata text-neutral-500 uppercase text-[10px] font-mono">Runtime</span>
                        <span className="font-body-sm text-primary text-sm">{getFrameworkLabel(project.framework)}</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <span className="font-metadata text-neutral-500 uppercase text-[10px] font-mono">Trigger</span>
                        <span className="font-body-sm text-primary text-sm font-light">
                          {activeDeployment.commitHash
                            ? 'GitHub Webhook push to main'
                            : 'Manual Redeployment'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Container Info Card */}
                  <div className="bg-[#0B0B0B] border border-layout rounded-lg p-6 flex flex-col gap-4">
                    <h3 className="font-headline-md text-primary uppercase text-xs tracking-wider text-neutral-500 font-mono">
                      Container Information
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-layout pb-2.5">
                        <span className="font-body-sm text-neutral-500 text-sm">Image</span>
                        <span className="font-code-sm text-primary font-mono text-xs truncate max-w-[150px]" title={`rovel/${project.slug}:latest`}>
                          rovel/{project.slug}:latest
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-layout pb-2.5">
                        <span className="font-body-sm text-neutral-500 text-sm">Container ID</span>
                        <span className="font-code-sm text-primary font-mono text-xs">
                          {project.containerId ? project.containerId.slice(0, 12) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-layout pb-2.5">
                        <span className="font-body-sm text-neutral-500 text-sm">Port</span>
                        <span className="font-code-sm text-primary font-mono text-xs">
                          {project.assignedPort || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-layout pb-2.5">
                        <span className="font-body-sm text-neutral-500 text-sm">Health Status</span>
                        <span className="font-body-sm text-primary flex items-center gap-1.5 text-sm font-medium">
                          <span className={`w-2 h-2 rounded-full ${
                            project.status === 'READY' ? 'bg-white' :
                            project.status === 'BUILDING' ? 'bg-neutral-400 animate-pulse' :
                            project.status === 'FAILED' ? 'bg-red-500' : 'bg-neutral-600 animate-pulse'
                          }`} />
                          {project.status === 'READY' ? 'Ready' :
                           project.status === 'BUILDING' ? 'Building' :
                           project.status === 'PENDING' ? 'Queued' :
                           project.status === 'FAILED' ? 'Failed' : project.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-body-sm text-neutral-500 text-sm">Limits</span>
                        <span className="font-body-sm text-primary text-sm font-light">512MB RAM, 0.5 CPU</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Terminal Logs */}
                <div className="lg:col-span-2 flex flex-col">
                  <div className={`bg-black border border-layout rounded-lg flex flex-col overflow-hidden transition-all duration-300 ${
                    isTerminalExpanded ? 'h-[800px]' : 'h-[600px]'
                  }`}>
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-layout bg-[#0B0B0B]">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Terminal size={14} />
                        <span className="font-body-sm text-xs font-mono uppercase tracking-wider">
                          Build Logs - {activeDeployment.status}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={handleCopyLogs}
                          className="text-neutral-500 hover:text-white transition-colors p-1 rounded hover:bg-neutral-900"
                          title="Copy Logs"
                        >
                          {copiedLogs ? (
                            <Check size={14} className="text-white animate-fade-in" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                          className="text-neutral-500 hover:text-white transition-colors p-1 rounded hover:bg-neutral-900"
                          title={isTerminalExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isTerminalExpanded ? (
                            <Minimize2 size={14} />
                          ) : (
                            <Maximize2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Terminal Body */}
                    <div className="flex-1 p-5 overflow-y-auto font-mono text-[12px] leading-relaxed flex flex-col bg-black text-neutral-300 select-text selection:bg-neutral-850">
                      <div className="white-space-pre-wrap break-all flex-1 select-text space-y-1">
                        {formatLogs(activeDeployment.logs)}
                      </div>
                      
                      {/* Pulsing blinking cursor */}
                      {(activeDeployment.status === 'BUILDING' || activeDeployment.status === 'PENDING') && (
                        <div className="flex gap-3 text-neutral-500 mt-2">
                          <span className="w-1.5 h-3.5 bg-white animate-pulse inline-block"></span>
                        </div>
                      )}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Deployment History Table */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-primary">Deployment History</h3>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Complete build history for this project. Click on any deployment row to inspect its logs and metadata in the overview.
              </p>
            </div>
            
            {project.deployments.length === 0 ? (
              <div className="border border-layout bg-[#0B0B0B] p-12 text-center rounded">
                <p className="text-neutral-500 text-sm font-light">No deployments found for this project.</p>
              </div>
            ) : (
              <div className="border border-layout rounded-lg overflow-hidden bg-[#0B0B0B]">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#050505] border-b border-layout">
                        <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Deployment ID</th>
                        <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Commit</th>
                        <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Status</th>
                        <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Started At</th>
                        <th className="py-3 px-4 font-metadata text-neutral-500 uppercase font-light text-xs font-mono">Completed At</th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm divide-y divide-[#1A1A1A] text-sm text-neutral-300">
                      {project.deployments.map((deployment) => (
                        <tr
                          key={deployment.id}
                          onClick={() => {
                            setSelectedDeploymentId(deployment.id);
                            setActiveTab('deployments');
                          }}
                          className="hover:bg-neutral-950/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4 font-mono text-xs text-neutral-400 group-hover:text-primary transition-colors">
                            {deployment.id.slice(0, 18)}...
                          </td>
                          <td className="py-3.5 px-4">
                            {deployment.commitHash ? (
                              <span className="font-mono bg-neutral-900 border border-layout px-2 py-0.5 rounded text-xs text-white">
                                {deployment.commitHash.slice(0, 7)}
                              </span>
                            ) : (
                              <span className="text-neutral-600 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="flex items-center gap-1.5 text-xs font-light">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                deployment.status === 'READY' ? 'bg-white' :
                                deployment.status === 'BUILDING' ? 'bg-neutral-400 animate-pulse' :
                                deployment.status === 'FAILED' ? 'bg-red-500' : 'bg-neutral-600'
                              }`} />
                              {deployment.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-500 font-light">
                            {new Date(deployment.startedAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-500 font-light">
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
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Environment Variables CRUD */}
        {activeTab === 'env' && (
          <div className="flex flex-col gap-6 max-w-3xl">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-primary">Environment Variables</h3>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Variables are encrypted in the database using AES-256-GCM and injected into your Docker containers at runtime.
              </p>
            </div>

            {envError && (
              <div className="border border-red-900/30 bg-red-950/10 px-4 py-3 rounded text-sm text-red-400 font-mono">
                {envError}
              </div>
            )}

            {envSuccess && (
              <div className="border border-white bg-neutral-950/50 px-4 py-3 rounded text-sm text-white font-mono flex items-center gap-2">
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
                      className="flex-1 bg-black border border-layout rounded px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none transition-colors font-mono uppercase text-primary placeholder:text-neutral-700 placeholder:text-xs text-sm"
                      required={!!ev.value}
                    />
                    <input
                      type="text"
                      placeholder="VALUE"
                      value={ev.value}
                      onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                      disabled={savingEnv}
                      className="flex-1 bg-black border border-layout rounded px-4 py-2.5 text-sm focus:border-neutral-500 focus:outline-none transition-colors font-mono text-primary placeholder:text-neutral-700 placeholder:text-xs text-sm"
                      required={!!ev.key}
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvVarField(index)}
                      disabled={savingEnv}
                      className="p-2.5 border border-layout hover:border-neutral-500 hover:text-white rounded transition-colors text-neutral-500"
                      title="Remove variable"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-4 border-t border-layout pt-4">
                <button
                  type="button"
                  onClick={addEnvVarField}
                  disabled={savingEnv}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-medium border border-layout hover:border-neutral-500 px-3 py-2 rounded bg-neutral-950/20 transition-all"
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

        {/* Tab 4: Project Settings & Danger Zone */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-8 max-w-3xl">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-primary">Project Settings</h3>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Manage configuration and project deletion.
              </p>
            </div>

            {/* Project Meta Details Card */}
            <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4">
              <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                <Cpu size={16} className="text-neutral-500" />
                Configuration Summary
              </h4>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[10px] font-mono uppercase">Project ID</span>
                  <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2 py-1 rounded w-fit select-all">
                    {project.id}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[10px] font-mono uppercase">Root Directory</span>
                  <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2 py-1 rounded w-fit">
                    {project.rootDirectory || '(Repository Root)'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[10px] font-mono uppercase">Docker Container Name</span>
                  <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2 py-1 rounded w-fit select-all font-light">
                    rovel-{project.slug}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[10px] font-mono uppercase">Assigned Port</span>
                  <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2 py-1 rounded w-fit">
                    {project.assignedPort || 'Not Allocated'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-neutral-500 text-[10px] font-mono uppercase">Resource Limits</span>
                  <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2 py-1 rounded w-fit font-light flex items-center gap-1">
                    <HardDrive size={12} className="text-neutral-500" />
                    512MB RAM, 0.5 CPU
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-layout rounded-lg overflow-hidden bg-black">
              <div className="bg-neutral-950 border-b border-layout px-6 py-4 flex items-center gap-3 text-neutral-400 font-medium text-sm uppercase font-mono tracking-wider bg-red-950/5">
                <ShieldAlert className="text-neutral-400" size={18} />
                Danger Zone
              </div>
              <div className="p-6 bg-black flex flex-col sm:flex-row justify-between sm:items-center gap-6 border-t-0">
                <div>
                  <h4 className="font-bold text-base text-primary">Delete this project</h4>
                  <p className="text-neutral-500 text-xs font-light mt-1 max-w-md">
                    Permanently delete this project, its deployment history, environment variables, 
                    and destroy its running Docker container. This action is irreversible.
                  </p>
                </div>
                <button
                  onClick={handleDeleteProject}
                  className="inline-flex items-center justify-center gap-2 border border-layout hover:border-red-900 hover:bg-red-950/20 hover:text-red-500 font-semibold px-4 py-2.5 rounded text-sm text-neutral-400 transition-all active:scale-95 duration-200 shrink-0"
                >
                  <Trash2 size={15} />
                  Delete Project
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Monochrome Confetti Canvas */}
      <MonochromeConfetti 
        active={triggerConfetti} 
        onComplete={() => setTriggerConfetti(false)} 
      />

      {/* Deployment Success Screen Toast Notification */}
      {showSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#131316] border border-white text-white p-5 rounded shadow-2xl max-w-sm flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-bold shrink-0">
              <Check size={12} />
            </div>
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">Deployment Successful</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-primary">{project?.name} is live.</p>
            <p className="text-xs text-neutral-400 font-light leading-normal">
              Your application has been built and deployed to production.
            </p>
          </div>
          <div className="flex gap-2 border-t border-[#1E1E22] pt-3 mt-1">
            <a 
              href={projectUrl}
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-mono bg-white text-black px-3.5 py-2 rounded hover:opacity-90 transition-all font-semibold"
            >
              Visit App
            </a>
            <button 
              onClick={() => setShowSuccessNotification(false)}
              className="text-xs font-mono text-neutral-400 hover:text-white transition-colors border border-[#1E1E22] px-3.5 py-2 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
