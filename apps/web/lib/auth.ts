import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from '@rovel/db';

const JWT_SECRET = process.env.JWT_SECRET || 'rovel-default-jwt-secret-key';

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  githubToken?: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (e) {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('codeship_session')?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId },
  });
}

/**
 * Retrieves the GitHub OAuth access token from the active session cookie.
 */
export async function getGitHubToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('codeship_session')?.value;
    if (!token) return null;

    const payload = await verifySession(token);
    return payload?.githubToken || null;
  } catch (e) {
    console.error('Failed to retrieve GitHub token from session:', e);
    return null;
  }
}

