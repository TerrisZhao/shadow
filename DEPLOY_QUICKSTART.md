# 快速部署指南

## 🚀 一键部署到 AWS EC2

### 方式一：Docker 部署（推荐，5分钟）

```bash
# 1. SSH 连接到 EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. 克隆项目
git clone https://github.com/your-username/shadow.git /opt/shadow
cd /opt/shadow

# 4. 配置环境变量
cp env.example .env
nano .env  # 填写所有必要的环境变量

# 5. 启动应用
docker-compose up -d

# 6. 查看日志
docker-compose logs -f
```

### 方式二：PM2 部署（10分钟）

```bash
# 1. SSH 连接到 EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. 运行部署脚本
git clone https://github.com/your-username/shadow.git /opt/shadow
cd /opt/shadow
chmod +x deploy-ec2.sh
sudo ./deploy-ec2.sh
```

## 📋 必需的环境变量

创建 `.env` 文件并配置以下变量：

```env
# 数据库（必需）
DATABASE_URL=postgres://user:password@host:5432/shadow

# NextAuth（必需）
NEXTAUTH_SECRET=your-secret-key  # 运行: openssl rand -base64 32
NEXTAUTH_URL=https://your-domain.com

# Cloudflare R2（必需）
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com/bucket
R2_PUBLIC_BASE_URL=https://your-cdn-domain.com

# Azure OpenAI（必需）
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini

# DeepL（必需）
DEEPL_AUTH_KEY=your-key

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret

# TTS 服务（可选，如果使用外部服务）
TTS_API_BASE_URL=http://your-tts-service:8880
```

## 🔧 常用命令

### Docker 方式

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 查看日志
docker-compose logs -f

# 重启
docker-compose restart

# 更新代码
git pull && docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### PM2 方式

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs shadow

# 重启
pm2 restart shadow

# 停止
pm2 stop shadow
```

## 🌐 配置域名和 HTTPS

1. **配置 Nginx 反向代理**（见 `DEPLOY.md`）
2. **使用 Let's Encrypt 获取 SSL 证书**：
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## ✅ 验证部署

访问以下 URL 验证部署：

- 应用首页: `http://your-domain.com`
- 健康检查: `http://your-domain.com/api/health`

## 🆘 遇到问题？

1. **查看日志**：
   - Docker: `docker-compose logs -f`
   - PM2: `pm2 logs shadow`

2. **检查环境变量**：确保所有必需的环境变量都已配置

3. **检查数据库连接**：确保数据库可访问且连接字符串正确

4. **检查端口**：确保安全组允许 3000 端口（或你配置的端口）

5. **查看详细文档**：参考 `DEPLOY.md` 获取完整的故障排查指南
