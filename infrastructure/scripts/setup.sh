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

# 3. Install Docker and Docker Compose
echo "Installing Docker and Docker Compose..."
sudo apt-get install -y docker.io docker-compose
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
echo "$USER ALL=(ALL) NOPASSWD: /usr/sbin/nginx" | sudo tee /etc/sudoers.d/codeship-nginx

# 5. Install Node.js v22 and npm
echo "Installing Node.js v22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 6. Create directories for CodeShip builds
echo "Setting up CodeShip directories..."
sudo mkdir -p /opt/codeship/builds
sudo chown -R $USER:$USER /opt/codeship

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
