import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { isUserAdminOrThrow } from '@/lib/admin';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Gating
    await isUserAdminOrThrow();

    const { id } = await params;
    const { action } = await request.json();

    if (!['start', 'stop', 'restart', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // 2. Fetch project
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isWin = process.platform === 'win32';
    const containerId = project.containerId;

    // 3. Execute actions
    if (action === 'start') {
      if (!containerId) {
        return NextResponse.json({ error: 'No container exists for this project' }, { status: 400 });
      }
      await execAsync(`docker start ${containerId}`);
      await prisma.project.update({
        where: { id },
        data: { status: 'READY' },
      });
      return NextResponse.json({ success: true, message: 'Container started' });
    }

    if (action === 'stop') {
      if (!containerId) {
        return NextResponse.json({ error: 'No container exists for this project' }, { status: 400 });
      }
      await execAsync(`docker stop ${containerId}`);
      await prisma.project.update({
        where: { id },
        data: { status: 'FAILED' }, // We mark as failed to indicate it's not running/ready
      });
      return NextResponse.json({ success: true, message: 'Container stopped' });
    }

    if (action === 'restart') {
      if (!containerId) {
        return NextResponse.json({ error: 'No container exists for this project' }, { status: 400 });
      }
      await execAsync(`docker restart ${containerId}`);
      await prisma.project.update({
        where: { id },
        data: { status: 'READY' },
      });
      return NextResponse.json({ success: true, message: 'Container restarted' });
    }

    if (action === 'delete') {
      // 3.1. Stop and remove container
      if (containerId) {
        try {
          console.log(`[Admin Delete] Stopping container ${containerId}...`);
          await execAsync(`docker stop ${containerId}`);
        } catch (e) {
          console.error('[Admin Delete] Failed to stop container:', e);
        }
        try {
          console.log(`[Admin Delete] Removing container ${containerId}...`);
          await execAsync(`docker rm ${containerId}`);
        } catch (e) {
          console.error('[Admin Delete] Failed to remove container:', e);
        }
      }

      // 3.2. Delete Nginx config
      const nginxConfigPath = isWin
        ? path.resolve(`./nginx_logs/${project.slug}.conf`)
        : `/etc/nginx/sites-enabled/${project.slug}.conf`;

      try {
        if (fs.existsSync(nginxConfigPath)) {
          await fs.promises.unlink(nginxConfigPath);
          console.log(`[Admin Delete] Purged Nginx config: ${nginxConfigPath}`);
        }
      } catch (e) {
        console.error('[Admin Delete] Failed to delete Nginx config file:', e);
      }

      // 3.3. Reload Nginx on Linux
      if (!isWin) {
        try {
          await execAsync('sudo nginx -s reload');
          console.log('[Admin Delete] Nginx proxy reloaded');
        } catch (e) {
          console.error('[Admin Delete] Failed to reload Nginx:', e);
        }
      }

      // 3.4. Transactional DB deletion to clean up deployments, env variables, and the project
      await prisma.$transaction([
        prisma.deployment.deleteMany({ where: { projectId: id } }),
        prisma.environmentVariable.deleteMany({ where: { projectId: id } }),
        prisma.project.delete({ where: { id } }),
      ]);

      return NextResponse.json({ success: true, message: 'Project and all associated resources successfully deleted' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  } catch (error: any) {
    console.error(`[Admin Project Control] Action error:`, error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
