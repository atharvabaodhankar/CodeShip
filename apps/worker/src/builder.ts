import { prisma } from '@rovel/db';
import { decrypt, isWindows } from '@rovel/shared';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit } from 'simple-git';
import * as net from 'net';

/**
 * Checks if a port is available on the local host.
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Allocates a port within the range specified, verifying availability
 * on the host network as well as checking database allocations.
 */
async function allocatePort(): Promise<number> {
  const start = parseInt(process.env.PORT_RANGE_START || '3001', 10);
  const end = parseInt(process.env.PORT_RANGE_END || '9999', 10);

  for (let port = start; port <= end; port++) {
    const hostAvailable = await isPortAvailable(port);
    if (hostAvailable) {
      // Check database to ensure no other active project is occupying it
      const databaseOccupied = await prisma.project.findFirst({
        where: {
          assignedPort: port,
          status: { not: 'FAILED' },
        },
      });
      if (!databaseOccupied) {
        return port;
      }
    }
  }
  throw new Error(`No available ports in range ${start}-${end}`);
}

/**
 * Runs a command and streams its output.
 */
function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  onLog: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    onLog(`\n$ ${cmd} ${args.join(' ')}\n`);
    
    // On Windows, running batch files or binaries sometimes requires shell: true
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      onLog(chunk);
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      onLog(chunk);
    });

    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve({ code: code || 0, stdout, stderr });
      } else {
        reject(new Error(`Command '${cmd} ${args.join(' ')}' failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Core builder logic to deploy an application.
 */
export async function buildAndDeploy(deploymentId: string): Promise<void> {
  // Fetch deployment details
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: { include: { envVars: true } } },
  });

  if (!deployment) {
    throw new Error(`Deployment not found: ${deploymentId}`);
  }

  const project = deployment.project;
  let logBuffer = '';

  const appendLog = async (text: string) => {
    logBuffer += text;
    console.log(`[${project.name}] ${text.trim()}`);
    // Save logs to database periodically or at the end
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { logs: logBuffer },
    });
  };

  try {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'BUILDING' },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'BUILDING' },
    });

    await appendLog(`Starting deployment for project: ${project.name}\n`);

    // 1. Setup paths
    const buildsDir = path.resolve(process.env.BUILDS_DIR || './builds');
    const projectBuildPath = path.join(buildsDir, deploymentId);
    await fs.promises.mkdir(projectBuildPath, { recursive: true });

    // 2. Clone Repository
    await appendLog(`Cloning repository: ${project.githubRepo}...\n`);
    const git = simpleGit();
    
    // Support both full GitHub URLs and owner/repo formats
    let repoUrl = project.githubRepo.trim();
    if (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
      repoUrl = `https://github.com/${repoUrl}.git`;
    } else if (!repoUrl.endsWith('.git')) {
      repoUrl = `${repoUrl}.git`;
    }
    
    await git.clone(repoUrl, projectBuildPath);
    await appendLog(`Successfully cloned repository.\n`);

    // Get current commit info if available
    try {
      const repoGit = simpleGit(projectBuildPath);
      const logSummary = await repoGit.log();
      if (logSummary.latest) {
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { commitHash: logSummary.latest.hash.slice(0, 7) },
        });
        await appendLog(`Latest commit: ${logSummary.latest.hash.slice(0, 7)} - ${logSummary.latest.message}\n`);
      }
    } catch (e) {
      // Ignore if git log fails
    }

    // 3. Detect Framework & Subdirectory
    const appRootPath = project.rootDirectory 
      ? path.join(projectBuildPath, project.rootDirectory) 
      : projectBuildPath;

    const packageJsonPath = path.join(appRootPath, 'package.json');
    const indexHtmlPath = path.join(appRootPath, 'index.html');
    
    let packageJsonExists = false;
    try {
      await fs.promises.access(packageJsonPath);
      packageJsonExists = true;
    } catch {}

    let indexHtmlExists = false;
    try {
      await fs.promises.access(indexHtmlPath);
      indexHtmlExists = true;
    } catch {}

    let framework = '';
    let internalPort = 3000;

    if (packageJsonExists) {
      const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.next) {
        framework = 'nextjs';
        internalPort = 3000;
      } else if ((deps.react || deps['react-dom']) && deps.vite) {
        framework = 'react-vite';
        internalPort = 80; // React app served via Nginx in container
      } else if (deps.express) {
        framework = 'express';
        internalPort = 3000;
      }
    }

    // Fallback: If no node framework detected but index.html exists, it's a vanilla static site
    if (!framework && indexHtmlExists) {
      framework = 'static';
      internalPort = 80; // Static served via Nginx on port 80
    }

    if (!framework) {
      throw new Error(
        'Unsupported framework. CodeShip MVP supports Next.js, React (Vite), Express.js, or vanilla static sites (index.html at root).'
      );
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { framework },
    });
    await appendLog(`Detected framework: ${framework}\n`);

    // 4. Generate Dockerfile automatically
    await appendLog(`Generating Dockerfile for ${framework}...\n`);
    const dockerfilePath = path.join(appRootPath, 'Dockerfile');
    let dockerfileContent = '';

    if (framework === 'react-vite') {
      dockerfileContent = `
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config if exists, or use default
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    } else if (framework === 'static') {
      dockerfileContent = `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    } else if (framework === 'nextjs') {
      dockerfileContent = `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "start"]
`;
    } else {
      // Express or general Node
      dockerfileContent = `
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "start"]
`;
    }

    await fs.promises.writeFile(dockerfilePath, dockerfileContent.trim());
    await appendLog(`Dockerfile generated.\n`);

    // 5. Build Docker Image
    const imageName = `codeship-${project.id.toLowerCase()}`;
    const imageTag = deploymentId.toLowerCase();
    const fullImageName = `${imageName}:${imageTag}`;

    await appendLog(`Building Docker image: ${fullImageName}...\n`);
    await runCommand('docker', ['build', '-t', fullImageName, '.'], appRootPath, appendLog);
    await appendLog(`Successfully built Docker image.\n`);

    // Clean up intermediate dangling builder stages to save disk space
    try {
      await appendLog(`Pruning dangling Docker build layers...\n`);
      await runCommand('docker', ['image', 'prune', '-f'], process.cwd(), () => {});
    } catch (e) {
      // Ignore prune errors
    }

    // 6. Allocate Port
    // If the project already has an assigned port, reuse it. Otherwise, allocate a new one.
    let hostPort = project.assignedPort;
    if (!hostPort) {
      await appendLog(`Allocating host port...\n`);
      hostPort = await allocatePort();
      await prisma.project.update({
        where: { id: project.id },
        data: { assignedPort: hostPort },
      });
      await appendLog(`Allocated port: ${hostPort}\n`);
    } else {
      await appendLog(`Reusing previously allocated port: ${hostPort}\n`);
    }

    // 7. Stop and remove existing container for this project
    const containerName = `codeship-${project.slug}`;
    await appendLog(`Cleaning up old containers with name ${containerName}...\n`);
    try {
      await runCommand('docker', ['stop', containerName], process.cwd(), () => {});
    } catch (e) {
      // Ignore if container is not running
    }
    try {
      await runCommand('docker', ['rm', containerName], process.cwd(), () => {});
    } catch (e) {
      // Ignore if container does not exist
    }

    // 8. Prepare Environment Variables
    await appendLog(`Preparing environment variables...\n`);
    const dockerArgs = [
      'run',
      '-d',
      '--name',
      containerName,
      '--memory=512m',
      '--cpus=0.5',
      '-p',
      `${hostPort}:${internalPort}`,
    ];

    // Inject decrypted environment variables
    for (const envVar of project.envVars) {
      const decryptedValue = decrypt(envVar.value);
      // Wrap value in double quotes and escape any existing double quotes to ensure safe shell execution (especially on Windows)
      const escapedValue = decryptedValue.replace(/"/g, '\\"');
      dockerArgs.push('-e', `${envVar.key}="${escapedValue}"`);
    }

    // Always inject PORT internally
    dockerArgs.push('-e', `PORT=${internalPort}`);
    dockerArgs.push(fullImageName);

    // 9. Run Container
    await appendLog(`Starting new container ${containerName}...\n`);
    const runResult = await runCommand('docker', dockerArgs, process.cwd(), appendLog);
    const newContainerId = runResult.stdout.trim().slice(0, 12);
    await appendLog(`Container started. ID: ${newContainerId}\n`);

    // Clean up old Docker images for this project to prevent VPS disk filling
    try {
      const oldDeployments = await prisma.deployment.findMany({
        where: {
          projectId: project.id,
          status: 'READY',
          id: { not: deploymentId },
        },
      });
      for (const oldDep of oldDeployments) {
        const oldImageName = `codeship-${project.id.toLowerCase()}:${oldDep.id.toLowerCase()}`;
        await appendLog(`Cleaning up old Docker image: ${oldImageName}...\n`);
        try {
          await runCommand('docker', ['rmi', oldImageName], process.cwd(), () => {});
          await appendLog(`Removed old image: ${oldImageName}\n`);
        } catch (e) {
          // Ignore if image not found or already deleted
        }
      }
    } catch (err) {
      await appendLog(`[Warning] Old image cleanup encountered an error: ${(err as any).message}\n`);
    }

    // 10. Configure Nginx Proxy
    await appendLog(`Generating Nginx configuration...\n`);
    const baseDomain = process.env.BASE_DOMAIN || 'localhost';
    
    // Check if wildcard SSL certificates exist for the base domain on Linux
    const sslCertPath = `/etc/letsencrypt/live/${baseDomain}/fullchain.pem`;
    const sslKeyPath = `/etc/letsencrypt/live/${baseDomain}/privkey.pem`;
    
    let hasSSL = false;
    if (!isWindows()) {
      try {
        await fs.promises.access(sslCertPath);
        await fs.promises.access(sslKeyPath);
        hasSSL = true;
      } catch {
        // Wildcard SSL certs not found or inaccessible, fallback to HTTP
      }
    }

    let nginxConfig = '';
    if (hasSSL) {
      await appendLog(`Wildcard SSL certificates detected. Generating secure HTTPS server blocks...\n`);
      nginxConfig = `
server {
    listen 80;
    server_name ${project.slug}.${baseDomain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${project.slug}.${baseDomain};

    ssl_certificate ${sslCertPath};
    ssl_certificate_key ${sslKeyPath};

    location / {
        proxy_pass http://127.0.0.1:${hostPort};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
    } else {
      await appendLog(`No wildcard SSL certificates detected. Falling back to HTTP-only...\n`);
      nginxConfig = `
server {
    listen 80;
    server_name ${project.slug}.${baseDomain};

    location / {
        proxy_pass http://127.0.0.1:${hostPort};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
    }

    if (isWindows()) {
      // On Windows development, we log Nginx config to a local folder and skip reloading
      const nginxLogsDir = path.resolve('./nginx_logs');
      await fs.promises.mkdir(nginxLogsDir, { recursive: true });
      await fs.promises.writeFile(path.join(nginxLogsDir, `${project.slug}.conf`), nginxConfig);
      await appendLog(`[Windows Dev Fallback] Nginx config written locally to ./nginx_logs/${project.slug}.conf\n`);
    } else {
      // On Linux VPS, write to Nginx configuration folder and reload Nginx
      const nginxConfigPath = `/etc/nginx/sites-enabled/${project.slug}.conf`;
      try {
        await fs.promises.writeFile(nginxConfigPath, nginxConfig);
        await appendLog(`Nginx config written to ${nginxConfigPath}\n`);
        await appendLog(`Reloading Nginx proxy...\n`);
        await runCommand('sudo', ['nginx', '-s', 'reload'], process.cwd(), appendLog);
        await appendLog(`Nginx reloaded successfully.\n`);
      } catch (err: any) {
        await appendLog(`[Warning] Failed to write Nginx config or reload: ${err.message}\n`);
      }
    }

    // 11. Complete deployment
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'READY',
        completedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'READY',
        containerId: newContainerId,
      },
    });

    await appendLog(`\nDeployment SUCCESSFUL! Application live at http://${project.slug}.${baseDomain}\n`);

    // 12. Cleanup build folder to save disk space
    try {
      await fs.promises.rm(projectBuildPath, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup failures
    }

  } catch (err: any) {
    const errMsg = err.message || err;
    await appendLog(`\nDeployment FAILED: ${errMsg}\n`);

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'FAILED' },
    });
  }
}
