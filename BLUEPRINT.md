# AURON HOSPITALITY — MASTER BLUEPRINT v1.0

---

# 1. EXECUTIVE SUMMARY

Auron Hospitality es un Hospitality Operating System (HOS) en fase MVP temprano, construido sobre una base arquitectónica moderna (Go + Chi + PostgreSQL + Event Sourcing + DDD + Next.js). El sistema tiene 5 domains funcionales (Room, Reservation, Guest, RoomType, Rate), 20 endpoints REST, y 6 páginas de frontend que cubren CRUD básico.

**Evaluación del estado actual:**
- Arquitectura: 7/10 — DDD limpio, event sourcing real en PostgreSQL, composition root bien estructurado
- Seguridad: 1/10 — No hay autenticación, no hay aislamiento multi-tenant real, no hay RBAC
- Funcionalidad: 2/10 — CRUD de 5 entidades sin workflow end-to-end completo
- Frontend: 3/10 — UI competente visualmente, pero con datos hardcoded, sin auth, sin offline
- Testing: 1/10 — 7 archivos de test, 0 tests de concurrencia, 0 tests de tenant isolation
- Market readiness: 0/10 — No competiría contra ningún PMS existente

**La oportunidad estratégica:**

El mercado hotelero LATAM/Caribe está dominado por PMS diseñados para mercados anglosajones y europeos. Mews (€199/property), Cloudbeds ($15/room/mo), y OPERA ($15-30/room/mo) no abordan fiscalidad dominicana (DGII/e-CF/NCF), no funcionan offline en zonas con conectividad limitada, y no entienden la operación hotelera caribeña (estacionalidad, WhatsApp como canal nativo, turismo regional). Auron tiene la oportunidad de construir el primer HOS diseñado específicamente para LATAM con AI nativo, offline-first, y fiscalidad local como diferenciadores reales.

**El camino más inteligente:** No construir 300 funcionalidades. Construir un PMS core sólido y seguro, luego agregar capas de valor incremental: Operations (housekeeping/maintenance), Money (billing/revenue/fiscal), Distribution (booking engine + channel manager), Guest Experience (WhatsApp-native), e Intelligence (analytics + AI). Cada fase debe entregar valor medible al hotelero antes de pasar a la siguiente.

---

# 2. CURRENT STATE

## 2.1 Lo que EXISTE realmente

### Backend (Go 1.24 + Chi v5 + PostgreSQL 16)

**Domain Layer (COMPLETO):**
- Room aggregate: state machine (available→occupied→cleaning→available, any→maintenance), eventos, validación de transiciones
- Reservation aggregate: 5 estados (pending/confirmed/canceled/checked_in/checked_out), Cancel/CheckIn/CheckOut con validación
- Guest aggregate: email regex, UpdateProfile
- RoomType aggregate: name, capacity, basePriceCents

**Application Layer (PARCIAL):**
- CreateReservationHandler: crea reserva pero NO verifica disponibilidad antes de insertar
- CancelReservationHandler: funciona correctamente
- CreateGuestHandler: funciona correctamente
- Availability engine: SQL overlap check existe pero NUNCA se llama durante creación de reserva
- Rate engine: cálculo simple de total = basePrice × nights

**Infrastructure Layer (SÓLIDO):**
- PG Event Store: persiste en PostgreSQL con optimistic concurrency (UNIQUE stream_id+version), auto-provisioning de schema
- Room Repo: CRUD completo con proyección de eventos a tabla rooms
- Guest Repo: CRUD con búsqueda
- Reservation Repo: Save/Load/List pero sin tenant_id en queries de Get
- 7 migraciones SQL aplicadas
- Seed data: tenant "eden-hotel", 3 habitaciones, 2 tipos, 1 tarifa

**HTTP Layer (FUNCIONAL PERO INSEGURO):**
- 20 endpoints en /v1/ con middleware Tenant (header) + Auth (no-op)
- Todos los endpoints de Get/Update individual carecen de tenant_id en WHERE → IDOR

**Empty directories que indican diseño intencional pero no implementado:**
- cmd/projector/ — proyector de eventos nunca escrito
- deploy/docker/ — Dockerfiles inexistentes
- internal/infrastructure/auth/ — auth infrastructure vacía
- internal/shared/observability/ — observability vacía
- internal/shared/tenant/ — tenant helpers vacíos
- web/components/ — componentes React vacíos

### Frontend (Next.js 16 + React 19 + Tailwind v4)

6 páginas, ~880 líneas totales:
- Dashboard: 4 stat cards reales + occupancy Math.random() + system status hardcoded
- Rooms: CRUD funcional, filtros, cambio de estado con badges
- Reservations: Create/List funcional pero UUID manual, IDs crudos como UI text
- Availability: La mejor página — búsqueda por fechas, loading state, error handling
- Guests: Create/List con búsqueda debounced 300ms
- Settings: Tipos de habitación y tarifas CRUD

Dead code: getReservation, getRoom, getGuest — definidos en api.js, nunca importados

### Bugs críticos activos

1. Tenant mismatch: Frontend envía "eden-hotel", seed inserta "eden-samana" → datos invisibles
2. No anti-double-booking: IsRoomAvailable() existe pero nunca se llama en creación
3. IDOR: Todos los GET/Update por ID no verifican tenant
4. crypto.randomUUID() rompe en HTTP plano (LAN IP, sin HTTPS)
5. RowsAffected no verificado en CheckIn/CheckOut/UpdateRoomStatus
6. Dashboard occupancy = Math.random() en cada re-render
7. Filter pill counts incorrectos cuando hay filtro activo

### Seguridad

| Capability | Estado |
|------------|--------|
| Authentication | NO EXISTE |
| Authorization | NO EXISTE |
| RBAC | NO EXISTE |
| Tenant isolation | HEADER-BASED THEATER |
| RLS | Habilitado pero sin policies, bypass por superuser |
| Rate limiting | NO EXISTE |
| CORS / CSRF / CSP | NO EXISTE |
| SQL injection | PROTEGIDO (pgx parameterized queries) |
| Secret management | Credenciales hardcoded en 3 archivos |
| Audit logging | NO EXISTE |

---

# 3. PRODUCT NORTH STAR

## 3.1 Product Vision

Auron Hospitality es el primer Hospitality Operating System diseñado para LATAM: un sistema que conecta property operations, reservations, revenue, distribution, guest experience, POS, y finance en una sola plataforma cloud-native con AI nativo, offline-first, y fiscalidad dominicana integrada.

## 3.2 Product Mission

Resolver el problema fundamental del hotelero LATAM: operar con 8-10 sistemas desconectados que no hablan entre sí, no entienden la fiscalidad local, no funcionan sin internet, y cuestan más de lo que aportan. Auron reemplaza esa fragmentación con un sistema unificado que el hotelero puede entender, configurar, y confiar.

## 3.3 Ideal Customer Profile

**Fase 1 (Target inicial):**
- Hotel boutique independiente, 15-80 habitaciones
- En República Dominicana o Caribe hispano
- Operado por owner-GM o equipo de 3-8 personas
- Revenue $50K-$500K/año
- Actualmente en Excel, cloudbeds básico, o PMS legacy
- Necesita: PMS + channel manager + booking engine + fiscalidad RD

**Fase 2:** Resorts pequeños/medianos (80-200 habitaciones), aparthotels, eco-lodges, multi-property (2-5 propiedades)

**NO target inicial:** Hoteles de cadena (OPERA dominado), hostels, grandes resorts 500+

## 3.4 Positioning

| Competidor | Fortaleza | Debilidad que Auron resuelve |
|------------|-----------|---------------------------|
| OPERA Cloud | Enterprise depth, 40K+ propiedades | $15-30/room/mo, 3-6 meses implementación, no entiende RD |
| Mews | API-first, modern UX, 15K propiedades | €199/property+, no offline, no fiscalidad LATAM |
| Cloudbeds | All-in-one accesible, 27K clientes | $15/room/mo, basic revenue, no WhatsApp-native |
| RoomRaccoon | Simple, all-in-one | Limitado en features, no LATAM-focused |
| Amenitiz | SMB-friendly | Europe-centric, no fiscalidad |

**Posicionamiento:** "No somos otro PMS. Somos el sistema operativo que un hotel caribeño necesita: PMS + facturación fiscal + WhatsApp como canal operativo + offline real + AI que explica qué pasó y qué hacer — todo por una fracción del costo."

---

# 4. PRODUCT ARCHITECTURE

## 4.1 Architectural Principles

1. Event-Driven Core: Todo flujo de negocio genera eventos. El event store es la fuente de verdad.
2. Domain-Driven Design: Bounded contexts con aggregates, value objects, domain events.
3. Multi-Tenant by Design: tenant_id en cada query, cada evento, cada cache key.
4. Offline-First: Operaciones críticas funcionan sin internet. Sync eventual.
5. API-First: Todo accesible vía REST + WebSocket.
6. Modular Monolith → Microservices: Empezar como modular monolith, evolucionar cuando la escala lo requiera.

## 4.2 Technology Stack

```
┌─────────────────────────────────────────────────┐
│                    CLIENTS                       │
│  Next.js (Web)  │  PWA (Offline)  │  Mobile    │
└────────┬────────┴────────┬────────┴─────┬───────┘
         │                 │              │
    ┌────▼─────────────────▼──────────────▼────┐
    │              API GATEWAY                  │
    │  Chi Router + Middleware Stack            │
    │  Auth │ Tenant │ Rate Limit │ Audit       │
    └────────────────┬─────────────────────────┘
                     │
    ┌────────────────▼─────────────────────────┐
    │           BOUNDED CONTEXTS                │
    │  Identity │ Property │ Reservation │ ...  │
    └────────────────┬─────────────────────────┘
                     │
    ┌────────────────▼─────────────────────────┐
    │         EVENT STORE + NATS                │
    │  PostgreSQL Event Store (write)           │
    │  NATS JetStream (distribution + async)    │
    └────────────────┬─────────────────────────┘
                     │
    ┌────────────────▼─────────────────────────┐
    │           POSTGRESQL 17                   │
    │  Read Models │ Projections │ RLS          │
    └──────────────────────────────────────────┘
```

---

# 5. DOMAIN MODEL

## 5.1 Core Entities

```
Property (aggregate root)
├── Building (entity)
├── Floor (entity)
├── Room (aggregate)
│   ├── RoomType (reference)
│   ├── RoomStatus (enum)
│   └── RoomAttributes (value object)
├── RatePlan (aggregate)
│   ├── SeasonCalendar (entity)
│   └── RateRules (value object: min_stay, cta, ctd, blackout)
└── Inventory (aggregate — room nights)

Guest (aggregate root)
├── GuestProfile (value object)
├── GuestPreferences (value object)
├── GuestHistory (read model)
└── GuestLifetimeValue (computed)

Reservation (aggregate root)
├── ReservationLine (entity)
├── Deposit (value object)
├── CancellationPolicy (reference)
└── ModificationLog (entity)

Folio (aggregate root)
├── FolioLine (entity — charge or payment)
├── TaxCalculation (value object)
└── FolioSummary (read model)

Payment (aggregate root)
├── PaymentMethod (enum)
└── PaymentReference (value object)

HousekeepingTask (aggregate root)
├── Assignment (value object)
└── Inspection (entity)

MaintenanceTicket (aggregate root)
├── SparePart (entity)
└── SLA (value object)

GuestRequest (aggregate root)

ChannelReservation (entity)
├── ChannelMapping (value object)
└── ConflictResolution (value object)
```

