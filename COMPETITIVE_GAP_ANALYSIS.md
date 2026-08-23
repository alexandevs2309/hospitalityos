# AURON HOSPITALITY — GAP ANALYSIS vs COMPETITORS

---

# 1. VISIÓN

Auron Hospitality no es un PMS — es una **plataforma de gestión hotelera** que combina lo mejor de Amenitiz, Mews, Cloudbeds y OPERA con diseño premium, fiscal RD nativo, WhatsApp como canal operativo, y offline-first.

**Competidores的目标:** Amenitiz (insipido en diseño), Mews (caro), Cloudbeds (genérico), RoomRaccoon (básico).

**Auron differentiator:** Diseño premium + Fiscal RD + WhatsApp-native + Offline + Precio $0-300/mo.

---

# 2. GAP ANALYSIS vs COMPETIDORES

## 2.1 PMS Core (Commodity — todo hotel necesita)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Reservation CRUD | ✅ | ✅ | ✅ | ⚠️ Basic | CRÍTICO |
| Room management | ✅ | ✅ | ✅ | ⚠️ Sin IDOR fix | CRÍTICO |
| Guest profiles | ✅ | ✅ | ✅ | ⚠️ Basic | ALTO |
| Rate management | ✅ | ✅ | ✅ | ⚠️ Sin seasons | MEDIO |
| Availability engine | ✅ | ✅ | ✅ | ✅ Works standalone | BAJO |
| Multi-tenant | ✅ | ✅ | ✅ | ❌ Sin aislamiento | CRÍTICO |
| Auth / RBAC | ✅ | ✅ | ✅ | ❌ No-op | CRÍTICO |

## 2.2 Front Desk (Operación diaria — sin esto no hay hotel)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Room grid visual (timeline) | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Arrivals / departures today | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Quick check-in/out | ✅ | ✅ | ✅ | ⚠️ SQL directo | ALTO |
| Walk-in booking | ✅ | ✅ | ✅ | ❌ | ALTO |
| Room assignment drag-drop | ✅ | ✅ | ⚠️ | ❌ | MEDIO |
| Color-coded status | ✅ | ✅ | ✅ | ⚠️ Solo badges | BAJO |

## 2.3 Folio / Billing (Sin esto no hay cobro)

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

## 2.4 Night Audit (Cierre diario obligatorio)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Auto night audit | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Nightly posting | ✅ | ✅ | ✅ | ❌ | CRÍTICO |
| Daily report | ✅ | ✅ | ✅ | ❌ | ALTO |
| Payment reconciliation | ✅ | ✅ | ✅ | ❌ | ALTO |

## 2.5 Housekeeping (Operación diaria)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Task board by floor | ✅ | ✅ | ✅ | ❌ | ALTO |
| Staff assignment | ✅ | ✅ | ✅ | ❌ | ALTO |
| Dirty→Clean→Inspected | ✅ | ✅ | ✅ | ⚠️ State machine sin UI | MEDIO |
| Mobile notifications | ✅ | ✅ | ✅ | ❌ | MEDIO |

## 2.6 Revenue Management (Optimización de pricing)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Seasonal pricing | ✅ | ✅ | ✅ | ❌ | ALTO |
| Dynamic pricing | ⚠️ | ✅ Atomize | ✅ Signals | ❌ | MEDIO |
| Occupancy-based pricing | ✅ | ✅ | ✅ | ❌ | MEDIO |
| Rate shopping | ❌ | ✅ | ❌ | ❌ | BAJO |

## 2.7 Distribution (Ventas)

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Channel manager | ✅ 30+ | ✅ SiteMinder | ✅ 300+ | ❌ | ALTO |
| Booking engine | ✅ | ✅ | ✅ | ❌ | ALTO |
| iCal export | ✅ | ✅ | ✅ | ❌ | MEDIO |
| Rate parity | ✅ | ✅ | ✅ | ❌ | MEDIO |

## 2.8 Guest Experience

| Feature | Amenitiz | Mews | Cloudbeds | Auron Actual | Gap |
|---------|----------|------|-----------|-------------|-----|
| Guest portal | ✅ | ✅ | ✅ | ❌ | ALTO |
| Pre-arrival email | ✅ | ✅ | ✅ | ❌ | MEDIO |
| WhatsApp messaging | ⚠️ Basic | ✅ Native | ⚠️ Partner | ❌ | ALTO |
| Online check-in | ✅ | ✅ | ✅ | ❌ | MEDIO |

## 2.9 What AURON has that NO competitor has

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

---

# 3. RESUMEN DE BRECHAS

