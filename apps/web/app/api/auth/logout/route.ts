import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('codeship_session');

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return NextResponse.redirect(`${protocol}://${host}/`);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('codeship_session');
  return NextResponse.json({ success: true });
}
