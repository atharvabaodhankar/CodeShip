import Link from 'next/link';
import { 
  Rocket, Terminal, ArrowRight, Zap, Box, GitBranch, 
  Globe, Cpu, HardDrive, Lock, Shield 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex-grow flex flex-col bg-black text-[#e2e2e2] overflow-x-hidden relative font-sans selection:bg-white selection:text-black">
      {/* Dynamic Scanline Overlay */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scanline {
          width: 100%;
          height: 100px;
          z-index: 10;
          background: linear-gradient(0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0) 100%);
          opacity: 0.1;
          position: absolute;
          bottom: 100%;
          pointer-events: none;
          animation: scanline 8s linear infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }

        .ambient-glow {
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.03);
        }
      `}} />

      {/* Top Header Navigation */}
      <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-page-padding bg-black/80 backdrop-blur-md z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg tracking-tighter text-white font-bold uppercase select-none">Rovel</span>
          <span className="text-[10px] font-mono text-neutral-500 border border-neutral-800 px-1.5 py-0.5 rounded uppercase">v2.4.0</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs text-neutral-400">
          <a className="hover:text-white transition-colors" href="https://github.com" target="_blank" rel="noreferrer">Documentation</a>
          <a className="hover:text-white transition-colors" href="#features">Features</a>
          <a className="hover:text-white transition-colors" href="#specs">Specs</a>
        </nav>
        <div className="flex items-center gap-4">
          <a 
            href="/api/auth/login"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-all"
          >
            Sign In
          </a>
          <a 
            href="/api/auth/login"
            className="bg-white text-black px-4 py-1.5 rounded font-mono font-bold text-xs hover:bg-neutral-200 active:scale-95 transition-all"
          >
            Get Started
          </a>
        </div>
      </header>

      <main className="relative pt-16 flex-grow flex flex-col">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-page-padding overflow-hidden py-16">
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950/50 backdrop-blur-sm mb-4">
              <Rocket className="text-white" size={12} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Now supporting Next.js 15</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl tracking-tight text-white leading-tight font-extrabold">
              Code to container <br />
              <span className="text-neutral-500 italic font-light font-sans">in seconds.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm md:text-base text-neutral-400 font-light leading-relaxed">
              A lightweight, self-hosted PaaS inspired by Render and Vercel. <br className="hidden md:block" />
              Deploy React, Next.js, and Express apps in isolated Docker containers instantly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full sm:w-auto">
              <a 
                href="/api/auth/login"
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-black px-8 py-3.5 rounded font-mono font-bold text-sm hover:bg-neutral-200 transition-colors active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              >
                <Terminal size={16} />
                Connect with GitHub
              </a>
              <a 
                href="#features"
                className="w-full sm:w-auto flex items-center justify-center gap-3 border border-neutral-800 bg-transparent text-white px-8 py-3.5 rounded font-mono font-medium text-sm hover:bg-neutral-900 transition-colors active:scale-95"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Terminal Glimpse */}
          <div className="relative z-10 mt-16 w-full max-w-2xl border border-neutral-800 bg-[#070708] rounded-t-xl overflow-hidden shadow-2xl ambient-glow">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-[#0C0C0E]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-800"></div>
              </div>
              <div className="text-[10px] text-neutral-500 font-mono">rovel --deploy main</div>
              <div className="w-8"></div>
            </div>
            <div className="p-6 font-mono text-[11px] text-left text-neutral-400 space-y-1.5 leading-relaxed">
              <div className="flex gap-4"><span className="text-neutral-700">09:41:02</span> <span className="text-white font-bold">INFO</span> <span>Detecting build environment...</span></div>
              <div className="flex gap-4"><span className="text-neutral-700">09:41:03</span> <span className="text-white font-bold">INFO</span> <span><span className="text-white underline">Next.js</span> project detected.</span></div>
              <div className="flex gap-4"><span className="text-neutral-700">09:41:04</span> <span className="text-white font-bold">INFO</span> <span>Initializing Docker build (isolated sandboxed)...</span></div>
              <div className="flex gap-4"><span className="text-neutral-700">09:41:12</span> <span className="text-white font-bold">INFO</span> <span>Build layer cached. Reducing build time by 84%.</span></div>
              <div className="flex gap-4"><span className="text-neutral-700">09:41:14</span> <span className="text-white font-bold">SUCCESS</span> <span>Deployment live at <span className="underline text-white">my-app-v4.rovel.dev</span></span></div>
              <div className="animate-pulse bg-white h-3.5 w-1.5 inline-block"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-page-padding max-w-6xl mx-auto w-full border-t border-white/5">
          <div className="mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight mb-4 font-extrabold">Engineered for Simplicity.</h2>
            <div className="w-16 h-[2px] bg-white"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: Zero Config */}
            <div className="group border border-neutral-900 bg-[#070708] p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative overflow-hidden rounded-lg">
              <div className="absolute top-0 right-0 p-4 text-neutral-900/40 text-8xl font-display pointer-events-none group-hover:text-neutral-800/30 transition-colors font-extrabold">01</div>
              <div>
                <Zap className="text-white mb-6" size={32} />
                <h3 className="font-display text-lg font-bold text-white mb-3">Zero Config Builds</h3>
                <p className="text-neutral-400 text-xs font-light leading-relaxed">
                  No Dockerfiles required. Rovel automatically analyzes your project code—whether it's React, Node, or Next.js—to compile, build, and deploy without manual intervention.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-neutral-500 group-hover:text-white transition-colors cursor-pointer">
                <span>LEARN MORE</span>
                <ArrowRight size={10} />
              </div>
            </div>

            {/* Feature 2: Isolated Containers */}
            <div className="group border border-neutral-900 bg-[#070708] p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative overflow-hidden rounded-lg">
              <div className="absolute top-0 right-0 p-4 text-neutral-900/40 text-8xl font-display pointer-events-none group-hover:text-neutral-800/30 transition-colors font-extrabold">02</div>
              <div>
                <Box className="text-white mb-6" size={32} />
                <h3 className="font-display text-lg font-bold text-white mb-3">Isolated Containers</h3>
                <p className="text-neutral-400 text-xs font-light leading-relaxed">
                  Every application runs in a sandboxed Docker container with strict resource allocation. Hardware-level security with guaranteed 0.5 CPU and 512MB RAM limits for every process.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-neutral-500 group-hover:text-white transition-colors cursor-pointer">
                <span>VIEW BENCHMARKS</span>
                <ArrowRight size={10} />
              </div>
            </div>

            {/* Feature 3: Git-Ops */}
            <div className="group border border-neutral-900 bg-[#070708] p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative overflow-hidden rounded-lg">
              <div className="absolute top-0 right-0 p-4 text-neutral-900/40 text-8xl font-display pointer-events-none group-hover:text-neutral-800/30 transition-colors font-extrabold">03</div>
              <div>
                <GitBranch className="text-white mb-6" size={32} />
                <h3 className="font-display text-lg font-bold text-white mb-3">Git-Ops Redeployment</h3>
                <p className="text-neutral-400 text-xs font-light leading-relaxed">
                  Integrated webhooks automatically trigger complete rebuilds upon every git push. Experience zero-downtime redeploys with health-check verified container switching.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-neutral-500 group-hover:text-white transition-colors cursor-pointer">
                <span>SETUP WEBHOOKS</span>
                <ArrowRight size={10} />
              </div>
            </div>

            {/* Feature 4: Instant DNS */}
            <div className="group border border-neutral-900 bg-[#070708] p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-300 relative overflow-hidden rounded-lg">
              <div className="absolute top-0 right-0 p-4 text-neutral-900/40 text-8xl font-display pointer-events-none group-hover:text-neutral-800/30 transition-colors font-extrabold">04</div>
              <div>
                <Globe className="text-white mb-6" size={32} />
                <h3 className="font-display text-lg font-bold text-white mb-3">Instant DNS &amp; Nginx</h3>
                <p className="text-neutral-400 text-xs font-light leading-relaxed">
                  Each project gets an automatic, isolated subdomain routed instantly via dynamically reloaded Nginx blocks. Manage SSL/TLS certificates and custom domains with a single click.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-neutral-500 group-hover:text-white transition-colors cursor-pointer">
                <span>NETWORK SETTINGS</span>
                <ArrowRight size={10} />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Specs Strip */}
        <section id="specs" className="py-12 border-y border-neutral-900 bg-[#070708] overflow-hidden w-full select-none">
          <div className="flex items-center gap-12 whitespace-nowrap px-page-padding opacity-40 hover:opacity-100 transition-opacity font-mono text-xs text-white">
            <div className="flex items-center gap-2 font-bold uppercase"><Cpu size={14} /> 0.5 CORE CPU LIMIT</div>
            <div className="flex items-center gap-2 font-bold uppercase"><HardDrive size={14} /> 512MB RAM QUOTA</div>
            <div className="flex items-center gap-2 font-bold uppercase"><Lock size={14} /> TLS 1.3 AUTO-SSL</div>
            <div className="flex items-center gap-2 font-bold uppercase"><Zap size={14} /> 0ms EDGE ROUTING</div>
            <div className="flex items-center gap-2 font-bold uppercase"><Terminal size={14} /> GITHUB ACTION NATIVE</div>
            {/* Duplication for continuous scroll simulation */}
            <div className="flex items-center gap-2 font-bold uppercase"><Cpu size={14} /> 0.5 CORE CPU LIMIT</div>
            <div className="flex items-center gap-2 font-bold uppercase"><HardDrive size={14} /> 512MB RAM QUOTA</div>
            <div className="flex items-center gap-2 font-bold uppercase"><Lock size={14} /> TLS 1.3 AUTO-SSL</div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-32 px-page-padding flex flex-col items-center text-center">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]"></div>
          </div>
          <div className="relative z-10 space-y-6 max-w-3xl flex flex-col items-center">
            <h2 className="font-display text-4xl md:text-5xl text-white tracking-tight font-extrabold">Ready to ship?</h2>
            <p className="text-neutral-400 text-sm max-w-lg leading-relaxed font-light">Join thousands of developers deploying infrastructure with absolute precision and zero overhead.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 w-full sm:w-auto">
              <a 
                href="/api/auth/login"
                className="px-8 py-3.5 bg-white text-black font-mono font-bold rounded text-sm hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
              >
                Get Started for Free
              </a>
              <div className="text-neutral-500 font-mono text-[10px] border-l border-neutral-800 pl-6 text-left leading-normal">
                $0 / month<br />
                No credit card required
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-neutral-900 py-12 px-page-padding">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="font-display text-lg tracking-tighter text-white font-bold uppercase">Rovel</div>
            <p className="text-neutral-500 text-xs font-light">Infrastructure for developers who build at the speed of thought.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 text-[10px] font-mono text-neutral-500">
            <span>© 2026 ROVEL. ALL RIGHTS RESERVED.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scanline Effect */}
      <div className="scanline"></div>
    </div>
  );
}
