# Architecture Rules

Rules for where to place things and why. This file grows over time as new patterns emerge.

---

## DTO placement

- **`libs/common/src/dto/`** — DTOs that are a **contract between services** (TCP/event messages). If service A sends data to service B, the DTO describing that data lives in common so both sides share the same type.
- **`apps/<service>/src/dto/`** — DTOs used **only within one service** (HTTP request bodies, internal validation). These are not imported by other services.
- **Extending shared DTOs** is fine — e.g. `PaymentsCreateChargeDto extends CreateChargeDto` adds service-specific fields while reusing the shared contract.
- When in doubt: if you `import` a DTO from another `apps/` directory, it belongs in `libs/common`.

---

## No magic strings

- **Never use magic strings** — neither in your own code nor when referencing external library types.
- When a library exports classes, enums, or constants — **use them** (`instanceof`, imported values) instead of comparing raw strings. Before writing a string literal, check if the library provides an exported type.
  - Good: `exception instanceof Stripe.errors.StripeCardError`
  - Bad: `exception?.type === 'StripeCardError'`
- In your own code: repeated string → `enum` or `const`. Even a one-off string representing a state or type should be extracted to a named constant — the name documents intent.

## Constants placement

- **`libs/common/src/constants/`** — constants shared between services (service names, status enums, event keys). Exported via `constants/index.ts`.
- **`apps/<service>/src/constants/`** — constants used only within one service. Don't create this directory preemptively — only when the first local constant appears.
- **Don't scatter constants across service files** (service, controller). If a value is not an obvious one-off parameter (e.g. `3600` for TTL), it should have a named constant in a dedicated file.

---

## Dockerfile rules

- **Always use multi-stage builds** — separate `development` and `production` stages. Dev stage includes dev dependencies and tools. Prod stage copies only the build output and production dependencies, keeping the image small.
- Production images must be based on Alpine variants (e.g. `node:alpine`) and must not contain dev dependencies, source code, or test files.

---

## Method complexity

- A method should do one thing at one level of abstraction.
- If a method has more than one try/catch block or exceeds ~20 lines of logic, extract steps into private methods with descriptive names.
- Multi-step flows (sagas, transactions, pipelines): the orchestrating method should read like a sequence of named steps. Implementation details belong in private methods.
- Design top-down: define the flow first (method signatures), then implement each step. Never bolt on logic incrementally without refactoring the whole method afterwards.

---

## Barrel exports (index.ts)

- Every module directory in `libs/common/src/` must have an `index.ts` that re-exports its public API.
- Consumers import from the directory (`'./saga'`), never from internal files (`'./saga/saga.types'`).
- This also applies to `apps/<service>/src/` subdirectories (e.g. `dto/`, `sagas/`) when they contain more than one file.

---

## No hidden side effects

- A method must do **exactly what its name says** — no more, no less. If you can't tell everything a method does by reading its name and signature, something is wrong.
- **Test:** describe what the method does in one sentence without using "and". If you need "and", it does too much — extract the extra behavior.
- Side effects (network calls, writes, deletions, compensations) must be **visible at the call site**. The caller should never need to read the implementation to understand the full impact.
- When a caller orchestrates a sequence of steps, each step method is a single operation. Decision logic (if X failed, do Y) belongs in the caller, not hidden inside a step.
