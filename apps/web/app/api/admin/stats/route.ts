import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { isUserAdminOrThrow } from '@/lib/admin';
import { getDeploymentQueue } from '@/lib/queue';
import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import fs from 'fs';

const execAsync = promisify(exec);

// Helper to check Docker socket
async function checkDockerStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const socketPath = isWin ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    
    if (!isWin && !fs.existsSync(socketPath)) {
      resolve(false);
      return;
    }
    
    const client = net.createConnection(socketPath);
    client.on('connect', () => {
      client.end();
      resolve(true);
    });
    client.on('error', () => {
      resolve(false);
    });
  });
}

export async function GET() {
  try {
    // 1. Gating
    await isUserAdminOrThrow();

    // 2. Fetch Database Metrics
    const [userCount, projectCount, deploymentCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.deployment.count(),
    ]);

    // 3. Service Connectivity Check
    let dbActive = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbActive = true;
    } catch {}

    let redisActive = false;
    let queueStats = { active: 0, waiting: 0, completed: 0, failed: 0 };
    try {
      const queue = getDeploymentQueue();
      const client = await queue.client;
      if (client && (client.status === 'ready' || client.status === 'connect')) {
        redisActive = true;
        const counts = await queue.getJobCounts('active', 'waiting', 'completed', 'failed');
        queueStats = {
          active: counts.active || 0,
          waiting: counts.waiting || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
        };
      }
    } catch (e) {
      console.error('[Admin Stats] Redis error:', e);
    }

    const dockerActive = await checkDockerStatus();

    // 4. Docker CLI Telemetry
    let runningContainers = 0;
    let totalContainers = 0;
    let dockerVersion = 'N/A';
    
    if (dockerActive) {
      try {
        const { stdout: psActive } = await execAsync('docker ps -q');
        runningContainers = psActive.trim().split('\n').filter(Boolean).length;

        const { stdout: psAll } = await execAsync('docker ps -a -q');
        totalContainers = psAll.trim().split('\n').filter(Boolean).length;

        const { stdout: version } = await execAsync('docker --version');
        dockerVersion = version.trim();
      } catch (e) {
        console.error('[Admin Stats] Docker CLI queries failed:', e);
      }
    }

    // 5. Host Resource Calculations (using basic OS stats or mockup fallback if platform-specific commands fail)
    // We can show high-level diagnostics
    return NextResponse.json({
      success: true,
      metrics: {
        users: userCount,
        projects: projectCount,
        deployments: deploymentCount,
      },
      services: {
        database: dbActive ? 'ACTIVE' : 'INACTIVE',
        redis: redisActive ? 'ACTIVE' : 'INACTIVE',
        docker: dockerActive ? 'ACTIVE' : 'INACTIVE',
      },
      docker: {
        version: dockerVersion,
        runningContainers,
        totalContainers,
      },
      queue: queueStats,
    });

  } catch (error: any) {
    console.error('[Admin Stats] API error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
