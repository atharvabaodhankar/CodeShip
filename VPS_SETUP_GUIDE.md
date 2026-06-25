# Rovel VPS Setup Guide: From Scratch to Production

This guide provides a comprehensive, step-by-step walkthrough to set up and deploy the **Rovel PaaS** platform on a brand-new Ubuntu VPS. It includes all terminal commands, configuration files, security hardening steps, and troubleshooting tips learned during the initial platform setup.

---

## 📋 Prerequisites & Hardware

### 1. VPS Specifications
* **Recommended OS**: Ubuntu 24.04 LTS (x86_64)
* **Minimum Specifications**: 1 vCPU, 1 GB RAM, 25 GB SSD (suitable for personal dev)
* **Production Specifications**: 4 vCPUs, 8 GB RAM, 160 GB SSD (allocates resource overhead for multiple isolated user containers)

### 2. Domain & DNS Configuration
Go to your DNS provider (e.g. DigitalOcean, Cloudflare) and create two `A` records pointing to your VPS IP:
* `deploy.rovel.yourdomain.com` ──► `YOUR_VPS_IP` (Dashboard console)
* `*.apps.rovel.yourdomain.com` ──► `YOUR_VPS_IP` (Wildcard for deployed user applications)

---

## 🚀 Step 1: Bootstrap the VPS Environment

Log into your fresh VPS as `root` via SSH and run these commands:

### 1. Clone the Rovel Repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/Rovel.git
cd Rovel
```

### 2. Run the Bootstrap Script
Our automated setup script installs Node.js v22, npm, Nginx, Git, build tools, and the official Docker CE repositories, configures UFW firewall rules, and sets up a passwordless Nginx reload permission:
```bash
chmod +x infrastructure/scripts/setup.sh
./infrastructure/scripts/setup.sh
```

### 3. Apply Docker Group Permissions
Activate the new user group permissions in your current terminal session immediately:
```bash
newgrp docker
```

---

## 🧹 Step 2: Clean Host-Level Database Conflicts

> [!WARNING]
> Many default Ubuntu VPS configurations come with system-wide PostgreSQL or Redis servers pre-installed and running on the host OS. This will prevent your isolated Docker containers from binding to ports `5432` and `6379`. 
>
> You **must** completely uninstall them from the host to ensure Docker-only isolation.

Run these commands to purge host-level databases:

```bash
# 1. Purge Host PostgreSQL
sudo systemctl stop postgresql || true
sudo systemctl disable postgresql || true
sudo apt-get purge -y postgresql postgresql-contrib postgresql-common
sudo rm -rf /etc/postgresql/
sudo rm -rf /var/lib/postgresql/
sudo userdel -r postgres || true
sudo groupdel postgres || true

# 2. Purge Host Redis
sudo systemctl stop redis-server || true
sudo systemctl disable redis-server || true
sudo apt-get purge -y redis-server
sudo rm -rf /etc/redis/
sudo rm -rf /var/lib/redis/
```

---

## ⚙️ Step 3: Configure Environment Variables

Create your production environment file in the root of your project:
```bash
nano .env
```

Paste the template below, replace the domain, secrets, and GitHub credentials, and save the file (press `Ctrl + O`, `Enter`, and `Ctrl + X` to exit):

```env
# Rovel Production Environment Variables

# Database & Redis Configuration
# Replace 'YOUR_SECURE_PASSWORD' with a strong random string
DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5432/rovel?schema=public"
REDIS_URL="redis://localhost:6379"

# Local Docker Database Credentials (used by Docker Compose)
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=rovel

# Security Secrets (Generate unique keys for this VPS)
# JWT_SECRET: Secure 32-byte key for signing session tokens (e.g., openssl rand -hex 32)
JWT_SECRET="YOUR_RANDOM_JWT_SECRET_STRING"
# ENCRYPTION_KEY: Must be EXACTLY 32 characters (32 bytes) for AES-256-GCM
ENCRYPTION_KEY="YOUR_EXACTLY_32_CHARACTER_KEY"

# Domain Routing Configuration
# Set to your wildcard base domain
BASE_DOMAIN="apps.rovel.yourdomain.com"
NEXT_PUBLIC_BASE_DOMAIN="apps.rovel.yourdomain.com"

# GitHub OAuth App Configuration
# Create a GitHub OAuth App pointing to https://deploy.rovel.yourdomain.com
GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID"
GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET"

