# Shadow - 英语句子学习平台

中文 | [English](./README.md)

Shadow 是一个现代化的英语句子学习平台，帮助用户通过影子跟读法（Shadowing）提升英语口语能力。平台提供句子管理、语音生成、分类组织等功能，支持共享学习资源和个性化学习路径。

## ✨ 核心特性

### 📚 句子管理
- **共享库**：管理员精选的优质学习句子，所有用户可见
- **自定义句子**：用户可以添加和管理自己的学习内容
- **收藏功能**：标记重要句子，方便复习
- **难度分级**：支持 easy/medium/hard 三个难度等级

### 🔊 语音功能
- **TTS 语音生成**：自动将英文句子转换为高质量语音
- **多种音色**：支持多种语音选择
- **云端存储**：音频文件自动上传至 Cloudflare R2，加载快速稳定

### 🏷️ 分类系统
- **预设分类**：系统内置常用学习场景分类
- **自定义分类**：用户可创建个性化分类，支持自定义颜色
- **灵活组织**：轻松管理不同主题的学习内容

### 👥 用户系统
- **多种登录方式**：支持 Google OAuth 和账号密码登录
- **角色权限**：owner/admin/user 三级权限管理
- **数据隔离**：用户数据安全独立

### 🎨 现代化界面
- **响应式设计**：完美适配桌面端和移动端
- **深色模式**：支持明暗主题切换
- **流畅交互**：基于 Framer Motion 的精美动画效果

## 🛠️ 技术栈

### 前端
- **[Next.js 15](https://nextjs.org/)** - React 全栈框架，使用 App Router
- **[React 18](https://react.dev/)** - 用户界面库
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript
- **[HeroUI v2](https://heroui.com/)** - 现代化 React UI 组件库
- **[Tailwind CSS](https://tailwindcss.com/)** - 原子化 CSS 框架
- **[Framer Motion](https://www.framer.com/motion/)** - 动画库
- **[Lucide React](https://lucide.dev/)** - 图标库

### 后端
- **[NextAuth.js](https://next-auth.js.org/)** - 身份认证解决方案
- **[Drizzle ORM](https://orm.drizzle.team/)** - 类型安全的 TypeScript ORM
- **[PostgreSQL](https://www.postgresql.org/)** - 关系型数据库
- **[Cloudflare R2](https://www.cloudflare.com/products/r2/)** - 对象存储（S3 兼容）

### 开发工具
- **[ESLint](https://eslint.org/)** - 代码规范检查
- **[Prettier](https://prettier.io/)** - 代码格式化
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - 数据库迁移工具

## 📋 前置要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0（推荐）或 npm/yarn
- PostgreSQL 数据库
- Cloudflare R2 账户（用于音频文件存储）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/shadow.git
cd shadow
```

### 2. 安装依赖

```bash
pnpm install
```

如果使用 `pnpm`，需要在项目根目录创建 `.npmrc` 文件并添加以下内容：

```bash
public-hoist-pattern[]=*@heroui/*
```

### 3. 配置环境变量

复制 `env.example` 文件为 `.env`，并填写必要的配置：

```bash
cp env.example .env
```

配置说明：

```env
# 数据库连接
DATABASE_URL=postgres://username:password@localhost:5432/shadow

# NextAuth.js 配置
NEXTAUTH_SECRET=your-secret-key-here  # 使用 openssl rand -base64 32 生成
NEXTAUTH_URL=http://localhost:3000

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare R2 存储
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com/your-bucket
R2_PUBLIC_BASE_URL=https://your-custom-domain.com
```

### 4. 初始化数据库

```bash
# 生成数据库迁移文件
pnpm db:generate

# 执行数据库迁移
pnpm db:push

# 初始化数据库表
pnpm db:init

# 初始化预设分类
pnpm db:init-categories
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📦 可用脚本

```bash
# 开发
pnpm dev          # 启动开发服务器（使用 Turbopack）
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # 代码检查和自动修复

# 数据库
pnpm db:generate  # 生成迁移文件
pnpm db:migrate   # 执行迁移
pnpm db:push      # 推送 schema 到数据库
pnpm db:studio    # 启动 Drizzle Studio（数据库可视化工具）
pnpm db:init      # 初始化数据库
pnpm db:init-categories  # 初始化预设分类
```

## 🏗️ 项目结构

```
shadow/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 认证相关页面
│   │   └── sign-in/         # 登录页面
│   ├── (main)/              # 主应用页面
│   │   ├── dashboard/       # 仪表板
│   │   ├── sentence/        # 句子管理页面
│   │   └── settings/        # 设置页面
│   └── api/                 # API 路由
│       ├── auth/            # 认证 API
│       ├── categories/      # 分类 API
│       ├── sentences/       # 句子 API
│       └── tts/             # TTS 语音生成 API
├── components/              # React 组件
│   ├── add-sentence-modal.tsx
│   ├── edit-sentence-modal.tsx
│   ├── sentence-list.tsx
│   └── navbar.tsx
├── lib/                     # 工具库
│   ├── auth/               # 认证配置
│   ├── db/                 # 数据库配置和 Schema
│   └── tts/                # TTS 语音生成
├── config/                  # 应用配置
├── styles/                  # 全局样式
├── types/                   # TypeScript 类型定义
└── scripts/                 # 脚本文件
```

## 🔐 认证配置

### Google OAuth 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 凭据
5. 配置授权重定向 URI：`http://localhost:3000/api/auth/callback/google`
6. 将 Client ID 和 Client Secret 添加到 `.env` 文件

## 🎙️ TTS 配置

项目使用本地 TTS 服务（默认端口 8880）生成语音。您需要：

1. 部署或运行兼容 OpenAI TTS API 的本地服务
2. 配置 Cloudflare R2 存储桶用于存储音频文件
3. 设置 R2 公开访问域名以提供音频访问

## 🌍 部署

### Vercel 部署（推荐）

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署

### Docker 部署

```bash
# 构建镜像
docker build -t shadow .

# 运行容器
docker run -p 3000:3000 --env-file .env shadow
```

## 📝 开发注意事项

### 数据库 Schema 修改

1. 修改 `lib/db/schema.ts` 中的表结构
2. 运行 `pnpm db:generate` 生成迁移文件
3. 运行 `pnpm db:push` 应用更改

### 代码规范

- 遵循 [DRY 原则](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)（Don't Repeat Yourself）
- 遵循 [KISS 原则](https://en.wikipedia.org/wiki/KISS_principle)（Keep It Simple, Stupid）
- 遵循 [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)
- 使用 TypeScript 进行类型安全开发
- 提交前运行 `pnpm lint` 检查代码

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

- [HeroUI](https://heroui.com/) - 提供优秀的 UI 组件库
- [Next.js](https://nextjs.org/) - 强大的 React 框架
- [Drizzle ORM](https://orm.drizzle.team/) - 类型安全的 ORM

---

如有问题或建议，欢迎提交 [Issue](https://github.com/your-username/shadow/issues)。

