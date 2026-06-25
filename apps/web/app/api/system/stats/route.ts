import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper to calculate CPU times average
function getCpuAverage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  
  cpus.forEach((core) => {
    for (const type in core.times) {
      total += (core.times as any)[type];
    }
    idle += core.times.idle;
  });
  
  return { 
    idle: idle / cpus.length, 
    total: total / cpus.length 
  };
}

// Function to calculate CPU load % over a short sample window
async function getCpuUsage(): Promise<number> {
  const start = getCpuAverage();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const end = getCpuAverage();
  
  const idleDifference = end.idle - start.idle;
  const totalDifference = end.total - start.total;
  
  if (totalDifference === 0) return 0;
  
  const cpuPercentage = Math.round(100 - (100 * idleDifference / totalDifference));
  return Math.max(0, Math.min(100, cpuPercentage));
}

// Function to calculate Memory usage %
function getMemoryUsage(): number {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return Math.round((usedMem / totalMem) * 100);
}

// Function to calculate Disk usage %
async function getDiskUsage(): Promise<number> {
  try {
    if (process.platform === 'win32') {
      // Windows: Query C: drive space using PowerShell
      const { stdout } = await execAsync('powershell -Command "Get-PSDrive C | Select-Object Used, Free"');
      const lines = stdout.trim().split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes('---') && !l.toLowerCase().includes('used'));
      
      if (lines.length >= 1) {
        const parts = lines[0].split(/\s+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const used = parts[0];
          const free = parts[1];
          const total = used + free;
          return Math.round((used / total) * 100);
        }
      }
    } else {
      // Linux/macOS: Query root filesystem space
      const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
      const cleanOutput = stdout.replace('%', '').trim();
      return parseInt(cleanOutput) || 45;
    }
  } catch (e) {
    console.error('Failed to get disk usage:', e);
  }
  return 45; // Default fallback
}

export async function GET() {
  try {
    const [cpu, memory, disk] = await Promise.all([
      getCpuUsage(),
      Promise.resolve(getMemoryUsage()),
      getDiskUsage()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        cpu,
        memory,
        disk
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
