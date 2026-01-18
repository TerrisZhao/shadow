# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Shadow 是一个基于 Next.js 15 的英语学习平台,使用 Shadowing 技术帮助用户提高英语口语能力。项目采用全栈架构,包含句子管理、语音生成、场景管理和练习系统。

## 开发命令

### 启动和构建
```bash
pnpm dev          # 启动开发服务器(使用 Turbopack)
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # ESLint 代码检查和自动修复
```

### 数据库管理
```bash
pnpm db:generate  # 生成 Drizzle 迁移文件(修改 schema 后运行)
pnpm db:migrate   # 执行数据库迁移
```

### 实用脚本
```bash
pnpm ai:test            # 测试 AI 功能
pnpm import:questions   # 导入问题数据
pnpm test:deepl         # 测试 DeepL 翻译
```

## 核心架构

### 路由结构 (App Router)

项目使用 Next.js 15 App Router,采用路由分组设计:

- `app/(auth)/` - 认证相关页面(简化布局)
  - `sign-in/` - 登录页面
- `app/(main)/` - 主应用页面(完整导航)
  - `dashboard/` - 仪表板
  - `sentence/` - 句子管理
  - `scene/` - 场景管理
  - `practice/` - 练习模块(语音识别、发音对比)
- `app/api/` - API 路由

### 认证系统

使用 **NextAuth.js v5** 实现,支持双重认证机制:

1. **Web 端**: Session Cookie 认证(JWT strategy)
2. **移动端**: Bearer Token 认证

**配置位置**:
- `lib/auth/config.ts` - NextAuth 配置(258行)
- `lib/auth/auth.ts` - 导出 auth、signIn、signOut
- `middleware.ts` - 路由保护中间件

**Providers**:
- Google OAuth (需配置 GOOGLE_CLIENT_ID/SECRET)
- Credentials (本地邮箱密码,使用 bcryptjs 加密)

**关键回调流程**:
- `signIn`: 记录登录历史(设备、浏览器、IP、位置)
- `jwt`: 将用户信息(ID、角色、主题)存入 token
- `session`: 将 token 映射到 session 对象

### 数据库设计

使用 **Drizzle ORM + PostgreSQL**,schema 定义在 `lib/db/schema.ts` (326行)。

**核心业务表**:
- `users` - 用户信息(支持多 provider)
- `sentences` - 英文句子库(中文翻译、难度、音频URL)
- `categories` - 句子分类(预设+自定义)
- `scenes` - 学习场景
- `sceneSentences` - 场景包含的句子(有序)
- `recordings` - 用户录音记录
- `tags` / `sentenceTags` - 标签系统
- `loginHistory` - 详细的登录历史记录

**关键索引和约束**:
- 条件唯一索引用于预设分类约束
- 多对多关系表(句子-标签、场景-句子)
- 支持复杂过滤(分类、难度、标签、全文搜索)

**数据库连接**: `lib/db/drizzle.ts` (关闭 prepared statements 以优化性能)

### API 设计

RESTful API 位于 `app/api/`,支持双重认证:
- Session Cookie (Web 端)
- Bearer Token (移动端,在路由中用 jwtVerify 验证)

**主要端点**:
- `/api/auth/*` - NextAuth 处理器
- `/api/sentences` - 句子 CRUD(支持 tab: shared/custom/favorite)
- `/api/scenes` - 场景管理
- `/api/recordings` - 录音上传和管理
- `/api/tts` - 文字转语音
- `/api/practice/random` - 随机句子(练习模式)
- `/api/categories` - 分类管理
- `/api/tags` - 标签管理

**句子 API 过滤参数**:
- `tab`: shared | custom | favorite
- `categoryId`, `difficulty`, `tagId`
- `search`: 全文搜索(英文/中文/备注)
- `page`, `limit`: 分页

### AI 集成

**配置**: `lib/ai/config.ts` - 使用 Azure OpenAI (gpt-5-mini)

**服务**: `lib/ai/services.ts` (158行)
- `analyzeSentence()` - 分析英语句子语法和用法
- `translateSentence()` - 英中互译
- `getLearningAdvice()` - 学习建议
- `translateITQuestion()` - IT 面试题翻译
- `sendMessage()` - 通用消息发送

**Prompts**: `lib/ai/prompts.ts` - LangChain ChatPromptTemplate
- englishTutorPrompt
- sentenceAnalyzerPrompt
- translatorPrompt
- learningAdvicePrompt
- itQuestionTranslatorPrompt

### 文字转语音 (TTS)

**生成器**: `lib/tts/generator.ts` (162行)

**流程**:
1. 调用本地 TTS 服务 (`http://localhost:8880/v1/audio/speech`)
2. 获取 mp3 音频数据
3. 上传到 Cloudflare R2 (AWS S3 兼容存储)
4. 返回公开访问 URL

**R2 配置**:
- 支持 bucket 在 endpoint 路径中或单独配置
- 文件名格式: `audio-{timestamp}-{random}.mp3`
- R2 客户端: `lib/utils/r2-client.ts` (234行)

