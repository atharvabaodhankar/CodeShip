import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { isUserAdminOrThrow } from '@/lib/admin';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    // 1. Gating
    await isUserAdminOrThrow();

    const { target } = await request.json();

    if (!['images', 'containers', 'builds'].includes(target)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    // 2. Execute target operations
    if (target === 'images') {
      console.log('[Admin Prune] Triggering docker image prune...');
      const { stdout } = await execAsync('docker image prune -a -f');
      return NextResponse.json({
        success: true,
        message: 'Unused Docker images successfully pruned',
        output: stdout.trim(),
      });
    }

    if (target === 'containers') {
      console.log('[Admin Prune] Triggering docker container prune...');
      const { stdout } = await execAsync('docker container prune -f');
      return NextResponse.json({
        success: true,
        message: 'Stopped Docker containers successfully pruned',
        output: stdout.trim(),
      });
    }

    if (target === 'builds') {
      console.log('[Admin Prune] Starting safe build folder workspace purge...');
      
      // Get all active building/pending deployments to prevent deleting them
      const activeDeployments = await prisma.deployment.findMany({
        where: {
          status: { in: ['BUILDING', 'PENDING'] },
        },
        select: { id: true },
      });

      const activeIds = new Set(activeDeployments.map((d) => d.id));
      const buildsDir = path.resolve(process.env.BUILDS_DIR || './builds');

      let deletedCount = 0;
      let errorCount = 0;

      if (fs.existsSync(buildsDir)) {
        const folders = await fs.promises.readdir(buildsDir);
        for (const folder of folders) {
          // If the folder matches a deployment ID that is NOT currently building, we delete it
          if (!activeIds.has(folder)) {
            try {
              const folderPath = path.join(buildsDir, folder);
              await fs.promises.rm(folderPath, { recursive: true, force: true });
              deletedCount++;
            } catch (err) {
              console.error(`[Admin Prune] Failed to delete folder ${folder}:`, err);
              errorCount++;
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Wipe complete. Purged ${deletedCount} unused build workspace folders.`,
        details: { deleted: deletedCount, failed: errorCount },
      });
    }

    return NextResponse.json({ error: 'Unsupported target' }, { status: 400 });

  } catch (error: any) {
    console.error('[Admin Prune] API error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
