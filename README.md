# Shadow - English Sentence Learning Platform

[中文文档](./README.zh-CN.md) | English

Shadow is a modern English sentence learning platform that helps users improve their English speaking skills through the Shadowing technique. The platform provides sentence management, voice generation, category organization, and supports shared learning resources and personalized learning paths.

## ✨ Core Features

### 📚 Sentence Management
- **Shared Library**: Admin-curated quality learning sentences visible to all users
- **Custom Sentences**: Users can add and manage their own learning content
- **Favorites**: Mark important sentences for easy review
- **Difficulty Levels**: Support for easy/medium/hard difficulty classifications

### 🔊 Voice Features
- **TTS Voice Generation**: Automatically convert English sentences to high-quality audio
- **Multiple Voices**: Support for various voice options
- **Cloud Storage**: Audio files automatically uploaded to Cloudflare R2 for fast and stable loading

### 🏷️ Category System
- **Preset Categories**: Built-in common learning scenario categories
- **Custom Categories**: Users can create personalized categories with custom colors
- **Flexible Organization**: Easily manage learning content across different topics

### 👥 User System
- **Multiple Login Methods**: Support for Google OAuth and username/password authentication
- **Role Permissions**: Three-tier permission management (owner/admin/user)
- **Data Isolation**: User data is secure and independent

### 🎨 Modern Interface
- **Responsive Design**: Perfect adaptation for desktop and mobile devices
- **Dark Mode**: Support for light and dark theme switching
- **Smooth Interactions**: Beautiful animation effects based on Framer Motion

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React full-stack framework with App Router
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[HeroUI v2](https://heroui.com/)** - Modern React UI component library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe TypeScript ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Cloudflare R2](https://www.cloudflare.com/products/r2/)** - Object storage (S3-compatible)

### Development Tools
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - Database migration tool

## 📋 Prerequisites

- Node.js >= 18.17.0
- pnpm >= 8.0.0 (recommended) or npm/yarn
- PostgreSQL database
- Cloudflare R2 account (for audio file storage)

## 🚀 Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/your-username/shadow.git
cd shadow
```

### 2. Install Dependencies

```bash
pnpm install
```

If using `pnpm`, create a `.npmrc` file in the project root with the following content:

```bash
public-hoist-pattern[]=*@heroui/*
```

### 3. Configure Environment Variables

Copy the `env.example` file to `.env` and fill in the necessary configuration:

```bash
cp env.example .env
```

Configuration details:

```env
# Database connection
DATABASE_URL=postgres://username:password@localhost:5432/shadow

# NextAuth.js configuration
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare R2 storage
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com/your-bucket
R2_PUBLIC_BASE_URL=https://your-custom-domain.com
```

### 4. Initialize Database

```bash
# Generate database migration files
pnpm db:generate

# Execute database migration
pnpm db:push

# Initialize database tables
pnpm db:init

# Initialize preset categories
pnpm db:init-categories
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 📦 Available Scripts

```bash
# Development
pnpm dev          # Start development server (with Turbopack)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint and auto-fix code

# Database
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Execute migrations
pnpm db:push      # Push schema to database
pnpm db:studio    # Start Drizzle Studio (database visualization tool)
pnpm db:init      # Initialize database
pnpm db:init-categories  # Initialize preset categories
```

## 🏗️ Project Structure

```
shadow/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   │   └── sign-in/         # Sign-in page
│   ├── (main)/              # Main application pages
│   │   ├── dashboard/       # Dashboard
│   │   ├── sentence/        # Sentence management page
│   │   └── settings/        # Settings page
│   └── api/                 # API routes
│       ├── auth/            # Authentication API
│       ├── categories/      # Categories API
│       ├── sentences/       # Sentences API
│       └── tts/             # TTS voice generation API
├── components/              # React components
│   ├── add-sentence-modal.tsx
│   ├── edit-sentence-modal.tsx
│   ├── sentence-list.tsx
│   └── navbar.tsx
├── lib/                     # Utility libraries
│   ├── auth/               # Authentication configuration
│   ├── db/                 # Database configuration and schema
│   └── tts/                # TTS voice generation
├── config/                  # Application configuration
├── styles/                  # Global styles
├── types/                   # TypeScript type definitions
└── scripts/                 # Script files
```

## 🔐 Authentication Configuration

### Google OAuth Setup

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Configure authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add Client ID and Client Secret to `.env` file

## 🎙️ TTS Configuration

The project uses a local TTS service (default port 8880) to generate voice. You need to:

1. Deploy or run a local service compatible with OpenAI TTS API
2. Configure Cloudflare R2 bucket for storing audio files
3. Set up R2 public access domain to serve audio files

## 🌍 Deployment

### Vercel Deployment (Recommended)

1. Push the project to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Docker Deployment

```bash
# Build image
docker build -t shadow .

# Run container
docker run -p 3000:3000 --env-file .env shadow
```

## 📝 Development Notes

### Database Schema Modifications

1. Modify table structure in `lib/db/schema.ts`
2. Run `pnpm db:generate` to generate migration files
3. Run `pnpm db:push` to apply changes

### Code Standards

- Follow [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) (Don't Repeat Yourself)
- Follow [KISS Principle](https://en.wikipedia.org/wiki/KISS_principle) (Keep It Simple, Stupid)
- Follow [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- Use TypeScript for type-safe development
- Run `pnpm lint` before committing code

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [HeroUI](https://heroui.com/) - Excellent UI component library
- [Next.js](https://nextjs.org/) - Powerful React framework
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe ORM

---

For questions or suggestions, please submit an [Issue](https://github.com/your-username/shadow/issues).
