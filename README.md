# Sleepr

NestJS microservices monorepo for hotel reservations.

## Architecture


| Service           | Transport   | Port                     |
| ----------------- | ----------- | ------------------------ |
| **reservations**  | HTTP        | 3000                     |
| **auth**          | HTTP + gRPC | 3001 (HTTP), 5000 (gRPC) |
| **payments**      | gRPC        | 5001                     |
| **notifications** | RabbitMQ    | — (consumer)             |


Communication flow:

```
Client → reservations (HTTP)
            ├── auth (gRPC) — JWT validation
            └── payments (gRPC) — Stripe charges
                    └── notifications (RabbitMQ) — email notifications
```

## Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env files and fill in your values
cp apps/reservations/.env.example apps/reservations/.env
cp apps/auth/.env.example apps/auth/.env
cp apps/payments/.env.example apps/payments/.env
cp apps/notifications/.env.example apps/notifications/.env

# Start all services
docker compose up --build
```

## Services & Dashboards


| URL                      | Description                |
| ------------------------ | -------------------------- |
| `http://localhost:3000`  | Reservations API           |
| `http://localhost:3001`  | Auth API (login, register) |
| `http://localhost:15672` | RabbitMQ Management UI     |


### RabbitMQ Management

Dashboard for monitoring queues, exchanges, and message flow.

- URL: `http://localhost:15672`
- Login: `guest` / `guest`

Useful for checking if messages are published to the `notifications` queue and consumed correctly.

## Environment Variables

### reservations


| Variable            | Example                        |
| ------------------- | ------------------------------ |
| `MONGODB_URI`       | `mongodb://mongo:27017/sleepr` |
| `PORT`              | `3000`                         |
| `AUTH_GRPC_URL`     | `auth:5000`                    |
| `PAYMENTS_GRPC_URL` | `payments:5001`                |


### auth


| Variable         | Example                        |
| ---------------- | ------------------------------ |
| `MONGODB_URI`    | `mongodb://mongo:27017/sleepr` |
| `JWT_SECRET`     | your secret                    |
| `JWT_EXPIRATION` | `3600`                         |
| `HTTP_PORT`      | `3001`                         |
| `GRPC_URL`       | `0.0.0.0:5000`                 |


### payments


| Variable            | Example                |
| ------------------- | ---------------------- |
| `GRPC_URL`          | `0.0.0.0:5001`         |
| `RABBITMQ_URI`      | `amqp://rabbitmq:5672` |
| `STRIPE_SECRET_KEY` | `sk_test_...`          |


### notifications


| Variable        | Example                |
| --------------- | ---------------------- |
| `RABBITMQ_URI`  | `amqp://rabbitmq:5672` |
| `SMTP_HOST`     | `smtp.gmail.com`       |
| `SMTP_PORT`     | `587`                  |
| `SMTP_USERNAME` | your email             |
| `SMTP_PASSWORD` | your app password      |


## Development

```bash
# Start single service with watch mode
pnpm run start:dev reservations

# Run tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Lint & format
pnpm run lint
pnpm run format
```

## API Testing

### Register

```
POST http://localhost:3001/users
Content-Type: application/json
```

```json
{
  "email": "test@sleepr.com",
  "password": "Test123!@#",
  "roles": ["admin"]
}
```

Password must satisfy `@IsStrongPassword()` — min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.

### Login

```
POST http://localhost:3001/auth/login
Content-Type: application/json
```

```json
{
  "email": "test@sleepr.com",
  "password": "Test123!@#"
}
```

Returns JWT in `Authentication` cookie.

### Create Reservation (requires JWT)

```
POST http://localhost:3000/reservations
Content-Type: application/json
Authentication: <jwt-token-from-cookie>
```

```json
{
  "startDate": "2026-04-01T00:00:00Z",
  "endDate": "2026-04-05T00:00:00Z",
  "placeId": "123",
  "charge": {
    "token": "pm_card_visa",
    "amount": 50
  }
}
```

This request tests the **full flow**: reservations → auth (gRPC) → payments (gRPC) → notifications (RMQ).

## Proto / gRPC

Proto files are in `proto/`. To regenerate TypeScript types after editing `.proto` files:

```bash
pnpm run proto:generate
```

Generated types are in `libs/common/src/grpc/generated/`.