#!/bin/bash

# Deployment script - Auto pull latest code and restart service with PM2
# Usage: ./deploy.sh

set -e  # Exit on error

APP_NAME="shadow"   # PM2 process name，可以改成你的项目名
APP_PORT=3000        # 服务端口（Next.js 默认端口）

echo "🚀 Starting deployment process with PM2..."

# --- Ensure pnpm and pm2 are available ---
export PNPM_HOME="/Users/zhaoxinyuan/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"

# 确保 pm2 已安装
if ! command -v pm2 >/dev/null 2>&1; then
  echo "⚠️  PM2 not found, installing..."
  pnpm add -g pm2
fi


# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# 3. Build project
echo "🔨 Building project..."
pnpm build

# 4. Restart service with PM2
echo "🔁 Restarting service with PM2..."
if pm2 list | grep -q "$APP_NAME"; then
    echo "⚠️  Service already exists, stopping and starting new instance..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
fi
echo "ℹ️  Starting new instance..."
pm2 start "pnpm run start" \
    --name "$APP_NAME" \
    --log-date-format="YYYY-MM-DD HH:mm Z" \
    --time \
    --output "app.log" \
    --error "app-error.log"

# 5. Save PM2 state (so it survives reboot if pm2 startup is enabled)
pm2 save

# 6. Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 10

# 7. Check if service started successfully
if lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Service started successfully!"
    echo "🌐 Service URL: http://localhost:$APP_PORT"
    echo "📋 Log files: app.log (stdout), app-error.log (stderr)"
else
    echo "❌ Service failed to start, please check logs with: pm2 logs $APP_NAME"
    exit 1
fi

echo "🎉 Deployment completed with PM2!"