| Nivel | Features | Prioridad | Semanas |
|-------|----------|-----------|---------|
| **Nivel 1: Sin esto no es PMS** | Auth, Tenant, Folio, Front Desk, Night Audit, Housekeeping | P0-P1 | 1-16 |
| **Nivel 2: Sin esto no compite** | Revenue, Booking Engine, Channel Manager, Guest Portal, Payments | P1-P2 | 17-34 |
| **Nivel 3: Lo que lo hace ÚNICO** | Fiscal RD, WhatsApp-native, Offline, AI, LATAM intelligence | P2-P3 | 35-52 |

---

# 4. GO BACKEND EXECUTION PLAN (GO-FIRST)

El usuario quiere cubrir TODO el trabajo de Go primero, luego el frontend.

## FASE A — SECURITY FOUNDATION (Weeks 1-4)

### A1. Secret Management
- **Archivo:** `cmd/api/main.go:133-142`, `cmd/migration/main.go`, `scripts/seed.go`
- **Cambio:** Eliminar `dev:dev` hardcoded. Leer `DATABASE_URL`, `JWT_SECRET` de env. Fail-fast si faltan.
- **Depende:** Nada
- **Estimación:** XS

### A2. Docker Security
- **Archivo:** `deploy/docker-compose.yml:10-11`
- **Cambio:** Eliminar publicación de puerto 5432. Usar env vars para credenciales.
- **Depende:** Nada
- **Estimación:** XS

### A3. JWT Authentication
- **Archivos nuevos:** `internal/infrastructure/auth/jwt.go`, `internal/infrastructure/auth/password.go`, `internal/interfaces/http/handlers/auth_handler.go`
- **Archivos modificar:** `internal/interfaces/http/middleware/auth.go`
- **DB:** Migration 008_create_users.sql, 009_create_refresh_tokens.sql
- **API:** POST /auth/login, POST /auth/refresh, POST /auth/logout
- **Depende:** A1
- **Estimación:** M

### A4. Tenant from JWT
- **Archivos modificar:** `internal/interfaces/http/middleware/tenant.go`, `internal/interfaces/http/middleware/auth.go`, todos los handlers
- **Cambio:** Eliminar X-Tenant-ID header. Extraer tenant_id de JWT claims.
- **Depende:** A3
- **Estimación:** S

### A5. RBAC Middleware
- **Archivos nuevos:** `internal/interfaces/http/middleware/rbac.go`
- **Archivos modificar:** `internal/interfaces/http/router.go`
- **Cambio:** Agregar RequireRole a cada ruta. Roles: admin, manager, front_desk, housekeeping, read_only.
- **Depende:** A3
- **Estimación:** S

### A6. IDOR Fix
- **Archivos modificar:** Todos los repos (room_repo, guest_repo, reservation_repo), cancel.go, todos los handlers
- **Cambio:** Agregar tenant_id a queries GET/UPDATE/DELETE. CancelCommand obtiene TenantID.
- **Depende:** A4
- **Estimación:** M

### A7. RLS Policies
- **Archivos nuevos:** `internal/infrastructure/postgres/middleware.go`
- **DB:** Migration 010_create_rls_policies.sql
- **Cambio:** CREATE POLICY en todas las tablas. Cambiar DB user a non-superuser.
- **Depende:** A4
- **Estimación:** M

### A8. Reservation Integrity
- **Archivos modificar:** `internal/application/reservation/create.go`
- **DB:** Migration 011_add_exclusion_constraint.sql (btree_gist + EXCLUDE USING gist)
- **Cambio:** Llamar availability check antes de insertar. Transacción serializable. Exclusion constraint anti-double-booking.
- **Depende:** A7
- **Estimación:** M

### A9. Error Handling + Input Validation
- **Archivos nuevos:** `pkg/httputil/errors.go`
- **Archivos modificar:** Todos los handlers
- **Cambio:** Errores estandarizados {error: {code, message}}. MaxBytesReader. Validación de campos.
- **Depende:** Nada
- **Estimación:** S

### A10. Room Status Validation
- **Archivos modificar:** `internal/interfaces/http/handlers/room_handler.go`, `reservation_handler.go`
- **Cambio:** Validar status contra enum. Verificar RowsAffected en CheckIn/CheckOut.
- **Depende:** Nada
- **Estimación:** S

### A11. Audit Trail
- **Archivos nuevos:** `internal/infrastructure/audit/repository.go`, `internal/interfaces/http/middleware/audit.go`
- **DB:** Migration 012_create_audit_logs.sql
- **Cambio:** Middleware intercepta mutaciones. Append-only. Actor, entity, old/new values.
- **Depende:** A3, A4
- **Estimación:** M

