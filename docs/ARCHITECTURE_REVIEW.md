# Recenzja architektury — Sleepr

## Przegląd

Sleepr to monorepo z 4 mikroserwisami NestJS + wspólna biblioteka. Projekt edukacyjny — solidna baza, ale z miejscami do poprawy przed produkcją.

---

## Co jest dobrze zrobione

### 1. Podział odpowiedzialności (Single Responsibility)

Każdy serwis ma jasno zdefiniowaną rolę:

- **reservations** (HTTP :3000) — API gateway, publiczny interfejs
- **auth** (HTTP :3001, TCP :3002) — uwierzytelnianie, JWT, rejestracja
- **payments** (TCP :3003) — integracja ze Stripe
- **notifications** (TCP :3004) — email przez Gmail OAuth2

### 2. Shared library (`libs/common`)

Dobrze wydzielone wspólne elementy:

- `AbstractRepository` — generyczny CRUD z type safety
- `DatabaseModule` — konfiguracja Mongoose z `forFeature()`
- `JwtAuthGuard` — rozproszona walidacja JWT przez RPC
- Dekoratory (`@CurrentUser`, `@Roles`) — reużywalne
- Stałe serwisów (`AUTH_SERVICE`, `PAYMENTS_SERVICE`, `NOTIFICATIONS_SERVICE`)

### 3. Walidacja konfiguracji z Joi

Każdy serwis waliduje zmienne środowiskowe na starcie przez `Joi.object()`. Aplikacja crash'uje natychmiast przy brakującej konfiguracji zamiast rzucać tajemnicze błędy w runtime.

### 4. Multi-stage Docker builds

Osobne stage'e `development` i `production` — prod image nie zawiera dev dependencies, jest lekki (~40MB na Alpine).

### 5. Wzorzec Repository

`AbstractRepository<TDocument>` z:

- `.lean()` na wszystkich odczytach (wydajność — zwraca POJO zamiast pełnych dokumentów Mongoose)
- Konsystentna obsługa `NotFoundException`
- Abstrakcyjny `logger` wymuszający implementację w podklasach

---

## Niedociągnięcia

### Architektura

#### 1. Brak transakcji rozproszonych (P1 — najpoważniejszy problem)

W `ReservationsService.create()` sekwencja to: stwórz rezerwację → pobierz opłatę przez Stripe. Jeśli Stripe się powiedzie, ale zapis rezerwacji failnie (lub odwrotnie) — masz niespójny stan. Brak mechanizmu kompensacji.

**Rozwiązanie:** Wzorzec **Saga** (choreography lub orchestration-based). Na początek przynajmniej:

1. Stwórz rezerwację ze statusem `PENDING`
2. Pobierz opłatę
3. Aktualizuj status na `CONFIRMED`
4. Przy failurze — kompensacja (anuluj charge lub usuń rezerwację)

#### 2. Synchroniczne przetwarzanie płatności

Endpoint `POST /reservations` blokuje HTTP request czekając na odpowiedź z Payments service przez TCP. Jeśli Stripe odpowiada wolno — użytkownik czeka.

**Rozwiązanie:** Asynchroniczne przetwarzanie z event-driven architecture. Zwróć rezerwację ze statusem `PENDING`, przetwarzaj płatność w tle, powiadom klienta przez WebSocket/polling.

#### 3. Brak refresh tokenów

JWT wygasa po godzinie (`JWT_EXPIRATION=3600`) i nie ma mechanizmu odświeżania. Użytkownik musi się logować co godzinę.

**Rozwiązanie:** Para access token (krótki, ~15min) + refresh token (długi, ~7 dni) przechowywany w httpOnly cookie.

#### 4. TCP transport zamiast message brokera

TCP jest OK do nauki, ale w produkcji:

- Brak persistence — jeśli serwis jest down, wiadomość ginie
- Brak retry out-of-the-box
- Tight coupling (musisz znać host:port)

**Rozwiązanie:** RabbitMQ, NATS, lub Kafka. NestJS wspiera je natywnie — zmiana to `Transport.TCP` → `Transport.RMQ` + konfiguracja brokera.

