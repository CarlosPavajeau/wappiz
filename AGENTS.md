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

Wappiz is an open-source appointment scheduling platform. This is a turborepo monorepo containing:

### `apps/web/`

Full-stack app using **TanStack Start** (Vite + Nitro). File-based routing lives in `src/routes/`. Each route file can export a loader, action, and default component. React Query is integrated at the router level (`src/router.tsx`).

### `packages/`

| Package      | Purpose                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `db`         | Drizzle ORM schemas + migrations against PostgreSQL                         |
| `auth`       | Better Auth configuration (Google OAuth, email/password, JWT, admin plugin) |
| `api-client` | Type-safe Axios-based HTTP client with endpoint definitions per resource    |
| `env`        | Zod-validated environment variables (`server.ts` / `web.ts`)                |

### Data flow

```
Route loader/action → api-client (Axios) → Nitro server routes → Drizzle (PostgreSQL)
                                                              ↕
                                                           Better Auth
```

## Build, Lint, and Test Commands

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

# Database (runs from root, operates on packages/db)
bun run db:push      # Push schema to DB (dev)
bun run db:generate  # Generate migration files
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Important Notes

- **Routing**: TanStack Router file-based routes in `apps/web/src/routes/`. Layout routes use `_layout` prefix.
- **API client**: Add new resources as endpoint files in `packages/api-client/src/endpoints/`, export from `packages/api-client/src/index.ts`.
- **DB schema**: Add tables in `packages/db/src/schema/`, run `db:generate` then `db:migrate`.
- **UI**: shadcn/ui components (configured via `components.json`). Icons from HugeIcons (`@hugeicons/react`).
- **Forms**: React Hook Form + Arktype for validation.
- **Env vars**: Always add new variables to `packages/env/src/server.ts` or `web.ts` — never access `process.env` directly in app code.
- **Imports**: Avoid barrel files. Prefer direct imports. Tailwind class order is enforced by Oxfmt.
- Use `bun run fix` before committing TypeScript changes
