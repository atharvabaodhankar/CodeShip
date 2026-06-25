import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@rovel/db';
import { signSession } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub OAuth is not configured properly on the server.' },
      { status: 500 }
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();
    if (!userData.id) {
      return NextResponse.json({ error: 'Failed to fetch user profile from GitHub' }, { status: 400 });
    }

    // 3. Fetch user email (since email can be private, we fetch the emails list)
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const emailsData = await emailsResponse.json();
    let primaryEmail = userData.email;

    if (Array.isArray(emailsData)) {
      const primaryEmailObj = emailsData.find((email) => email.primary);
      if (primaryEmailObj) {
        primaryEmail = primaryEmailObj.email;
      }
    }

    if (!primaryEmail) {
      primaryEmail = `${userData.login}@users.noreply.github.com`;
    }

    // 4. Create or Update User in database
    const user = await prisma.user.upsert({
      where: { githubId: userData.id },
      update: {
        username: userData.login,
        avatarUrl: userData.avatar_url,
        email: primaryEmail,
      },
      create: {
        githubId: userData.id,
        username: userData.login,
        avatarUrl: userData.avatar_url,
        email: primaryEmail,
      },
    });

    // 5. Sign Session JWT
    const sessionToken = await signSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      githubToken: accessToken, // Store the GitHub access token in the session cookie!
    });

    // 6. Set Cookie & Redirect
    const cookieStore = await cookies();
    cookieStore.set('rovel_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Redirect back to dashboard
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}/dashboard`);

  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
