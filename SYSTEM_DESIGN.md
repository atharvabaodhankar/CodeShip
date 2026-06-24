# CodeShip - MVP System Design

## Overview

CodeShip is a lightweight Platform-as-a-Service (PaaS) inspired by Render and Vercel.

Users can:

1. Login with GitHub
2. Select a repository
3. Configure environment variables
4. Deploy
5. Receive a live URL
6. Auto-redeploy on GitHub push

The platform must automatically build and deploy applications without requiring users to provide Dockerfiles.

---

# MVP Goals

Supported frameworks:

* React (Vite)
* Next.js
* Express.js

Deployment strategy:

* Each deployment runs inside its own Docker container
* Every application gets its own subdomain
* Environment variables configurable from dashboard
* GitHub webhook auto-redeploy
* Build logs visible in dashboard

Out of scope:

* Teams
* Billing
* Custom domains
* Multi-server deployments
* Kubernetes
* Databases as a service
* Serverless functions

---

# Domain Architecture

Platform Dashboard:

deploy.atharvabaodhankar.me

User Applications:

<project-slug>.apps.atharvabaodhankar.me

Examples:

notes.apps.atharvabaodhankar.me

portfolio.apps.atharvabaodhankar.me

chat.apps.atharvabaodhankar.me

---

# DNS Requirements

Create:

A Record

deploy
→ VPS_PUBLIC_IP

Wildcard A Record

*.apps
→ VPS_PUBLIC_IP

This allows unlimited subdomains.

---

# Infrastructure

Single VPS

Recommended:

4 vCPU
8 GB RAM
100 GB SSD

Operating System:

Ubuntu 24.04 LTS

Installed Services:

Docker
Docker Compose
Nginx
PostgreSQL
Node.js
Git

---

# Architecture

```
                    ┌─────────────┐
                    │   GitHub    │
                    └──────┬──────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   CodeShip API   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Deployment Queue │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Deployment Worker│
                 └────────┬─────────┘
                          │
      ┌───────────────────┼────────────────────┐
      ▼                   ▼                    ▼
```

Docker Build      Docker Container      Nginx Routing

---

# Tech Stack

Frontend

Next.js 15
TypeScript
Tailwind
shadcn/ui

Backend

Next.js Route Handlers

Database

PostgreSQL

ORM

Prisma

Authentication

GitHub OAuth

Container Runtime

Docker

Reverse Proxy

Nginx

Background Jobs

BullMQ

Redis

---

# Database Schema

## users

id
email
github_id
username
avatar_url
created_at

---

## projects

id
user_id
name
slug
github_repo
framework
status
container_id
assigned_port
created_at

---

## deployments

id
project_id
commit_hash
status
logs
started_at
completed_at

---

## environment_variables

id
project_id
key
value

---

# Authentication

GitHub OAuth only.

Flow:

User Login
→ GitHub OAuth
→ Store profile
→ Create session

---

# Project Creation Flow

User clicks:

New Project

Select GitHub Repository

Store:

owner/repo

Generate slug

Example:

my-notes-app

Create project record

Status:

pending

---

# Deployment Flow

When Deploy is clicked:

1. Create deployment record
2. Push deployment job to queue
3. Worker processes deployment

Worker steps:

---

Step 1

Clone repository

git clone <repo>

into:

/opt/codeship/builds/{deploymentId}

---

Step 2

Detect framework

Check package.json

React:

dependencies.react exists

Next:

dependencies.next exists

Express:

dependencies.express exists

Store framework.

---

Step 3

Generate Dockerfile automatically

Users never upload Dockerfiles.

React:

Build application
Serve generated dist folder

Next:

Build
Run npm start

Express:

npm install
npm start

---

Step 4

Build image

docker build

Tag:

codeship-{deploymentId}

---

Step 5

Allocate Port

Range:

3001-9999

Find unused port

Store in database

---

Step 6

Load Environment Variables

Read from database

Inject via:

docker run -e KEY=value

---

Step 7

Run Container

Resource Limits:

--memory=512m
--cpus=0.5

Store:

container_id

---

Step 8

Generate Nginx Config

Template:

server {
listen 80;
server_name PROJECT.apps.atharvabaodhankar.me;

```
location / {
    proxy_pass http://127.0.0.1:PORT;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

}

Save:

/etc/nginx/sites-enabled/

Reload:

nginx -s reload

---

Step 9

Mark Deployment

status = success

---

# Redeployment Flow

GitHub Webhook

push event

↓

Create deployment

↓

Repeat deployment flow

Before new container starts:

Stop old container

Remove old container

Start new container

Update nginx mapping

---

# Environment Variables

Dashboard UI:

KEY
VALUE

Examples:

DATABASE_URL
JWT_SECRET
API_KEY

Stored encrypted in database.

Injected at runtime.

---

# Build Logs

Capture:

git clone

npm install

npm run build

docker build

docker run

Store logs in deployment record.

Display in dashboard.

---

# Dashboard Pages

Login

Projects

Project Details

Deployments

Environment Variables

Deployment Logs

Settings

---

# Security

Container Isolation

Every project gets its own container.

Apply limits:

512MB RAM

0.5 CPU

Disable privileged mode.

Never mount host filesystem.

Never expose Docker socket.

Only deployment worker can access Docker daemon.

---

# File Structure

/apps/web

Dashboard

/apps/worker

Deployment worker

/packages/db

Prisma

/packages/shared

Shared types

/infrastructure

Docker
Nginx
Scripts

---

# CI/CD For CodeShip

GitHub Actions

On Push:

Install

Lint

Build

Run Tests

SSH VPS

Pull latest code

docker compose pull

docker compose up -d

---

# MVP Acceptance Criteria

User can:

✓ Login with GitHub

✓ Select repository

✓ Create project

✓ Add environment variables

✓ Deploy React app

✓ Deploy Next.js app

✓ Deploy Express app

✓ Receive live URL

✓ View logs

✓ Redeploy automatically on git push

✓ Run each deployment in isolated Docker container

All functionality must work on a single VPS.
