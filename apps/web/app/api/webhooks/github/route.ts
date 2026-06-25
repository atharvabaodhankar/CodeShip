import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getDeploymentQueue } from '@/lib/queue';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Check if it's a push event
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) {
      return NextResponse.json({ error: 'Not a valid GitHub webhook payload' }, { status: 400 });
    }

    const commitHash = payload.head_commit?.id?.slice(0, 7) || 'webhook';
    const commitMessage = payload.head_commit?.message || 'Auto-redeploy via GitHub push';

    console.log(`[Webhook] Received push event for repo: ${repoFullName}, commit: ${commitHash}`);

    // Find all active projects connected to this repository
    const projects = await prisma.project.findMany({
      where: {
        githubRepo: {
          equals: repoFullName,
          mode: 'insensitive', // Match case-insensitively
        },
      },
    });

    if (projects.length === 0) {
      console.log(`[Webhook] No projects found matching repository: ${repoFullName}`);
      return NextResponse.json({ message: 'No matching projects found' });
    }

    const deploymentsCreated = [];

    // Trigger redeployment for each matching project
    for (const project of projects) {
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          commitHash,
          status: 'PENDING',
          logs: `Auto-redeploy triggered by GitHub push event.\nCommit: ${commitHash} - ${commitMessage}\nWaiting in queue...\n`,
        },
      });

      await getDeploymentQueue().add('build', { deploymentId: deployment.id });
      deploymentsCreated.push({ projectId: project.id, deploymentId: deployment.id });
      console.log(`[Webhook] Enqueued redeployment for project ${project.name} (ID: ${project.id})`);
    }

    return NextResponse.json({
      success: true,
      message: `Triggered ${projects.length} redeployment(s)`,
      deployments: deploymentsCreated,
    });

  } catch (error: any) {
    console.error('[Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