### 翻译模块

**DeepL 翻译**: `lib/translator/deepl.ts` (164行)
- 调用 DeepL API 进行高质量翻译
- 用于句子的中英文互译

### 组件架构

**核心 Providers** (在 `app/providers.tsx` 中组合):
- `client-session-provider.tsx` - NextAuth SessionProvider
- `client-theme-provider.tsx` - next-themes 主题管理
- HeroUIProvider - UI 组件库
- ToastProvider - 提示通知

**功能组件**:
- `navbar.tsx` - 导航栏(支持完整/简化模式)
- `sentence-list.tsx` / `sentence-list-with-ai.tsx` - 句子列表
- `sentence-card.tsx` - 句子卡片
- `add-sentence-modal.tsx` / `edit-sentence-modal.tsx` - 句子表单
- `voice-input-button.tsx` - 语音输入(Web Speech API)
- `login-history-recorder.tsx` - 登录历史记录

**UI 框架**: HeroUI (基于 Tailwind CSS) + Framer Motion 动画

## 修改数据库 Schema 的流程

1. 编辑 `lib/db/schema.ts`
2. 运行 `pnpm db:generate` 生成迁移文件
3. 检查生成的迁移文件 (`drizzle/` 目录)
4. 运行 `pnpm db:migrate` 应用更改到数据库

## 环境变量要求

关键环境变量(参考 `env.example`):

```env
# 数据库
DATABASE_URL=postgres://username:password@localhost:5432/shadow

# NextAuth
NEXTAUTH_SECRET=...  # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (可选)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudflare R2 存储
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com/your-bucket
R2_PUBLIC_BASE_URL=https://your-custom-domain.com

# AI (Azure OpenAI)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_DEPLOYMENT_NAME=...

# DeepL 翻译
DEEPL_API_KEY=...

# TTS 服务
TTS_API_BASE_URL=http://localhost:8880
```

## 代码组织原则

### 分层架构
- `app/` - 路由和页面组件
- `lib/` - 业务逻辑和工具函数
- `components/` - 可复用 UI 组件
- `config/` - 应用配置
- `types/` - TypeScript 类型定义
- `scripts/` - 脚本工具

### 文件命名
- 服务端组件: 默认导出,文件名 kebab-case
- 客户端组件: 需要 "use client" 指令
- API 路由: `route.ts` (使用 Next.js Route Handlers)

### 认证保护
- 公开路由: `/sign-in`, `/api/auth/*`
- 需要认证的路由通过 `middleware.ts` 自动保护
- API 中获取当前用户:
  - Web: `await auth()` (从 lib/auth/auth.ts)
  - 移动端: 解析 Authorization header 中的 JWT

## 技术栈总结

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | React 18, HeroUI, Tailwind CSS, Framer Motion |
| 语言 | TypeScript |
| 数据库 | PostgreSQL + Drizzle ORM |
| 认证 | NextAuth.js v5 (JWT strategy) |
| 存储 | Cloudflare R2 (S3-compatible) |
| AI | LangChain + Azure OpenAI |
| TTS | 本地 TTS 服务 (OpenAI API 兼容) |
| 翻译 | DeepL API |
| 语音识别 | Web Speech API |
| 包管理 | pnpm |

## 常见开发任务

### 添加新的 API 端点
1. 在 `app/api/` 下创建 `[name]/route.ts`
2. 导出 GET、POST、PUT、DELETE 等函数
3. 使用 `await auth()` 获取当前用户
4. 使用 `db` (从 lib/db/drizzle) 访问数据库

### 添加新的数据库表
1. 在 `lib/db/schema.ts` 中定义表
2. 添加必要的索引和关系
3. 运行 `pnpm db:generate` 和 `pnpm db:migrate`
4. 如需初始化数据,在 `scripts/` 下创建脚本

### 创建新页面
1. 在 `app/(main)/` 下创建目录和 `page.tsx`
2. 如需保护,确保在 `middleware.ts` 之外(默认受保护)
3. 使用 `await auth()` 获取用户信息
4. 导入所需组件和 UI 库

### 添加新的 AI 功能
1. 在 `lib/ai/prompts.ts` 中定义新的 prompt
2. 在 `lib/ai/services.ts` 中添加新的服务函数
3. 使用 `getChatModel()` 获取 AI 模型实例
4. 在 API 路由或服务端组件中调用

## 注意事项

- **pnpm 配置**: 必须在 `.npmrc` 中设置 `public-hoist-pattern[]=*@heroui/*`
- **TTS 依赖**: 需要运行本地 TTS 服务在端口 8880
- **R2 配置**: endpoint 可包含 bucket 名称或通过 Bucket 参数指定
- **中间件**: 修改 `middleware.ts` 时注意路由匹配逻辑
- **数据库连接**: 使用 `db` 实例前检查是否已初始化(见 lib/db/drizzle.ts 的降级处理)
- **登录历史**: 用户登录时自动记录设备和位置信息(见 lib/utils/device-parser.ts)
