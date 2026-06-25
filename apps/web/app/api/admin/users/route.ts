import { NextResponse } from 'next/server';
import { prisma } from '@rovel/db';
import { isUserAdminOrThrow } from '@/lib/admin';

export async function GET() {
  try {
    // Gating
    await isUserAdminOrThrow();

    // Fetch all users sorted by registration date
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      projectCount: user._count.projects,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });

  } catch (error: any) {
    console.error('[Admin Users] API error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
