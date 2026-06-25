import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { isUserAdminOrThrow } from '@/lib/admin';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Gating
    await isUserAdminOrThrow();

    // Fetch all projects including owners
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch all running/stopped docker containers in one command
    const containerStatusMap = new Map<string, string>(); // shortId -> status string
    try {
      const { stdout } = await execAsync('docker ps -a --format "{{.ID}}\t{{.Status}}"');
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const [id, status] = line.split('\t');
        if (id) {
          containerStatusMap.set(id.toLowerCase(), status || 'unknown');
        }
      }
    } catch (e) {
      console.error('[Admin Projects] Docker query failed:', e);
    }

    // Correlate projects with actual Docker status
    const formattedProjects = projects.map((project) => {
      let dockerStatus = 'NO_CONTAINER';
      
      if (project.containerId) {
        const dbContainerId = project.containerId.toLowerCase();
        // Check if any key in containerStatusMap matches the start of the project's containerId
        let foundStatus = '';
        for (const [id, status] of containerStatusMap.entries()) {
          if (dbContainerId.startsWith(id) || id.startsWith(dbContainerId.slice(0, 12))) {
            foundStatus = status;
            break;
          }
        }
        
        if (foundStatus) {
          dockerStatus = foundStatus;
        } else {
          dockerStatus = 'CONTAINER_MISSING';
        }
      }

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        githubRepo: project.githubRepo,
        framework: project.framework,
        status: project.status,
        assignedPort: project.assignedPort,
        containerId: project.containerId,
        createdAt: project.createdAt,
        dockerStatus,
        owner: {
          username: project.user.username,
          email: project.user.email,
          avatarUrl: project.user.avatarUrl,
        },
      };
    });

    return NextResponse.json({
      success: true,
      projects: formattedProjects,
    });

  } catch (error: any) {
    console.error('[Admin Projects] API error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