## 5.2 Value Objects

```
Money { Amount int64, Currency string }
DateRange { Start, End time.Time }
Address { Street, City, State, Country, Zip string }
ContactInfo { Email, Phone, WhatsApp string }
TenantID string
PropertyID string
```

## 5.3 Aggregates vs Entities vs Value Objects

| Concepto | Tipo | Rationale |
|----------|------|-----------|
| Property | Aggregate root | Own unit of consistency, own events |
| Room | Aggregate | State machine, own lifecycle |
| RoomType | Value Object within Property | Referenced, no complex lifecycle |
| RatePlan | Aggregate | Pricing rules, seasons, restrictions |
| Guest | Aggregate root | Profile own identity, cross-stay history |
| Reservation | Aggregate root | Lifecycle propio, references other aggregates |
| Folio | Aggregate root | Financial consistency critical |
| Payment | Aggregate root | Financial transaction integrity |
| HousekeepingTask | Aggregate | Assignable, trackable independently |
| MaintenanceTicket | Aggregate | Independent lifecycle |
| GuestRequest | Aggregate | Cross-cutting — links to room, guest, staff |

---

# 6. BOUNDED CONTEXTS

## 6.1 Identity

**Responsabilidad:** Authentication, authorization, sessions, RBAC.

| Aspecto | Definición |
|---------|------------|
| Entities | User, Role, Permission, Session, Token |
| Aggregates | User (root) |
| Events | UserCreated, UserAuthenticated, RoleAssigned, PermissionChanged |
| Commands | RegisterUser, AuthenticateUser, AssignRole, RevokeAccess |
| Queries | GetUser, ListUsers, CheckPermission |
| Data ownership | users, roles, user_roles, role_permissions, sessions |

## 6.2 Tenant

**Responsabilidad:** Multi-tenancy isolation. Every request resolves to a tenant.

| Aspecto | Definición |
|---------|------------|
| Entities | Tenant, TenantSettings |
| Aggregates | Tenant (root) |
| Events | TenantCreated, TenantConfigured, TenantSuspended |
| Data ownership | tenants, tenant_settings |

## 6.3 Property

**Responsabilidad:** Physical property configuration. Buildings, floors, rooms, room types.

| Aspecto | Definición |
|---------|------------|
| Entities | Property, Building, Floor, Room, RoomType, Amenity |
| Aggregates | Property (root), Room (root) |
| Events | PropertyConfigured, RoomCreated, RoomStatusChanged, RoomTypeAdded |
| Data ownership | properties, buildings, floors, rooms, room_types |

## 6.4 Reservations

**Responsabilidad:** Booking lifecycle. Creation, modification, cancellation, availability, room assignment.

| Aspecto | Definición |
|---------|------------|
| Entities | Reservation, ReservationLine, RoomAssignment |
| Aggregates | Reservation (root) |
| Events | ReservationCreated, ReservationModified, ReservationCanceled, ReservationCheckedIn, ReservationCheckedOut, ReservationNoShow |
| Commands | CreateReservation, ModifyReservation, CancelReservation, AssignRoom, CheckIn, CheckOut, MarkNoShow |
| Queries | GetReservation, ListReservations, CheckAvailability |
| Data ownership | reservations, reservation_lines |

## 6.5 Front Desk

**Responsabilidad:** Operational hub. Arrivals, departures, walk-ins, room status overview, night audit.

| Aspecto | Definición |
|---------|------------|
| Entities | FrontDeskBoard, ArrivalList, DepartureList, RoomGrid |
| Aggregates | None (read-heavy, orchestrates) |
| Events | NightAuditCompleted, DailyReportGenerated |
| Commands | RunNightAudit, ProcessArrival, ProcessDeparture |
| Queries | GetArrivals, GetDepartures, GetRoomGrid, GetInHouse |
| Data ownership | front_desk_logs, night_audit_snapshots |

## 6.6 Billing / Folio

**Responsabilidad:** Financial ledger per guest/stay.

| Aspecto | Definición |
|---------|------------|
| Entities | Folio, FolioLine, TaxLine, PaymentLine, Deposit |
| Aggregates | Folio (root) |
| Events | FolioCreated, FolioChargePosted, FolioPaymentPosted, FolioClosed, DepositReceived, RefundIssued |
| Commands | CreateFolio, PostCharge, PostPayment, PostDeposit, IssueRefund, CloseFolio, SplitFolio |
| Queries | GetFolio, GetFolioSummary, GetOutstandingBalance |
| Data ownership | folios, folio_lines |

## 6.7 Payments

| Aspecto | Definición |
|---------|------------|
| Aggregates | Payment (root) |
| Events | PaymentInitiated, PaymentCaptured, PaymentFailed, PaymentRefunded, PaymentVoided |
| Data ownership | payments, refunds |

## 6.8 Housekeeping

| Aspecto | Definición |
|---------|------------|
| Entities | HousekeepingTask, Assignment, Inspection, CleaningLog |
| Aggregates | HousekeepingTask (root) |
| Events | TaskCreated, TaskAssigned, TaskStarted, TaskCompleted, TaskVerified, TaskOverdue |
| Data ownership | housekeeping_tasks, housekeeping_assignments, housekeeping_logs |

## 6.9 Maintenance

| Aspecto | Definición |
|---------|------------|
| Entities | Asset, WorkOrder, MaintenanceSchedule, SparePart |
| Aggregates | WorkOrder (root), Asset (root) |
| Events | WorkOrderCreated, WorkOrderAssigned, WorkOrderCompleted, MaintenanceDue |
| Data ownership | assets, work_orders, maintenance_schedules |

## 6.10 Revenue

| Aspecto | Definición |
|---------|------------|
| Entities | PricingRule, Season, DemandForecast, CompetitorRate, PickupData |
| Aggregates | PricingStrategy (root per property) |
| Events | RateRecommendationGenerated, DemandForecastUpdated, PricingRuleChanged |
| Data ownership | pricing_rules, seasons, forecasts, pickup_data |

## 6.11 Distribution

| Aspecto | Definición |
|---------|------------|
| Entities | Channel, ChannelMapping, SyncLog, ChannelReservation |
| Aggregates | Channel (root per property) |
| Events | ChannelConnected, RatesPushed, AvailabilityPushed, ChannelReservationReceived, SyncFailed |
| Data ownership | channels, channel_mappings, sync_logs, channel_reservations |

## 6.12 Guest Experience

| Aspecto | Definición |
|---------|------------|
| Entities | GuestPortal, GuestRequest, Review, LoyaltyAccount |
| Aggregates | GuestRequest (root), LoyaltyAccount (root) |
| Events | GuestRequestCreated, GuestRequestCompleted, ReviewSubmitted, LoyaltyPointsEarned |
| Data ownership | guest_requests, reviews, loyalty_accounts |

## 6.13 Communications

| Aspecto | Definición |
|---------|------------|
| Entities | Message, Template, DeliveryLog |
| Aggregates | Message (root) |
| Events | MessageQueued, MessageSent, MessageDelivered, MessageFailed |
| Data ownership | messages, templates, delivery_logs |

## 6.14 POS / F&B

| Aspecto | Definición |
|---------|------------|
| Entities | POSOrder, POSItem, POSModifier, POSPayment |
| Aggregates | POSOrder (root) |
| Events | OrderCreated, OrderSent, OrderCompleted, PaymentReceived |
| Data ownership | pos_orders, pos_items, pos_payments |

## 6.15 Fiscal RD

| Aspecto | Definición |
|---------|------------|
| Entities | NCFSequence, ECFDocument, TaxLine, ITBISReport |
| Aggregates | NCFSequence (root), ECFDocument (root) |
| Events | NCFGenerated, ECFSubmitted, ECFRejected, NCFSequenceExhausted |
| Data ownership | ncf_sequences, ecf_documents, fiscal_lines, fiscal_returns |

Reglas: NCF secuencial sin gaps, e-CF XML DGII, ITBIS 18%, Propina 10%, Total = subtotal + ITBIS + Propina.

## 6.16 Analytics / BI

| Aspecto | Definición |
|---------|------------|
| Aggregates | None (read-only projections) |
| Events | ReportGenerated, AlertTriggered |
| Data ownership | analytics_snapshots, kpi_values, report_cache |

Analytics NO escribe datos de negocio. Solo lee proyecciones.

## 6.17 AI

| Aspecto | Definición |
|---------|------------|
| Entities | AIRecommendation, AIInsight, AIConversation |
| Aggregates | AIAdvisor (root per property) |
| Events | RecommendationGenerated, InsightSurfaced |
| Data ownership | ai_recommendations, ai_insights, ai_conversations |

AI recomienda, humano decide. Cada recomendación tiene confidence score y explicación.

## 6.18 Platform

| Aspecto | Definición |
|---------|------------|
| Entities | APIKey, Webhook, AuditLog, OfflineSyncLog |
| Aggregates | Webhook (root — retry + DLQ) |
| Events | APIKeyCreated, WebhookFired, AuditLogCreated, SyncCompleted |
| Data ownership | api_keys, webhooks, audit_logs, offline_sync_logs |

## 6.19 Regional Calendar

| Aspecto | Definición |
|---------|------------|
| Entities | RegionalCalendar, DestinationEvent, Holiday |
| Events | HolidayAdded, EventAdded, DemandSignalReceived |
| Data ownership | regional_calendars, destination_events, holidays |

Configurable por propiedad. NO hardcodear RD en el core.

---

# 7. EVENT ARCHITECTURE

## 7.1 Event Store — Current State

El event store actual (pg_store.go) es funcional:
- Persiste eventos en tabla events (id, stream_id, event_type, data JSONB, version)
- Optimistic concurrency: UNIQUE(stream_id, version)
- Auto-provisioning de schema

**Problemas actuales:**
- Sin correlation ID ni causation ID
- Sin event versioning
- Sin TTL ni archiving
- Sin proyecciones persistentes (projector binary = directorio vacío)
- Sin replay de eventos

## 7.2 Event Design — Target

```json
{
  "id": "uuid-v4",
  "type": "ReservationCreated",
  "stream_id": "reservation-abc123",
  "version": 1,
  "data": { },
  "metadata": {
    "tenant_id": "t-abc",
    "property_id": "p-xyz",
    "user_id": "u-123",
    "correlation_id": "req-uuid",
    "causation_id": "event-uuid-que-causo-esto",
    "timestamp": "2026-08-22T10:30:00Z",
    "source": "reservation-context"
  }
}
```

## 7.3 NATS JetStream Architecture

```
Streams:
├── DOMAIN_EVENTS.{tenant_id}
├── INTEGRATION_EVENTS.{tenant_id}
├── SYSTEM_EVENTS
└── DEAD_LETTER.DLQ.{context}.{tenant_id}

Consumers:
├── housekeeping-consumer (RoomStatusChanged → checkout task)
├── billing-consumer (ReservationCheckedIn → create folio)
├── analytics-consumer (all → materialized views)
├── notifications-consumer (all → push/email/whatsapp)
├── fiscal-consumer (FolioClosed → generate NCF)
├── sync-consumer (offline events → reconcile)
└── ai-consumer (all → ML pipeline)
```

