import { NextResponse } from 'next/server';
import { prisma } from '@codeship/db';
import { getSessionUser, getGitHubToken } from '@/lib/auth';
import { getDeploymentQueue } from '@/lib/queue';

// URL-friendly slug generator with uniqueness guarantee
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  let slug = baseSlug || 'app';
  let counter = 0;
  
  while (true) {
    const existing = await prisma.project.findUnique({
      where: { slug },
    });
    if (!existing) {
      return slug;
    }
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, githubRepo, framework, rootDirectory } = body;

    if (!name || !githubRepo || !framework) {
      return NextResponse.json({ error: 'Missing required fields: name, githubRepo, framework' }, { status: 400 });
    }

    let sanitizedRootDirectory = '';
    if (rootDirectory && typeof rootDirectory === 'string') {
      sanitizedRootDirectory = rootDirectory
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .trim();
    }

    const slug = await generateUniqueSlug(name);

    // Create the project and the initial deployment in a single transaction
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        slug,
        githubRepo,
        framework,
        rootDirectory: sanitizedRootDirectory,
        status: 'PENDING',
      },
    });

    const deployment = await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: 'PENDING',
        logs: 'Deployment initialized. Waiting in queue...\n',
      },
    });

    // Enqueue the build job in BullMQ
    await getDeploymentQueue().add('build', { deploymentId: deployment.id });

    // 6. Automatically register webhook on GitHub to enable automated push-to-deploy (Vercel-like experience)
    try {
      const githubToken = await getGitHubToken();
      if (githubToken && githubRepo && githubRepo.includes('/')) {
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const webhookUrl = `${protocol}://${host}/api/webhooks/github`;

        console.log(`[Webhook Auto-Register] Registering webhook for repo: ${githubRepo} pointing to: ${webhookUrl}...`);
        
        const githubHookResponse = await fetch(`https://api.github.com/repos/${githubRepo}/hooks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeShip-App',
          },
          body: JSON.stringify({
            name: 'web',
            active: true,
            events: ['push'],
            config: {
              url: webhookUrl,
              content_type: 'json',
              insecure_ssl: '0',
            },
          }),
        });

        if (githubHookResponse.ok) {
          console.log(`[Webhook Auto-Register] Successfully registered webhook for ${githubRepo}`);
        } else {
          const errText = await githubHookResponse.text();
          console.warn(`[Webhook Auto-Register] GitHub API returned status ${githubHookResponse.status}: ${errText}`);
        }
      }
    } catch (err: any) {
      console.error('[Webhook Auto-Register] Failed to auto-register repository hook:', err);
    }

    return NextResponse.json({ project, deployment }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
