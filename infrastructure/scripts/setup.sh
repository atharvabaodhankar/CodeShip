#!/bin/bash

# CodeShip VPS Bootstrap Setup Script
# Recommended OS: Ubuntu 24.04 LTS

set -e

echo "===================================================="
echo "Starting CodeShip VPS Bootstrap Setup..."
echo "===================================================="

# 1. Update package manager
echo "Updating packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install essential tools
echo "Installing git, curl, and build-essential..."
sudo apt-get install -y git curl build-essential

# 3. Install Docker and Docker Compose (Official CE)
echo "Installing Docker and Docker Compose..."
# Remove any conflicting older docker packages
sudo apt-get remove -y docker docker-engine docker.io containerd runc || true
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
# Add current user to docker group to run without sudo
sudo usermod -aG docker $USER

# 4. Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
# Configure passwordless sudo for Nginx reload (Option B)
echo "Configuring passwordless sudo for Nginx reload..."
echo "$USER ALL=(ALL) NOPASSWD: /usr/sbin/nginx" | sudo tee /etc/sudoers.d/rovel-nginx

# 5. Install Node.js v22 and npm
echo "Installing Node.js v22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 6. Create directories for Rovel builds
echo "Setting up Rovel directories..."
sudo mkdir -p /opt/rovel/builds
sudo chown -R $USER:$USER /opt/rovel

# 7. Open Ports in firewall (UFW)
echo "Configuring firewall (UFW)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Docker container ports are proxied via localhost Nginx, so we do not need to expose 3001-9999 to the public internet!
# This is a critical security best practice.

echo "===================================================="
echo "Bootstrap setup completed successfully!"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Docker version: $(docker -v)"
echo "Nginx version: $(nginx -v)"
echo "===================================================="
echo "NOTE: Please log out and log back in (or run 'newgrp docker')"
echo "to apply docker group permissions without sudo!"
echo "===================================================="
