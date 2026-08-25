# AURON HOSPITALITY — MASTER IMPLEMENTATION PLAN

---

# 1. EXECUTIVE SUMMARY

Este documento es la fuente operativa para desarrollar Auron Hospitality. Cruza la auditoría del código real con el BLUEPRINT.md para producir un backlog ejecutable con dependencias, criterios de validación, y orden técnicamente correcto.

**Estado actual:** MVP temprano — 5 domains, 20 endpoints, 6 páginas frontend, 0 seguridad real, 0 aislamiento multi-tenant, 0 tests de concurrencia.

**Objetivo:** Hospitality Operating System competitivo para LATAM/Caribe en ~52 semanas.

**Primeras 20 tareas:** Seguridad + tenant isolation + reservation integrity. Sin esto nada funciona.

---

# 2. COMPETITIVE LANDSCAPE

## 2.1 Vision

Auron Hospitality no es un PMS — es una **plataforma de gestión hotelera** que combina lo mejor de Amenitiz, Mews, Cloudbeds y OPERA con diseño premium, fiscal RD nativo, WhatsApp como canal operativo, y offline-first.

**Competitors:** Amenitiz (insipido en diseño), Mews (caro), Cloudbeds (genérico), RoomRaccoon (básico).

**Auron differentiator:** Diseño premium + Fiscal RD + WhatsApp-native + Offline + Precio $0-300/mo.

## 2.2 Gap Analysis vs Competitors

### PMS Core (Commodity — todo hotel necesita)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Reservation CRUD | ✅ | ✅ | ✅ | ⚠️ Basic | CRÍTICO |
| Room management | ✅ | ✅ | ✅ | ⚠️ Sin IDOR fix | CRÍTICO |
| Guest profiles | ✅ | ✅ | ✅ | ⚠️ Basic | ALTO |
| Rate management | ✅ | ✅ | ✅ | ⚠️ Sin seasons | MEDIO |
| Availability engine | ✅ | ✅ | ✅ | ✅ Works standalone | BAJO |
| Multi-tenant | ✅ | ✅ | ✅ | ❌ Sin aislamiento | CRÍTICO |
| Auth / RBAC | ✅ | ✅ | ✅ | ❌ No-op | CRÍTICO |

### Front Desk (Operación diaria)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Room grid visual (timeline) | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Arrivals / departures today | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Quick check-in/out | ✅ | ✅ | ✅ | ⚠️ SQL directo | ALTO |
| Walk-in booking | ✅ | ✅ | ✅ | ❌ | ALTO |
| Room assignment drag-drop | ✅ | ✅ | ⚠️ | ❌ | MEDIO |
| Color-coded status | ✅ | ✅ | ✅ | ⚠️ Solo badges | BAJO |

### Folio / Billing

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Charge ledger | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Payment recording | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Tax calculation (ITBIS) | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Deposits | ✅ | ✅ | ✅ | ❌ | ALTO |
| Refunds / credits | ✅ | ✅ | ✅ | ❌ | ALTO |
| Close folio | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Split payment | ✅ | ✅ | ✅ | ❌ | MEDIO |
| Multi-currency | ⚠️ | ✅ | ✅ | ❌ DOP only | MEDIO |

### Night Audit

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Auto night audit | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Nightly posting | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Daily report | ✅ | ✅ | ✅ | ❌ | ALTO |
| Payment reconciliation | ✅ | ✅ | ✅ | ❌ | ALTO |

### Housekeeping

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Task board by floor | ✅ | ✅ | ✅ | ❌ | ALTO |
| Staff assignment | ✅ | ✅ | ✅ | ❌ | ALTO |
| Dirty→Clean→Inspected | ✅ | ✅ | ✅ | ⚠️ State machine sin UI | MEDIO |
| Mobile notifications | ✅ | ✅ | ✅ | ❌ | MEDIO |

### Revenue Management

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Seasonal pricing | ✅ | ✅ | ✅ | ❌ | ALTO |
| Dynamic pricing | ⚠️ | ✅ Atomize | ✅ Signals | ❌ | MEDIO |
| Occupancy-based pricing | ✅ | ✅ | ✅ | ❌ | MEDIO |

### Distribution

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Channel manager | ✅ 30+ | ✅ SiteMinder | ✅ 300+ | ❌ | ALTO |
| Booking engine | ✅ | ✅ | ✅ | ❌ | ALTO |
| iCal export | ✅ | ✅ | ✅ | ❌ | MEDIO |

### Guest Experience

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Guest portal | ✅ | ✅ | ✅ | ❌ | ALTO |
| Pre-arrival email | ✅ | ✅ | ✅ | ❌ | MEDIO |
| WhatsApp messaging | ⚠️ Basic | ✅ Native | ⚠️ Partner | ❌ | ALTO |
| Online check-in | ✅ | ✅ | ✅ | ❌ | MEDIO |

## 2.3 What AURON has that NO competitor has

| Feature | Auron | Amenitiz | Mews | Cloudbeds |
|---------|-------|----------|------|-----------|
| **Fiscal RD (DGII/NCF/ITBIS)** | 🎯 TARGET | ❌ | ❌ | ❌ |
| **WhatsApp-native operations** | 🎯 TARGET | ⚠️ | ✅ messaging | ⚠️ |
| **Offline-first** | 🎯 TARGET | ❌ | ❌ | ❌ |
| **Open source** | 🎯 TARGET | ❌ | ❌ | ❌ |
| **LATAM pricing ($0-300/mo)** | 🎯 TARGET | $15/room | €199+ | $15/room |
| **Event Sourcing architecture** | ✅ | ❌ | ❌ | ❌ |
| **DDD clean architecture** | ✅ | ❌ | ⚠️ | ❌ |
| **Caribbean intelligence** | 🎯 TARGET | ❌ | ❌ | ❌ |

## 2.4 Gap Summary by Level

| Nivel | Features | Prioridad | Phases |
|-------|----------|-----------|--------|
| **Nivel 1: Sin esto no es PMS** | Auth, Tenant, Folio, Front Desk, Night Audit, Housekeeping | P0-P1 | 0-2 |
| **Nivel 2: Sin esto no compite** | Revenue, Booking Engine, Channel Manager, Guest Portal, Payments | P1-P2 | 3-5 |
| **Nivel 3: Lo que lo hace ÚNICO** | Fiscal RD, WhatsApp-native, Offline, AI, LATAM intelligence | P2-P3 | 6-7 |

---

# 3. CURRENT STATE

## 3.1 Code Inventory

| Category | Count | Files |
|----------|-------|-------|
| Domain aggregates | 4 | room, reservation, guest, roomtype |
| Application services | 5 | reservation/create, reservation/cancel, guest/create, availability, rate |
| Repositories | 3 | room_repo, guest_repo, reservation_repo |
| Event store | 2 | pg_store.go, client.go (in-memory fallback) |
| HTTP handlers | 6 | reservation, room, guest, roomtype, rate, availability |
| HTTP middleware | 2 | auth (no-op), tenant (header-based) |
| Migrations | 7 | 001-007 |
| Frontend pages | 6 | dashboard, rooms, reservations, availability, guests, settings |
| Tests | 7 files | domain (2), application (2), infra (1), handler (1) |
| Pkg | 3 | es/aggregate, httputil, types/money |
| Empty dirs | 7 | projector, docker, auth, observability, tenant, room app, components |

