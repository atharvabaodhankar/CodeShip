import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = user.username;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Rovel-App',
    };

    if (clientId && clientSecret) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Fetch public repositories for the user from GitHub API
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
      headers,
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch repos from GitHub:', errorText);
      return NextResponse.json({ error: 'Failed to fetch repositories from GitHub' }, { status: response.status });
    }

    const repos = await response.json();
    
    // Map to a cleaner format
    const formattedRepos = repos.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
    }));

    return NextResponse.json({ repos: formattedRepos });
  } catch (error: any) {
    console.error('Error in /api/github/repos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