### Struktura katalogów

#### 5. Płaska struktura wewnątrz serwisów

Każdy serwis ma wszystko w jednym folderze `src/`. Przy rozrastaniu się serwisu to będzie problem.

**Obecna struktura:**

```
apps/auth/src/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── users.service.ts        ← miesza się z auth
├── users.controller.ts     ← miesza się z auth
├── users.repository.ts     ← miesza się z auth
├── strategies/
├── guards/
├── dto/
└── main.ts
```

**Lepsza struktura (modularyzacja per feature):**

```
apps/auth/src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   ├── dto/
│   └── models/
├── strategies/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
└── main.ts
```

#### 6. DTO w dwóch miejscach

DTOs są zarówno w `libs/common/src/dto/` jak i w `apps/*/src/dto/`. Brak jasnej reguły.

**Zasada:** DTO używane przez >1 serwis → `libs/common`. DTO specyficzne dla jednego serwisu → lokalne `dto/`.

### Kod

#### 7. Puste testy jednostkowe

Wszystkie pliki `.spec.ts` zawierają tylko test `"should be defined"`. To gorsze niż brak testów — daje fałszywe poczucie bezpieczeństwa (`pnpm test` przechodzi "na zielono").

#### 8. Health check nie sprawdza zależności

`HealthController` zwraca `true` bez sprawdzania:

- Połączenia z MongoDB
- Dostępności downstream serwisów
- Stanu pamięci/dysku

**Rozwiązanie:** `@nestjs/terminus` — gotowe health checki dla bazy, dysku, pamięci, HTTP.

#### 9. Brak paginacji

`AbstractRepository.find()` zwraca WSZYSTKIE dokumenty. Przy dużej liczbie rekordów to zabije serwis.

**Rozwiązanie:** Dodać `skip/limit` do `find()` lub zaimplementować cursor-based pagination.

#### 10. Luźne typowanie

`@Payload() data: any` w handlerze `authenticate` — traci się type safety. Powinien być dedykowany DTO/interface.

### DevOps / Security

#### 11. Sekrety w plikach `.env` w repozytorium (P0)

Stripe key, JWT secret, Google OAuth tokens — to nie powinno być commitowane do git.

**Rozwiązanie:**

- Dodać `.env` do `.gitignore`
- Stworzyć `.env.example` z placeholder'ami
- W produkcji: secrets manager (Vault, AWS SSM, K8s Secrets)

#### 12. Brak rate limitingu

Endpoint logowania bez rate limitu = zaproszenie do brute force.

**Rozwiązanie:** `@nestjs/throttler` — kilka linii konfiguracji.

#### 13. Brak distributed tracingu

Przy 4 serwisach trudno debugować request flow bez śledzenia.

**Rozwiązanie:** OpenTelemetry + Jaeger/Zipkin — pozwala śledzić request przez wszystkie serwisy.

---

## Priorytetyzacja

| Priorytet | Co | Dlaczego |
|---|---|---|
| **P0** | Usunąć sekrety z git, `.env` do `.gitignore` | Bezpieczeństwo |
| **P1** | Saga/kompensacja dla rezerwacja+płatność | Spójność danych |
| **P1** | Paginacja w repository | Skalowalność |
| **P2** | Rate limiting na auth endpointach | Bezpieczeństwo |
| **P2** | Prawdziwe health checki (`@nestjs/terminus`) | Operacyjność |
| **P2** | Modularyzacja struktury katalogów | Utrzymywalność |
| **P3** | Message broker zamiast TCP | Niezawodność |
| **P3** | Refresh token | UX |
| **P3** | Distributed tracing | Obserwowalność |

---

## Podsumowanie

Jako projekt edukacyjny — naprawdę dobry. Architektura mikroserwisowa jest poprawna w swoich fundamentach: separacja serwisów, wspólna biblioteka, walidacja konfiguracji, Docker multi-stage. Gdyby to miało iść na produkcję — P0 i P1 to absolutne must-have.
