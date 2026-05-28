# AGENTS.md - Wappiz Development Guide

This document provides essential information for AI coding agents working in this repository.

## Communication

- Be extremely concise; sacrifice grammar for brevity
- At the end of each plan, list unresolved questions (if any)

## Code Quality Standards

- Make minimal, surgical changes
- **Never compromise type safety**: No `any`, no `!` (non-null assertion), no `as Type`
- **Make illegal states unrepresentable**: Model domain with ADTs/discriminated unions; parse inputs at boundaries into typed structures
- Leave the codebase better than you found it

### Entropy

This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

**Fight entropy. Leave the codebase better than you found it.**

## Project Overview

Wappiz is an open-source appointment scheduling platform. This repository contains:

- **Go backend** (root): Services, APIs, and shared libraries
- **Web frontend** (`web/`): Turborepo monorepo with TanStack Start and shared packages

### `web/apps/web/`

Full-stack app using **TanStack Start** (Vite + Nitro). File-based routing lives in `src/routes/`. Each route file can export a loader, action, and default component. React Query is integrated at the router level (`src/router.tsx`).

### `web/packages/`

| Package      | Purpose                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `db`         | Drizzle ORM schemas + migrations against PostgreSQL                         |
| `auth`       | Better Auth configuration (Google OAuth, email/password, JWT, admin plugin) |
| `api-client` | Type-safe Axios-based HTTP client with endpoint definitions per resource    |
| `env`        | Zod-validated environment variables (`server.ts` / `web.ts`)                |

### Web data flow

```
Route loader/action -> api-client (Axios) -> Nitro server routes -> Drizzle (PostgreSQL)
                                                              |
                                                           Better Auth
```

## Code Style Guidelines

### Go Conventions

**Testing** - Use `testify/require` for assertions:

```go
func TestFeature(t *testing.T) {
    t.Run("scenario", func(t *testing.T) {
        require.NoError(t, err)
        require.Equal(t, expected, actual)
    })
}
```

## Detailed Guidelines

- **Code Style**: Design philosophy (safety > performance > DX), zero technical debt policy, assertions, error handling with `fault`, scope minimization, failure handling (circuit breakers, retry with backoff, idempotency)
- **Documentation**: Document the "why" not the "what", use prose over bullets, match depth to complexity, verify behavior before documenting

## Web Commands

Run these from `web/`.

```bash
# Development
bun run dev          # Start all apps (web on port 3001)
bun run dev:web      # Start web app only

# Type checking & linting
bun run check-types  # TypeScript type checking across workspace
bun run check        # Oxlint + Oxfmt check (via Ultracite)
bun run fix          # Auto-fix formatting and lint issues

# Build
bun run build        # Build all apps

# Database
bun run db:push      # Push schema to DB (dev)
bun run db:generate  # Generate migration files
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Web Notes

- **Routing**: TanStack Router file-based routes in `web/apps/web/src/routes/`. Layout routes use `_layout` prefix.
- **API client**: Add resources as endpoint files in `web/packages/api-client/src/endpoints/`, export from `web/packages/api-client/src/index.ts`.
- **DB schema**: Add tables in `web/packages/db/src/schema/`, run `db:generate` then `db:migrate`.
- **UI**: shadcn/ui components configured via `web/apps/web/components.json`. Icons from HugeIcons (`@hugeicons/react`).
- **Forms**: React Hook Form + Arktype for validation.
- **Env vars**: Always add variables to `web/packages/env/src/server.ts` or `web.ts`; never access `process.env` directly in app code.
- **Imports**: Avoid barrel files. Prefer direct imports. Tailwind class order is enforced by Oxfmt.
- Use `bun run fix` before committing TypeScript changes.
