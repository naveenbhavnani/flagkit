# FlagKit

[![CI](https://github.com/naveenbhavnani/flagkit/actions/workflows/ci.yml/badge.svg)](https://github.com/naveenbhavnani/flagkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

> Modern, self-hosted feature flag management platform built for developers

FlagKit is a feature flag management platform that gives you complete control over feature rollouts and experimentation. Built with TypeScript and modern web technologies, it provides powerful targeting capabilities, type-safe SDKs, and a clean developer experience.

## 🎯 Project Vision

FlagKit aims to solve the common pain points of existing feature flag platforms:

- **Affordable Pricing**: Flat pricing tiers without surprise charges based on MAU
- **Built-in Experimentation**: A/B testing included from day one, not an expensive add-on
- **Simple & Intuitive**: Clean UI that doesn't overwhelm non-technical users
- **Developer-First**: Comprehensive SDKs with great DX and local evaluation
- **Stale Flag Management**: Automatic detection and cleanup workflows

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FlagKit Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Next.js    │    │   Fastify    │    │  PostgreSQL  │ │
│  │     Web      │◄───┤      API     │◄───┤   Database   │ │
│  │  Dashboard   │    │   + Auth     │    │              │ │
│  └──────────────┘    └──────┬───────┘    └──────────────┘ │
│                             │                              │
│                             │ SDK Endpoints                │
│                             ▼                              │
│                  ┌──────────────────────┐                  │
│                  │  Client Applications │                  │
│                  ├──────────────────────┤                  │
│                  │  @flagkit/sdk-js     │                  │
│                  │  @flagkit/sdk-react  │                  │
│                  └──────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

This is a **monorepo** managed with **pnpm workspaces**.

### Project Structure

```
flagkit/
├── apps/
│   ├── api/              # Fastify backend API
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic & targeting
│   │   │   ├── types/    # Type definitions
│   │   │   └── utils/    # Utilities & middleware
│   │   └── prisma/       # Database schema & migrations
│   │
│   └── web/              # Next.js 14 dashboard (App Router)
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/ # React components
│       │   ├── lib/      # Utilities
│       │   └── stores/   # Zustand stores
│       └── package.json
│
├── packages/
│   ├── sdk-js/           # JavaScript/TypeScript SDK
│   │   ├── src/
│   │   │   ├── client.ts # Main SDK client
│   │   │   ├── types.ts  # Type definitions
│   │   │   └── index.ts  # Public exports
│   │   └── README.md
│   │
│   ├── sdk-react/        # React SDK with hooks
│   │   ├── src/
│   │   │   ├── provider.tsx # Context provider
│   │   │   ├── hooks.ts  # React hooks
│   │   │   └── index.ts  # Public exports
│   │   └── README.md
│   │
│   └── config/           # Shared TypeScript config
│
└── package.json          # Root dependencies
```

### Tech Stack

**Backend (apps/api):**
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens + SDK key validation
- **Validation**: Zod schemas
- **Language**: TypeScript

**Frontend (apps/web):**
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Language**: TypeScript

**SDKs (packages/):**
- **@flagkit/sdk-js**: JavaScript/TypeScript SDK with polling & events
- **@flagkit/sdk-react**: React hooks and context provider
- **Build Tool**: tsup (fast TypeScript bundler)

**Development:**
- **Package Manager**: pnpm (monorepo with workspaces)
- **Database Tools**: Prisma CLI, migrations
- **Node Version**: 20.x

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 8+
- **PostgreSQL** 14+ (local or hosted)

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd flagkit
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Setup environment variables**

```bash
# Backend
cd apps/api
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Frontend
cd apps/web
cp .env.example .env.local
# Edit .env.local with API URL
```

4. **Setup the database**

```bash
cd apps/api

# Run migrations
pnpm prisma migrate dev

# Seed database with demo data
pnpm prisma db seed
```

5. **Start development servers**

```bash
# Terminal 1 - API Server
cd apps/api
pnpm dev    # Runs on http://localhost:3001

# Terminal 2 - Web Dashboard
cd apps/web
pnpm dev    # Runs on http://localhost:3000
```

6. **Login to Dashboard**

Default credentials (from seed data):
- **Email**: admin@example.com
- **Password**: admin123

**Want a guided walkthrough?** Check out the [End-to-End Demo Guide](./DEMO.md) for a complete tutorial including building a demo React app with targeting rules.

### Quick SDK Usage

Install the SDK in your application:

```bash
npm install @flagkit/sdk-react
```

Use in your React app:

```tsx
import { FlagKitProvider, useBooleanFlag } from '@flagkit/sdk-react';

function App() {
  return (
    <FlagKitProvider config={{ sdkKey: 'your-sdk-key' }}>
      <MyApp />
    </FlagKitProvider>
  );
}

function MyComponent() {
  const showNewFeature = useBooleanFlag('new-feature', false);
  return showNewFeature ? <NewFeature /> : <OldFeature />;
}
```

## 📚 Development Workflow

### Common Commands

```bash
# Development
cd apps/api && pnpm dev     # Start API server
cd apps/web && pnpm dev     # Start web dashboard

# Build
cd packages/sdk-js && pnpm build      # Build JavaScript SDK
cd packages/sdk-react && pnpm build   # Build React SDK

# Database
cd apps/api
pnpm prisma generate        # Generate Prisma client
pnpm prisma migrate dev     # Create and run migrations
pnpm prisma studio          # Open Prisma Studio
pnpm prisma db seed         # Seed database

# Lint
cd apps/api && pnpm lint    # Lint API code
cd apps/web && pnpm lint    # Lint web code
```

### Environment Variables

**apps/api/.env**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/flagkit"
JWT_SECRET="your-secret-key"
PORT=3001
```

**apps/web/.env.local**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Working with the Monorepo

- Each package/app has its own `package.json`
- Shared dependencies are hoisted to root `node_modules`
- Internal dependencies use workspace protocol: `"@flagkit/sdk-js": "workspace:*"`
- Build SDKs before using them in development

## ✅ Current Features

### Core Platform
- ✅ **Authentication System**: JWT-based auth with login/register
- ✅ **Organization Management**: Multi-tenant architecture with isolation
- ✅ **Project Management**: Group related flags into projects
- ✅ **Environment Support**: Dev, staging, production environments per project
- ✅ **Flag CRUD**: Create, read, update, delete flags with variations
- ✅ **Flag Types**: Boolean, string, number, and JSON flag values

### Targeting & Rollouts
- ✅ **Targeting Rules Engine**: Complex user targeting with conditions
- ✅ **14 Condition Operators**: equals, notEquals, contains, in, greaterThan, matches (regex), etc.
- ✅ **AND/OR Logic**: Combine conditions with configurable logic
- ✅ **Percentage Rollouts**: Per-rule and global rollout percentages
- ✅ **Stable Bucketing**: djb2 hash algorithm for consistent user assignment
- ✅ **User Context**: Target based on userId and custom attributes

### Client SDKs
- ✅ **JavaScript SDK (@flagkit/sdk-js)**:
  - Automatic polling with configurable intervals
  - Event system (ready, update, error)
  - Context management
  - Type-safe flag access
  - Full TypeScript support

- ✅ **React SDK (@flagkit/sdk-react)**:
  - FlagKitProvider context provider
  - 7 specialized hooks (useBooleanFlag, useStringFlag, etc.)
  - Automatic re-rendering on flag changes
  - Memoized performance
  - Full TypeScript support

### Dashboard UI
- ✅ **Responsive Navigation**: Sidebar with active route highlighting
- ✅ **Organization Views**: List and manage organizations
- ✅ **Project Views**: Manage projects and environments
- ✅ **Flag Management**: Create and configure flags
- ✅ **Environment Controls**: Per-environment flag configuration

## 🗺️ Roadmap

### Phase 1: MVP Completion (Current)
- ✅ Core platform architecture
- ✅ Targeting rules engine
- ✅ JavaScript & React SDKs
- 🔄 Complete documentation
- [ ] Targeting rules UI (currently JSON-based)
- [ ] Flag change history/audit log
- [ ] SDK key management UI

### Phase 2: Enhanced Features
- [ ] Analytics dashboard with evaluation metrics
- [ ] A/B testing metrics and statistical analysis
- [ ] Advanced targeting rules UI builder
- [ ] Webhooks for flag change notifications
- [ ] Flag dependencies and prerequisites
- [ ] Segment management UI

### Phase 3: Additional SDKs & Integrations
- [ ] Python SDK
- [ ] Go SDK
- [ ] Mobile SDKs (iOS, Android)
- [ ] Slack integration
- [ ] GitHub integration
- [ ] OpenFeature provider

### Phase 4: Enterprise Features
- [ ] SSO/SAML authentication
- [ ] Advanced RBAC with custom roles
- [ ] Approval workflows for flag changes
- [ ] SOC 2 compliance
- [ ] Advanced audit logging
- [ ] Multi-region deployment

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details

### Projects
- `GET /api/projects` - List projects for organization
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details

### Flags
- `GET /api/flags` - List flags for project
- `POST /api/flags` - Create flag
- `GET /api/flags/:id` - Get flag details
- `PATCH /api/flags/:id/environments/:envId` - Update flag environment config

### SDK Endpoints (Client-Side)
- `GET /sdk/v1/client/:sdkKey/flags` - Get all flags with optional context
- `POST /sdk/v1/client/:sdkKey/evaluate/:flagKey` - Evaluate single flag with context

## 📖 Documentation

- [JavaScript SDK Documentation](./packages/sdk-js/README.md)
- [React SDK Documentation](./packages/sdk-react/README.md)

## 🤝 Contributing

This is currently a solo project, but contributions are welcome once the core MVP is stable. Feel free to:

1. Open issues for bugs or feature requests
2. Suggest improvements to documentation
3. Provide feedback on the developer experience

## 📝 License

MIT License

## 🔗 Resources

- [End-to-End Demo Guide](./DEMO.md) - Complete walkthrough from setup to production
- [JavaScript SDK Documentation](./packages/sdk-js/README.md) - Complete JS/TS SDK reference
- [React SDK Documentation](./packages/sdk-react/README.md) - React hooks and provider guide
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions

---

**Status**: 🚀 MVP Complete - Active Development

Built with ❤️ for developers who need flexible, powerful feature flags
