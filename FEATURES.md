# CodeShip Features & Capabilities Guide

This document provides a comprehensive breakdown of the features, capabilities, and system polishes implemented in the CodeShip Platform-as-a-Service (PaaS). 

---

## 🚀 Core Platform Capabilities

### 1. Zero-Config Framework Auto-Detection
CodeShip automatically inspects the structure of your repository to detect the language and framework being used. It supports:
* **Next.js**: Detects `next` in `package.json`. Compiles pages and boots the server using an optimized production Docker environment.
* **React (Vite)**: Detects `vite` and `react` in `package.json`. Compiles assets and serves them via a high-performance, lightweight Nginx container.
* **Express.js**: Detects `express` in `package.json`. Provisions an isolated Node runtime and boots the server using the defined startup scripts.
* **Vanilla HTML/CSS/JS**: Detects `index.html` at the root. Instantly copies the assets directly into an Nginx image, minimizing build overhead.

### 2. Multi-Stage Containerization
All application builds utilize multi-stage Docker configurations. This separates the build-time dependencies and intermediate assets from the final production image, resulting in:
* Extremely small production image footprints.
* Faster container start and reload times.
* Secure runtimes containing only the minimal assets required for execution.

### 3. Dynamic Subdomain Routing & Wildcard SSL
CodeShip coordinates with an Nginx reverse proxy and Let's Encrypt Certbot to handle incoming traffic:
* Every project is assigned its own subdomain (e.g., `project-slug.apps.yourdomain.com`).
* Nginx configurations are dynamically written and loaded by the worker daemon upon successful deployment.
* A single host-level wildcard SSL certificate secures all subdomains, removing Let's Encrypt rate-limiting bottlenecks and ensuring instant HTTPS.

---

## 🔄 Advanced GitOps & Deployment Orchestration

### 1. Vercel-like Automated GitHub Webhooks
To eliminate manual setup, CodeShip offers a fully automated GitOps integration:
* **OAuth Token Persistence**: The user's GitHub OAuth token is stored securely in an HTTP-only, encrypted JWT session cookie (`githubToken`), avoiding database exposure.
* **Auto-Registration**: Upon project creation, CodeShip calls the GitHub Repositories Hook API to automatically register a webhook pointing to the platform's `/api/webhooks/github` endpoint.
* **Dynamic Resolution**: The webhook registration dynamically resolves the host and protocol (supporting local dev tunnels like ngrok/cloudflare tunnels as well as production environments) without hardcoding environment variables.
* **Instant Redeployment**: Every code push triggers a background rebuild automatically. CodeShip updates the container, verifies health checks, swaps Nginx routing targets, and prunes the old container with zero downtime.

### 2. Subdirectory & Monorepo Deployments
CodeShip supports complex repository layouts, including monorepos and nested project structures:
* **Custom Build Contexts**: Users can specify a custom directory path (e.g., `packages/frontend` or `apps/web`) during project creation.
* **Isolated Detection**: Framework auto-detection runs specifically within the context of the subfolder, inspecting local package manifests.
* **Context-Aware Builds**: The background worker isolates the Docker build context and generates Dockerfiles targeted directly at the specified subdirectory, ensuring dependencies are resolved correctly.

---

## 🛡️ Administrative & Operator Tools (`/admin`)

CodeShip features a dedicated, secured administration portal designed to give operators complete visibility and control over the platform's resources.

### 1. Secure Access Gating
* Access to `/admin` and `/api/admin/*` endpoints is strictly limited to authorized GitHub usernames configured in the `ADMIN_USERNAMES` environment variable (defaulting to `atharvabaodhankar`).
* Unauthorized requests are immediately blocked with `401 Unauthorized` or `403 Forbidden` responses.

### 2. System Telemetry & Resource Auditing
The admin dashboard displays real-time performance and usage metrics of the host VPS:
* **CPU Usage**: Visual progress bar showing total host CPU load.
* **Memory Utilization**: Real-time RAM consumption showing active vs. total capacity.
* **Disk Capacity**: Monitored storage capacity to help avoid out-of-disk crashes during large builds.
* **Active Containers**: Total count of running user application containers.

### 3. Global Project & User Directories
* **User Management**: A complete roster of all registered developers using the platform.
* **Project Registry**: An overview of all hosted projects, displaying:
  * Dynamic link to the live hosted application.
  * Link to the source GitHub repository.
  * Current deployment status (e.g., Ready, Building, Failed).
  * Allocated internal port mappings.

### 4. Remote Container Power Controls
Administrators can perform direct management actions on any running project container directly from the UI:
* **Start**: Boot up a stopped container.
* **Stop**: Safely terminate a running application container.
* **Restart**: Perform a quick power-cycle of the container.
* **Delete**: Completely remove the application container and clean up associated Nginx routing files.

### 5. Server Pruning & Disk Garbage Collection
To prevent build cache bloat and dangling images from consuming disk space, the admin portal includes a remote maintenance tool:
* **One-Click Cleanup**: Triggers Docker image and builder prunes on the host.
* **Streaming Terminal Output**: Opens an SSE (Server-Sent Events) connection to stream the live stdout/stderr of the Docker cleanup commands directly into an interactive terminal component in the web browser.

---

## 🎨 Premium Developer Experience (DX) & UI Enhancements

The user interface has been polished to deliver a distraction-free, high-performance experience:

### 1. Sleek Monochrome Interface
* A custom, high-contrast developer theme utilizing deep charcoal and stark white elements.
* An interactive landing page (`/`) featuring a retro scanline overlay, technical specification tickers, and responsive layouts.

### 2. Custom React Combobox Component
To replace clunky native browser selects, CodeShip uses a custom-built Combobox:
* **Live Search Filtering**: Developers can type to filter through long lists of repositories or options.
* **Keyboard Navigation**: Fully interactive via arrow keys and Enter.
* **Sleek UX**: Fluid transitions, custom scrollbars, and styled checkmarks indicating the active selection.

### 3. Client-Side Resilience & Stability
* Handled edge cases where deployments might load as undefined, avoiding application crashes.
* Integrated optional chaining and fallback empty arrays (`[]`) across the dashboard and project pages to ensure a resilient rendering pipeline.

---

## 🔒 Security & Hardening Architecture

CodeShip is architected with a strong focus on platform security:
1. **AES-256-GCM Environment Encryption**: All user-defined environment variables are encrypted before writing to the PostgreSQL database, utilizing Node's native `crypto` library and a host-level key.
2. **Host Port Protection**: While user containers bind to internal host ports (ranges `3001-9999`), the host firewall blocks external access to these ports. All traffic must pass through the Nginx reverse proxy over HTTPS.
3. **Container Resource Constraints**: Containers are capped at `512MB` RAM and `0.5 vCPU` to prevent a single application from starving host resources.
