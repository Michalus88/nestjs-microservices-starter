# Architecture Rules

Rules for where to place things and why. This file grows over time as new patterns emerge.

---

## DTO placement

- **`libs/common/src/dto/`** — DTOs that are a **contract between services** (TCP/event messages). If service A sends data to service B, the DTO describing that data lives in common so both sides share the same type.
- **`apps/<service>/src/dto/`** — DTOs used **only within one service** (HTTP request bodies, internal validation). These are not imported by other services.
- **Extending shared DTOs** is fine — e.g. `PaymentsCreateChargeDto extends CreateChargeDto` adds service-specific fields while reusing the shared contract.
- When in doubt: if you `import` a DTO from another `apps/` directory, it belongs in `libs/common`.
