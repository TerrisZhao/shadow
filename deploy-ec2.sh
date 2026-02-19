#!/bin/bash

# AWS EC2 部署脚本
# 用于在 EC2 实例上部署 Shadow 应用
# 使用方法: ./deploy-ec2.sh

set -e  # 遇到错误立即退出

APP_NAME="shadow"
APP_PORT=3000
APP_DIR="/opt/shadow"
SERVICE_USER="shadow"

echo "🚀 开始部署 Shadow 应用到 EC2..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
  echo "⚠️  请使用 sudo 运行此脚本"
  exit 1
fi

# 1. 创建应用目录和用户
echo "📁 创建应用目录和用户..."
if ! id "$SERVICE_USER" &>/dev/null; then
  useradd -r -s /bin/bash -d "$APP_DIR" "$SERVICE_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

# 2. 安装必要的系统依赖
echo "📦 安装系统依赖..."
if command -v apt-get >/dev/null 2>&1; then
  # Debian/Ubuntu
  apt-get update
  apt-get install -y curl git build-essential
elif command -v yum >/dev/null 2>&1; then
  # Amazon Linux/CentOS/RHEL
  yum update -y
  yum install -y curl git gcc gcc-c++ make
fi

# 3. 安装 Node.js (如果未安装)
if ! command -v node >/dev/null 2>&1; then
  echo "📦 安装 Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 4. 安装 pnpm (如果未安装)
if ! command -v pnpm >/dev/null 2>&1; then
  echo "📦 安装 pnpm..."
  npm install -g pnpm
fi

# 5. 安装 PM2 (如果未安装)
if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 安装 PM2..."
  npm install -g pm2
fi

# 6. 切换到应用目录
cd "$APP_DIR"

# 7. 克隆或更新代码
if [ -d ".git" ]; then
  echo "📥 更新代码..."
  sudo -u "$SERVICE_USER" git pull origin main || git pull origin main
else
  echo "📥 克隆代码库..."
  # 注意: 这里需要你提供实际的 Git 仓库地址
  echo "⚠️  请手动克隆代码库到 $APP_DIR"
  echo "   例如: git clone https://github.com/your-username/shadow.git ."
  exit 1
fi

# 8. 安装项目依赖
echo "📦 安装项目依赖..."
sudo -u "$SERVICE_USER" pnpm install --frozen-lockfile

# 9. 检查环境变量文件
if [ ! -f ".env" ]; then
  echo "⚠️  警告: .env 文件不存在"
  echo "   请创建 .env 文件并配置必要的环境变量"
  echo "   参考 env.example 文件"
fi

# 10. 构建项目
echo "🔨 构建项目..."
sudo -u "$SERVICE_USER" pnpm build

# 11. 使用 PM2 管理应用
echo "🔁 配置 PM2..."
if pm2 list | grep -q "$APP_NAME"; then
  echo "⚠️  应用已在运行，重启中..."
  pm2 stop "$APP_NAME"
  pm2 delete "$APP_NAME"
fi

# 切换到应用用户运行 PM2
cd "$APP_DIR"
sudo -u "$SERVICE_USER" pm2 start "pnpm run start" \
  --name "$APP_NAME" \
  --log-date-format="YYYY-MM-DD HH:mm Z" \
  --time \
  --output "$APP_DIR/app.log" \
  --error "$APP_DIR/app-error.log"

# 12. 保存 PM2 配置
sudo -u "$SERVICE_USER" pm2 save

# 13. 设置 PM2 开机自启
pm2 startup systemd -u "$SERVICE_USER" --hp "$APP_DIR" || true

# 14. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 15. 检查服务状态
if pm2 list | grep "$APP_NAME" | grep -q "online"; then
  echo "✅ 服务启动成功!"
  echo "🌐 应用运行在: http://localhost:$APP_PORT"
  echo "📋 日志文件: $APP_DIR/app.log (stdout), $APP_DIR/app-error.log (stderr)"
  echo ""
  echo "📊 查看状态: pm2 status"
  echo "📋 查看日志: pm2 logs $APP_NAME"
  echo "🔄 重启应用: pm2 restart $APP_NAME"
else
  echo "❌ 服务启动失败，请检查日志:"
  echo "   pm2 logs $APP_NAME"
  exit 1
fi

echo "🎉 部署完成!"