### A12. Observability
- **Archivos nuevos:** `internal/infrastructure/observability/logger.go`, `health.go`, `metrics.go`
- **Cambio:** Structured logging (slog). Health check con DB status. Metrics endpoint.
- **Depende:** Nada
- **Estimación:** M

### A13. Testing Infrastructure
- **Archivos nuevos:** `pkg/testutil/` con helpers para DB, HTTP, events
- **Cambio:** Test fixtures, mock DB, integration test harness.
- **Depende:** Nada
- **Estimación:** M

---

## FASE B — PMS CORE (Weeks 5-10)

### B1. Front Desk Handler
- **Archivos nuevos:** `internal/interfaces/http/handlers/frontdesk_handler.go`
- **API:** GET /frontdesk/today (arrivals, departures, in-house, room statuses)
- **Lógica:** Query combinada: habitaciones + reservas de hoy + status
- **Depende:** Fase A completa
- **Estimación:** L

### B2. Folio Engine
- **Archivos nuevos:** `internal/domain/folio/aggregate.go`, `events.go`, `repository.go`, `internal/infrastructure/postgres/folio_repo.go`, `internal/interfaces/http/handlers/folio_handler.go`
- **DB:** Migration 013_create_folio_entries.sql
- **API:** GET /reservations/{id}/folio, POST /reservations/{id}/folio/entries, POST /reservations/{id}/folio/close
- **Lógica:** Ledger con charges, payments, adjustments. Balance calculation. Close validation (balance must be 0).
- **Event sourcing:** FolioEntryAdded, FolioClosed
- **Depende:** A6 (IDOR fix)
- **Estimación:** L

### B3. Night Audit
- **Archivos nuevos:** `internal/application/nightaudit/audit.go`, `internal/interfaces/http/handlers/nightaudit_handler.go`
- **DB:** Migration 014_create_night_audit_runs.sql
- **API:** POST /night-audit/run, GET /night-audit/history
- **Lógica:** Procesar todas las reservas in-house. Posting de noches. Actualizar fechas. Generar reporte.
- **Depende:** B2 (Folio)
- **Estimación:** L

### B4. Rate Plans + Seasonal Pricing
- **Archivos modificar:** `internal/domain/rate/` (nuevo aggregate), `internal/infrastructure/postgres/rate_repo.go`
- **DB:** Extender tabla rates con season_dates, min_stay, blackout_dates
- **Lógica:** Múltiples rate plans. Overrides estacionales. Cálculo de precio por fecha.
- **Depende:** B2 (Folio)
- **Estimación:** M

### B5. Guest Profile 360
- **Archivos modificar:** `internal/domain/guest/aggregate.go` (extender con preferences, documents)
- **API:** GET /guests/{id}/profile (historial, spend, preferencias)
- **Lógica:** Agregar document_type, nationality, preferences JSON. Total spend from folio.
- **Depende:** A6, B2
- **Estimación:** M

### B6. Housekeeping
- **Archivos nuevos:** `internal/domain/housekeeping/aggregate.go`, `events.go`, `repository.go`, handlers, repos
- **DB:** Migration 015_create_housekeeping_tasks.sql
- **API:** GET /housekeeping/today, POST /housekeeping/tasks, PATCH /housekeeping/tasks/{id}
- **Lógica:** Task lifecycle: pending→assigned→in_progress→completed→inspected. Asignación a staff.
- **Depende:** A3 (Auth), B1 (Front Desk)
- **Estimación:** L

### B7. Payments Module
- **Archivos nuevos:** `internal/domain/payment/aggregate.go`, `events.go`, `repository.go`, handlers, repos
- **DB:** Migration 016_create_payments.sql
- **API:** POST /folios/{id}/payments, GET /folios/{id}/payments
- **Lógica:** Cash, card, transfer. Idempotency key. Apply to folio. Balance update.
- **Depende:** B2 (Folio)
- **Estimación:** L

### B8. Staff Management
- **Archivos nuevos:** `internal/domain/staff/aggregate.go`, handlers, repos
- **DB:** Migration 017_create_staff_profiles.sql
- **Lógica:** Employee CRUD. Role assignment. Shift tracking.
- **Depende:** A3, A5
- **Estimación:** M

### B9. Maintenance Requests
- **Archivos nuevos:** `internal/domain/maintenance/aggregate.go`, handlers, repos
- **DB:** Migration 018_create_maintenance_requests.sql
- **Lógica:** Create→assign→in_progress→resolved. Priority levels.
- **Depende:** A3
- **Estimación:** M