## 7.4 Event Versioning

- Upcasters: cada evento tiene version numérica
- Breaking changes: nueva versión del tipo (ReservationCreatedV2)
- Migration: re-play V1 con upcaster a V2

## 7.5 Correlation and Causation

- correlation_id: Se asigna al inicio de cada request HTTP. Se propaga a todos los eventos.
- causation_id: ID del evento que causó el evento actual.
- Permiten trace completo end-to-end.

---

# 8. SECURITY ARCHITECTURE

## 8.1 Current Vulnerabilities

| # | Vulnerability | Severity | File |
|---|--------------|----------|------|
| 1 | No authentication | CRITICAL | middleware/auth.go — no-op |
| 2 | No tenant isolation real | CRITICAL | middleware/tenant.go — cliente controla |
| 3 | IDOR en endpoints | CRITICAL | handlers/*.go — sin WHERE tenant_id |
| 4 | CancelReservation sin tenant | CRITICAL | cancel.go — solo ReservationID |
| 5 | RLS sin policies | HIGH | migrations — sin CREATE POLICY |
| 6 | Credenciales hardcoded | HIGH | main.go, seed.go, dev.sh |
| 7 | Puerto DB publicado | HIGH | docker-compose.yml — 5432:5432 |
| 8 | Sin rate limiting | MEDIUM | — |
| 9 | Sin CORS/CSP | MEDIUM | — |
| 10 | Errores raw al cliente | MEDIUM | handlers/*.go — err.Error() |
| 11 | Sin MaxBytesReader | MEDIUM | handlers/*.go |
| 12 | Sin pagination | MEDIUM | handlers/*.go |

## 8.2 Authentication — Target State

**JWT Flow:**
1. Login: POST /auth/login → access_token (15min) + refresh_token (7d)
2. Refresh: POST /auth/refresh → new access_token
3. Logout: POST /auth/logout → invalida refresh_token
4. Cada request: Authorization: Bearer {access_token}
5. Claims: { sub: user_id, tenant_id, property_id, roles: [...], exp, iat }

**Library:** golang-jwt/jwt/v5
**Secret:** From env JWT_SECRET — no fallback, fail-fast
**Algorithm:** HS256

## 8.3 RBAC

| Role | Permissions |
|------|-------------|
| Admin | all |
| Front Desk | reservation.*, front_desk.*, guest.*, room.view, billing.post_*, housekeeping.view |
| Manager | reservation.*, front_desk.*, revenue.*, billing.*, housekeeping.*, reports.* |
| Housekeeper | housekeeping.complete_task, room.view |
| Maintenance | maintenance.*, room.view |
| Accountant | billing.*, fiscal.*, reports.finance |
| Read Only | *.view |

## 8.4 Tenant Isolation — Non-Negotiable

**Regla: TenantID NUNCA viene del cliente. Siempre del JWT verificado.**

```
Request → Auth Middleware (verifica JWT, extrae tenant_id)
        → Context con tenant_id verificado
        → Repository (usa tenant_id de context)
        → PostgreSQL (RLS policy filtra)
```

Capas de aislamiento:

| Layer | Mechanism |
|-------|-----------|
| HTTP | Auth middleware extrae tenant de JWT |
| Application | Repository recibe tenant_id de context |
| Database | RLS WHERE tenant_id = current_setting('app.tenant_id') |
| Cache | Redis keys namespaced: {tenant_id}:room:{id} |
| Events | Metadata incluye tenant_id |
| Files | Storage: {tenant_id}/uploads/ |

**Dual isolation:** App-level (WHERE) + DB-level (RLS). Si una falla, la otra atrapa.

## 8.5 Rate Limiting

- Auth endpoints: 5 req/min per IP
- Read endpoints: 100 req/min per user
- Write endpoints: 30 req/min per user
- Admin endpoints: 10 req/min per user

## 8.6 Input Validation

- http.MaxBytesReader (1MB limit)
- Dates validated (format + range)
- Numeric inputs validated (range + non-negative)
- Room status transitions validated against state machine
- Email RFC 5322 regex
- Phone E.164 format

## 8.7 Secrets Management

- JWT_SECRET, DATABASE_URL, REDIS_URL, NATS_URL, ENCRYPTION_KEY: env vars, required
- No secrets in code, config, or Docker Compose
- .env for local dev only, excluded from git

## 8.8 Security Gate

Ninguna capability se considera COMPLETE si viola:
1. Autenticación JWT real
2. TenantID de JWT, nunca del cliente
3. RLS con policies activas
4. RBAC con permisos verificados
5. Rate limiting
6. Input validation
7. Audit logging
8. Secrets en env vars

---

# 9. MULTI-TENANT ARCHITECTURE

## 9.1 Tenant Model

```
Tenant
├── id: TEXT PK
├── name: VARCHAR(255)
├── slug: VARCHAR(100) UNIQUE
├── rnc: VARCHAR(20)
├── timezone: VARCHAR(50)
├── currency: VARCHAR(3)
├── locale: VARCHAR(10)
├── settings: JSONB
├── status: ENUM (active, suspended, trial)
├── plan: ENUM (free, starter, pro, enterprise)
```

## 9.2 Property Model (multi-property)

```
Tenant
├── Property A → Building 1 → Floor 1 → Room 101, 102
│                        → Floor 2 → Room 201
│             → Building 2
└── Property B
```

Un tenant puede tener múltiples properties. JWT contiene property_id para el contexto operativo.

## 9.3 Database — RLS

```sql
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON rooms
  USING (tenant_id = current_setting('app.tenant_id')::text);
```

Cada transacción: `SET LOCAL app.tenant_id = 't-abc123';`

## 9.4 Cache Isolation

Redis keys: `{tenant_id}:{context}:{id}` — nunca sin tenant.

## 9.5 Event Isolation

NATS streams namespaced: `DOMAIN_EVENTS.{tenant_id}`

---

# 10. PMS BLUEPRINT

## 10.1 Room Management

| State | Allowed Transitions |
|-------|-------------------|
| available | → occupied, → maintenance, → ooo |
| occupied | → cleaning, → maintenance, → ooo |
| cleaning | → available, → maintenance, → ooo |
| maintenance | → available, → ooo |
| ooo | → available |

Rules: Room number unique per property. State machine enforced. room_type must exist.

## 10.2 Rate Management

RatePlan types: BAR, corporate, group, package, loyalty, employee, wholesale.
- Only one BAR per room type
- Seasons can overlap (priority system)
- Restrictions: min_stay, max_stay, CTA, CTD, blackout

## 10.3 Inventory — Room Nights

States: available, blocked, sold.
- Each room night sold once only
- Channel holds create temporary blocks with TTL
- Overbooking: configurable percentage per property

## 10.4 Availability Engine — CORRECTED

**Current:** IsRoomAvailable() never called during reservation creation.

**Target Flow:**
```
1. Validate input
2. Check availability (SELECT ... FOR UPDATE on room_nights)
3. Create reservation aggregate
4. Create folio
5. Persist reservation + inventory in SAME transaction
6. Emit events
```

**Concurrency:** PostgreSQL row-level lock. Second simultaneous request waits, then fails.

**Protection:** Unique exclusion constraint:
```sql
CREATE UNIQUE INDEX idx_reservation_no_overlap
ON reservations (room_id, check_in, check_out)
WHERE status IN ('confirmed', 'checked_in');
```

---

# 11. FRONT DESK BLUEPRINT

## 11.1 Front Desk Board

### Arrivals
Guest name | Room | Type | Check-in time | Status | Actions (Check-in, Assign, View Folio)

### Departures
Guest name | Room | Check-out time | Folio balance | Status | Actions (Check-out, View Folio, Extend)

### In-House Grid
Room | Guest | Housekeeping Status | Folio Balance | Actions (Room move, View Folio, Request)

## 11.2 Walk-In Flow

```
1. Guest arrives without reservation
2. Check availability (live)
3. Select room type → show rate
4. Create/find guest profile
5. Create reservation (confirmed)
6. Immediately check-in
7. Create folio
8. Assign room
9. Room status → occupied
10. Notify housekeeping
```

## 11.3 Room Assignment Rules

Room must be available. Type must match. Floor preferences. VIP rooms. Accessibility. Avoid noisy areas.

## 11.4 Night Audit

1. Close open folios for checkout guests
2. Post room charges (rate + taxes)
3. Generate daily revenue report
4. Snapshot occupancy, ADR, RevPAR
5. Process no-shows
6. Update inventory for next day
7. Generate fiscal summary (ITBIS)
8. Audit trail event

---

# 12. FOLIO / BILLING BLUEPRINT

## 12.1 Folio Model

```
Folio (aggregate root)
├── id, tenant_id, property_id, reservation_id, guest_id
├── status: open | closed | voided
├── currency: DOP default
│
├── FolioLines[]
│   ├── type: charge | payment | adjustment | tax | discount | tip | refund
│   ├── category: room | restaurant | bar | spa | minibar | laundry | transport | misc
│   ├── amount_cents (positive=charge, negative=credit)
│   ├── tax_amount_cents, tax_rate
│   ├── reference_id (links to POS order, spa booking, etc.)
│   └── posted_by, posted_at, voided
│
└── Payments[]
    ├── method: cash | card | transfer | deposit | comp | ota_virtual_card
    ├── amount_cents, reference
    └── captured, voided, captured_at
```

## 12.2 Folio Operations

| Operation | Rules |
|-----------|-------|
| Post Charge | Open folio only; amount > 0; category + description required |
| Post Payment | Open folio only; amount > 0; method required |
| Post Deposit | Held until checkout |
| Issue Refund | Closed folio; reference to original payment; amount <= original |
| Void Line | Can void charges (not payments); generates reversal entry |
| Close Folio | Balance must be 0; creates FolioClosed event; triggers NCF |
| Split Folio | Move lines to new folio; both folios must balance after split |
| Transfer Charge | Move line between folios; both folios updated |

## 12.3 Tax Calculation (RD)

```
Subtotal = sum(charge lines)
ITBIS = Subtotal × 0.18 (on taxable items)
Propina = Subtotal × 0.10
Total = Subtotal + ITBIS + Propina - discounts + tips
```

ITBIS y Propina NO se cobran sobre sí mismos. Son sobre subtotal base.

## 12.4 Daily Reconciliation

Night audit genera:
- Total charges by category
- Total payments by method
- Outstanding balance summary
- Tax collected (ITBIS)
- Reconciliation variance = 0 expected

---

# 13. HOUSEKEEPING BLUEPRINT

## 13.1 Room Status Model

```
Vacant Clean ← Inspector approves
Vacant Dirty ← Guest checks out
Occupied ← Guest is in room
On-Change ← Guest requested extra cleaning
Out of Order ← Maintenance issue
Out of Service ← Temporary (short-term)
```

## 13.2 Task Lifecycle

```
1. Checkout → RoomStatusChanged(occupied→cleaning) → TaskCreated(checkout_clean)
2. Supervisor assigns → TaskAssigned
3. Housekeeper starts → TaskStarted
4. Housekeeper completes → TaskCompleted
5. Inspector verifies → TaskVerified → RoomStatusChanged(cleaning→available)
```

## 13.3 Cleaning Board

| Column | Data |
|--------|------|
| Room | Number + floor |
| Status | Dirty / In Progress / Clean / Inspected |
| Priority | checkout (high) / stayover (normal) / deep_clean (low) |
| Assigned to | Staff name |
| Started at | Timestamp |
| Duration | Calculated |
| SLA target | Based on priority (checkout: 30min, stayover: 60min) |

## 13.4 Automation Triggers

- Guest checkout → auto-create checkout cleaning task
- Guest request (towel) → auto-create stayover task
- Maintenance completed → auto-create inspection task
- Deep clean scheduled → auto-create weekly task
- Task overdue > 30min → notify supervisor

## 13.5 Productivity Metrics

- Average cleaning time per room type
- Rooms cleaned per staff per shift
- SLA compliance rate
- Inspection pass rate
- Turnaround time (checkout → available)

## 13.6 Lost & Found

| Entity | Fields |
|--------|--------|
| LostItem | id, room_id, guest_id, description, location_found, date_found, status (found→claimed→disposed→donated), photo, storage_location |

---

# 14. MAINTENANCE BLUEPRINT

## 14.1 Asset Management

| Entity | Fields |
|--------|--------|
| Asset | id, name, type, location, room_id (nullable), purchase_date, warranty_expiry, expected_lifespan, status (active, maintenance, decommissioned) |

Types: HVAC, plumbing, electrical, furniture, appliance, fire_safety, elevator, generator.

## 14.2 Work Order Lifecycle

```
1. Request created (from staff, guest, preventive schedule, or AI prediction)
2. Priority assigned (critical/high/medium/low)
3. Technician assigned
4. Work started
5. Work completed
6. Parts used logged
7. Cost logged
8. Supervisor verifies (optional)
9. Work order closed
```

## 14.3 Preventive Maintenance

- Schedule per asset type (HVAC: quarterly, plumbing: semi-annual, etc.)
- Auto-generate work orders on schedule
- Track completion rate
- Alert on overdue preventive maintenance

## 14.4 SLA

| Priority | Response Time | Resolution Time |
|----------|--------------|----------------|
| Critical (safety) | 15 min | 2 hours |
| High (guest impact) | 30 min | 4 hours |
| Medium | 2 hours | 24 hours |
| Low | 8 hours | 72 hours |

## 14.5 Predictive Maintenance (AI)

- Track failure patterns per asset
- Predict failures based on age, usage, maintenance history
- Recommend replacement timing
- Generate proactive work orders

---

# 15. REVENUE BLUEPRINT

## Level 1: Reporting (Basic)

What exists: Occupancy %, room revenue, number of bookings.

| KPI | Formula |
|-----|---------|
| Occupancy % | Rooms Sold / Rooms Available |
| ADR | Room Revenue / Rooms Sold |
| RevPAR | Room Revenue / Rooms Available |
| TRevPAR | Total Revenue / Rooms Available |
| GOPPAR | GOP / Rooms Available |
| Booking Pace | Bookings this period vs same period last year |

Data needed: Historical reservations, room inventory, revenue.

## Level 2: Rules-Based Pricing

- Seasonal rate adjustments (high/low/peak)
- Day-of-week pricing (weekday vs weekend)
- Length-of-stay discounts
- Early-bird discounts
- Last-minute deals

Data needed: Seasons, booking patterns, historical demand.

## Level 3: Dynamic Pricing

- Occupancy-based rate adjustments
- Competitor rate monitoring
- Automated rate pushes to channels
- Rate parity management
- Minimum/maximum rate floors and ceilings

Data needed: Real-time occupancy, competitor rates, channel performance.

## Level 4: Forecasting

- Demand prediction (30, 60, 90 days)
- Booking curve analysis
- Event-based demand spikes
- Cancellation prediction
- Revenue forecast by segment

Data needed: 2+ years historical data, event calendar, booking pace.

## Level 5: Revenue Intelligence

- Anomaly detection (RevPAR drop, occupancy spike)
- Explanation ("RevPAR dropped 15% because competitor X lowered rates 20% and occupancy fell to 55%")
- Recommendation ("Increase weekend rates 12% based on upcoming event + current pace")
- Channel profitability analysis
- Guest lifetime value optimization

Data needed: Full historical data, competitor data, market events, guest behavior.

## Level 6: AI Revenue Advisor

- Conversational revenue queries ("What rate should I set for next Saturday?")
- Natural language reports ("Show me RevPAR by source market for August")
- Predictive scenario modeling ("What if I close to OTAs for 3 days?")
- Automated rate optimization with human override

Data needed: All Levels 1-5 + LLM integration.

---

# 16. CARIBBEAN REVENUE INTELLIGENCE

## 16.1 Regional Calendar

```
RegionalCalendar
├── Holidays (national, religious, school)
│   ├── Semana Santa
│   ├── Carnaval
│   ├── Día de la Independencia
│   ├── Navidad / Año Nuevo
│   └── (configurable por país)
├── Events (destination-specific)
│   ├── Festivales locales
│   ├── Conferencias
│   ├── Deportes
│   ├── Conciertos
│   └── (configurable por propiedad)
└── Season Patterns
    ├── Alta (Dec-Apr: European/American winter escape)
    ├── Media (May, Jun, Nov)
    └── Baja (Jul-Oct: hurricane season)
```

## 16.2 Demand Signals

- Weather forecast (rain reduces walk-ins)
- Flight search volume to destination
- Local event calendars
- Competitor pricing movements
- Booking pace vs forecast
- Cancellation rate changes
- Review sentiment shifts

## 16.3 Local Pricing Rules (configurable)

```json
{
  "name": "Semana Santa Premium",
  "dates": { "type": "variable", "offset": "easter", "days_before": 3, "days_after": 4 },
  "adjustment": { "type": "percentage", "value": 35 },
  "min_stay": 3,
  "applicable_room_types": ["all"],
  "priority": 10
}
```

**Regra fundamental:** Configurable por propiedad. El core no hardcodea eventos. La propiedad configura su calendario regional y reglas de pricing.

---

# 17. CHANNEL MANAGER BLUEPRINT

## 17.1 Supported Channels (phased)

| Phase | Channels | Integration Type |
|-------|----------|-----------------|
| 1 | Booking.com, Expedia | OTA API (direct) |
| 2 | Airbnb, Agoda | OTA API (direct) |
| 3 | VRBO, Google Hotel | OTA API + Metasearch |
| 4 | GDS (Amadeus, Sabre) | GDS gateway |

## 17.2 Architecture

```
Channel Manager
├── Channel Adapters (one per OTA)
│   ├── Mapping Engine (room types, rate plans)
│   ├── Rate Pusher (bulk rate updates)
│   ├── Availability Pusher (inventory updates)
│   ├── Reservation Importer (new bookings from OTA)
│   ├── Modification Handler (OTA modifications)
│   └── Cancellation Handler (OTA cancellations)
├── Sync Engine
│   ├── Rate Sync (batch, every 5 min or on-demand)
│   ├── Availability Sync (real-time or near-real-time)
│   └── Reservation Sync (real-time)
├── Conflict Resolution
│   ├── Overbooking detection
│   ├── Double-booking resolution (first-write-wins)
│   └── Manual override queue
└── Monitoring
    ├── Sync status dashboard
    ├── Error log
    └── Retry queue with DLQ
```

## 17.3 Channel Mapping

```
RoomType "Standard" → Booking.com "Standard Room" → Expedia "Std Double"
RatePlan "BAR" → Booking.com "Flexible Rate" → Expedia "Best Available"
RatePlan "Corporate" → Booking.com "Corporate Rate"
```

## 17.4 Sync Rules

- Rate changes: push immediately to all channels
- Availability changes: push immediately on reservation create/cancel
- Reservation import: real-time webhook or polling (channel-dependent)
- Conflict: overbooking allowed up to X% (configurable per property)
- Failed sync: retry 3x with exponential backoff → DLQ → alert

---

# 18. BOOKING ENGINE BLUEPRINT

## 18.1 Public-Facing Booking Flow

```
1. Guest visits hotel website → embedded booking widget
2. Selects dates → system shows availability + rates
3. Selects room type → shows rate details, policies, add-ons
4. Guest enters details (name, email, phone)
5. Optional: promo code, corporate code
6. Payment: card pre-auth or deposit
7. Confirmation email/WhatsApp
8. Reservation created in Auron
9. Folio created with deposit
10. Channel availability updated
```

## 18.2 Booking Engine Features

| Feature | Description |
|---------|-------------|
| Real-time availability | Pulls from same inventory as PMS |
| Rate display | Shows all applicable rates per room type |
| Promo codes | Configurable discounts (%, fixed, free night) |
| Packages | Room + breakfast, room + spa, etc. |
| Upselling | Room upgrade, late checkout, early check-in, breakfast add-on |
| Multi-room | Book multiple rooms in single transaction |
| Guest details | Form with validation |
| Payment | Card pre-auth, deposit, or pay-at-hotel |
| Confirmation | Email + WhatsApp |
| Abandoned booking | Track incomplete bookings, reminder email |
| Mobile-first | Responsive design, thumb-friendly |
| Multi-language | ES, EN, FR (configurable) |
| Multi-currency | Display in guest currency, charge in hotel currency |

## 18.3 Rate Parity

- Booking engine shows same rates as OTAs (or better for direct)
- Member rates (10-15% discount for direct bookers)
- Best rate guarantee

---

# 19. GUEST EXPERIENCE BLUEPRINT

## 19.1 Guest Journey

```
BOOKING → CONFIRMATION → PRE-ARRIVAL → PRE-CHECK-IN → ARRIVAL
  ↓                                                       ↓
DIRECT BOOKING                                    DIGITAL KEY
OR OTA                                               ↓
                                                     STAY
                                                  ↓     ↓
                                              REQUESTS  UPSELL
                                                  ↓     ↓
                                              CHECKOUT → REVIEW → LOYALTY
```

## 19.2 Pre-Arrival (T-7 days)

- Automated email/WhatsApp: "Your stay is coming up"
- Online check-in form (identity doc, preferences, arrival time)
- Room selection (if available)
- Upsell offer (room upgrade, airport transfer, breakfast package)
- Special requests collection

## 19.3 During Stay

- Guest Portal: view folio, make requests, chat with staff
- WhatsApp: natural language requests
- Upselling: dynamic offers based on availability + guest profile
- Concierge: local recommendations, tours, restaurants

## 19.4 Check-Out

- Express checkout via guest portal (no front desk needed)
- Folio review and payment
- Digital receipt (email/WhatsApp)
- Feedback survey (1-click NPS)

## 19.5 Post-Stay

- Thank you email
- Review request (Google, TripAdvisor)
- Loyalty points (if applicable)
- Re-engagement campaign (30/60/90 days)

## 19.6 Monetization Opportunities Per Stage

| Stage | Revenue Opportunity |
|-------|-------------------|
| Booking | Upselling, packages, add-ons |
| Pre-arrival | Upgrade offers, transfers, experiences |
| Check-in | Room upgrade, early check-in fee |
| During stay | F&B, spa, minibar, tours |
| Check-out | Late checkout fee |
| Post-stay | Repeat booking, loyalty enrollment |

---

# 20. WHATSAPP BLUEPRINT

## 20.1 WhatsApp as Operational Channel

No es "WhatsApp integration". Es canal operativo nativo.

### Inbound (Guest → Hotel)

```
Guest: "Necesito toallas"
   ↓
Auron: Detecta intención → Crea GuestRequest
   ↓
Housekeeping: Recibe tarea en app/tablero
   ↓
Empleado: Marca completa
   ↓
Auron: Responde automáticamente "¡Listo! Las toallas llegan en 5 minutos"
```

### Outbound (Hotel → Guest)

```
Trigger: Check-in confirmado
   ↓
Auron: Envía WhatsApp template
   "¡Bienvenido al Eden Hotel! 🏖️ Tu habitación 101 está lista.
    WiFi: EdenGuest / Pass: welcome2026
    ¿Necesitas algo? Escríbenos aquí."

Trigger: Check-out pendiente
   ↓
Auron: Envía WhatsApp
   "Buenos días. Su check-out es a las 12:00. ¿Desea extender?"
```

## 20.2 Template System

| Template | Trigger | Channel |
|----------|---------|---------|
| Reservation Confirmed | ReservationCreated | Email + WhatsApp |
| Pre-Arrival Check-in | T-7 days | WhatsApp |
| Welcome | ReservationCheckedIn | WhatsApp |
| Room Ready | RoomStatusChanged → available | WhatsApp |
| Service Request Ack | GuestRequestCreated | WhatsApp |
| Service Complete | GuestRequestCompleted | WhatsApp |
| Check-out Reminder | T+checkout_day morning | WhatsApp |
| Review Request | ReservationCheckedOut + 24h | Email |
| Re-engagement | 30 days after checkout | Email |

## 20.3 Automation Rules

```
WHEN guest sends message with keywords:
  - toalla/towel → CREATE housekeeping_task(category: towel, priority: high)
  - agua/water → CREATE housekeeping_task(category: amenity, priority: normal)
  - ruido/noise → CREATE guest_request(type: complaint, priority: urgent)
  - check-out/checkout → SHOW checkout options
  - factura/factura → SEND folio summary
  - DEFAULT → CREATE guest_request(type: info, assign to front_desk)
```

## 20.4 Human Handoff

AI handles routine requests. Complex issues escalate to human:
- Complaints → Front desk manager
- Billing disputes → Accountant
- Safety/emergency → Manager immediately
- Guest says "hablar con persona" → Transfer to human

## 20.5 Delivery Tracking

Every message tracked: queued → sent → delivered → read. Retries on failure. Failed messages → dashboard alert.

---

# 21. POS / F&B BLUEPRINT

## 21.1 Integration Decision: Auron POS vs D'Yiya

**Recomendación: Construir POS hotelero nativo ligero.**

Razones:
- D'Yiya es POS de restaurante standalone, no hotelero
- Hotelero necesita: charge-to-room, guest folio posting, room service
- Hotelero NO necesita: kitchen display completo, mesas, waiter stations
- Posible reutilización: dominio de menú, cálculos de impuestos

**Enfoque:** POS mínimo viable para hotel:
- Menú digital (restaurant + room service)
- Pedidos con modifiers
- Charge to room (post to folio)
- Impuestos (ITBIS)
- Pagos (cash, card, room charge)
- Reportes básicos de ventas

## 21.2 Modules

| Module | Description |
|--------|-------------|
| Restaurant POS | Tables, orders, modifiers, split checks |
| Room Service | Phone/web orders, charge to room |
| Bar | Open tab, close tab, charge to room |
| Minibar | Consumption tracking, auto-post to folio |
| Kitchen Display | Order queue, timing, completion |

## 21.3 Charge-to-Room Flow

```
1. Guest orders (room service, restaurant, bar)
2. Staff creates POS order
3. Links to guest reservation
4. Posts charge to guest's folio
5. Folio balance updated
6. Guest sees charge on their portal/folio
```

---

# 22. CRM BLUEPRINT

## 22.1 Guest 360

```
Guest Profile
├── Personal: name, email, phone, nationality, ID doc
├── Preferences: room type, floor, pillow, minibar, language
├── History
│   ├── Stays: dates, room, rate, revenue
│   ├── F&B: orders, spend, favorites
│   ├── Spa: treatments, therapists
│   ├── Requests: types, frequency, satisfaction
│   └── Payments: methods, amounts, outstanding
├── Computed
│   ├── LTV (Lifetime Value)
│   ├── Average spend per stay
│   ├── Stay frequency
│   ├── Channel preference
│   └── Segment (business, leisure, group, loyalty)
├── Communication
│   ├── Messages sent/received
│   ├── Preferred channel (WhatsApp, email, SMS)
│   └── Opt-in/opt-out status
└── Reviews
    ├── Ratings
    ├── Sentiment
    └── Responses
```

## 22.2 Segmentation

| Segment | Rules |
|---------|-------|
| VIP | LTV > X OR loyalty tier >= Gold OR repeat >= 5 |
| Corporate | Has corporate rate OR company linked |
| Group | Part of group reservation |
| Direct | Booked via booking engine (no OTA commission) |
| OTA | Booked via any OTA |
| New | First stay |
| At Risk | No booking in 2x average frequency |
| High Value | Top 20% by LTV |

## 22.3 Loyalty Program

```
LoyaltyAccount
├── Points balance
├── Tier (Bronze, Silver, Gold, Platinum)
├── Tier qualification criteria (stays, nights, spend)
├── Points earning rules (per dollar spent, per night)
├── Points redemption (room upgrades, free nights, F&B credits)
└── Benefits per tier
```

---

# 23. EVENTS / GROUPS BLUEPRINT

## 23.1 Scope

Events = weddings, conferences, meetings, galas.

| Entity | Description |
|--------|-------------|
| Event | name, type, date_range, expected_attendees, status |
| Venue | name, capacity, setup_types, hourly_rate |
| Room Block | reservation block for group (dates, room types, group_rate) |
| Catering | menu_selections, per_person_price, dietary_requirements |
| Contract | terms, deposit, cancellation, penalties |
| Budget | estimated vs actual per category |

## 23.2 Group Reservation Flow

```
1. Create event (name, dates, type)
2. Assign venue(s)
3. Create room block (room type × quantity × dates × group rate)
4. Individual guests book within block (via booking engine or front desk)
5. Block releases unbooked rooms X days before event
6. Catering orders managed separately
7. Final invoice: rooms + catering + venue + misc
8. Single folio or per-attendee folios
```

---

# 24. FISCAL RD BLUEPRINT

## 24.1 NCF Management

```
NCFSequence
├── id
├── tenant_id
├── type: ENUM (fiscal, governmental, consumer, special_regime, uniq)
├── prefix: VARCHAR(10)  (ej: B0100000001)
├── current_number: INT
├── start_number: INT
├── end_number: INT
├── status: active | exhausted | expired
├── expiry_date: DATE
└── dgii_authorization: TEXT
```

**Rules:**
- Sequential, no gaps
- Current number auto-increments on each NCF generation
- When exhausted: alert + block new fiscal documents
- Type determines who gets the NCF (fiscal: business with RNC, consumer: individuals)

## 24.2 e-CF Submission

```
ECFDocument
├── id
├── ncf_number
├── tenant_rnc
├── client_rnc (nullable — consumer NCF)
├── type: sale | credit_note | debit_note
├── xml_payload: TEXT (DGII schema)
├── status: draft | submitted | accepted | rejected
├── dgii_response: JSONB
├── submitted_at: TIMESTAMPTZ
└── accepted_at: TIMESTAMPTZ
```

**Flow:**
1. Folio closes → fiscal-consumer listens
2. Generate NCF from sequence
3. Build XML per DGII spec
4. Submit to Alanube/DGII API
5. Receive acceptance/rejection
6. If rejected: alert, retry, or manual resolution

## 24.3 ITBIS Rules

- 18% on taxable goods and services
- Some items exempt (certain food items, medical)
- ITBIS calculated on subtotal, NOT on propina
- Propina Legal: 10% on subtotal (service charge)
- Total = Subtotal + ITBIS + Propina

## 24.4 Reports

| Report | Frequency | Description |
|--------|-----------|-------------|
| 606 | Monthly | Compras (purchases) —所有 proveedores con RNC |
| 607 | Monthly | Ventas (sales) — todos los NCF emitidos |
| ITBIS Report | Monthly | ITBIS collected vs ITBIS paid |
| Retention Report | Monthly | ITBIS retained from suppliers |

---

# 25. ANALYTICS BLUEPRINT

## 25.1 General Manager Dashboard

| KPI | Description | Source |
|-----|-------------|--------|
| Occupancy % | Rooms sold / available | Reservations + Inventory |
| ADR | Revenue / rooms sold | Folios |
| RevPAR | Revenue / available rooms | Calculated |
| TRevPAR | Total revenue / available rooms | All revenue sources |
| Booking Pace | Bookings this period vs LY | Reservations |
| Channel Mix | % direct, % OTA, % group | Reservations + Distribution |
| Guest Satisfaction | Average review score | Reviews |
| Forecast vs Actual | Budget variance | Analytics |

## 25.2 Front Desk Dashboard

- Today's arrivals (count, VIP flagged)
- Today's departures (count, folio balance alerts)
- In-house count
- Room status grid (color-coded)
- Walk-ins today

## 25.3 Housekeeping Dashboard

- Rooms to clean (by priority)
- Average cleaning time today
- SLA compliance %
- Staff productivity (rooms/staff)
- Inspection pass rate

## 25.4 Revenue Dashboard

- Current vs forecast demand
- Rate recommendations
- Competitor rate comparison
- Pickup report (last 7/30/90 days)
- Cancellation rate
- No-show rate
- Revenue by channel
- Revenue by segment

## 25.5 Finance Dashboard

- Total revenue (room + F&B + spa + misc)
- Payments collected (by method)
- Outstanding balance (aged receivables)
- Tax collected (ITBIS)
- Daily P&L summary

---

# 26. AI BLUEPRINT

## 26.1 AI Revenue Advisor

**Pregunta:** "¿Qué tarifa recomiendo para el sábado?"

**Datos requeridos:**
- Historical occupancy for that date pattern
- Current booking pace
- Competitor rates
- Local events
- Weather forecast
- Day of week
- Season

**Modelo:** Regression model (轻量) o rule-based con scoring
**Costo:** Low (local model o small LLM call)
**Utilidad:** HIGH — direct revenue impact
**Cuándo construir:** Phase 6 (después de tener 12+ meses de datos)

## 26.2 AI Operations Advisor

**Pregunta:** "¿Por qué hay retrasos en limpieza?"

**Datos requeridos:**
- Housekeeping task timestamps
- Staff assignments
- Room complexity (size, type)
- Historical patterns
- Guest complaints related to cleanliness

**Modelo:** Anomaly detection + correlation analysis
**Costo:** Low
**Utilidad:** MEDIUM — improves operational efficiency
**Cuándo construir:** Phase 6

## 26.3 AI Guest Assistant

**Pregunta:** Guest asks about local restaurants, hotel services, etc.

**Datos requeridos:**
- Hotel knowledge base (FAQ, services, hours)
- Guest profile (preferences, past requests)
- Local knowledge base (restaurants, attractions)

**Modelo:** RAG (Retrieval Augmented Generation) con LLM
**Costo:** MEDIUM (LLM calls per interaction)
**Utilidad:** HIGH — guest satisfaction + labor reduction
**Cuándo construir:** Phase 5 (after WhatsApp is solid)

## 26.4 AI Analytics — "Why did RevPAR drop?"

**Modelo:** Explanation engine sobre datawarehouse
**Costo:** Low-Medium
**Utilidad:** MEDIUM
**Cuándo construir:** Phase 6

## 26.5 Predictive Maintenance

**Modelo:** Classification (will this asset fail in next 30 days?)
**Datos requeridos:** Asset history, maintenance logs, age, usage
**Costo:** Low
**Utilidad:** MEDIUM
**Cuándo construir:** Phase 6 (after maintenance module is mature)

## 26.6 AI Principles

1. AI recomienda, humano decide (excepto auto-pricing con override)
2. Cada recomendación tiene confidence score + explicación
3. Privacy: AI no retiene PII sin consentimiento
4. Cost control: cachear, batchear, usar modelos pequeños
5. Offline: modelos ligeros corren localmente
6. Transparency: hotelero puede ver por qué AI hizo esa recomendación

---

# 27. OFFLINE / EDGE BLUEPRINT

## 27.1 Operations That MUST Work Offline

| Operation | Priority | Data Needed |
|-----------|----------|-------------|
| Check-in | CRITICAL | Guest list, room inventory |
| Check-out | CRITICAL | Folio, payments |
| Room status update | CRITICAL | Room list |
| Housekeeping tasks | CRITICAL | Task list |
| POS orders | HIGH | Menu, prices |
| Guest requests | HIGH | Request types |
| View availability | HIGH | Room inventory |
| View guest profile | HIGH | Guest data |

## 27.2 Operations That CAN Wait

| Operation | Reason |
|-----------|--------|
| Reservation creation | Needs availability check (sync preferred) |
| Channel sync | Requires internet |
| e-CF submission | Requires DGII connection |
| Report generation | Not time-critical |
| AI recommendations | Can use cached data |

## 27.3 Architecture

```
┌──────────────────────────────┐
│        PWA Shell              │
│  Service Worker + IndexedDB   │
│                               │
│  ┌─────────────────────────┐ │
│  │  Local Cache (IndexedDB) │ │
│  │  • Room inventory       │ │
│  │  • Guest profiles       │ │
│  │  • Menu items           │ │
│  │  • Task queue           │ │
│  │  • User session (JWT)   │ │
│  └────────────┬────────────┘ │
│               │               │
│  ┌────────────▼────────────┐ │
│  │  Command Queue           │ │
│  │  • Pending operations   │ │
│  │  • Idempotency keys     │ │
│  │  • Timestamps           │ │
│  └────────────┬────────────┘ │
│               │               │
│  ┌────────────▼────────────┐ │
│  │  Sync Engine             │ │
│  │  • Network detection    │ │
│  │  • Queue flush          │ │
│  │  • Conflict resolution  │ │
│  │  • Retry with backoff   │ │
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

## 27.4 Sync Protocol

```
1. Client detects network available
2. Flush command queue (FIFO order)
3. For each command:
   a. Send to server with idempotency_key
   b. Server processes normally
   c. If success: remove from queue
   d. If conflict: resolve (server wins for writes, merge for reads)
   e. If server error: retry with exponential backoff
4. Pull fresh data from server (delta sync)
5. Update local cache
```

## 27.5 Conflict Resolution

- **Writes to same resource:** Server timestamp wins (last-write-wins is acceptable for hotel operations)
- **Room status conflict:** Most recent action wins (staff on-site has authority)
- **Folio charges:** Never conflict offline (folios always sync first)
- **Guest requests:** If two staff complete same request, first sync wins

## 27.6 Local Auth

- JWT stored in IndexedDB (encrypted)
- Offline: validate JWT locally (check expiry only — can't verify signature without server)
- Session timeout: 8 hours offline max, then require re-auth
- If JWT expired offline: read-only mode until reconnected

## 27.7 Network Detection

```javascript
// PWA Service Worker
self.addEventListener('fetch', (event) => {
  if (!navigator.onLine) {
    // Queue for later
    event.respondWith(cacheFirst(event.request));
  }
});
```

Backend detects: health endpoint returns network status to frontend.

---

# 28. MARKET BENCHMARK

## 28.1 Competitor Comparison Matrix

| Capability | OPERA Cloud | Mews | Cloudbeds | RoomRaccoon | Stayntouch | Auron (Target) |
|------------|-------------|------|-----------|-------------|------------|----------------|
| **PMS Core** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial |
| **Reservations** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Basic |
| **Front Desk** | ✅ Deep | ✅ Modern | ✅ Good | ✅ Basic | ✅ Good | ❌ Not yet |
| **Housekeeping** | ✅ Module | ✅ Module | ✅ Module | ⚠️ Basic | ✅ Module | ❌ Not yet |
| **Maintenance** | ✅ Module | ⚠️ Via partner | ⚠️ Basic | ❌ No | ⚠️ Basic | ❌ Not yet |
| **Revenue Mgmt** | 🔌 Partner (IDeaS) | ✅ Atomize native | ✅ Signals | ✅ Built-in | 🔌 Partner | ❌ Not yet |
| **Channel Manager** | 🔌 30+ via OHIP | ✅ SiteMinder native | ✅ Built-in 300+ | ✅ Built-in | 🔌 Partner | ❌ Not yet |
| **Booking Engine** | 🔌 Partner | ✅ Excellent | ✅ Good | ✅ Good | ✅ Good | ❌ Not yet |
| **Guest Experience** | 🔌 Partner | ✅ Native + AI | ✅ Whistle | ⚠️ Basic | ✅ Good | ❌ Not yet |
| **CRM** | ✅ Deep | ✅ Good | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic | ❌ Not yet |
| **POS/F&B** | ✅ Simphony | ✅ Native POS | 🔌 Partner | ❌ No | 🔌 Partner | ❌ Not yet |
| **Events** | ✅ Module | ⚠️ Basic | ❌ No | ❌ No | ❌ No | ❌ Not yet |
| **Fiscal RD** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | 🎯 TARGET |
| **WhatsApp Native** | 🔌 Partner | ✅ Guest Messaging | 🔌 Partner | ❌ No | 🔌 Partner | 🎯 TARGET |
| **Offline** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No | 🎯 TARGET |
| **AI** | ⚠️ Nor1 upsell | ✅ Agentic AI | ✅ Signals | ❌ No | ❌ No | 🎯 TARGET |
| **Multi-property** | ✅ Enterprise | ✅ Unlimited | ⚠️ Up to 20 | ❌ No | ✅ Good | ⚠️ Planned |
| **API** | ✅ OHIP (1200+) | ✅ 800+ marketplace | ✅ Good | ⚠️ Limited | ✅ Good | ⚠️ Basic |
| **Mobile** | ⚠️ Limited | ✅ Strong | ✅ Good | ⚠️ Basic | ✅ Strong | ❌ Not yet |
| **Pricing** | $15-30/room/mo | €199+/property | $15/room/mo | ~€199/mo | Custom | 🎯 Free/Starter |
| **Training time** | 5-7 days | 1-2 days | 2-3 days | 1-2 days | 2-3 days | 🎯 < 1 day |

Legend: ✅ Available | ⚠️ Partial | ❌ Not available | 🔌 Third-party | 🎯 Auron differentiator

## 28.2 Pricing Benchmarks

| PMS | Monthly Cost (60-room hotel) | Setup Cost | Contract |
|-----|------------------------------|------------|----------|
| OPERA Cloud | $900-1,800 | $3,000-8,000 | Multi-year |
| Mews | $1,200-2,000 | Included | Annual |
| Cloudbeds | $900-1,500 | Included | Annual |
| RoomRaccoon | ~$500 | Included | Monthly/Annual |
| Little Hotelier | ~$400 | Included | Monthly |
| Stayntouch | Custom | Custom | Annual |
| **Auron** | **$0-300** | **Included** | **Monthly** |

---

# 29. DIFFERENTIATION MAP

## 29.1 Commodity (Every PMS must have)

- Reservation CRUD
- Room management
- Guest profiles
- Basic reporting
- Channel manager connectivity
- Basic billing

## 29.2 Competitive (Needed to compete with leaders)

- Modern UI/UX
- Mobile-responsive
- Open API
- Multi-property support
- Revenue management (basic)
- Guest messaging
- Housekeeping management
- Online check-in/out

## 29.3 Differentiator (Makes Auron stand out)

- **Fiscal RD integration** (DGII/e-CF/NCF/ITBIS) — NO competitor has this
- **WhatsApp-native operations** — Competitors have messaging, not operational WhatsApp
- **Offline-first architecture** — NO competitor works offline
- **LATAM-specific** — Caribbean calendar, regional events, local pricing
- **Transparent pricing** — $0-300/mo vs $500-2,000/mo competitors
- **Open source core** — Community, transparency, customization

## 29.4 Strategic Moat (Hard to copy)

1. **Fiscal RD:** First PMS with native DGII integration. Hotels MUST comply. Switching cost = very high.
2. **Offline + LATAM:** Competitors are cloud-only. Caribbean hotels have unreliable internet. Auron keeps working.
3. **WhatsApp as OS:** Not a chatbot. Operational channel. Guest requests, housekeeping, notifications — all via WhatsApp.
4. **Regional Intelligence:** Caribbean calendar, hurricane season pricing, Semana Santa patterns, local event demand.
5. **Price disruption:** Free tier for small hotels. Undercuts everyone.

## 29.5 Experimental (Validate before building)

- AI Revenue Advisor (might not add enough value for small hotels)
- Predictive Maintenance (might be overkill for 15-80 room hotels)
- Spa/Wellness module (only relevant for resorts)
- Events module (only relevant for conference hotels)

---

# 30. PRIORITY MATRIX

## 30.1 Scoring

| Capability | Impact | Revenue Potential | Operational Value | Customer Demand | Complexity | Risk | Strategic Value | Dependencies |
|------------|--------|-------------------|-------------------|-----------------|------------|------|-----------------|--------------|
| Security/Auth | 10 | 3 | 8 | 7 | 5 | 2 | 10 | None |
| Tenant Isolation | 10 | 2 | 9 | 5 | 4 | 3 | 10 | Auth |
| Reservation Fix | 10 | 8 | 9 | 8 | 4 | 3 | 9 | Auth, Tenant |
| Front Desk | 9 | 7 | 10 | 9 | 6 | 4 | 8 | Reservations |
| Folio/Billing | 9 | 9 | 10 | 9 | 7 | 4 | 9 | Reservations |
| Housekeeping | 8 | 3 | 9 | 8 | 5 | 3 | 7 | Rooms, Staff |
| Payments | 9 | 9 | 9 | 8 | 7 | 5 | 8 | Folio |
| Fiscal RD | 8 | 7 | 8 | 9 | 8 | 6 | 10 | Billing, Payments |
| Booking Engine | 8 | 9 | 6 | 9 | 7 | 4 | 8 | Reservations, Inventory |
| Channel Manager | 8 | 9 | 7 | 9 | 9 | 6 | 8 | Reservations, Inventory |
| WhatsApp | 7 | 5 | 8 | 8 | 6 | 5 | 9 | Guest, Communications |
| Guest Portal | 6 | 4 | 7 | 7 | 5 | 3 | 7 | Reservations, Billing |
| Analytics | 7 | 6 | 7 | 7 | 6 | 2 | 6 | All contexts |
| Offline | 8 | 2 | 9 | 6 | 9 | 7 | 10 | Auth, PMS Core |
| AI Revenue | 6 | 8 | 5 | 5 | 8 | 5 | 7 | Revenue, Analytics |
| POS/F&B | 5 | 6 | 6 | 6 | 7 | 4 | 5 | Billing |
| CRM | 5 | 5 | 5 | 6 | 5 | 3 | 6 | Guest |
| Events | 3 | 4 | 3 | 4 | 6 | 3 | 3 | Reservations |

## 30.2 Priority Classification

### P0 — CRÍTICAS (Sin esto Auron no debería lanzarse)

1. **Security & Auth** — Sin esto no hay producto
2. **Tenant Isolation** — Sin esto no hay SaaS
3. **Reservation Fix** (anti-double-booking + availability integration) — Sin esto no hay PMS
4. **Front Desk** — Sin esto no hay operación diaria
5. **Folio/Billing** — Sin esto no hay cobro
6. **Payments** — Sin esto no hay revenue
7. **Basic Reporting** — Sin esto no hay visibilidad

### P1 — COMPETITIVAS (Necesarias para competir)

8. **Housekeeping** — Operación diaria
9. **Fiscal RD** — Obligatorio en DR
10. **Booking Engine** — Direct revenue
11. **Channel Manager** — Distribution
12. **Guest Portal** — Guest experience
13. **WhatsApp (basic)** — Guest communication
14. **Multi-property** — Scalability

### P2 — DIFERENCIADORES (Nos distinguen)

15. **WhatsApp-native operations** — Unique in market
16. **Offline-first** — Unique in market
17. **Revenue Intelligence** (Level 1-3) — Caribbean pricing
18. **Regional Calendar** — LATAM-specific
19. **Analytics dashboards** — Visibility

### P3 — INNOVACIÓN (Experimental)

20. **AI Revenue Advisor**
21. **AI Guest Assistant**
22. **Predictive Maintenance**
23. **Spa/Wellness**
24. **Events/Groups**
25. **Loyalty Program**
26. **CRM Advanced**

---

# 31. ROADMAP

## PHASE 0 — HARDEN CORE (Weeks 1-4)

**Goal:** Secure, stable, working PMS core.

| Week | Tasks |
|------|-------|
| 1 | JWT auth (login, refresh, logout), remove fake auth middleware, fail-fast on missing JWT_SECRET |
| 2 | Tenant isolation (JWT-based, remove X-Tenant-ID header, RLS policies on all tables, dual isolation) |
| 3 | Reservation fix (availability integration, anti-double-booking, concurrency), fix IDOR on all endpoints, fix RowsAffected bugs |
| 4 | RBAC (roles, permissions, middleware), rate limiting, input validation, audit logging, error handling (no raw errors to client) |

**Exit criteria:**
- Auth works end-to-end (login → JWT → protected endpoints)
- Two tenants cannot see each other's data
- Two simultaneous reservation requests for same room → one succeeds, one fails
- No endpoint returns raw DB errors
- All writes generate audit events
- RLS policies active on all tables

**Deliverable:** Auron is a secure, multi-tenant PMS core.

## PHASE 1 — PMS FOUNDATION (Weeks 5-10)

**Goal:** Complete PMS that a hotel could actually use.

| Week | Tasks |
|------|-------|
| 5-6 | Front Desk board (arrivals, departures, in-house grid, room status), walk-in flow |
| 7-8 | Folio engine (charges, payments, taxes, deposits, refunds, close folio), night audit |
| 9 | Room type management, rate plans, season management, inventory (room nights) |
| 10 | Guest profile management (Guest 360 basic), settings/configuration UI |

**Exit criteria:**
- GM can: create room types, set rates, configure seasons
- Front desk can: check-in guest, assign room, post charges, check-out, close folio
- Night audit runs and generates daily report
- Reports show occupancy, ADR, RevPAR

**Deliverable:** Functional PMS for single property.

## PHASE 2 — HOTEL OPERATIONS (Weeks 11-16)

**Goal:** Operational modules that save staff time.

| Week | Tasks |
|------|-------|
| 11-12 | Housekeeping (task board, assignments, priorities, inspection, productivity metrics) |
| 13-14 | Maintenance (work orders, asset tracking, preventive scheduling) |
| 15 | Staff management (employees, roles, schedules, attendance) |
| 16 | Guest requests (WhatsApp basic — receive, create task, complete, respond) |

**Exit criteria:**
- Housekeeper sees cleaning board with assigned rooms
- Maintenance technician receives work orders on mobile
- Guest can send WhatsApp message → staff receives task → guest gets confirmation

**Deliverable:** Hotel operations + basic WhatsApp.

## PHASE 3 — MONEY ENGINE (Weeks 17-22)

**Goal:** Get paid properly and legally.

| Week | Tasks |
|------|-------|
| 17-18 | Payment integration (Stripe/cash/transfer, card tokenization, deposit management) |
| 19-20 | Fiscal RD (NCF generation, e-CF XML, DGII submission, ITBIS calculation, 606/607 reports) |
| 21-22 | Advanced billing (split folios, company billing, group billing, transfers) |

**Exit criteria:**
- Hotel can accept card payments
- Every folio close generates valid NCF
- e-CF submitted to DGII
- Monthly fiscal reports generated
- ITBIS correctly calculated

**Deliverable:** Revenue + compliance.

## PHASE 4 — DISTRIBUTION (Weeks 23-28)

**Goal:** Get bookings from multiple channels.

| Week | Tasks |
|------|-------|
| 23-24 | Booking engine (availability search, rate display, guest details, payment, confirmation) |
| 25-26 | Channel manager — Booking.com + Expedia (mapping, rate sync, availability sync, reservation import) |
| 27-28 | Channel manager — Airbnb + Agoda, plus overbooking management |

**Exit criteria:**
- Guests can book directly on hotel website
- Rates and availability sync to Booking.com and Expedia
- OTA reservations import into Auron automatically
- Overbooking protection prevents double-booking across channels

**Deliverable:** Distribution + direct bookings.

## PHASE 5 — GUEST EXPERIENCE (Weeks 29-34)

**Goal:** Delight guests, reduce manual work.

| Week | Tasks |
|------|-------|
| 29-30 | WhatsApp-native operations (full automation, templates, AI-assisted responses) |
| 31-32 | Guest portal (pre-check-in, view folio, make requests, express checkout) |
| 33-34 | Upselling engine (room upgrade, add-ons, experiences), review management |

**Exit criteria:**
- Guest receives WhatsApp welcome message at check-in
- Guest can request towels via WhatsApp → auto-creates task → auto-responds when complete
- Guest can check-in online before arrival
- Guest can view and pay folio from phone

**Deliverable:** Modern guest experience.

## PHASE 6 — INTELLIGENCE (Weeks 35-42)

**Goal:** Data-driven decisions.

| Week | Tasks |
|------|-------|
| 35-36 | Analytics dashboards (GM, Front Desk, Housekeeping, Revenue, Finance) |
| 37-38 | Revenue Level 1-3 (reporting, rules-based pricing, basic dynamic pricing) |
| 39-40 | Regional calendar + Caribbean revenue intelligence |
| 41-42 | AI Level 1-2 (revenue advisor basic, analytics explanations) |

**Exit criteria:**
- GM sees real-time dashboard with key metrics
- System recommends rate adjustments based on occupancy
- Caribbean calendar configured (holidays, events, seasons)
- AI explains "RevPAR dropped 15% because..."

**Deliverable:** Intelligence layer.

## PHASE 7 — PLATFORM (Weeks 43-52)

**Goal:** Scale and extend.

| Week | Tasks |
|------|-------|
| 43-44 | Multi-property management (shared users, portfolio view) |
| 45-46 | API (public REST API, webhooks, API keys) |
| 47-48 | Offline mode (PWA, IndexedDB, command queue, sync engine) |
| 49-50 | POS/F&B basic (room service, charge to room, menu management) |
| 51-52 | Mobile app (React Native or PWA) for staff |

**Exit criteria:**
- Manager can see portfolio dashboard across properties
- Third-party can integrate via API
- Front desk can check-in guests without internet
- Room service can charge to guest folio

**Deliverable:** Platform + offline + POS.

**Total: ~52 weeks (12 months) to full HOS.**

---

# 32. DO NOT BUILD YET

## 32.1 AI Revenue Advisor (Full)

**Por qué no:** Requires 12+ months of historical data to be useful. Without data, AI is guessing. Build reporting first (Level 1), then rules (Level 2), then dynamic pricing (Level 3). AI comes at Level 6.

**Dependencia:** Full PMS running 12+ months, revenue data, competitor data, event data.

**Cuándo:** Phase 6, after 12 months of production data.

## 32.2 Predictive Maintenance

**Por qué no:** Requires mature maintenance module with 6+ months of asset data. Without work order history, predictions are random.

**Dependencia:** Maintenance module, asset registry, 6+ months of work orders.

**Cuándo:** Phase 6, after maintenance module is mature.

## 32.3 Spa/Wellness Module

**Por qué no:** Only relevant for resort properties. Our target (boutique hotels 15-80 rooms) rarely has spa operations. Build when a customer asks for it.

**Dependencia:** Resort customer segment, spa booking system, therapist scheduling.

**Cuándo:** Phase 7, on-demand.

## 32.4 Events/Groups Module

**Por qué no:** Complex, only relevant for hotels with meeting space. Our target rarely has conference facilities. High complexity, low demand in initial segment.

**Dependencia:** Venue management, catering, contract management.

**Cuándo:** Phase 7, on-demand.

## 32.5 Loyalty Program (Full)

**Por qué no:** Requires guest data across multiple stays. With new properties, there's no repeat guest data yet. Basic loyalty (points accrual) is fine. Full program with tiers, redemption, campaigns needs data.

**Dependencia:** 100+ repeat guests per property minimum.

**Cuándo:** Phase 6, when guest data supports it.

## 32.6 GDS Integration

**Por qué no:** GDS (Amadeus, Sabre) is for corporate travel agents. Our target segment (boutique hotels) rarely uses GDS. High integration complexity, low ROI.

**Dependencia:** GDS gateway, corporate travel segment.

**Cuándo:** Phase 7, only if customer demand exists.

## 32.7 Microservices Migration

**Por qué no:** Premature. Modular monolith is correct at current scale. Microservices add operational complexity (service discovery, distributed tracing, deployment coordination) without benefit at <100 properties.

**Dependencia:** >100 concurrent properties, team >10 engineers, specific scaling bottleneck.

**Cuándo:** When the monolith can't scale, and only the specific module that's bottlenecked.

## 32.8 Mobile App (Native)

**Por qué no:** PWA covers 80% of mobile use cases. Native apps require App Store/Play Store approval, update cycles, device-specific testing. PWA is sufficient for Phase 7.

**Dependencia:** Stable PWA, specific feature need that PWA can't handle (push notifications on Android, offline deep functionality).

**Cuándo:** Phase 7, and only if PWA proves insufficient.

## 32.9 Multi-language (i18n)

**Por qué no:** Premature. Spanish first. English second. Other languages when we have international customers. i18n framework can be added later without rearchitecting.

**Dependencia:** International customer base.

**Cuándo:** Phase 5 (basic EN), later phases for FR/PT/DE.

## 32.10 Smart Locks Integration

**Por qué no:** Hardware-dependent, complex, low demand in our target segment. Caribbean hotels use physical keys or basic card locks. Digital key is a nice-to-have, not a need.

**Dependencia:** Smart lock hardware, guest smartphone, security model.

**Cuándo:** Phase 7, on-demand.

---

# 33. ARCHITECTURAL MIGRATION PLAN

## 33.1 KEEP (Conservar tal cual)

| Component | Rationale |
|-----------|-----------|
| Go + Chi router | Solid, fast, well-structured |
| DDD architecture | Clean bounded contexts, good separation |
| PostgreSQL as primary DB | Proven, reliable, supports RLS |
| Event sourcing pattern | Good audit trail, supports replay |
| pgx driver | Fast, type-safe PostgreSQL access |
| Domain aggregates (Room, Reservation, Guest, RoomType) | Well-designed state machines |
| pkg/es/aggregate.go | Clean base aggregate |
| pkg/types/money.go | Correct money handling |
| pkg/httputil/httputil.go | Useful helpers |

## 33.2 REFACTOR (Corregir sin cambiar arquitectura)

| Component | Issue | Fix |
|-----------|-------|-----|
| middleware/auth.go | No-op authentication | Replace with JWT validation |
| middleware/tenant.go | Client-controlled | Extract from JWT claims |
| All handlers Get/Update | No tenant_id in WHERE | Add AND tenant_id=$N |
| cancel.go CancelReservationCommand | Missing TenantID field | Add TenantID, extract from context |
| reservation_repo.go Load | No tenant scoping | Add tenant_id filter |
| handlers error responses | Raw err.Error() | Generic messages + server logging |
| cmd/api/main.go | Hardcoded port, fallback DSN | Env vars, fail-fast |
| Migration runner | Splits on ";" | Use proper migration library (golang-migrate) |
| All List endpoints | No pagination | Add limit/offset with defaults |
| Reservation create | No availability check | Call IsRoomAvailable before insert |
| Room status PATCH | Accepts any string | Validate against state machine |

## 33.3 REDESIGN (Necesita cambio estructural)

| Component | Current | Target |
|-----------|---------|--------|
| Event Store metadata | No correlation/causation | Add metadata with correlation_id, causation_id, user_id |
| Event Store projector | Empty directory | Implement event projections to read models |
| Repository pattern | Mixed (some repos use events, some direct SQL) | Consistent: all writes through aggregates + events, all reads through projections |
| Frontend components | Zero components, all inline | Component library (Button, Card, Table, Badge, Modal, Form) |
| Frontend state | useState/useEffect per page | Zustand or React Context for shared state |
| Frontend API client | Manual fetch | React Query / SWR for caching, dedup, refetch |
| Frontend auth | None | Login page, token storage, route guards |

## 33.4 REPLACE (Reemplazar)

| Component | Current | Target |
|-----------|---------|--------|
| DB migration runner | Custom strings.Split(";") | golang-migrate or atlas |
| JWT | None | golang-jwt/jwt/v5 |
| Password hashing | None | bcrypt or argon2 |
| Rate limiting | None | Redis-based (go-redis) |
| HTTP body limit | None | http.MaxBytesReader |
| Logging | chi.Logger | Structured logging (slog or zerolog) |
| Config management | Hardcoded + env | Viper or envconfig |

## 33.5 NEW (Agregar)

| Component | Purpose |
|-----------|---------|
| Authentication service | JWT, login, refresh, password hashing |
| RBAC middleware | Role-based access control |
| Audit service | Event sourcing for all writes |
| Folio engine | Financial ledger |
| Housekeeping module | Task management |
| Maintenance module | Work orders, assets |
| Revenue engine | Pricing, forecasting |
| Channel manager | OTA connectivity |
| Booking engine | Direct bookings |
| WhatsApp integration | Guest communication |
| Fiscal RD engine | NCF, e-CF, ITBIS |
| Analytics service | Dashboards, KPIs |
| Offline sync | PWA, IndexedDB, sync |
| NATS consumer framework | Event consumption, retry, DLQ |

---

# 34. DEFINITION OF DONE

## PMS FOUNDATION COMPLETE

When ALL of the following are true:
- [ ] Authentication works: login → JWT → protected endpoints → refresh → logout
- [ ] Tenant isolation: Tenant A cannot access Tenant B data (verified by test)
- [ ] RLS active on ALL tables with proper policies
- [ ] RBAC: different roles see different data and can perform different actions
- [ ] Reservations prevent double-booking (verified by concurrency test)
- [ ] Front desk board shows real-time arrivals/departures/in-house
- [ ] Walk-in flow works end-to-end (guest → reservation → check-in → room assignment)
- [ ] Folio engine: charge, payment, tax calculation, close folio
- [ ] Night audit generates daily report with correct numbers
- [ ] Room status transitions enforced by state machine
- [ ] No endpoint returns raw DB errors
- [ ] All writes generate audit events
- [ ] Pagination on all list endpoints
- [ ] Rate limiting active
- [ ] All tests pass (existing + new)

## HOTEL OPERATIONS COMPLETE

When ALL of the following are true:
- [ ] Housekeeping board shows room cleaning status in real-time
- [ ] Housekeeper can see assigned tasks and mark complete
- [ ] Supervisor can assign/reassign tasks
- [ ] Inspection workflow works (complete → inspect → available)
- [ ] Maintenance work orders can be created, assigned, completed
- [ ] Asset registry with basic info
- [ ] Preventive maintenance schedule generates work orders
- [ ] Staff can be assigned to shifts
- [ ] Guest requests can be created and tracked
- [ ] WhatsApp basic: receive message → create task → complete → respond

## REVENUE COMPLETE

When ALL of the following are true:
- [ ] Payment processing works (card + cash + transfer)
- [ ] Deposits can be collected and applied
- [ ] Refunds can be issued
- [ ] NCF generated on folio close
- [ ] e-CF XML generated per DGII spec
- [ ] ITBIS calculated correctly (18%)
- [ ] Propina calculated correctly (10%)
- [ ] 606/607 reports generated monthly
- [ ] Revenue reporting: occupancy, ADR, RevPAR
- [ ] Basic dynamic pricing (occupancy-based rules)

## DISTRIBUTION COMPLETE

When ALL of the following are true:
- [ ] Booking engine live on hotel website
- [ ] Guests can book directly with real-time availability
- [ ] Booking.com integration: rates + availability sync
- [ ] Expedia integration: rates + availability sync
- [ ] OTA reservations import into Auron
- [ ] Overbooking protection across all channels
- [ ] Rate parity management

## GUEST EXPERIENCE COMPLETE

When ALL of the following are true:
- [ ] WhatsApp: full automation (requests, notifications, responses)
- [ ] Guest portal: pre-check-in, folio view, requests, express checkout
- [ ] Pre-arrival email/WhatsApp sequence
- [ ] Upselling offers during stay
- [ ] Review request post-checkout
- [ ] Guest profile 360 (history, preferences, spend, segment)

## HOSPITALITY OS COMPLETE

When ALL of the following are true:
- [ ] Multi-property management with portfolio dashboard
- [ ] Public API with documentation
- [ ] Offline mode for critical operations
- [ ] Analytics dashboards (GM, Front Desk, Housekeeping, Revenue, Finance)
- [ ] Revenue intelligence (Level 3+)
- [ ] AI revenue advisor (basic recommendations)
- [ ] POS/F&B (room service, charge to room)
- [ ] 50+ properties live on platform
- [ ] < 1 day training for new front desk staff
- [ ] Monthly uptime > 99.9%

---

# 35. FINAL CTO RECOMMENDATION

## ¿Qué debe convertirse AURON HOSPITALITY?

Un Hospitality Operating System que un hotelero caribeño pueda desplegar en una computadora de caja, conectar por Wi-Fi a tablets de meseros y monitores de cocina, y usar sin internet — facturando legalmente con DGII, respondiendo huéspedes por WhatsApp, y viendo sus números en tiempo real.

## ¿Qué construir primero?

**Fase 0 (Seguridad):** No hay atajos. JWT + Tenant Isolation + RBAC + Anti-Double-Booking. Esto es la fundación. Sin esto, nada funciona.

**Fase 1 (PMS Core):** Front Desk + Folio + Night Audit. Un hotelero puede operar con esto. Es el MVP real.

**Fase 2 (Operaciones):** Housekeeping + Maintenance + WhatsApp básico. El hotelero ahorra tiempo.

**Fase 3 (Dinero):** Pagos + Fiscal RD. El hotelero cobra y factura legalmente.

**Fase 4 (Distribución):** Booking Engine + Channel Manager. El hotelero recibe reservas de múltiples canales.

**Fase 5 (Experiencia):** WhatsApp completo + Guest Portal + Upselling. El huésped tiene una experiencia moderna.

**Fase 6 (Inteligencia):** Analytics + Revenue + AI. El hotelero toma mejores decisiones.

## ¿Qué NO construir?

- No construir microservices (monolith is fine)
- No construir GDS (not needed for target segment)
- No construir spa/events (on-demand only)
- No construir mobile native (PWA first)
- No contratar 50 engineers (small team, ship fast)
- No competir contra OPERA en features (compete on simplicity, price, and LATAM-fit)

## ¿Cuál es el moat?

1. **Fiscal RD:** Nadie más lo tiene. Los hoteles DR necesitan cumplir DGII. Auron es el único PMS que lo hace nativo.
2. **Offline + LATAM:** Internet en el Caribe es unreliable. Auron funciona sin conexión. Ningún competidor ofrece esto.
3. **WhatsApp como canal operativo:** No un chatbot. Una capa donde el huésped pide toallas y el sistema crea la tarea automáticamente.
4. **Precio:** Free tier para hoteles pequeños. Undercuts a todos.
5. **Open source:** Comunidad, transparencia, personalización. Los hoteleros LATAM prefieren.controlar su software.

## La pregunta final

¿Puede Auron competir contra Mews y Cloudbeds? No en features. No hoy.

¿Puede Auron competir en el Caribe hispano? Sí. Porque ningún competidor entiende la fiscalidad dominicana, funciona offline, ni cuesta $0-300/mes.

El camino más inteligente: construir el PMS más simple, más legal, más offline, y más barato del Caribe. No intentar ser OPERA. Intentar ser el sistema que un hotelero de Samaná pueda usar mañana mismo.
