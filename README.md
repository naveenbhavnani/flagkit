# FlagKit

> Modern feature flag management platform with built-in experimentation

FlagKit is a feature flag and experimentation platform designed to be simple, affordable, and developer-friendly. Built with TypeScript and modern web technologies, it provides a complete solution for feature management, A/B testing, and progressive rollouts.

## 🎯 Project Vision

FlagKit aims to solve the common pain points of existing feature flag platforms:

- **Affordable Pricing**: Flat pricing tiers without surprise charges based on MAU
- **Built-in Experimentation**: A/B testing included from day one, not an expensive add-on
- **Simple & Intuitive**: Clean UI that doesn't overwhelm non-technical users
- **Developer-First**: Comprehensive SDKs with great DX and local evaluation
- **Stale Flag Management**: Automatic detection and cleanup workflows

## 🏗️ Architecture

This is a **monorepo** managed with **Turborepo** and **pnpm workspaces**.

### Project Structure

```
flagkit/
├── apps/
│   ├── web/          # Next.js 14 frontend (App Router)
│   └── api/          # Fastify backend API
├── packages/
│   ├── database/     # Prisma schema & client
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared configs (TypeScript, ESLint)
│   ├── sdk-core/     # Core SDK logic
│   ├── sdk-node/     # Node.js SDK (server-side)
│   ├── sdk-react/    # React SDK (client-side)
│   ├── sdk-js/       # Vanilla JS SDK
│   └── ui/           # Shared UI components
└── docs/             # Documentation
```

### Tech Stack

**Backend:**
- **Fastify** - High-performance Node.js framework
- **PostgreSQL** - Primary database (via Prisma)
- **Redis** - Caching and real-time updates
- **Zod** - Runtime type validation

**Frontend:**
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Re-usable component library
- **Zustand** - State management
- **TanStack Query** - Data fetching and caching

**Infrastructure:**
- **Vercel** - Frontend hosting
- **Railway/Render** - Backend hosting
- **Neon/Supabase** - Managed PostgreSQL
- **Upstash** - Managed Redis

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **PostgreSQL** (local or hosted)
- **Redis** (optional for development)

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
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database credentials

# Frontend
cp apps/web/.env.example apps/web/.env
```

4. **Setup the database**

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Or run migrations (production)
pnpm db:migrate

# Seed database with demo data
cd packages/database
pnpm db:seed
```

5. **Start development servers**

```bash
# Start all apps in development mode
pnpm dev

# Or start individually
cd apps/api && pnpm dev    # API at http://localhost:3001
cd apps/web && pnpm dev    # Web at http://localhost:3000
```

## 📚 Development Workflow

### Available Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm format           # Format code with Prettier

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes (dev)
pnpm db:migrate       # Create and run migrations
pnpm db:studio        # Open Prisma Studio

# Cleanup
pnpm clean            # Remove build artifacts
```

### Working with the Monorepo

- Each package/app is independent with its own `package.json`
- Shared dependencies are hoisted to root `node_modules`
- Use workspace protocol for internal dependencies: `"@flagkit/types": "workspace:*"`
- Turborepo handles build caching and task orchestration

## 🗺️ Development Roadmap

### Phase 1: MVP (Current - Months 1-3)

- [x] Project scaffolding and monorepo setup
- [x] Database schema with Prisma
- [x] Basic backend API structure
- [x] Frontend shell with Next.js
- [ ] Authentication system (email/password + OAuth)
- [ ] Organization/Project/Environment management
- [ ] Core flag CRUD operations
- [ ] Basic targeting and rollouts
- [ ] Node.js & React SDKs
- [ ] Basic dashboard UI

### Phase 2: Enhancement (Months 4-6)

- [ ] A/B testing engine
- [ ] Statistical analysis
- [ ] Additional SDKs (Python, Java, JavaScript)
- [ ] Integrations (Slack, GitHub)
- [ ] Advanced targeting rules
- [ ] Analytics dashboard
- [ ] Audit logs

### Phase 3: Enterprise (Months 7-12)

- [ ] SSO/SAML authentication
- [ ] Custom roles & permissions
- [ ] Approval workflows
- [ ] Advanced analytics
- [ ] Self-hosted option
- [ ] SOC 2 compliance

## 📖 Key Features (Planned)

### Core Features
- ✅ Multi-variant flags (Boolean, String, Number, JSON)
- ✅ Environment management (dev, staging, prod)
- ✅ User targeting and segmentation
- ✅ Percentage rollouts
- ✅ RBAC with 5 default roles

### Experimentation
- 🚧 A/B testing framework
- 🚧 Statistical significance calculation
- 🚧 Guardrail metrics
- 🚧 Winner selection

### Developer Experience
- 🚧 Multiple SDKs (Node, React, Python, Java)
- 🚧 Local flag evaluation
- 🚧 Real-time updates via WebSocket
- 🚧 Comprehensive API documentation
- 🚧 CLI tool

### Analytics & Governance
- 🚧 Flag evaluation analytics
- 🚧 Audit logs
- 🚧 Stale flag detection
- 🚧 Change history

## 🤝 Contributing

This is currently a solo project, but contributions are welcome! Please feel free to:

1. Open issues for bugs or feature requests
2. Submit pull requests
3. Improve documentation

## 📝 License

MIT License - see LICENSE file for details

## 🔗 Links

- **Documentation**: Coming soon
- **API Reference**: Coming soon
- **SDK Documentation**: Coming soon

---

**Status**: 🚧 In Active Development

Built with ❤️ by Naveen Bhavnani
