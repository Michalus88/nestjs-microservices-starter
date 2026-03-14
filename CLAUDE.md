# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sleepr is a NestJS microservices monorepo for hotel reservations. It uses TypeScript, MongoDB/Mongoose, and pnpm workspaces.

## Architecture

Four microservices + one shared library:

- **reservations** (HTTP :3000) — Public API. Calls auth and payments via TCP.
- **auth** (HTTP :3001, TCP :3002) — User registration/login, JWT tokens, passport strategies.
- **payments** (TCP :3003) — Stripe charges. Emits to notifications.
- **notifications** (TCP :3004) — Email via Gmail OAuth2/Nodemailer.
- **libs/common** — Shared: AbstractRepository, DatabaseModule, LoggerModule, JwtAuthGuard, decorators (`@CurrentUser`, `@Roles`), DTOs, constants.

Inter-service communication uses NestJS TCP transport. Service names are defined in `libs/common/src/constants/services.ts` (AUTH_SERVICE, PAYMENTS_SERVICE, NOTIFICATIONS_SERVICE).

## Common Commands

```bash
# Development
pnpm run start:dev                # Start default app (reservations) with watch
pnpm run start:dev <app>          # Start specific app (auth, payments, notifications)

# Building
pnpm run build                    # Build default app
pnpm run build <app>              # Build specific app

# Testing
pnpm run test                     # Run unit tests (Jest)
pnpm run test -- --testPathPattern=<pattern>  # Run specific test
pnpm run test:e2e                 # E2E tests via docker-compose

# Code quality
pnpm run lint                     # ESLint with auto-fix
pnpm run format                   # Prettier
```

## Key Patterns

- **AbstractRepository\<TDocument\>** in `libs/common/src/database/` — generic CRUD for Mongoose. All repos extend this.
- **DatabaseModule.forFeature()** — registers Mongoose models per service, similar to TypeOrmModule.forFeature().
- **ConfigModule** with Joi validation — each service validates its own env vars on startup.
- **NestJS ValidationPipe** with `whitelist: true` at app bootstrap.
- **Path alias**: `@app/common` maps to `libs/common/src` (configured in tsconfig.json and jest config).

## Code Style

- Prettier: single quotes, trailing commas
- ESLint: @typescript-eslint + prettier plugin

## Architecture Rules

See [docs/ARCHITECTURE_RULES.md](docs/ARCHITECTURE_RULES.md) — living document with rules for code placement, patterns, and conventions. **Always consult before adding new files or moving code.**
