'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sliders, Cpu, Database, HardDrive, HelpCircle, RefreshCw } from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

interface SystemConfig {
  services: {
    database: 'ACTIVE' | 'INACTIVE';
    redis: 'ACTIVE' | 'INACTIVE';
    docker: 'ACTIVE' | 'INACTIVE';
  };
  config: {
    baseDomain: string;
    portRange: string;
    buildsDir: string;
    limits: string;
  };
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export default function SystemConfiguration() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [diagnostics, setDiagnostics] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/system/config');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (e) {
      console.error('Failed to load system diagnostics:', e);
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

        await fetchDiagnostics();
      } catch (e) {
        console.error('Initialization failed:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDiagnostics();
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-black text-white h-screen">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
        <p className="font-mono text-sm tracking-widest text-neutral-500">LOADING DIAGNOSTICS...</p>
      </div>
    );
  }

  const services = diagnostics?.services || { database: 'INACTIVE', redis: 'INACTIVE', docker: 'INACTIVE' };
  const config = diagnostics?.config || { baseDomain: 'N/A', portRange: 'N/A', buildsDir: 'N/A', limits: 'N/A' };

  return (
    <SidebarLayout user={user} activeLink="config">
      
      {/* Title & Actions */}
      <div className="flex justify-between items-end border-b border-layout pb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary mb-1 tracking-tight flex items-center gap-2.5">
            System Diagnostics
          </h1>
          <p className="font-body-md text-body-md text-neutral-500 text-sm font-light mt-1">
            Real-time status of backend services and active platform configurations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 border border-layout hover:border-neutral-500 rounded text-primary hover:bg-[#111111] transition-colors font-body-sm text-body-sm flex items-center gap-2"
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh Diagnostics
        </button>
      </div>

      {/* Services Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        
        {/* Database Status */}
        <div className="card-bg border border-layout rounded-lg p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">Database Service</span>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Database size={16} className="text-neutral-400" />
                PostgreSQL Engine
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              services.database === 'ACTIVE'
                ? 'bg-neutral-950 border-white text-white'
                : 'bg-red-950/20 border-red-900/30 text-red-500'
            }`}>
              {services.database === 'ACTIVE' ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-light mt-4">
            Stores project meta-information, encrypted environment variables, and build logs history.
          </p>
        </div>

        {/* Redis Status */}
        <div className="card-bg border border-layout rounded-lg p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">Queue Broker</span>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <HardDrive size={16} className="text-neutral-400" />
                Redis & BullMQ
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              services.redis === 'ACTIVE'
                ? 'bg-neutral-950 border-white text-white'
                : 'bg-red-950/20 border-red-900/30 text-red-500'
            }`}>
              {services.redis === 'ACTIVE' ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-light mt-4">
            Manages background build job queuing, job state locks, and real-time build concurrency.
          </p>
        </div>

        {/* Docker Status */}
        <div className="card-bg border border-layout rounded-lg p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">Container Runtime</span>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Cpu size={16} className="text-neutral-400" />
                Docker Engine Socket
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              services.docker === 'ACTIVE'
                ? 'bg-neutral-950 border-white text-white'
                : 'bg-red-950/20 border-red-900/30 text-red-500'
            }`}>
              {services.docker === 'ACTIVE' ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 font-light mt-4">
            Deploys, monitors, and runs your applications in isolated system containers via socket pipes.
          </p>
        </div>

      </div>

      {/* Configuration Parameters Card */}
      <div className="border border-layout bg-[#0B0B0B] p-6 rounded-lg flex flex-col gap-4 mt-2">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <Sliders size={18} className="text-neutral-400" />
          Active Configuration Parameters
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mt-2">
          <div className="flex flex-col gap-1.5 border-b border-layout pb-4">
            <span className="text-neutral-500 text-[10px] font-mono uppercase">Routing Wildcard Domain</span>
            <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2.5 py-1 rounded w-fit">
              {config.baseDomain === 'localhost' ? '*.localhost' : `*.${config.baseDomain}`}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-b border-layout pb-4">
            <span className="text-neutral-500 text-[10px] font-mono uppercase">Internal Port Allocation Range</span>
            <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2.5 py-1 rounded w-fit font-light">
              {config.portRange}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 sm:border-b-0 pb-4 sm:pb-0">
            <span className="text-neutral-500 text-[10px] font-mono uppercase">Build Storage Path</span>
            <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2.5 py-1 rounded w-fit select-all font-light">
              {config.buildsDir}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-neutral-500 text-[10px] font-mono uppercase">Default Resource Limits</span>
            <span className="font-mono text-neutral-300 text-sm bg-black border border-layout px-2.5 py-1 rounded w-fit font-light">
              {config.limits}
            </span>
          </div>
        </div>
      </div>

    </SidebarLayout>
  );
}