## 3.2 Bugs and Gaps (from audit)

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | No authentication (middleware is no-op) | CRITICAL | middleware/auth.go:18-21 |
| 2 | No tenant isolation (client controls X-Tenant-ID) | CRITICAL | middleware/tenant.go:14 |
| 3 | IDOR on all Get/Update endpoints (no tenant_id in WHERE) | CRITICAL | handlers/*.go |
| 4 | CancelReservation command missing TenantID field | CRITICAL | cancel.go:9-11 |
| 5 | Availability not called during reservation creation | CRITICAL | reservation/create.go |
| 6 | No anti-double-booking constraint | CRITICAL | postgres (no exclusion index) |
| 7 | RLS enabled but no policies created | HIGH | migrations/*.sql |
| 8 | Credenciales hardcoded dev:dev in 3 files | HIGH | main.go:136, migration:18, seed.go:16 |
| 9 | DB port 5432 published to host | HIGH | docker-compose.yml:10-11 |
| 10 | RowsAffected not checked on CheckIn/CheckOut/UpdateStatus | MEDIUM | handlers |
| 11 | Room status PATCH accepts any string | MEDIUM | room_handler.go:156 |
| 12 | No input validation (MaxBytesReader, ranges) | MEDIUM | all handlers |
| 13 | Raw err.Error() returned to clients | MEDIUM | all handlers |
| 14 | No pagination on List endpoints | MEDIUM | all handlers |
| 15 | Dashboard occupancy = Math.random() | LOW | web/app/page.js |
| 16 | Tenant mismatch (eden-hotel vs eden-samana) | LOW | api.js:7 vs seed.go:25 |
| 17 | crypto.randomUUID() fails on HTTP plain | LOW | reservations/page.js:33 |

## 3.3 What Works (verified)

| Capability | Evidence | Limitation |
|------------|----------|------------|
| Room CRUD | room_handler.go + room_repo.go | No tenant on Get |
| Room state machine | room/aggregate.go:51-78 | Valid transitions enforced |
| Guest create | guest_handler.go + guest_repo.go | No email validation at handler |
| Guest search | guest_handler.go List with ILIKE | Wildcards not escaped |
| Reservation create | reservation_handler.go Create | No availability check |
| Reservation cancel | reservation_handler.go Cancel | Missing TenantID in command |
| Reservation check-in/out | reservation_handler.go | No RowsAffected, no tenant on Get |
| Availability check | availability_handler.go | Works standalone, never called in reservation flow |
| Rate create/list | rate_handler.go | Works |
| RoomType create/list | roomtype_handler.go | Works |
| Event persistence | pg_store.go | Optimistic concurrency works |
| Room repo projection | room_repo.go | Events projected to rooms table |

---

# 4. IMPLEMENTATION PRINCIPLES

1. **Security before features.** No new feature without auth, tenant isolation, and RBAC.
2. **Fix before build.** Existing bugs resolved before adding capabilities.
3. **Backend before frontend.** API works correctly before UI is built on top.
4. **Tests are part of the feature.** No feature is COMPLETE without tests.
5. **Single responsibility.** Each task does one thing.
6. **Atomic commits.** Each task = one commit with tests passing.
7. **No dead code.** Remove unused code.
8. **Data integrity over speed.** Concurrency, transactions, consistency — always.
9. **File-level tracing.** Every task references exact files.
10. **Definition of Done is mandatory.**

---

# 5. CAPABILITY COVERAGE

| Capability | Current | Target | Gap | Priority |
|------------|---------|--------|-----|----------|
| Authentication | NOT IMPLEMENTED | Complete | Critical | P0 |
| Tenant Isolation | INSECURE | Complete | Critical | P0 |
| RBAC | NOT IMPLEMENTED | Complete | Critical | P0 |
| Room Management | PARTIAL | Complete | High | P0 |
| Reservation Integrity | BROKEN | Complete | Critical | P0 |
| Error Handling | INSECURE | Complete | High | P0 |
| Audit Trail | NOT IMPLEMENTED | Complete | High | P0 |
| Input Validation | INSECURE | Complete | High | P0 |
| Front Desk | NOT IMPLEMENTED | Complete | High | P1 |
| Folio/Billing | NOT IMPLEMENTED | Complete | High | P1 |
| Housekeeping | NOT IMPLEMENTED | Complete | High | P1 |
| Night Audit | NOT IMPLEMENTED | Complete | High | P1 |
| Guest Profile 360 | PARTIAL | Complete | Medium | P1 |
| Payments | NOT IMPLEMENTED | Complete | High | P1 |
| Fiscal RD (DGII/NCF) | NOT IMPLEMENTED | Complete | High | P1 |
| Staff Management | NOT IMPLEMENTED | Complete | Medium | P1 |
| Booking Engine | NOT IMPLEMENTED | Complete | High | P2 |
| Channel Manager | NOT IMPLEMENTED | Complete | High | P2 |
| Guest Portal | NOT IMPLEMENTED | Complete | Medium | P2 |
| WhatsApp Native | NOT IMPLEMENTED | Differentiator | High | P2 |
| Revenue Management | NOT IMPLEMENTED | Advanced | High | P2 |
| Analytics | NOT IMPLEMENTED | Complete | Medium | P2 |
| Offline/Edge | NOT IMPLEMENTED | Differentiator | Very High | P3 |
| AI Revenue Advisor | NOT IMPLEMENTED | Basic | Medium | P3 |
| AI Guest Assistant | NOT IMPLEMENTED | Basic | Medium | P3 |
| Multi-Property | NOT IMPLEMENTED | Complete | Medium | P3 |
| POS/F&B | NOT IMPLEMENTED | Basic | Medium | P3 |
| CRM Advanced | NOT IMPLEMENTED | Basic | Low | P3 |
| Events/Groups | NOT IMPLEMENTED | Basic | Low | P3 |


---

# 6. P0 FOUNDATION BACKLOG

## SEC-001 — JWT Authentication System

- **Epic:** Security | **Capability:** Authentication
- **Feature:** JWT-based authentication with login, refresh, logout
- **Priority:** P0 | **Current Status:** NOT IMPLEMENTED
- **Business Value:** Without auth, system is completely open.
- **Dependencies:** None
- **Backend Changes:** Create `internal/infrastructure/auth/jwt.go`, `internal/infrastructure/auth/password.go`, `internal/interfaces/http/handlers/auth_handler.go`. Modify `internal/interfaces/http/middleware/auth.go`.
- **Database Changes:** Migration 008_create_users.sql. Migration 009_create_refresh_tokens.sql.
- **API Changes:** POST /auth/login, POST /auth/refresh, POST /auth/logout
- **Frontend Changes:** Create login page `web/app/login/page.js`.
- **Security Requirements:** JWT_SECRET from env, no fallback. Token expiry 15min.
- **Test Requirements:** Unit (JWT), Integration (login valid/invalid), Security (401 on missing/expired/invalid token)
- **Definition of Done:** All /v1/* return 401 without token.
- **Complexity:** M | **Risk:** Medium

## SEC-002 — Tenant Resolution from JWT

- **Epic:** Security | **Capability:** Multi-Tenant
- **Feature:** Extract tenant_id from JWT, eliminate X-Tenant-ID header
- **Priority:** P0 | **Current Status:** INSECURE
- **Dependencies:** SEC-001
- **Backend Changes:** Modify `middleware/tenant.go`, `middleware/auth.go`, all handlers.
- **Frontend Changes:** Remove X-Tenant-ID from `web/lib/api.js`.
- **Definition of Done:** Grep for X-Tenant-ID returns zero in Go code.
- **Complexity:** S | **Risk:** Low

## SEC-003 — RLS Policies on All Tables

- **Epic:** Security | **Capability:** Multi-Tenant
- **Feature:** PostgreSQL RLS policies enforcing tenant isolation at DB level
- **Priority:** P0 | **Current Status:** BROKEN (no policies)
- **Dependencies:** SEC-002
- **Backend Changes:** Create `internal/infrastructure/postgres/middleware.go` (SET LOCAL app.tenant_id).
- **Database Changes:** Migration 010_create_rls_policies.sql. Change DB user to non-superuser.
- **Definition of Done:** All tables have active RLS. Cross-tenant test passes.
- **Complexity:** M | **Risk:** Medium

## SEC-004 — RBAC Middleware

- **Epic:** Security | **Capability:** Authorization
- **Feature:** Role-based access control (admin, manager, front_desk, housekeeping, read_only)
- **Priority:** P0 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001
- **Backend Changes:** Create `middleware/rbac.go`. Add RequireRole to router.go.
- **Definition of Done:** All endpoints have RBAC. Cross-role test passes.
- **Complexity:** S | **Risk:** Low

## SEC-005 — Secret Management

- **Epic:** Security | **Capability:** Configuration
- **Feature:** All secrets from environment variables, no hardcoded credentials
- **Priority:** P0 | **Current Status:** INSECURE (dev:dev hardcoded in 3 files)
- **Dependencies:** None
- **Backend Changes:** Modify `cmd/api/main.go`, `cmd/migration/main.go`, `scripts/seed.go`.
- **Definition of Done:** Grep for hardcoded passwords returns zero.
- **Complexity:** S | **Risk:** Low

## SEC-006 — IDOR Fix on All Repos

- **Epic:** Security | **Capability:** Multi-Tenant
- **Feature:** All repository queries include tenant_id. Cancel command includes TenantID.
- **Priority:** P0 | **Current Status:** BROKEN
- **Dependencies:** SEC-002
- **Backend Changes:** Modify all repos + `cancel.go` + all handlers.
- **Domain Changes:** CancelCommand gets TenantID field.
- **Definition of Done:** Every repo method filters by tenant_id. IDOR test passes.
- **Complexity:** M | **Risk:** Medium

## FIX-001 — Reservation Creation Integrity

- **Epic:** Core Integrity | **Capability:** Reservations
- **Feature:** Availability check atomically + exclusion constraint
- **Priority:** P0 | **Current Status:** BROKEN
- **Dependencies:** SEC-003
- **Backend Changes:** Modify `application/reservation/create.go`. Add exclusion constraint.
- **Database Changes:** Migration 011_add_exclusion_constraint.sql.
- **Test Requirements:** Concurrency (two simultaneous reservations, only one succeeds)
- **Definition of Done:** Double-booking test passes.
- **Complexity:** M | **Risk:** Medium

## FIX-002 — Error Handling and Input Validation

- **Epic:** Core Integrity | **Capability:** Error Handling
- **Feature:** Standardized errors, input validation, safe messages
- **Priority:** P0 | **Current Status:** INSECURE
- **Dependencies:** None
- **Backend Changes:** Create `pkg/httputil/errors.go`. Modify all handlers.
- **Definition of Done:** No error strings leak. Validation works.
- **Complexity:** S | **Risk:** Low

## FIX-003 — Room Status Validation + RowsAffected

- **Epic:** Core Integrity | **Capability:** Rooms
- **Feature:** Validate status enum, check RowsAffected on state transitions
- **Priority:** P0 | **Current Status:** BROKEN
- **Dependencies:** None
- **Backend Changes:** Modify `room_handler.go`, `reservation_handler.go`.
- **Definition of Done:** Invalid status returns 400. State transitions return 404 if not found.
- **Complexity:** S | **Risk:** Low

## AUD-001 — Audit Trail System

- **Epic:** Security | **Capability:** Audit
- **Feature:** Record all state changes with actor, timestamp, old/new values
- **Priority:** P0 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001, SEC-002
- **Backend Changes:** Create `audit/repository.go`, `middleware/audit.go`.
- **Database Changes:** Migration 012_create_audit_logs.sql.
- **Definition of Done:** Every mutation creates audit record. Append-only verified.
- **Complexity:** M | **Risk:** Medium

## FIX-004 — Docker Security Hardening

- **Epic:** Security | **Capability:** Infrastructure
- **Feature:** Remove published DB port, env-based credentials
- **Priority:** P0 | **Current Status:** INSECURE
- **Dependencies:** None
- **Backend Changes:** Modify `deploy/docker-compose.yml`.
- **Definition of Done:** DB port not exposed. No hardcoded credentials.
- **Complexity:** XS | **Risk:** Low

---

# 7. P1 PMS FOUNDATION BACKLOG

## PMS-001 — Front Desk Board

- **Epic:** PMS | **Capability:** Front Desk
- **Feature:** Visual board showing room status, today arrivals/departures, quick check-in/out
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001 through SEC-006, FIX-001
- **Backend Changes:** Create `internal/interfaces/http/handlers/frontdesk_handler.go`. New queries for today's activity.
- **API Changes:** GET /frontdesk/today (arrivals, departures, in-house, room statuses)
- **Frontend Changes:** Create `web/app/frontdesk/page.js`
- **Definition of Done:** Staff can see all room statuses and perform check-in/out from one screen.
- **Complexity:** L | **Risk:** Medium

## PMS-002 — Folio Engine

- **Epic:** PMS | **Capability:** Folio/Billing
- **Feature:** Per-guest ledger with charges, payments, balance calculation
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-006, FIX-001
- **Backend Changes:** Create `internal/domain/folio/`, `internal/infrastructure/postgres/folio_repo.go`, `internal/interfaces/http/handlers/folio_handler.go`.
- **Database Changes:** Migration 013_create_folio_entries.sql.
- **API Changes:** GET /reservations/{id}/folio, POST /reservations/{id}/folio/entries, POST /reservations/{id}/folio/close
- **Definition of Done:** Folio tracks charges/payments. Balance correct. Close validates zero balance.
- **Complexity:** L | **Risk:** Medium

## PMS-003 — Night Audit Process

- **Epic:** PMS | **Capability:** Night Audit
- **Feature:** Automated end-of-day: close rooms, generate folio summaries, roll date
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-002, FIX-001
- **Backend Changes:** Create `internal/application/nightaudit/audit.go`.
- **Database Changes:** Migration 014_create_night_audit_runs.sql.
- **API Changes:** POST /night-audit/run, GET /night-audit/history
- **Definition of Done:** Night audit processes all in-house reservations, updates dates, creates audit report.
- **Complexity:** L | **Risk:** High

## PMS-004 — Rate Plans and Seasonal Pricing

- **Epic:** PMS | **Capability:** Revenue
- **Feature:** Multiple rate plans, seasonal overrides, minimum stay rules
- **Priority:** P1 | **Current Status:** PARTIAL (basic rate create/list exists)
- **Dependencies:** PMS-002
- **Backend Changes:** Extend `internal/domain/rate/` (season_dates, min_stays, blackouts). Modify rate repo.
- **Database Changes:** Extend rates table with season dates, min_stay, blackout dates.
- **Definition of Done:** Multiple rate plans work. Seasonal pricing calculates correctly.
- **Complexity:** M | **Risk:** Medium

## PMS-005 — Guest Profile 360

- **Epic:** PMS | **Capability:** Guest
- **Feature:** Full guest profile: history, preferences, spend, notes, documents
- **Priority:** P1 | **Current Status:** PARTIAL (basic guest create/search)
- **Dependencies:** SEC-006, PMS-002
- **Backend Changes:** Extend guest aggregate (preferences JSON, document type/number, nationality). Create `guest_profile_handler.go`.
- **API Changes:** GET /guests/{id}/profile (history, spend, preferences)
- **Definition of Done:** Guest profile shows complete history, preferences, total spend.
- **Complexity:** M | **Risk:** Low

## PMS-006 — Housekeeping Management

- **Epic:** PMS | **Capability:** Housekeeping
- **Feature:** Room status tracking (dirty/clean/inspected), staff assignment
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001, PMS-001
- **Backend Changes:** Create `internal/domain/housekeeping/`, handlers, repos.
- **Database Changes:** Migration 015_create_housekeeping_tasks.sql.
- **API Changes:** GET /housekeeping/today, POST /housekeeping/tasks, PATCH /housekeeping/tasks/{id}
- **Frontend Changes:** Create `web/app/housekeeping/page.js`.
- **Definition of Done:** Staff can see dirty rooms, mark clean/inspected, assign tasks.
- **Complexity:** L | **Risk:** Medium

## PMS-007 — Payments Module

- **Epic:** PMS | **Capability:** Payments
- **Feature:** Record payments (cash, card, transfer), apply to folio
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-002
- **Backend Changes:** Create `internal/domain/payment/`, handlers, repos.
- **Database Changes:** Migration 016_create_payments.sql.
- **API Changes:** POST /folios/{id}/payments, GET /folios/{id}/payments
- **Definition of Done:** Payments recorded, applied to folio, balance updated.
- **Complexity:** L | **Risk:** Medium

## PMS-008 — Staff Management

- **Epic:** PMS | **Capability:** Staff
- **Feature:** Employee profiles, roles, shifts, permissions
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001, SEC-004
- **Backend Changes:** Create `internal/domain/staff/`, handlers, repos. Extend users table.
- **Database Changes:** Migration 017_create_staff_profiles.sql.
- **Definition of Done:** Staff CRUD works. Roles assigned. Shifts tracked.
- **Complexity:** M | **Risk:** Low

## PMS-009 — Maintenance Requests

- **Epic:** PMS | **Capability:** Maintenance
- **Feature:** Log maintenance issues, assign staff, track resolution
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001
- **Backend Changes:** Create `internal/domain/maintenance/`, handlers, repos.
- **Database Changes:** Migration 018_create_maintenance_requests.sql.
- **Definition of Done:** Staff can create, assign, and resolve maintenance requests.
- **Complexity:** M | **Risk:** Low

## PMS-010 — Reports Module

- **Epic:** PMS | **Capability:** Analytics
- **Feature:** Occupancy report, revenue summary, guest statistics
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED (dashboard uses Math.random)
- **Dependencies:** PMS-002, PMS-003
- **Backend Changes:** Create `internal/interfaces/http/handlers/report_handler.go`.
- **Frontend Changes:** Replace Math.random dashboard with real data.
- **Definition of Done:** Dashboard shows real occupancy, revenue, arrivals/departures.
- **Complexity:** M | **Risk:** Low

---

# 8. P2 COMPETITIVE BACKLOG

## CH-001 — Booking Engine (Widget)

- **Epic:** Distribution | **Capability:** Booking Engine
- **Feature:** Embeddable booking widget for hotel websites
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-001, PMS-004, SEC-001
- **Backend Changes:** Create public availability API, booking flow endpoints.
- **Frontend Changes:** Embeddable widget (React component or iframe).
- **Definition of Done:** Guest can search availability and book from hotel website.
- **Complexity:** XL | **Risk:** High

## CH-002 — Channel Manager

- **Epic:** Distribution | **Capability:** Channel Manager
- **Feature:** Sync availability/rates to OTAs (Booking.com, Expedia, Airbnb)
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** CH-001, PMS-004
- **Backend Changes:** Create OTA sync engine, iCal export, webhooks.
- **Definition of Done:** Rate/availability changes sync to connected channels.
- **Complexity:** XL | **Risk:** High

## WA-001 — WhatsApp Basic Integration

- **Epic:** Guest Experience | **Capability:** WhatsApp
- **Feature:** Send booking confirmations, pre-arrival messages via WhatsApp
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** SEC-001, PMS-005
- **Backend Changes:** WhatsApp Business API integration, message templates.
- **Definition of Done:** Booking confirmation sent via WhatsApp automatically.
- **Complexity:** L | **Risk:** Medium

## WA-002 — WhatsApp Native Operations

- **Epic:** Guest Experience | **Capability:** WhatsApp
- **Feature:** Guest chat, service requests, room service ordering via WhatsApp
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** WA-001, PMS-006
- **Definition of Done:** Guests can request services via WhatsApp. Staff receives and fulfills.
- **Complexity:** XL | **Risk:** High

## GP-001 — Guest Portal

- **Epic:** Guest Experience | **Capability:** Guest Portal
- **Feature:** Self-service portal for guests: check-in, folio view, service requests
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-002, SEC-001
- **Definition of Done:** Guests can self check-in, view folio, make requests from phone.
- **Complexity:** L | **Risk:** Medium

## REV-001 — Revenue Management (Basic)

- **Epic:** Revenue | **Capability:** Revenue
- **Feature:** Dynamic pricing suggestions based on occupancy, seasonality, competitor rates
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-004, PMS-010
- **Definition of Done:** System suggests price adjustments based on demand signals.
- **Complexity:** XL | **Risk:** High

## CRM-001 — CRM Basic

- **Epic:** Guest Experience | **Capability:** CRM
- **Feature:** Guest segmentation, repeat guest detection, communication history
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-005
- **Definition of Done:** Guests segmented by spend/visits. Repeat guests flagged.
- **Complexity:** M | **Risk:** Low

## ANA-001 — Analytics Dashboard

- **Epic:** Analytics | **Capability:** Analytics
- **Feature:** Revenue charts, occupancy trends, guest demographics, ADR/RevPAR
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-010, PMS-002
- **Definition of Done:** Real analytics dashboard with exportable reports.
- **Complexity:** L | **Risk:** Medium

## FISCAL-001 — Fiscal RD (DGII/NCF)

- **Epic:** Fiscal | **Capability:** Fiscal RD
- **Feature:** NCF generation, ITBIS calculation, DGII e-CF submission
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-002, PMS-007
- **Backend Changes:** Create `internal/domain/fiscal/`, NCF sequence management, ITBIS engine.
- **Database Changes:** Migration 019_create_fiscal_records.sql.
- **Definition of Done:** NCF assigned per folio. ITBIS calculated. E-CF generated in DGII format.
- **Complexity:** XL | **Risk:** High (regulatory compliance)

## EVT-001 — Events/Groups Management

- **Epic:** Events | **Capability:** Events
- **Feature:** Group reservations, event spaces, banquet orders
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-001, PMS-002
- **Definition of Done:** Group block bookings work. Event spaces track capacity and pricing.
- **Complexity:** L | **Risk:** Medium

## POS-001 — POS / F&B Basic

- **Epic:** POS | **Capability:** POS
- **Feature:** Restaurant/bar charges, table management, menu items
- **Priority:** P2 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-002, PMS-007
- **Definition of Done:** F&B charges post to guest folio. Table tracking works.
- **Complexity:** L | **Risk:** Medium

---

# 9. P3 DIFFERENTIATION BACKLOG

## EDGE-001 — Offline/Edge Architecture

- **Epic:** Innovation | **Capability:** Offline/Edge
- **Feature:** Full PMS functionality without internet via local-first architecture
- **Priority:** P3 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** None (independent workstream)
- **Backend Changes:** Create local SQLite sync layer, conflict resolution engine.
- **Frontend Changes:** Service Worker, IndexedDB, offline queue.
- **Definition of Done:** PMS works fully offline. Syncs when connectivity restored.
- **Complexity:** XL | **Risk:** Very High

## AI-001 — AI Revenue Advisor

- **Epic:** Innovation | **Capability:** AI
- **Feature:** AI-powered pricing recommendations, demand forecasting
- **Priority:** P3 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** REV-001, PMS-010
- **Definition of Done:** AI suggests optimal pricing. Forecast accuracy > 75%.
- **Complexity:** XL | **Risk:** High

## AI-002 — AI Guest Assistant

- **Epic:** Innovation | **Capability:** AI
- **Feature:** AI chatbot for guest requests, local recommendations, concierge
- **Priority:** P3 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** WA-002, GP-001
- **Definition of Done:** AI handles 60% of routine guest requests without human intervention.
- **Complexity:** L | **Risk:** Medium

## AI-003 — Predictive Maintenance

- **Epic:** Innovation | **Capability:** AI
- **Feature:** Predict equipment failures based on usage patterns
- **Priority:** P3 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** PMS-009
- **Definition of Done:** System predicts maintenance needs with > 70% accuracy.
- **Complexity:** L | **Risk:** Medium

## MPROP-001 — Multi-Property Management

- **Epic:** Platform | **Capability:** Multi-Property
- **Feature:** Central dashboard managing multiple hotel properties
- **Priority:** P3 | **Current Status:** NOT IMPLEMENTED
- **Dependencies:** All P1 features
- **Definition of Done:** Single login manages multiple properties with consolidated reporting.
- **Complexity:** XL | **Risk:** High

---

# 10. TECHNICAL FOUNDATION BACKLOG

## TF-001 — Event Store Reliability

- **Epic:** Technical Foundation | **Capability:** Event Sourcing
- **Feature:** NATS JetStream replacing in-memory event store, replay, projection rebuild
- **Priority:** P0 | **Current Status:** PARTIAL (PG store works, no NATS, in-memory fallback exists)
- **Dependencies:** None
- **Backend Changes:** Create `internal/infrastructure/eventstore/nats.go`. Remove `client.go` in-memory fallback.
- **Definition of Done:** Events persist to NATS JetStream. Replay works. No in-memory fallback.
- **Complexity:** L | **Risk:** Medium

## TF-002 — Database Migration System

- **Epic:** Technical Foundation | **Capability:** Database
- **Feature:** Automated migration runner (goose or similar), rollback support
- **Priority:** P1 | **Current Status:** PARTIAL (manual `cmd/migration/main.go`)
- **Dependencies:** None
- **Backend Changes:** Refactor `cmd/migration/main.go` to use goose. Add rollback commands.
- **Definition of Done:** Migrations run automatically on startup. Rollback works.
- **Complexity:** S | **Risk:** Low

## TF-003 — Observability Stack

- **Epic:** Technical Foundation | **Capability:** Observability
- **Feature:** Structured logging, health check, readiness probe, metrics endpoint
- **Priority:** P1 | **Current Status:** NOT IMPLEMENTED (empty observability/ dir)
- **Dependencies:** None
- **Backend Changes:** Create `internal/infrastructure/observability/logger.go`, `health.go`, `metrics.go`.
- **Definition of Done:** Health endpoint returns DB/Redis status. Structured JSON logs. Metrics on /metrics.
- **Complexity:** M | **Risk:** Low

## TF-004 — Configuration Management

- **Epic:** Technical Foundation | **Capability:** Configuration
- **Feature:** Centralized config from env vars with validation and defaults
- **Priority:** P1 | **Current Status:** INSECURE (hardcoded values scattered)
- **Dependencies:** SEC-005
- **Backend Changes:** Create `internal/infrastructure/config/config.go`. Centralize all env reads.
- **Definition of Done:** Single config struct validated at startup. All env vars documented.
- **Complexity:** S | **Risk:** Low

## TF-005 — Database Seeder

- **Epic:** Technical Foundation | **Capability:** Database
- **Feature:** Proper seed system with env-based credentials, idempotent, multi-tenant support
- **Priority:** P1 | **Current Status:** PARTIAL (scripts/seed.go exists but hardcoded)
- **Dependencies:** SEC-005
- **Backend Changes:** Refactor `scripts/seed.go` to read from env. Make idempotent.
- **Definition of Done:** Seed runs with env credentials. Idempotent. Creates demo data for multiple tenants.
- **Complexity:** S | **Risk:** Low

## TF-006 — API Versioning Strategy

- **Epic:** Technical Foundation | **Capability:** API
- **Feature:** Formal API versioning (v1 prefix), deprecation policy
- **Priority:** P2 | **Current Status:** PARTIAL (v1 prefix exists but informal)
- **Dependencies:** None
- **Backend Changes:** Ensure all routes under /v1/. Document versioning policy.
- **Definition of Done:** All endpoints versioned. Deprecation header for old versions.
- **Complexity:** S | **Risk:** Low

## TF-007 — Testing Infrastructure

- **Epic:** Technical Foundation | **Capability:** Testing
- **Feature:** Test helpers, fixtures, mock DB, integration test harness
- **Priority:** P1 | **Current Status:** PARTIAL (7 test files exist, limited coverage)
- **Dependencies:** None
- **Backend Changes:** Create `pkg/testutil/` with test helpers. Standardize test patterns.
- **Definition of Done:** Test helpers exist for DB, HTTP, events. CI runs all tests.
- **Complexity:** M | **Risk:** Low

---

# 11. DOMAIN BACKLOG

| ID | Domain | Current | Actions Needed |
|----|--------|---------|----------------|
| DOM-001 | Room | PARTIAL | Fix IDOR, add RLS, add status validation |
| DOM-002 | RoomType | PARTIAL | Add tenant_id filtering, validate pricing |
| DOM-003 | Reservation | BROKEN | Add availability check, exclusion constraint, fix cancel command |
| DOM-004 | Guest | PARTIAL | Add IDOR fix, extend profile fields |
| DOM-005 | Rate | PARTIAL | Add season dates, min_stay, blackouts |
| DOM-006 | Folio | NOT IMPLEMENTED | Create domain model, events, aggregate |
| DOM-007 | Payment | NOT IMPLEMENTED | Create domain model, idempotency |
| DOM-008 | Housekeeping | NOT IMPLEMENTED | Create domain model, task states |
| DOM-009 | Maintenance | NOT IMPLEMENTED | Create domain model, priority levels |
| DOM-010 | Staff | NOT IMPLEMENTED | Extend users, add shifts |
| DOM-011 | Fiscal | NOT IMPLEMENTED | NCF, ITBIS, DGII integration |
| DOM-012 | Event/Group | NOT IMPLEMENTED | Group booking, event spaces |
| DOM-013 | Audit | NOT IMPLEMENTED | Append-only log, actor tracking |
| DOM-014 | Channel | NOT IMPLEMENTED | OTA sync, iCal |
| DOM-015 | Booking | NOT IMPLEMENTED | Public availability, booking flow |

---

# 12. API BACKLOG

| ID | Endpoint | Current | Fix/Build |
|----|----------|---------|-----------|
| API-001 | POST /auth/login | Missing | Build (SEC-001) |
| API-002 | POST /auth/refresh | Missing | Build (SEC-001) |
| API-003 | POST /auth/logout | Missing | Build (SEC-001) |
| API-004 | GET /rooms | IDOR | Fix tenant_id (SEC-006) |
| API-005 | POST /rooms | Missing validation | Fix input validation (FIX-002) |
| API-006 | GET /rooms/{id} | IDOR | Fix tenant_id (SEC-006) |
| API-007 | PATCH /rooms/{id} | No RowsAffected, any status | Fix validation (FIX-003) |
| API-008 | GET /reservations | IDOR | Fix tenant_id (SEC-006) |
| API-009 | POST /reservations | No availability check | Fix + add double-booking (FIX-001) |
| API-010 | GET /reservations/{id} | IDOR | Fix tenant_id (SEC-006) |
| API-011 | POST /reservations/{id}/checkin | No RowsAffected | Fix (FIX-003) |
| API-012 | POST /reservations/{id}/checkout | No RowsAffected | Fix (FIX-003) |
| API-013 | POST /reservations/{id}/cancel | Missing TenantID | Fix (SEC-006) |
| API-014 | GET /guests | IDOR + unescaped ILIKE | Fix tenant_id + escaping |
| API-015 | POST /guests | Missing validation | Fix input validation (FIX-002) |
| API-016 | GET /guests/{id} | IDOR | Fix tenant_id (SEC-006) |
| API-017 | POST /availability/check | Works | No change needed |
| API-018 | POST /roomtypes | Works | Add validation |
| API-019 | GET /roomtypes | Works | Add tenant_id filtering |
| API-020 | POST /rates | Works | Add validation |
| API-021 | GET /rates | Works | Add tenant_id filtering |
| API-022 | GET /frontdesk/today | Missing | Build (PMS-001) |
| API-023 | GET /reservations/{id}/folio | Missing | Build (PMS-002) |
| API-024 | POST /reservations/{id}/folio/entries | Missing | Build (PMS-002) |
| API-025 | POST /night-audit/run | Missing | Build (PMS-003) |
| API-026 | GET /housekeeping/today | Missing | Build (PMS-006) |
| API-027 | POST /folios/{id}/payments | Missing | Build (PMS-007) |
| API-028 | GET /reports/occupancy | Missing | Build (PMS-010) |
| API-029 | GET /reports/revenue | Missing | Build (PMS-010) |

---

# 13. DATABASE BACKLOG

| ID | Migration | Status | Description |
|----|-----------|--------|-------------|
| DB-001 | 001_create_tenants | DONE | Tenants table |
| DB-002 | 002_create_guests | DONE | Guests table |
| DB-003 | 003_create_rooms | DONE | Rooms table |
| DB-004 | 004_create_reservations | DONE | Reservations table |
| DB-005 | 005_create_rates | DONE | Rates table |
| DB-006 | 006_create_events | DONE | Event store table |
| DB-007 | 007_add_room_columns | DONE | Extended room columns |
| DB-008 | 008_create_users | Not Created | Users table (SEC-001) |
| DB-009 | 009_create_refresh_tokens | Not Created | Refresh tokens (SEC-001) |
| DB-010 | 010_create_rls_policies | Not Created | RLS policies (SEC-003) |
| DB-011 | 011_add_exclusion_constraint | Not Created | Anti-double-booking (FIX-001) |
| DB-012 | 012_create_audit_logs | Not Created | Audit trail (AUD-001) |
| DB-013 | 013_create_folio_entries | Not Created | Folio engine (PMS-002) |
| DB-014 | 014_create_night_audit_runs | Not Created | Night audit (PMS-003) |
| DB-015 | 015_create_housekeeping_tasks | Not Created | Housekeeping (PMS-006) |
| DB-016 | 016_create_payments | Not Created | Payments (PMS-007) |
| DB-017 | 017_create_staff_profiles | Not Created | Staff (PMS-008) |
| DB-018 | 018_create_maintenance_requests | Not Created | Maintenance (PMS-009) |
| DB-019 | 019_create_fiscal_records | Not Created | Fiscal RD (FISCAL-001) |

---

# 14. FRONTEND BACKLOG

| ID | Page | Status | Actions |
|----|------|--------|---------|
| FE-001 | Dashboard | DONE | Stats reales del API |
| FE-002 | Rooms | DONE | CRUD completo con filtros |
| FE-003 | Reservations | DONE | CRUD + check-in/out + link a folio |
| FE-004 | Availability | DONE | Búsqueda por fechas |
| FE-005 | Guests | DONE | CRUD + búsqueda + link a perfil 360 |
| FE-006 | Settings | DONE | Tipos de habitación + tarifas |
| FE-007 | Login | DONE | JWT auth + redirect a dashboard |
| FE-008 | Front Desk | DONE | Board diario + llegadas/salidas |
| FE-009 | Housekeeping | DONE | Task board con status flow |
| FE-010 | Guest Profile | DONE | Perfil 360: historial, preferencias, tags |
| FE-011 | Folio | DONE | Cargos/pagos/balance + cerrar folio |
| FE-012 | Reports | DONE | Dashboard + ocupación + revenue + guests |
| FE-013 | Staff | DONE | CRUD + cambio de roles |
| FE-014 | Maintenance | DONE | Requests CRUD + prioridades |
| FE-015 | Night Audit | DONE | Ejecutar + historial |
| FE-016 | Fiscal (e-CF) | DONE | Receipts DGII + RNC + ITBIS |
| FE-017 | Auth client | DONE | JWT storage + auto-attach Bearer |
| FE-018 | Navigation | DONE | 12 items sidebar |

---

# 15. EVENT BACKLOG

| ID | Event | Status | Target |
|----|-------|--------|--------|
| EVT-S-001 | RoomCreated | DONE | Event store + projection |
| EVT-S-002 | RoomStatusChanged | DONE | Event store + projection |
| EVT-S-003 | ReservationCreated | DONE | Event store (no projection) |
| EVT-S-004 | ReservationCancelled | PARTIAL | Missing TenantID in command |
| EVT-S-005 | ReservationCheckedIn | DONE | Event store only |
| EVT-S-006 | ReservationCheckedOut | DONE | Event store only |
| EVT-S-007 | GuestCreated | DONE | Event store + projection |
| EVT-S-008 | UserAuthenticated | NOT IMPLEMENTED | Build (SEC-001) |
| EVT-S-009 | AuditLogged | NOT IMPLEMENTED | Build (AUD-001) |
| EVT-S-010 | ReservationRejected | NOT IMPLEMENTED | Build (FIX-001) |
| EVT-S-011 | FolioEntryAdded | NOT IMPLEMENTED | Build (PMS-002) |
| EVT-S-012 | PaymentRecorded | NOT IMPLEMENTED | Build (PMS-007) |
| EVT-S-013 | NightAuditCompleted | NOT IMPLEMENTED | Build (PMS-003) |
| EVT-S-014 | HousekeepingTaskCreated | NOT IMPLEMENTED | Build (PMS-006) |

---

# 16. INTEGRATION BACKLOG

| ID | Integration | Status | Dependencies |
|----|------------|--------|-------------|
| INT-001 | PostgreSQL Event Store | PARTIAL | Works but no NATS |
| INT-002 | Docker Compose | PARTIAL | Hardcoded credentials, exposed ports |
| INT-003 | Next.js API Proxy | WORKING | Proxy /api/* to localhost:8081 |
| INT-004 | Seed Data | PARTIAL | Hardcoded credentials, single tenant |
| INT-005 | WhatsApp Business API | NOT IMPLEMENTED | P2 - needs PMS foundation |
| INT-006 | DGII e-CF | NOT IMPLEMENTED | P2 - needs fiscal module |
| INT-007 | Booking.com XML | NOT IMPLEMENTED | P2 - needs channel manager |
| INT-008 | Expedia XML | NOT IMPLEMENTED | P2 - needs channel manager |
| INT-009 | iCal Export | NOT IMPLEMENTED | P2 - needs channel manager |
| INT-010 | Stripe/PayPal | NOT IMPLEMENTED | P2 - needs payments module |

---

# 17. SECURITY BACKLOG

| ID | Control | Status | Severity | Target |
|----|---------|--------|----------|--------|
| SEC-S-001 | Authentication | NOT IMPLEMENTED | CRITICAL | JWT (SEC-001) |
| SEC-S-002 | Tenant Isolation (App) | INSECURE | CRITICAL | JWT tenant (SEC-002) |
| SEC-S-003 | Tenant Isolation (DB) | BROKEN | CRITICAL | RLS policies (SEC-003) |
| SEC-S-004 | RBAC | NOT IMPLEMENTED | CRITICAL | Middleware (SEC-004) |
| SEC-S-005 | IDOR Prevention | BROKEN | CRITICAL | Repo tenant_id (SEC-006) |
| SEC-S-006 | Secret Management | INSECURE | HIGH | Env vars (SEC-005) |
| SEC-S-007 | Input Validation | INSECURE | HIGH | Validation layer (FIX-002) |
| SEC-S-008 | Error Sanitization | INSECURE | MEDIUM | Error types (FIX-002) |
| SEC-S-009 | Rate Limiting | NOT IMPLEMENTED | MEDIUM | Redis + middleware |
| SEC-S-010 | Audit Trail | NOT IMPLEMENTED | HIGH | Audit system (AUD-001) |
| SEC-S-011 | CORS Policy | NOT CHECKED | MEDIUM | Verify and configure |
| SEC-S-012 | TLS Enforcement | NOT CHECKED | HIGH | HTTPS redirect |

---

# 18. TESTING BACKLOG

| ID | Test Type | Current | Target |
|----|-----------|---------|--------|
| TEST-001 | Unit: Domain aggregates | 2 files (room, reservation, guest) | All 15 domains |
| TEST-002 | Unit: Application services | 2 files (create, cancel) | All application services |
| TEST-003 | Unit: Auth/Security | 0 | JWT, bcrypt, RBAC |
| TEST-004 | Integration: API endpoints | 1 file (reservation handler) | All 29+ endpoints |
| TEST-005 | Integration: DB repos | 1 file (reservation repo) | All repos |
| TEST-006 | Integration: Event store | 0 | Event persistence, replay |
| TEST-007 | Security: IDOR | 0 | Cross-tenant access denied |
| TEST-008 | Security: Auth bypass | 0 | Missing/expired token rejected |
| TEST-009 | Concurrency: Double booking | 0 | Simultaneous reservations |
| TEST-010 | E2E: Full reservation flow | 0 | Create -> CheckIn -> Folio -> Checkout |
| TEST-011 | Regression: Critical paths | 0 | Smoke test suite |

---

# 19. OBSERVABILITY BACKLOG

| ID | Component | Status | Priority |
|----|-----------|--------|----------|
| OBS-001 | Structured Logging | NOT IMPLEMENTED | P1 |
| OBS-002 | Health Check Endpoint | NOT IMPLEMENTED | P1 |
| OBS-003 | Readiness Probe | NOT IMPLEMENTED | P1 |
| OBS-004 | Metrics Endpoint | NOT IMPLEMENTED | P1 |
| OBS-005 | Error Tracking | NOT IMPLEMENTED | P2 |
| OBS-006 | Request Tracing | NOT IMPLEMENTED | P2 |
| OBS-007 | Database Connection Pool Metrics | NOT IMPLEMENTED | P2 |

---

# 20. DEPENDENCY GRAPH

```
SEC-005 (Secrets)
    |
SEC-001 (JWT Auth)
    |
    +---> SEC-004 (RBAC)
    |
    +---> SEC-002 (Tenant from JWT)
              |
              +---> SEC-003 (RLS Policies)
              |         |
              |         +---> FIX-001 (Reservation Integrity)
              |                   |
              |                   +---> PMS-001 (Front Desk)
              |                   |         |
              |                   |         +---> PMS-003 (Night Audit)
              |                   |         |         |
              |                   |         |         +---> PMS-010 (Reports)
              |                   |         |
              |                   |         +---> PMS-006 (Housekeeping)
              |                   |
              |                   +---> PMS-002 (Folio Engine)
              |                             |
              |                             +---> PMS-007 (Payments)
              |                             |         |
              |                             |         +---> FISCAL-001 (Fiscal RD)
              |                             |
              |                             +---> PMS-004 (Rate Plans)
              |                                       |
              |                                       +---> CH-001 (Booking Engine)
              |                                       |         |
              |                                       |         +---> CH-002 (Channel Manager)
              |                                       |
              |                                       +---> REV-001 (Revenue Mgmt)
              |
              +---> SEC-006 (IDOR Fix)
              |         |
              |         +---> PMS-005 (Guest Profile 360)
              |                   |
              |                   +---> WA-001 (WhatsApp Basic)
              |                   +---> CRM-001 (CRM Basic)
              |
              +---> AUD-001 (Audit Trail)

FIX-002 (Error Handling) --- independent, do anytime
FIX-003 (Room Status Validation) --- independent, do anytime
FIX-004 (Docker Security) --- independent, do anytime
TF-001 (Event Store NATS) --- independent, do anytime
TF-003 (Observability) --- independent, do anytime
```

---

# 21. PHASE 0 — SECURITY + CORE INTEGRITY

**Duration:** Weeks 1-4
**Goal:** System is secure and data is trustworthy.

## Entry Criteria
- Existing code compiles and runs
- Docker environment functional
- 7 migrations applied

## Exit Criteria
- Auth works end-to-end (login, JWT, refresh, logout)
- All endpoints protected by JWT + RBAC
- All DB queries filtered by tenant_id
- RLS policies active on all tables
- No hardcoded credentials
- No IDOR vulnerabilities
- Reservation creation is atomic with double-booking prevention
- Audit trail records all mutations
- All P0 tests passing

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| SEC-005 | Secret Management | XS |
| FIX-004 | Docker Security | XS |
| SEC-001 | JWT Authentication | M |
| SEC-002 | Tenant Resolution from JWT | S |
| SEC-004 | RBAC Middleware | S |
| SEC-006 | IDOR Fix on All Repos | M |
| FIX-002 | Error Handling | S |
| FIX-003 | Room Status Validation | S |
| SEC-003 | RLS Policies | M |
| FIX-001 | Reservation Integrity | M |
| AUD-001 | Audit Trail | M |

## Risks
- RLS requires non-superuser DB role (coordination with Docker setup)
- JWT integration touches every handler (large surface area)
- Exclusion constraint requires btree_gist extension

## Tests
- Auth: 401 on missing/expired/invalid token
- RBAC: 403 on cross-role access
- IDOR: Cross-tenant access returns 404
- Double-booking: Simultaneous reservations, only one succeeds
- RLS: Cross-tenant query at DB level returns empty
- Audit: Every mutation creates audit record

---

# 22. PHASE 1 — PMS FOUNDATION

**Duration:** Weeks 5-10
**Goal:** Hotel can operate day-to-day with front desk, folio, and basic operations.

## Entry Criteria
- Phase 0 complete (all security in place)
- Auth + tenant isolation working

## Exit Criteria
- Front desk board shows real-time room status
- Folio tracks all charges and payments
- Night audit runs successfully
- Housekeeping tasks tracked
- Staff management functional
- Dashboard shows real data (no Math.random)

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| PMS-001 | Front Desk Board | L |
| PMS-002 | Folio Engine | L |
| PMS-004 | Rate Plans + Seasonal Pricing | M |
| PMS-005 | Guest Profile 360 | M |
| PMS-008 | Staff Management | M |
| TF-002 | Database Migration System | S |
| TF-003 | Observability Stack | M |
| TF-004 | Configuration Management | S |
| TF-005 | Database Seeder | S |
| TF-007 | Testing Infrastructure | M |

## Risks
- Folio engine is complex (charges, payments, adjustments, currency)
- Night audit is time-sensitive (must process correctly in one pass)
- Front desk board needs real-time updates (WebSocket consideration)

## Tests
- Folio: Charge adds to balance, payment reduces, close validates zero
- Night Audit: All in-house reservations processed, dates rolled
- Rate Plans: Seasonal pricing calculates correctly
- Guest Profile: History, spend, preferences all accessible
- Dashboard: All numbers from real data

---

# 23. PHASE 2 — HOTEL OPERATIONS

**Duration:** Weeks 11-16
**Goal:** Full operational workflow for daily hotel management.

## Entry Criteria
- Phase 1 complete (Folio, Front Desk, Rates, Guest Profile working)

## Exit Criteria
- Housekeeping staff can see and complete their tasks
- Maintenance requests tracked and resolved
- Payments properly recorded against folios
- Night audit automated and reliable
- All P1 tests passing

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| PMS-003 | Night Audit Process | L |
| PMS-006 | Housekeeping Management | L |
| PMS-007 | Payments Module | L |
| PMS-009 | Maintenance Requests | M |

## Risks
- Night audit correctness is critical (financial implications)
- Payments need idempotency (prevent duplicate charges)
- Housekeeping needs real-time updates

## Tests
- Night Audit: Processes all in-house, generates report
- Payments: Idempotent, correct balance updates
- Housekeeping: Task lifecycle (dirty -> clean -> inspected)
- Maintenance: Create -> assign -> resolve workflow

---

# 24. PHASE 3 — REVENUE + FISCAL

**Duration:** Weeks 17-22
**Goal:** Revenue management and Dominican fiscal compliance.

## Entry Criteria
- Phase 2 complete (Folio + Payments working)
- Rate plans and seasonal pricing functional

## Exit Criteria
- NCF assigned correctly per folio
- ITBIS calculated properly (18%)
- E-CF generated in DGII format
- Reports module with real analytics
- Occupancy and revenue from real data

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| PMS-010 | Reports Module | M |
| FISCAL-001 | Fiscal RD (DGII/NCF) | XL |

## Risks
- DGII compliance is regulatory — errors have legal consequences
- NCF sequence management must be gapless
- ITBIS calculation must follow DR tax law exactly

## Tests
- Fiscal: NCF sequential, ITBIS correct, E-CF valid format
- Reports: Occupancy matches room states, revenue matches folio
- Dashboard: All real data, no placeholders

---

# 25. PHASE 4 — DISTRIBUTION + BOOKING

**Duration:** Weeks 23-28
**Goal:** Hotels can receive direct bookings and connect to OTAs.

## Entry Criteria
- Phase 3 complete
- Rate plans with seasonal pricing working
- Front desk operational

## Exit Criteria
- Booking widget works on hotel website
- Availability syncs to at least one OTA
- Guest can complete booking flow end-to-end

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| CH-001 | Booking Engine | XL |
| CH-002 | Channel Manager | XL |

## Risks
- OTA XML protocols are complex and change frequently
- Real-time availability sync requires robust conflict resolution
- Booking engine needs to handle payment (PCI compliance)

## Tests
- Booking: Guest searches, selects, books, receives confirmation
- Channel: Rate change syncs to OTA within 60 seconds
- Concurrency: Booking via widget + front desk simultaneously handled

---

# 26. PHASE 5 — GUEST EXPERIENCE

**Duration:** Weeks 29-34
**Goal:** Guest engagement through WhatsApp and self-service.

## Entry Criteria
- Phase 4 complete (booking flow working)
- Guest profiles with contact info

## Exit Criteria
- [x] WhatsApp messages sent for booking confirmation
- [x] Guest can self check-in via portal
- [x] CRM segments guests by behavior

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| WA-001 | WhatsApp Basic | L |
| GP-001 | Guest Portal | L |
| CRM-001 | CRM Basic | M |

## Risks
- WhatsApp Business API has strict template approval process
- Guest portal needs its own auth (separate from staff)
- GDPR/privacy concerns with guest data

## Tests
- WhatsApp: Message delivered for new booking
- Portal: Guest self check-in works end-to-end
- CRM: Repeat guest detection accurate

---

# 27. PHASE 6 — INTELLIGENCE

**Duration:** Weeks 35-42
**Goal:** Data-driven insights and advanced features.

## Entry Criteria
- Phase 5 complete
- Sufficient historical data for analytics

## Exit Criteria
- Revenue management suggests optimal pricing
- Analytics dashboard with exportable reports
- Advanced WhatsApp operations (chat, service requests)

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| WA-002 | WhatsApp Native Operations | XL |
| REV-001 | Revenue Management | XL |
| ANA-001 | Analytics Dashboard | L |
| EVT-001 | Events/Groups | L |
| POS-001 | POS/F&B Basic | L |

## Risks
- Revenue management algorithms need tuning with real data
- WhatsApp native operations are complex (conversations, routing)
- POS integration with folio must be real-time

## Tests
- Revenue: Suggestions based on occupancy thresholds
- Analytics: Charts render with real data, export works
- POS: F&B charges post to guest folio correctly

---

# 28. PHASE 7 — DIFFERENTIATION

**Duration:** Weeks 43-52
**Goal:** AI features, offline capability, multi-property.

## Entry Criteria
- All P1/P2 features complete and stable
- Sufficient data for AI training

## Exit Criteria
- AI provides actionable pricing recommendations
- PMS works offline for basic operations
- Multi-property dashboard functional

## Features

| ID | Feature | Complexity |
|----|---------|-----------|
| AI-001 | AI Revenue Advisor | XL |
| AI-002 | AI Guest Assistant | L |
| AI-003 | Predictive Maintenance | L |
| EDGE-001 | Offline/Edge Architecture | XL |
| MPROP-001 | Multi-Property Management | XL |

## Risks
- AI accuracy depends on data quality and volume
- Offline architecture is a fundamental paradigm shift
- Multi-property adds complexity to every feature

## Tests
- AI: Recommendations improve over baseline
- Offline: Full CRUD works without connectivity
- Sync: Conflicts resolved correctly after reconnection
- Multi-property: Data isolation between properties verified

---

# 29. CAPABILITY DEFINITION OF DONE

A capability is **COMPLETE** only when ALL of the following are true:

| Dimension | Requirement |
|-----------|------------|
| Backend | All handlers, services, repos implemented and working |
| Database | Migrations created, applied, tested |
| Business Rules | Domain logic enforced at application layer |
| API | All endpoints documented, tested, returning correct responses |
| Frontend | UI pages built, connected to API, error handling in place |
| Security | Auth required, tenant isolation enforced, RBAC checked, no IDOR |
| Integration | Event publishing works, external integrations functional |
| Tests | Unit + integration + security + concurrency tests passing |
| Observability | Structured logging, health check, error tracking |
| Documentation | API docs updated, README reflects changes |

A capability is **NOT COMPLETE** if any dimension is missing.

---

# 30. SECURITY GATES

No feature can pass to COMPLETE if ANY of these are true:

- [ ] Breaks tenant isolation (cross-tenant data access possible)
- [ ] Allows IDOR (resource accessible without tenant_id verification)
- [ ] Has auth bypass (endpoint accessible without valid JWT)
- [ ] Exposes secrets (hardcoded credentials, env vars in responses)
- [ ] Lacks authorization (any role can access any endpoint)
- [ ] Introduces cross-tenant access (one tenant's data visible to another)
- [ ] Generates data inconsistencies (transaction not atomic, partial state possible)
- [ ] Returns raw error strings to clients (information leakage)
- [ ] Accepts unvalidated input (missing MaxBytesReader, no field validation)
- [ ] Bypasses audit trail (mutation without audit record)

**Enforcement:** Every PR must pass security gate checklist before merge.

---

# 31. DO NOT BUILD YET

| Feature | Motivation | Missing Dependency | Risk | Reconsider When |
|---------|-----------|-------------------|------|-----------------|
| Multi-Property | Adds complexity to every feature | All P1 features stable | High | After Phase 6 |
| Offline/Edge | Paradigm shift, needs mature codebase | All features stable | Very High | After Phase 7 |
| AI Revenue | Needs historical data | 6+ months of rate/occupancy data | Medium | After Phase 5 |
| AI Guest Assistant | Needs WhatsApp + Guest Portal | WA-001, GP-001, CRM-001 | Low | After Phase 5 |
| Predictive Maintenance | Needs maintenance history | PMS-009 with 6+ months data | Low | After Phase 6 |
| Native Mobile App | Web app should be sufficient first | PWA mature, user demand validated | Medium | After Phase 5 |
| Stripe Integration | PCI compliance complexity | PMS-007 payments working | High | After Phase 3 |
| Advanced Reporting | Needs substantial data | PMS-003 (night audit) running | Low | After Phase 3 |
| Social Login | Adds auth complexity | Basic auth stable (SEC-001) | Low | After Phase 1 |
| White Labeling | Premature optimization | Single brand proven first | Medium | After Phase 7 |

---

# 32. ARCHITECTURAL MIGRATION PLAN

## Current State -> Target State

### Authentication
- **Current:** No-op middleware
- **Target:** JWT with refresh tokens, httpOnly cookies
- **Migration:** SEC-001 + SEC-002 (Phase 0)

### Tenant Isolation
- **Current:** Client-controlled X-Tenant-ID header
- **Target:** JWT-derived tenant_id + RLS policies
- **Migration:** SEC-002 + SEC-003 (Phase 0)

### Event Store
- **Current:** PostgreSQL event store with in-memory fallback
- **Target:** NATS JetStream primary, PG as durable backup
- **Migration:** TF-001 (Phase 0, parallel)

### Database
- **Current:** 7 migrations, superuser access, no RLS
- **Target:** 19+ migrations, non-superuser with RLS, exclusion constraints
- **Migration:** SEC-003 + FIX-001 (Phase 0)

### API
- **Current:** 20 endpoints, no versioning, no validation
- **Target:** 40+ endpoints, /v1/ prefix enforced, input validation, standardized errors
- **Migration:** FIX-002 + new endpoints (Phase 0-3)

### Frontend
- **Current:** 6 pages, hardcoded tenant, no auth, Math.random dashboard
- **Target:** 12+ pages, JWT auth, login page, real data, role-based UI
- **Migration:** SEC-001 (login) + PMS-010 (dashboard) + new pages (Phase 1-5)

### Infrastructure
- **Current:** Docker Compose with exposed ports, hardcoded credentials
- **Target:** Secured Docker, env-based config, health checks, structured logging
- **Migration:** FIX-004 + TF-004 + TF-003 (Phase 0-1)

---

# 33. RECOMMENDED EXECUTION ORDER

1. **SEC-005** — Secret Management (XS, unblocks everything safely)
2. **FIX-004** — Docker Security (XS, quick win)
3. **SEC-001** — JWT Authentication (M, foundation for all security)
4. **SEC-002** — Tenant from JWT (S, depends on SEC-001)
5. **SEC-004** — RBAC Middleware (S, depends on SEC-001)
6. **FIX-002** — Error Handling (S, independent, improves quality)
7. **FIX-003** — Room Status Validation (S, independent, fixes bugs)
8. **SEC-006** — IDOR Fix (M, depends on SEC-002)
9. **SEC-003** — RLS Policies (M, depends on SEC-002)
10. **FIX-001** — Reservation Integrity (M, depends on SEC-003)
11. **AUD-001** — Audit Trail (M, depends on SEC-001 + SEC-002)
12. **TF-003** — Observability (M, independent, improves debugging)
13. **TF-007** — Testing Infrastructure (M, enables reliable development)
14. **PMS-001** — Front Desk Board (L, depends on Phase 0)
15. **PMS-002** — Folio Engine (L, depends on Phase 0)
16. **PMS-004** — Rate Plans (M, depends on PMS-002)
17. **PMS-005** — Guest Profile 360 (M, depends on SEC-006)
18. **TF-004** — Configuration Management (S, do alongside Phase 1)
19. **TF-005** — Database Seeder (S, do alongside Phase 1)
20. **PMS-010** — Reports Module (M, replaces Math.random dashboard)

---

# 34. FIRST 20 TASKS

These are the 20 tasks to execute in order. They build a secure, functional foundation.

| # | ID | Task | Phase | Est | Depends On |
|---|-----|------|-------|-----|-----------|
| 1 | SEC-005 | Remove all hardcoded credentials, read from env vars | P0 | XS | None |
| 2 | FIX-004 | Remove DB port from docker-compose, secure Docker config | P0 | XS | None |
| 3 | SEC-001 | Implement JWT auth: users table, login, refresh, middleware | P0 | M | SEC-005 |
| 4 | SEC-002 | Tenant resolution from JWT, remove X-Tenant-ID header | P0 | S | SEC-001 |
| 5 | SEC-004 | RBAC middleware with role-based route protection | P0 | S | SEC-001 |
| 6 | FIX-002 | Standardized error responses, input validation, MaxBytesReader | P0 | S | None |
| 7 | FIX-003 | Room status validation enum, RowsAffected checks | P0 | S | None |
| 8 | SEC-006 | Add tenant_id to all repo queries, fix CancelCommand | P0 | M | SEC-002 |
| 9 | SEC-003 | RLS policies on all tables, non-superuser DB role | P0 | M | SEC-002 |
| 10 | FIX-001 | Atomic reservation creation + exclusion constraint | P0 | M | SEC-003 |
| 11 | AUD-001 | Audit trail middleware + audit_logs table | P0 | M | SEC-001 |
| 12 | TF-003 | Observability: structured logging, health endpoint | P1 | M | None |
| 13 | TF-007 | Test helpers, fixtures, integration test harness | P1 | M | None |
| 14 | PMS-001 | Front Desk board: room status, arrivals, departures | P1 | L | Phase 0 |
| 15 | PMS-002 | Folio engine: charges, payments, balance, close | P1 | L | SEC-006 |
| 16 | PMS-004 | Rate plans: seasons, min_stay, blackout dates | P1 | M | PMS-002 |
| 17 | PMS-005 | Guest Profile 360: history, spend, preferences | P1 | M | SEC-006 |
| 18 | TF-004 | Configuration management: centralized config struct | P1 | S | SEC-005 |
| 19 | TF-005 | Database seeder: env-based, idempotent, multi-tenant | P1 | S | SEC-005 |
| 20 | PMS-010 | Reports module: real occupancy, revenue, dashboard data | P1 | M | PMS-002 |

---

# 35. RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JWT implementation flawed | Medium | Critical | Follow established patterns, thorough testing |
| RLS breaks existing queries | Medium | High | Test all queries after enabling RLS |
| Exclusion constraint performance | Low | High | Index tuning, monitor query plans |
| Night audit processes incorrectly | Medium | Critical | Extensive testing, dry-run mode first |
| DGII compliance errors | Low | Critical | Legal review, test with known values |
| Front desk board complexity | Medium | Medium | Start simple, iterate |
| Folio currency calculations | Medium | High | Use integer cents, never floats |
| OTA protocol changes | High | Medium | Abstraction layer, regular updates |
| WhatsApp template rejection | Medium | Medium | Prepare multiple templates |
| Team velocity overestimated | High | Medium | Prioritize ruthlessly, cut scope not quality |

---

# 36. CTO RECOMMENDATION

## Immediate Priority (Now)

**Start Phase 0 immediately.** The codebase has critical security vulnerabilities that must be resolved before any new feature development. Specifically:

1. **SEC-005 + FIX-004** (Day 1): Remove hardcoded credentials and exposed ports. Takes 1-2 hours.
2. **SEC-001** (Days 2-5): JWT authentication. This is the foundation everything else depends on.
3. **SEC-002 + SEC-004** (Days 6-8): Tenant from JWT + RBAC. Completes the security layer.

## What NOT to do

- Do not build any new PMS feature until Phase 0 is complete
- Do not add WhatsApp, booking engine, or channel manager yet
- Do not implement AI or offline until all P1 features are stable
- Do not hire frontend developers until backend security is in place

## Technical Debt to Address

1. CancelReservation command missing TenantID — fix in SEC-006
2. Math.random() in dashboard — fix in PMS-010
3. No input validation — fix in FIX-002
4. Raw error strings exposed — fix in FIX-002
5. No pagination — fix as part of each endpoint

## Architecture Decisions Needed

1. **WebSocket vs SSE** for real-time front desk updates (recommend SSE for simplicity)
2. **Monolith vs Services** — keep monolith until 50+ rooms per property, then consider splitting
3. **Local-first vs Cloud-first** — start cloud, add offline capability in Phase 7

## Budget Consideration

Phase 0-2 (16 weeks) can be built by 1 senior Go developer. Phase 3-5 requires adding a frontend developer. Phase 6-7 may need a data engineer for AI features.

## Risk Assessment

The biggest risk is **not** technical — it's shipping a secure, working product too slowly. The hospitality PMS market has room for a modern, LATAM-focused competitor, but the window is closing. Execute Phase 0-1 rapidly, get a working prototype in a real hotel within 10 weeks, then iterate based on real usage data.

## Summary

| Phase | Weeks | Outcome |
|-------|-------|---------|
| 0 | 1-4 | Secure, trustworthy foundation |
| 1 | 5-10 | Functional PMS for daily operations |
| 2 | 11-16 | Complete hotel operations workflow |
| 3 | 17-22 | Revenue management + fiscal compliance |
| 4 | 23-28 | Distribution + booking channels |
| 5 | 29-34 | Guest experience + WhatsApp |
| 6 | 35-42 | Intelligence + advanced features |
| 7 | 43-52 | Differentiation + offline + multi-property |