# Deployment Configuration
PORT_RANGE_START=3001
PORT_RANGE_END=9999
BUILDS_DIR="/opt/rovel/builds"
```

---

## 🐘 Step 4: Initialize Databases & Build Code

### 1. Launch Docker Databases
Start the isolated PostgreSQL and Redis containers:
```bash
docker compose up -d
```
*(Verify they are online and running without port conflicts by running `docker ps`)*.

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Push the Database Schema
Initialize the database tables and generate the Prisma client on the host:
```bash
node -e "require('dotenv').config(); require('child_process').spawn('npm', ['run', 'db:push', '-w', 'packages/db'], { stdio: 'inherit', shell: true })"
```

### 4. Compile all Monorepo Workspaces
Build the Next.js frontend console and compiling the TypeScript worker code:
```bash
npm run build:all
```

---

## 🛡️ Step 5: Secure the Dashboard with SSL

We must route public traffic to our Next.js server (running on port `3000`) and secure it with a Let's Encrypt certificate to allow GitHub OAuth redirects.

### 1. Configure the Nginx Proxy
Copy our template, remove Nginx's default fallback page, and reload Nginx:
```bash
# Copy the Rovel configuration
sudo cp infrastructure/nginx/rovel.conf /etc/nginx/sites-enabled/

# Remove the default site
sudo rm -f /etc/nginx/sites-enabled/default

# Verify configuration syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 2. Provision SSL for the Dashboard
Install Certbot and request a certificate for the main dashboard subdomain:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d deploy.rovel.yourdomain.com
```
*(Certbot will automatically edit your Nginx files to handle HTTPS and redirect all HTTP traffic to port 443).*

---

## 📡 Step 6: Configure Wildcard SSL for Deployed Apps

To serve user applications securely (HTTPS) without Let's Encrypt rate limit issues, we must obtain a wildcard certificate using a DNS challenge.

### 1. Request the Wildcard Certificate
```bash
sudo certbot certonly --manual --preferred-challenges=dns -d "*.apps.rovel.yourdomain.com" -d "apps.rovel.yourdomain.com"
```

### 2. Add the DNS TXT Record
Certbot will pause and output a TXT record value. 
1. Open your DNS provider (e.g. DigitalOcean DNS settings).
2. Create a new record:
   * **Type**: `TXT`
   * **Name**: `_acme-challenge.apps`
   * **Value**: Paste the long verification string from Certbot.
   * **TTL**: `60` seconds (lowest possible).
3. Wait 30 seconds, then return to the VPS terminal and press **Enter** to complete the challenge.

The certificate will be saved at `/etc/letsencrypt/live/apps.rovel.yourdomain.com/fullchain.pem`.

---

## ⚙️ Step 7: Manage Services under PM2

To ensure the Rovel services run persistently in the background and survive system crashes or server reboots, we run them under the **PM2** process manager.

### 1. Install PM2 Globally
```bash
sudo npm install -g pm2
```

### 2. Start Rovel Services
```bash
# 1. Start the Next.js Web Console
pm2 start npm --name "rovel-dashboard" -- run start -w apps/web

# 2. Start the Background Deployment Worker
pm2 start dist/index.js --name "rovel-worker" --cwd apps/worker
```

### 3. Persist PM2 across Reboots
Save your running PM2 process list and configure a systemd startup script so they boot automatically when the VPS restarts:
```bash
pm2 startup systemd
# (Run the command generated in the terminal output of the step above)
pm2 save
```

---

## 🔄 Step 8: Set Up Automated Platform Updates (CI/CD)

Avoid logging into the VPS to update the Rovel platform code. We automate this using a dedicated SSH deploy key and a GitHub Actions workflow.

### 1. Create a Dedicated SSH Key Pair on the VPS
Generate the keys without a passphrase:
```bash
ssh-keygen -t ed25519 -C "github-actions-rovel" -f ~/.ssh/id_ed25519_github -N ""
```

### 2. Authorize the Key on the VPS
Add the public key to your authorized list:
```bash
cat ~/.ssh/id_ed25519_github.pub >> ~/.ssh/authorized_keys
```

### 3. Copy the Private Key to GitHub
Display the private key:
```bash
cat ~/.ssh/id_ed25519_github
```
*Copy the entire output, including the header and footer.*

### 4. Create an Update Script on the VPS
Create an update script inside `~/Rovel`:
```bash
nano update.sh
```
Paste this configuration:
```bash
#!/bin/bash
set -e
git pull
npm install
node -e "require('dotenv').config(); require('child_process').spawn('npm', ['run', 'db:push', '-w', 'packages/db'], { stdio: 'inherit', shell: true })"
npm run build:all
pm2 restart all
```
Save, exit, and make it executable:
```bash
chmod +x update.sh
```

### 5. Configure GitHub Secrets
Go to your **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**:

* **`VPS_HOST`**: `YOUR_VPS_IP`
* **`VPS_USERNAME`**: `root`
* **`VPS_SSH_KEY`**: *(Paste the private key copied in Step 3)*

Now, whenever you run `git push` on your local machine, GitHub Actions will securely log into your VPS and update the entire platform.
