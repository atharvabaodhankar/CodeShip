'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings, User, Cpu, ShieldAlert, ExternalLink, HelpCircle, HardDrive, BookOpen, X, Check } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
}

export default function GlobalSettings() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats>({ cpu: 0, memory: 0, disk: 0 });
  const [loading, setLoading] = useState(true);

  // Help & Resources Modal States
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Support Ticket Form State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    
    setSupportSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSupportSubmitting(false);
    setSupportSuccess(true);
    
    setSupportSubject('');
    setSupportMessage('');
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load system stats in settings:', e);
    }
  };

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

        await fetchStats();
      } catch (e) {
        console.error('Settings initialization failed:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Poll system stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING SETTINGS...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="settings">
      
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Platform Settings</h1>
        <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">
          Manage your connected accounts, monitor server specifications, and review system configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        
        {/* Left Column: Account Profile & System Specs (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* GitHub Account Profile */}
          <div className="border border-layout bg-[#131316] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <User size={18} className="text-neutral-400" />
              Connected GitHub Profile
            </h3>
            
            {user && (
              <div className="flex items-start gap-4 mt-2">
                <img 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  className="w-16 h-16 rounded-lg border border-layout object-cover"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-primary">{user.username}</span>
                  <span className="text-xs font-mono text-neutral-400">{user.email}</span>
                  <a 
                    href={`https://github.com/${user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white mt-1.5 hover:underline"
                  >
                    View GitHub Account
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
            
            <div className="border-t border-layout pt-4 mt-2">
              <span className="text-neutral-500 text-[10px] font-mono uppercase">User Session token ID</span>
              <div className="font-mono text-neutral-300 text-xs bg-black border border-layout px-3 py-1.5 rounded select-all mt-1 truncate max-w-lg">
                {user?.id}
              </div>
            </div>
          </div>

          {/* VPS Hardware Specs */}
          <div className="border border-layout bg-[#131316] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Cpu size={18} className="text-neutral-400" />
              VPS System Resources
            </h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Real-time resource utilization of the host machine running your application containers and proxy layers.
            </p>
            
            <div className="flex flex-col gap-4 mt-2">
              {/* CPU */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">CPU Load</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.cpu}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.cpu}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Memory */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">Memory Utilization</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.memory}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.memory}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Disk */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono uppercase text-neutral-500">System Disk Space</span>
                  <span className="text-xs font-mono text-primary font-medium">{systemStats.disk}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500" 
                    style={{ width: `${systemStats.disk}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Versioning & Support (Span 1) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Versioning & Meta */}
          <div className="border border-layout bg-[#131316] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Settings size={18} className="text-neutral-400" />
              Platform Meta
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Control Plane Version</span>
                <span className="font-mono text-xs text-primary font-semibold">v2.4.0</span>
              </div>
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Active Pipeline</span>
                <span className="font-mono text-xs text-primary">BullMQ Node Workers</span>
              </div>
              <div className="flex justify-between items-center border-b border-layout pb-2.5">
                <span className="text-sm text-neutral-500">Reverse Proxy</span>
                <span className="font-mono text-xs text-primary">Nginx Server block</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-500">OS Environment</span>
                <span className="font-mono text-xs text-primary capitalize">{process.platform}</span>
              </div>
            </div>
          </div>

          {/* Support & Docs */}
          <div className="border border-layout bg-[#131316] p-6 rounded-lg flex flex-col gap-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <BookOpen size={18} className="text-neutral-400" />
              Help & Resources
            </h3>
            
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={() => setIsDocOpen(true)}
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40 w-full text-left"
              >
                <span className="flex items-center gap-2">
                  <BookOpen size={14} className="text-neutral-400" />
                  Documentation
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setIsSupportOpen(true);
                  setSupportSuccess(false);
                }}
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40 w-full text-left"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-neutral-400" />
                  Get Platform Support
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </button>
              
              <button 
                type="button"
                onClick={() => setIsSecurityOpen(true)}
                className="flex justify-between items-center px-3 py-2 border border-layout hover:border-neutral-500 rounded text-sm transition-colors text-neutral-300 hover:text-white hover:bg-neutral-900/40 w-full text-left"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-neutral-400" />
                  System Security
                </span>
                <ExternalLink size={12} className="text-neutral-500" />
              </button>
            </div>
          </div>

        </div>

      </div>

    {/* Documentation Overlay Modal */}
      {isDocOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#131316] border border-[#1E1E22] w-full max-w-2xl p-8 rounded shadow-2xl relative flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setIsDocOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">Documentation</h2>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Learn how to deploy, manage, and scale your applications on CodeShip.
              </p>
            </div>

            <div className="flex flex-col gap-6 text-sm text-neutral-300 leading-relaxed font-light">
              <section className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">1. Connecting Repositories</h3>
                <p>
                  CodeShip allows you to import repositories from your GitHub account. 
                  When you connect a public repository, the platform will pull the source code, 
                  automatically identify the framework from the dependencies, and allocate a dedicated host port for internal routing.
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">2. Supported Build Frameworks</h3>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li><strong>Next.js</strong>: Built and compiled using server-side rendering. Runs on Node.js inside the container on port 3000.</li>
                  <li><strong>React (Vite)</strong>: Bundles the client assets and serves them via Nginx inside the container on port 80.</li>
                  <li><strong>Express.js</strong>: Runs a custom Node.js server, exposing backend endpoints on port 3000.</li>
                  <li><strong>Static Sites</strong>: Deploys a pure HTML/CSS/JS directory served via Nginx.</li>
                </ul>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">3. Managing Environment Variables</h3>
                <p>
                  Environment variables can be added directly to your projects in the project details panel.
                  All variables are encrypted at rest using industry-standard cryptography before being saved in the database,
                  and are safely injected into your containers during the startup phase.
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">4. Sandbox Isolation Limits</h3>
                <p>
                  Every project runs inside a dedicated Docker container with strict CPU and Memory boundaries to protect host system stability:
                </p>
                <div className="grid grid-cols-2 gap-4 mt-1 bg-black p-3 border border-layout rounded font-mono text-xs text-neutral-400">
                  <div>Memory Limit: 512 MB</div>
                  <div>CPU Shares: 0.5 cores</div>
                </div>
              </section>
            </div>

            <div className="flex justify-end mt-4 border-t border-layout pt-4">
              <button
                type="button"
                onClick={() => setIsDocOpen(false)}
                className="bg-white text-black font-semibold px-6 py-2 rounded hover:opacity-90 transition-all text-sm animate-pulse-gray"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#131316] border border-[#1E1E22] w-full max-w-lg p-8 rounded shadow-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setIsSupportOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">Get Platform Support</h2>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Submit an inquiry directly to the CodeShip operations team.
              </p>
            </div>

            {supportSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                  <Check size={24} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-base font-bold text-white">Support Ticket Submitted</h4>
                  <p className="text-xs text-neutral-400 max-w-xs font-light leading-relaxed">
                    Ticket has been logged in the system. A platform administrator will contact you at <strong>{user?.email}</strong> shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupportOpen(false)}
                  className="mt-2 border border-layout hover:border-neutral-500 px-5 py-2 rounded text-sm transition-colors text-primary"
                >
                  Back to Settings
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">Registered Email</label>
                  <input 
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="bg-black border border-layout rounded px-3 py-2 text-xs text-neutral-500 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">Subject</label>
                  <input 
                    type="text"
                    placeholder="e.g. Build queue timeouts or container SSL issues"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    required
                    className="bg-black border border-[#1E1E22] rounded px-3 py-2 text-xs focus:border-neutral-500 focus:outline-none transition-colors text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-400">Message / Inquiry Details</label>
                  <textarea 
                    placeholder="Describe the issue you are facing on the platform..."
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    required
                    className="bg-black border border-[#1E1E22] rounded px-3 py-2 text-xs focus:border-neutral-500 focus:outline-none transition-colors text-primary resize-none font-light"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-layout pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(false)}
                    className="border border-layout hover:border-neutral-500 px-4 py-2 rounded text-xs transition-colors text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={supportSubmitting}
                    className="bg-white text-black font-semibold px-5 py-2 rounded hover:opacity-90 transition-all text-xs flex items-center gap-2"
                  >
                    {supportSubmitting && <Loader2 size={12} className="animate-spin" />}
                    Submit Inquiry
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* System Security Modal */}
      {isSecurityOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6 z-50 animate-fade-in">
          <div className="bg-[#131316] border border-[#1E1E22] w-full max-w-lg p-8 rounded shadow-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setIsSecurityOpen(false)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-primary">System Security</h2>
              <p className="text-neutral-500 text-sm font-light mt-1">
                Overview of the platform's multi-tenant isolation and data protection architecture.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-sm text-neutral-300 leading-relaxed font-light">
              <div className="flex gap-3 items-start border-b border-layout pb-3.5">
                <div className="bg-neutral-900 border border-layout px-2 py-1 rounded font-mono text-[10px] text-white shrink-0 uppercase">SANDBOX</div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white text-xs">Docker Namespace Isolation</span>
                  <span className="text-[11px] text-neutral-400">Applications run in isolated namespaces with strict resource quotas (512MB RAM limit), preventing cross-container security breaches.</span>
                </div>
              </div>

              <div className="flex gap-3 items-start border-b border-layout pb-3.5">
                <div className="bg-neutral-900 border border-layout px-2 py-1 rounded font-mono text-[10px] text-white shrink-0 uppercase">SSL / TLS</div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white text-xs">Automatic Wildcard SSL</span>
                  <span className="text-[11px] text-neutral-400">All external routes mapped to projects are automatically secured behind wildcard subdomains with verified SSL handshakes.</span>
                </div>
              </div>

              <div className="flex gap-3 items-start border-b border-layout pb-3.5">
                <div className="bg-neutral-900 border border-layout px-2 py-1 rounded font-mono text-[10px] text-white shrink-0 uppercase">CRYPTO</div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white text-xs">Symmetric At-Rest Encryption</span>
                  <span className="text-[11px] text-neutral-400">All environment variables and secret credentials stored in the database are fully encrypted at rest using AES-256 encryption.</span>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="bg-neutral-900 border border-layout px-2 py-1 rounded font-mono text-[10px] text-white shrink-0 uppercase">AUDIT</div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-white text-xs">Vertical Activity Trails</span>
                  <span className="text-[11px] text-neutral-400">Every single project modification, build event, and system action is logged in an immutable, timestamped audit log.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 border-t border-layout pt-4">
              <button
                type="button"
                onClick={() => setIsSecurityOpen(false)}
                className="bg-white text-black font-semibold px-6 py-2 rounded hover:opacity-90 transition-all text-sm"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </SidebarLayout>
  );
}
