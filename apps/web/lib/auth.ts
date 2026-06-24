import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from '@codeship/db';

const JWT_SECRET = process.env.JWT_SECRET || 'codeship-default-jwt-secret-key';

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
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
