# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS microservices monorepo for hotel reservations. TypeScript, MongoDB/Mongoose, pnpm workspaces.

## Architecture

Four microservices + one shared library:

| Service           | Transport        | Port                      |
| ----------------- | ---------------- | ------------------------- |
| **reservations**  | HTTP             | 3000                      |
| **auth**          | HTTP + gRPC      | 3001 (HTTP), 5000 (gRPC)  |
| **payments**      | gRPC             | 5001                      |
| **notifications** | RabbitMQ         | — (consumer only)         |

Communication flow:
```
Client → reservations (HTTP)
            ├── auth (gRPC) — JWT validation
            └── payments (gRPC) — Stripe charges
                    └── notifications (RabbitMQ) — email
```

**libs/common** — Shared: `AbstractRepository`, `DatabaseModule`, `LoggerModule`, `JwtAuthGuard`, `GrpcModule`, `RmqModule`, `HealthModule`, `SagaRunner`, decorators (`@CurrentUser`, `@Roles`), DTOs, constants, generated gRPC types.

Service name constants (injected as `ClientGrpc`/`ClientProxy`) are in `libs/common/src/constants/services.ts`.

## Common Commands

```bash
# Development
pnpm run start:dev                # Start reservations with watch
pnpm run start:dev <app>          # Start specific app (auth, payments, notifications)

# Building
pnpm run build <app>

# Testing
pnpm run test                                          # All unit tests
pnpm run test -- --testPathPattern=<pattern>           # Specific test file
pnpm run test:e2e                                      # E2E via docker-compose

# Code quality
pnpm run lint                     # ESLint with auto-fix
pnpm run format                   # Prettier

# Proto
pnpm run proto:generate           # Regenerate TS types from .proto files
```

## Key Patterns

- **AbstractRepository\<TDocument\>** in `libs/common/src/database/` — generic CRUD for Mongoose. All repos extend this.
- **DatabaseModule.forFeature()** — registers Mongoose models per service.
- **ConfigModule** with Joi validation — each service validates its own env vars on startup.
- **NestJS ValidationPipe** with `whitelist: true` at app bootstrap.
- **Path alias**: `@app/common` maps to `libs/common/src` (configured in tsconfig.json and jest config).

## gRPC

Proto files live in `proto/`. Generated TypeScript types (via `ts-proto`) are in `libs/common/src/grpc/generated/` — **never edit these manually**, always run `proto:generate` after changing `.proto` files.

`GrpcModule` in `libs/common/src/grpc/` provides `GrpcModule.forClient(serviceName)` for registering a gRPC client. `GrpcExceptionFilter` (applied on gRPC servers) translates exceptions to gRPC status codes. `GrpcToHttpInterceptor` (applied on HTTP controllers) translates gRPC errors back to HTTP responses.

## RabbitMQ

`RmqModule.register(name, queue)` in `libs/common/src/rmq/` registers a RabbitMQ client. Payments publishes to the `notifications` queue; notifications service consumes it.

## Saga Pattern

`runSaga(steps, context, logger)` from `@app/common` executes an ordered list of `SagaStep` objects. Each step has `execute` and optionally `compensate`. On failure, completed steps are compensated in reverse order. Used in `ReservationSagasService` for the create-reservation flow (create → charge → confirm).

## Code Style

- Prettier: single quotes, trailing commas
- ESLint: @typescript-eslint + prettier plugin

## Stripe Error Handling (payments service)

Stripe errors have the structure `{ type, code, message }`. The `type` field (e.g. `StripeInvalidRequestError`, `StripeCardError`) identifies the error category. The `code` field (e.g. `charge_already_refunded`) gives the specific reason. Error mapping to gRPC status codes is done in `apps/payments/src/stripe-exception.mapper.ts` — map by `type` first, only add `code`-level checks when you need to differentiate errors within the same type. Full list of codes: https://docs.stripe.com/error-codes

## Architecture Rules

See [docs/ARCHITECTURE_RULES.md](docs/ARCHITECTURE_RULES.md) — living document with rules for code placement, patterns, and conventions. **Always consult before adding new files or moving code.**
