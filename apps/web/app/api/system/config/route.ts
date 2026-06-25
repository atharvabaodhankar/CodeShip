import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
import { getDeploymentQueue } from '@/lib/queue';
import fs from 'fs';
import net from 'net';

// Helper function to check if the Docker socket/pipe is reachable
async function checkDockerStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const socketPath = isWin ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    
    // On Linux, check if socket file exists first
    if (!isWin && !fs.existsSync(socketPath)) {
      resolve(false);
      return;
    }
    
    // Attempt to open a connection to the socket/named pipe
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
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Diagnose Database Connection
    let dbActive = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbActive = true;
    } catch (e) {
      console.error('[Diagnostics] Database connection failed:', e);
    }

    // 2. Diagnose Redis Connection via BullMQ client
    let redisActive = false;
    try {
      const queue = getDeploymentQueue();
      const client = await queue.client;
      if (client && (client.status === 'ready' || client.status === 'connect')) {
        redisActive = true;
      }
    } catch (e) {
      console.error('[Diagnostics] Redis queue connection failed:', e);
    }

    // 3. Diagnose Docker Socket Connection
    const dockerActive = await checkDockerStatus();

    return NextResponse.json({
      success: true,
      services: {
        database: dbActive ? 'ACTIVE' : 'INACTIVE',
        redis: redisActive ? 'ACTIVE' : 'INACTIVE',
        docker: dockerActive ? 'ACTIVE' : 'INACTIVE',
      },
      config: {
        baseDomain: process.env.BASE_DOMAIN || 'localhost',
        portRange: `${process.env.PORT_RANGE_START || 3001} - ${process.env.PORT_RANGE_END || 9999}`,
        buildsDir: process.env.BUILDS_DIR || './builds',
        limits: '512MB RAM, 0.5 CPU cores per container',
      }
    });
  } catch (error: any) {
    console.error('[Diagnostics] System diagnostics failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
