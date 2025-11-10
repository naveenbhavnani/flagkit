# GitHub Automation

This directory contains GitHub Actions workflows, Dependabot configuration, and other automation for the FlagKit project.

## Workflows

### CI Pipeline (`ci.yml`)

The main CI pipeline runs on every push to `main` or `develop` branches and on all pull requests. It consists of four jobs:

#### 1. Lint & Type Check
- Runs ESLint on API and Web applications
- Runs TypeScript type checking on both projects
- Ensures code quality and type safety

#### 2. Test API
- Sets up PostgreSQL and Redis services
- Runs Prisma migrations
- Executes all API tests (210+ tests)
- Validates API functionality

#### 3. Test Web
- Runs all Web UI tests (89 tests)
- Includes component and integration tests
- Validates frontend functionality

#### 4. Build
- Builds both API and Web applications
- Uploads build artifacts for 7 days
- Runs only if all previous jobs succeed

### PR Labeler (`pr-labeler.yml`)

Automatically labels pull requests based on the files changed:
- `api` - Changes in `apps/api/**`
- `web` - Changes in `apps/web/**`
- `sdk` - Changes in SDK packages
- `database` - Database or Prisma changes
- `analytics` - Analytics dashboard changes
- `documentation` - Documentation updates
- `tests` - Test file changes
- `ci-cd` - CI/CD configuration changes
- `dependencies` - Dependency updates

## Dependabot

Dependabot is configured to automatically check for dependency updates weekly on Mondays. Updates are grouped by category:

- **Production dependencies** - All runtime dependencies
- **Type definitions** - TypeScript type packages (@types/*)
- **Testing dependencies** - Testing libraries and frameworks
- **Dev tools** - ESLint, Prettier, and other dev tools

## Pull Request Template

When creating a PR, you'll be prompted with a template that includes:
- Description of changes
- Type of change (bug fix, feature, etc.)
- Related issue reference
- Testing checklist
- Code quality checklist

## Running CI Locally

### Prerequisites
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

### Run all CI checks locally

```bash
# Lint
pnpm --filter @flagkit/api lint
pnpm --filter @flagkit/web lint

# Type check
pnpm --filter @flagkit/api exec tsc --noEmit
pnpm --filter @flagkit/web exec tsc --noEmit

# Test
pnpm --filter @flagkit/api test
pnpm --filter @flagkit/web test:run

# Build
pnpm --filter @flagkit/api build
pnpm --filter @flagkit/web build
```

### Using Act (Local GitHub Actions)

You can run GitHub Actions locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or see https://github.com/nektos/act for other platforms

# Run CI workflow
act pull_request

# Run specific job
act -j lint-and-typecheck

# Run with secrets
act -s GITHUB_TOKEN=<your_token>
```

## CI/CD Best Practices

1. **Always run tests before pushing**
   ```bash
   pnpm test
   ```

2. **Keep dependencies up to date**
   - Review and merge Dependabot PRs regularly
   - Test thoroughly after dependency updates

3. **Write meaningful commit messages**
   - Use conventional commits format
   - Example: `feat(api): add flag archiving endpoint`

4. **Keep PRs focused**
   - One feature or fix per PR
   - Makes review easier and CI faster

5. **Fix CI failures immediately**
   - Don't let CI stay red
   - Revert if necessary to unblock others

## Environment Variables for CI

The CI pipeline uses the following environment variables:

### API Tests
- `DATABASE_URL` - PostgreSQL connection string (provided by service)
- `REDIS_URL` - Redis connection string (provided by service)
- `JWT_SECRET` - Test JWT secret
- `JWT_REFRESH_SECRET` - Test refresh token secret
- `NODE_ENV` - Set to `test`

### Web Build
- `NEXT_PUBLIC_API_URL` - API endpoint URL

## Troubleshooting

### Tests failing locally but passing in CI
- Check Node.js version (CI uses Node 20)
- Ensure you have latest dependencies: `pnpm install`
- Clear caches: `rm -rf node_modules .next dist && pnpm install`

### Tests passing locally but failing in CI
- Check for environment-specific issues
- Review CI logs for specific errors
- Ensure all required services are configured

### Build artifacts not uploading
- Check workflow permissions
- Verify artifact paths are correct
- Review GitHub Actions logs

## Adding New Workflows

When adding new workflows:

1. Create a new file in `.github/workflows/`
2. Follow existing naming conventions
3. Document the workflow in this README
4. Test with `act` if possible
5. Create a PR and verify it runs correctly

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Act - Local GitHub Actions](https://github.com/nektos/act)
- [Conventional Commits](https://www.conventionalcommits.org/)
