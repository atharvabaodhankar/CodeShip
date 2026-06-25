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
    const branchParam = searchParams.get('branch');

    if (!repo || !repo.includes('/')) {
      return NextResponse.json({ error: 'Invalid repository format. Expected owner/repo.' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

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

    // Determine the branch to fetch the tree from. If not specified, we try main then master.
    const branches = branchParam ? [branchParam] : ['main', 'master'];
    let treeData = null;
    let activeBranch = 'main';
    let fetchError = null;

    for (const branch of branches) {
      try {
        const url = `https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`;
        const response = await fetch(url, { headers });

        if (response.ok) {
          treeData = await response.json();
          activeBranch = branch;
          break; // Successfully fetched
        } else if (response.status !== 404) {
          fetchError = `GitHub API returned status ${response.status}`;
        }
      } catch (err: any) {
        console.error(`Error fetching tree on branch ${branch}:`, err);
        fetchError = err.message;
      }
    }

    if (!treeData || !Array.isArray(treeData.tree)) {
      return NextResponse.json({
        directories: [],
        error: fetchError || 'Failed to fetch repository file tree',
      });
    }

    // Common directories to ignore
    const ignoreDirs = new Set([
      'node_modules',
      '.git',
      '.github',
      'dist',
      'build',
      'out',
      '.next',
      'temp',
      'tmp',
      'coverage',
    ]);

    // Track directories
    const dirMap = new Map<string, { path: string; isProject: boolean }>();
    
    // Always include root
    dirMap.set('', { path: '', isProject: false });

    // Process tree entries
    for (const entry of treeData.tree) {
      const path: string = entry.path;
      const type: string = entry.type; // 'tree' or 'blob'

      // Split path to check if any parent folder should be ignored
      const segments = path.split('/');
      if (segments.some(seg => ignoreDirs.has(seg))) {
        continue;
      }

      if (type === 'blob' && path.endsWith('package.json')) {
        // This is a package.json file. Its directory is the parent path.
        const dirPath = segments.slice(0, -1).join('/');
        dirMap.set(dirPath, { path: dirPath, isProject: true });
      } else if (type === 'tree') {
        // If it's a top-level directory (depth 1), we include it
        if (segments.length === 1) {
          if (!dirMap.has(path)) {
            dirMap.set(path, { path, isProject: false });
          }
        }
      }
    }

    // Convert map to list and format
    const directories = Array.from(dirMap.values()).map(dir => {
      let label = dir.path === '' ? 'Root Directory (/)' : dir.path;
      if (dir.isProject) {
        label += ' (package.json detected)';
      }
      return {
        path: dir.path,
        label,
        isProject: dir.isProject,
      };
    });

    // Sort: Root first, then projects, then other top-level directories
    directories.sort((a, b) => {
      if (a.path === '') return -1;
      if (b.path === '') return 1;
      
      // Sort projects above non-projects
      if (a.isProject && !b.isProject) return -1;
      if (!a.isProject && b.isProject) return 1;
      
      return a.path.localeCompare(b.path);
    });

    return NextResponse.json({
      directories,
      branch: activeBranch,
    });

  } catch (error: any) {
    console.error('Error in /api/github/dirs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
