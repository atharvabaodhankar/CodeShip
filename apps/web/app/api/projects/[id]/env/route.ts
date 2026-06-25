import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { getSessionUser } from '@/lib/auth';
import { encrypt, decrypt } from '@rovel/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: { envVars: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Decrypt all environment variable values before sending to the client
    const decryptedEnvVars = project.envVars.map((envVar) => {
      try {
        return {
          id: envVar.id,
          key: envVar.key,
          value: decrypt(envVar.value),
        };
      } catch (e) {
        // Fallback if decryption fails
        return {
          id: envVar.id,
          key: envVar.key,
          value: '',
        };
      }
    });

    return NextResponse.json({ envVars: decryptedEnvVars });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { envVars } = body; // Expected: [{ key: "API_KEY", value: "secret123" }, ...]

    if (!Array.isArray(envVars)) {
      return NextResponse.json({ error: 'Invalid body format. Expected envVars array' }, { status: 400 });
    }

    // Perform database updates in a transaction: delete old and write new
    await prisma.$transaction([
      prisma.environmentVariable.deleteMany({
        where: { projectId: project.id },
      }),
      prisma.environmentVariable.createMany({
        data: envVars
          .filter((ev: any) => ev.key && ev.key.trim() !== '')
          .map((ev: any) => ({
            projectId: project.id,
            key: ev.key.trim(),
            value: encrypt(ev.value),
          })),
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Environment variables updated successfully' });
  } catch (error: any) {
    console.error('Failed to update environment variables:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