### B10. Reports Module
- **Archivos nuevos:** `internal/interfaces/http/handlers/report_handler.go`
- **API:** GET /reports/occupancy, GET /reports/revenue, GET /reports/guest-stats
- **Lógica:** SQL queries para occupancy, ADR, RevPAR, revenue. Reemplazar Math.random en frontend.
- **Depende:** B2, B3
- **Estimación:** M

---

## FASE C — REVENUE + FISCAL (Weeks 11-16)

### C1. Fiscal RD (DGII/NCF)
- **Archivos nuevos:** `internal/domain/fiscal/`, `internal/infrastructure/dgii/`, handlers
- **DB:** Migration 019_create_fiscal_records.sql
- **Lógica:** NCF sequence management. ITBIS calculation (18%). E-CF generation. DGII XML format.
- **Depende:** B2, B7
- **Estimación:** XL

### C2. Revenue Management (Basic)
- **Archivos nuevos:** `internal/application/revenue/pricing.go`
- **Lógica:** Dynamic pricing based on occupancy, season, day-of-week. Suggestions engine.
- **Depende:** B4, B10
- **Estimación:** XL

---

## FASE D — DISTRIBUTION (Weeks 17-22)

### D1. Booking Engine API
- **Archivos nuevos:** `internal/interfaces/http/handlers/booking_handler.go`, `internal/application/booking/`
- **API:** Public availability, booking flow, confirmation
- **Lógica:** Public API (sin auth). Search→select→book→confirm. Payment integration.
- **Depende:** B1, B4
- **Estimación:** XL

### D2. Channel Manager
- **Archivos nuevos:** `internal/infrastructure/channel/`, sync engine
- **Lógica:** OTA sync (Booking.com, Expedia). iCal export. Webhook notifications.
- **Depende:** D1
- **Estimación:** XL

---

## FASE E — GUEST + WHATSAPP (Weeks 23-28)

### E1. WhatsApp Integration
- **Archivos nuevos:** `internal/infrastructure/whatsapp/`, message templates
- **Lógica:** WhatsApp Business API. Booking confirmations. Pre-arrival messages. Service requests.
- **Depende:** B5
- **Estimación:** L

### E2. Guest Portal API
- **Archivos nuevos:** `internal/interfaces/http/handlers/guestportal_handler.go`
- **Lógica:** Self check-in. Folio view. Service requests. Separate auth (guest token).
- **Depende:** B2, E1
- **Estimación:** L

---

## FASE F — INTELLIGENCE (Weeks 29-36)

### F1. AI Revenue Advisor
### F2. AI Guest Assistant
### F3. Offline/Edge Architecture
### F4. Multi-Property Management

---

# 5. ORDEN DE EJECUCIÓN GO (TODO EL BACKEND)

```
SEMANA 1-2:  A1, A2, A9, A10, A12, A13 (Foundation — quick wins)
SEMANA 3-4:  A3, A4, A5 (Auth + Tenant + RBAC)
SEMANA 5-6:  A6, A7, A8, A11 (Security hardening)
SEMANA 7-8:  B1, B2 (Front Desk + Folio)
SEMANA 9-10: B3, B4, B5 (Night Audit + Rates + Guest Profile)
SEMANA 11-12: B6, B7, B8, B9 (Operations)
SEMANA 13-14: B10, C1 (Reports + Fiscal RD start)
SEMANA 15-16: C1 finish, C2 (Fiscal + Revenue)
SEMANA 17-20: D1 (Booking Engine)
SEMANA 21-24: D2 (Channel Manager)
SEMANA 25-28: E1, E2 (WhatsApp + Guest Portal)
SEMANA 29-36: F1-F4 (Intelligence)
```

**Total Go backend: ~36 semanas**
**Después de esto: Frontend (React/Next.js) para consumir toda la API**

---

# 6. MÉTRICAS DE ÉXITO POR FASE

| Fase | Criterio de salida |
|------|-------------------|
| A | Auth funciona. Tenant A no ve datos de Tenant B. Double-booking bloqueado. |
| B | Hotel puede: crear reserva→check-in→cobrar→check-out→night audit. |
| C | Hotel cumple DGII. Pricing dinámico funciona. |
| D | Guest puede bookear desde web del hotel. Rates sincronizan con OTAs. |
| E | Guest recibe WhatsApp. Self check-in funciona. |
| F | AI sugiere pricing. PMS funciona offline. Multi-property opera. |
