import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo'); // format: owner/repo
    const pathParam = searchParams.get('path') || '';

    if (!repo || !repo.includes('/')) {
      return NextResponse.json({ error: 'Invalid repository format. Expected owner/repo.' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // We will attempt to fetch package.json from the default branches: main first, then master.
    const branches = ['main', 'master'];
    let packageJsonData = null;
    let fetchError = null;

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

    for (const branch of branches) {
      try {
        const cleanPath = pathParam.trim().replace(/^\/+|\/+$/g, '');
        const packageJsonPath = cleanPath ? `${cleanPath}/package.json` : 'package.json';
        const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${packageJsonPath}?ref=${branch}`;
        const response = await fetch(url, { headers });

        if (response.ok) {
          const fileData = await response.json();
          if (fileData.content && fileData.encoding === 'base64') {
            const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
            packageJsonData = JSON.parse(decoded);
            break; // Successfully fetched and parsed
          }
        } else if (response.status !== 404) {
          fetchError = `GitHub API returned status ${response.status}`;
        }
      } catch (err: any) {
        console.error(`Error fetching package.json on branch ${branch}:`, err);
        fetchError = err.message;
      }
    }

    if (!packageJsonData) {
      return NextResponse.json({
        framework: 'static',
        detected: false,
        reason: fetchError || 'package.json not found in main or master branches',
      });
    }

    // Detect framework based on dependencies
    const deps = {
      ...(packageJsonData.dependencies || {}),
      ...(packageJsonData.devDependencies || {}),
    };

    let framework = 'static';
    let reason = 'No specific framework dependencies detected in package.json';

    if (deps['next']) {
      framework = 'nextjs';
      reason = 'Detected "next" in dependencies';
    } else if (deps['express']) {
      framework = 'express';
      reason = 'Detected "express" in dependencies';
    } else if (deps['react'] && (deps['vite'] || deps['@vitejs/plugin-react'] || deps['@vitejs/plugin-react-swc'])) {
      framework = 'react-vite';
      reason = 'Detected "react" and "vite" in dependencies';
    } else if (deps['react']) {
      framework = 'react-vite';
      reason = 'Detected "react" in dependencies';
    }

    return NextResponse.json({
      framework,
      detected: true,
      reason,
      packageName: packageJsonData.name || repoName,
    });

  } catch (error: any) {
    console.error('Error in /api/github/detect-framework:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
