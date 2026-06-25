'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, History, Check, RefreshCw, AlertTriangle, Plus, Terminal } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface EventItem {
  id: string;
  type: 'PROJECT_CREATED' | 'BUILD_STARTED' | 'BUILD_SUCCESS' | 'BUILD_FAILED' | 'BUILD_QUEUED';
  projectName: string;
  projectId: string;
  commitHash?: string | null;
  time: string;
  details?: string;
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function GlobalActivity() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch projects to derive creation events
        const projectsRes = await fetch('/api/projects');
        // Fetch deployments to derive build events
        const deploymentsRes = await fetch('/api/deployments');

        if (projectsRes.ok && deploymentsRes.ok) {
          const projectsData = await projectsRes.json();
          const deploymentsData = await deploymentsRes.json();

          const rawProjects = projectsData.projects || [];
          const rawDeployments = deploymentsData.deployments || [];

          // Build chronological audit log events
          const derivedEvents: EventItem[] = [];

          // 1. Add project creation events
          rawProjects.forEach((p: any) => {
            derivedEvents.push({
              id: `proj-create-${p.id}`,
              type: 'PROJECT_CREATED',
              projectName: p.name,
              projectId: p.id,
              time: p.createdAt,
              details: `Project connected to repository ${p.githubRepo} utilizing the ${p.framework} template.`
            });
          });

          // 2. Add deployment events
          rawDeployments.forEach((d: any) => {
            const commitInfo = d.commitHash ? `commit ${d.commitHash.slice(0, 7)}` : 'manual trigger';
            
            if (d.status === 'READY') {
              derivedEvents.push({
                id: `dep-success-${d.id}`,
                type: 'BUILD_SUCCESS',
                projectName: d.project.name,
                projectId: d.projectId,
                commitHash: d.commitHash,
                time: d.completedAt || d.startedAt,
                details: `Production container build succeeded for ${commitInfo}. Assigned Port: ${d.project.assignedPort || 'N/A'}.`
              });
            } else if (d.status === 'FAILED') {
              derivedEvents.push({
                id: `dep-fail-${d.id}`,
                type: 'BUILD_FAILED',
                projectName: d.project.name,
                projectId: d.projectId,
                commitHash: d.commitHash,
                time: d.completedAt || d.startedAt,
                details: `Production container build failed for ${commitInfo}. Review logs for details.`
              });
            } else if (d.status === 'BUILDING') {
              derivedEvents.push({
                id: `dep-build-${d.id}`,
                type: 'BUILD_STARTED',
                projectName: d.project.name,
                projectId: d.projectId,
                commitHash: d.commitHash,
                time: d.startedAt,
                details: `Compiling, building, and provisioning container resources for ${commitInfo}...`
              });
            } else if (d.status === 'PENDING') {
              derivedEvents.push({
                id: `dep-queue-${d.id}`,
                type: 'BUILD_QUEUED',
                projectName: d.project.name,
                projectId: d.projectId,
                commitHash: d.commitHash,
                time: d.startedAt,
                details: `Redeployment enqueued in BullMQ for ${commitInfo}. Waiting to build.`
              });
            }
          });

          // Sort events chronologically, newest first
          derivedEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          setEvents(derivedEvents);
        }
      } catch (e) {
        console.error('Failed to compile activity logs:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

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

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING AUDIT LOGS...</p>
      </div>
    );
  }

  return (
    <SidebarLayout user={user} activeLink="activity">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight">Platform Activity</h1>
        <p className="font-body-md text-body-md text-neutral-500 text-sm font-light">
          Chronological audit trail of all project initializations and container orchestrations.
        </p>
      </div>

      <div className="card-bg border border-layout rounded-lg p-6 flex flex-col mt-2 min-h-[400px]">
        
        <div className="border-b border-layout pb-3 mb-6 flex justify-between items-center bg-[#0B0B0B]/0">
          <h2 className="font-headline-md text-primary flex items-center gap-2 font-semibold text-sm uppercase font-mono tracking-wider">
            <History size={14} /> Audit Trail Log
          </h2>
          <span className="text-xs font-mono text-neutral-500">{events.length} system events</span>
        </div>

        <div className="space-y-6 select-none pl-2 max-w-4xl">
          {events.length === 0 ? (
            <div className="text-center text-neutral-600 text-xs py-16 font-light font-mono">
              NO SYSTEM EVENTS FOUND IN AUDIT LOGS
            </div>
          ) : (
            events.map((item, index) => {
              // Determine icon and color based on event type
              let Icon = Terminal;
              let iconColor = 'text-white';
              let badgeText = 'System Event';

              if (item.type === 'PROJECT_CREATED') {
                Icon = Plus;
                badgeText = 'Project Created';
              } else if (item.type === 'BUILD_SUCCESS') {
                Icon = Check;
                badgeText = 'Deployment Succeeded';
              } else if (item.type === 'BUILD_FAILED') {
                Icon = AlertTriangle;
                iconColor = 'text-red-500';
                badgeText = 'Deployment Failed';
              } else if (item.type === 'BUILD_STARTED') {
                Icon = RefreshCw;
                badgeText = 'Build Started';
              } else if (item.type === 'BUILD_QUEUED') {
                Icon = Terminal;
                badgeText = 'Build Queued';
              }

              return (
                <div 
                  key={item.id}
                  onClick={() => router.push(`/projects/${item.projectId}`)}
                  className="flex gap-4 relative before:absolute before:left-[11px] before:top-6 before:bottom-[-24px] before:w-[1px] before:bg-layout last:before:hidden cursor-pointer group"
                >
                  {/* Event Icon Block */}
                  <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-layout flex items-center justify-center shrink-0 z-10 group-hover:border-neutral-500 transition-colors">
                    <Icon size={12} className={`${iconColor} ${item.type === 'BUILD_STARTED' ? 'animate-spin' : ''}`} />
                  </div>
                  
                  {/* Event Details Block */}
                  <div className="flex flex-col pb-2 select-text">
                    <span className="font-body-md text-sm text-primary group-hover:underline decoration-neutral-500 font-semibold flex items-center gap-2">
                      {badgeText}
                      <span className="font-normal text-neutral-500 text-xs">— {item.projectName}</span>
                    </span>
                    
                    <span className="text-xs text-neutral-400 font-light mt-1 max-w-2xl leading-relaxed">
                      {item.details}
                    </span>
                    
                    <span className="font-metadata text-neutral-600 mt-1.5 text-[10px] font-mono">
                      {getTimeAgo(item.time)} ({new Date(item.time).toLocaleString()})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
