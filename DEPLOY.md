# AWS EC2 部署指南

本文档详细说明如何将 Shadow 应用部署到 AWS EC2 实例上。

## 📋 前置要求

- AWS EC2 实例（推荐 Ubuntu 22.04 LTS 或 Amazon Linux 2023）
- 至少 2GB RAM，2 CPU 核心
- 已配置安全组，开放端口 3000（或你选择的其他端口）
- 已配置的 PostgreSQL 数据库（可以是 RDS 或 EC2 上的 PostgreSQL）
- 所有必要的环境变量配置

## 🚀 部署方式

### 方式一：使用 Docker（推荐）

Docker 部署提供了更好的隔离性和可移植性。

#### 1. 准备 EC2 实例

```bash
# SSH 连接到 EC2 实例
ssh -i your-key.pem ubuntu@your-ec2-ip

# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户添加到 docker 组（可选，避免每次使用 sudo）
sudo usermod -aG docker $USER
```

#### 2. 克隆项目

```bash
# 创建应用目录
mkdir -p /opt/shadow
cd /opt/shadow

# 克隆代码（或使用 scp 上传）
git clone https://github.com/your-username/shadow.git .
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量（使用你喜欢的编辑器）
nano .env
```

**重要环境变量配置：**

```env
# 数据库连接（如果是 RDS，使用 RDS 端点）
DATABASE_URL=postgres://username:password@your-db-host:5432/shadow

# NextAuth 配置
NEXTAUTH_SECRET=your-secret-key-here  # 使用 openssl rand -base64 32 生成
NEXTAUTH_URL=https://your-domain.com  # 生产环境域名

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare R2 存储
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com/your-bucket
R2_PUBLIC_BASE_URL=https://your-custom-domain.com

# Azure OpenAI
AZURE_OPENAI_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2025-04-01-preview

# DeepL 翻译
DEEPL_AUTH_KEY=your-deepl-api-key

# TTS 服务（如果使用外部 TTS 服务）
TTS_API_BASE_URL=http://your-tts-service:8880
```

#### 4. 构建和运行 Docker 容器

```bash
# 构建镜像
docker build -t shadow-app .

# 运行容器
docker run -d \
  --name shadow-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  shadow-app

# 或者使用 docker-compose（推荐）
docker-compose up -d
```

#### 5. 查看日志

```bash
# 查看容器日志
docker logs -f shadow-app

# 或使用 docker-compose
docker-compose logs -f
```

#### 6. 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建并重启
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 方式二：直接部署（不使用 Docker）

适合需要更多控制或不想使用 Docker 的场景。

#### 1. 准备 EC2 实例

```bash
# SSH 连接到 EC2 实例
ssh -i your-key.pem ubuntu@your-ec2-ip

# 更新系统
sudo apt-get update && sudo apt-get upgrade -y
```

#### 2. 运行部署脚本

```bash
# 克隆项目
git clone https://github.com/your-username/shadow.git /opt/shadow
cd /opt/shadow

# 给部署脚本执行权限
chmod +x deploy-ec2.sh

# 运行部署脚本（需要 sudo）
sudo ./deploy-ec2.sh
```

部署脚本会自动：
- 创建应用用户和目录
- 安装 Node.js、pnpm、PM2
- 安装项目依赖
- 构建项目
- 使用 PM2 启动应用
- 配置开机自启

#### 3. 手动部署步骤（如果不想使用脚本）

```bash
# 1. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 pnpm
npm install -g pnpm

# 3. 安装 PM2
npm install -g pm2

# 4. 克隆项目
git clone https://github.com/your-username/shadow.git /opt/shadow
cd /opt/shadow

# 5. 安装依赖
pnpm install --frozen-lockfile

# 6. 配置环境变量
cp env.example .env
nano .env  # 编辑环境变量

# 7. 构建项目
pnpm build

# 8. 启动应用
pm2 start "pnpm run start" --name shadow

# 9. 保存 PM2 配置
pm2 save

# 10. 设置开机自启
pm2 startup systemd
```

## 🔧 PM2 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs shadow

# 重启应用
pm2 restart shadow

# 停止应用
pm2 stop shadow

# 删除应用
pm2 delete shadow

# 监控
pm2 monit
```

## 🌐 配置反向代理（Nginx）

为了使用域名访问并启用 HTTPS，建议配置 Nginx 作为反向代理。

#### 1. 安装 Nginx

```bash
sudo apt-get install -y nginx
```

#### 2. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/shadow`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS（如果已配置 SSL）
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/shadow /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 4. 配置 SSL（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 证书会自动续期
```

## 🔒 安全配置

#### 1. 配置防火墙（UFW）

```bash
# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果直接访问应用（不使用 Nginx），允许 3000 端口
# sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

#### 2. 更新 NextAuth URL

确保 `.env` 文件中的 `NEXTAUTH_URL` 设置为你的实际域名：

```env
NEXTAUTH_URL=https://your-domain.com
```

#### 3. 数据库安全

- 如果使用 RDS，确保安全组只允许 EC2 实例访问
- 使用强密码
- 定期备份数据库

## 📊 监控和日志

#### 查看应用日志

**Docker 方式：**
```bash
docker logs -f shadow-app
```

**PM2 方式：**
```bash
pm2 logs shadow
```

#### 查看系统资源

```bash
# CPU 和内存使用
htop

# 磁盘使用
df -h

# 网络连接
netstat -tulpn
```

## 🔄 更新应用

### Docker 方式

```bash
cd /opt/shadow
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### PM2 方式

```bash
cd /opt/shadow
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart shadow
```

## 🐛 故障排查

#### 应用无法启动

1. 检查环境变量是否正确配置
2. 检查数据库连接是否正常
3. 查看应用日志：`pm2 logs shadow` 或 `docker logs shadow-app`
4. 检查端口是否被占用：`sudo lsof -i :3000`

#### 数据库连接失败

1. 检查 `DATABASE_URL` 是否正确
2. 检查数据库安全组是否允许 EC2 访问
3. 测试数据库连接：
   ```bash
   psql $DATABASE_URL
   ```

#### 内存不足

如果应用内存占用过高：

1. 增加 EC2 实例大小
2. 优化 Next.js 构建配置
3. 使用 Docker 限制容器内存：
   ```yaml
   # docker-compose.yml
   services:
     shadow-app:
       mem_limit: 1g
   ```

## 📝 注意事项

1. **环境变量安全**：不要将 `.env` 文件提交到 Git 仓库
2. **数据库迁移**：首次部署后运行 `pnpm db:migrate` 初始化数据库
3. **TTS 服务**：如果使用外部 TTS 服务，确保服务可访问
4. **备份**：定期备份数据库和应用数据
5. **监控**：建议设置 CloudWatch 或其他监控服务

## 🆘 获取帮助

如果遇到问题，请检查：
- 应用日志
- 系统日志：`journalctl -u shadow`（如果使用 systemd）
- PM2 日志：`pm2 logs`
- Docker 日志：`docker logs shadow-app`
