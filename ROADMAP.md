# HospitalityOS — Roadmap Completo

## Visión

**El primer PMS del mundo con AI nativo, offline-first, open source, y optimizado para Latinoamérica.**

```
Competidores actuales:    HospitalityOS:
──────────────────        ──────────────
PMS básico                PMS + AI
Channel manager           Smart channel manager
Booking engine            Booking engine + pricing AI
Payments                  Pagos locales (RD)
Email                     WhatsApp + Telegram
Manual                    Automático
Cloud only                Offline + Cloud
Cerrado                   Open source
Europa/USA                RD first, LATAM after
$4-25/hab/mes             $1-3/hab/mes o gratis
```

---

## Arquitectura Target

```
┌─────────────────────────────────────────────────────────────┐
│                    HOSPITALITYOS CORE                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Reservation  │  │    Guest     │  │     Room     │      │
│  │   Context     │  │   Context    │  │   Context    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
│  ┌──────┴─────────────────┴─────────────────┴──────┐       │
│  │              Event Store (PostgreSQL)             │       │
│  └─────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Housekeeping │  │   Payments   │  │   Revenue    │      │
│  │   Context    │  │   Context    │  │   Context    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │                AI Engine (MCP)                     │      │
│  │  Guest Chatbot │ Staff Assistant │ Revenue AI     │      │
│  └──────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRATION LAYER                         │
│  Channel Manager │ Booking Engine │ DGII │ WhatsApp │ POS  │
├─────────────────────────────────────────────────────────────┤
│                    FRONTEND (Angular)                        │
│  Dashboard │ Front Desk │ Housekeeping │ Reports │ Mobile  │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases de Desarrollo

### Fase 1 — Core PMS (Semanas 1-4)
**Objetivo:** Un hotel puede hacer check-in, check-out, y gestionar reservaciones.

#### Semana 1-2: Domain + Infrastructure
- [ ] `room` context: RoomType, Room, RoomStatus aggregates
- [ ] `reservation` context: fix in-memory event store → PostgreSQL
- [ ] `guest` context: GuestProfile aggregate con stay history
- [ ] Availability engine: previene double booking
- [ ] Rate engine: pricing por temporada, fin de semana, holidays
- [ ] Multi-tenant real: filtrar queries por tenant_id

#### Semana 3-4: API + Frontend básico
- [ ] REST API completa: CRUD para rooms, reservations, guests
- [ ] Check-in/Check-out endpoints con validaciones
- [ ] Housekeeping status: dirty → cleaning → clean → inspected
- [ ] Frontend Angular: Front Desk dashboard
- [ ] Calendar view: ver disponibilidad por fechas
- [ ] Seed data: hotel de prueba con 20 habitaciones

#### Entregable Fase 1:
```
- Backend Go con 5 bounded contexts
- API REST completa
- Frontend Angular funcional
- Hotel puede hacer operaciones básicas
- Tests: unit + integration
```

---

### Fase 2 — Guest Experience (Semanas 5-7)
**Objetivo:** El huésped tiene una experiencia digital moderna.

#### Semana 5: Guest Portal
- [ ] Pre-check-in digital: formulario vía link (sin app)
- [ ] QR code por habitación → portal del huésped
- [ ] Digital compendium: WiFi, reglas, mapa, servicios
- [ ] Room service ordering vía QR
- [ ] Feedback system: rating + comentarios

#### Semana 6: WhatsApp Integration
- [ ] WhatsApp Business API integration
- [ ] Confirmación de reserva por WhatsApp
- [ ] Recordatorio pre-llegada (48h antes)
- [ ] Check-in por WhatsApp (enviar documentos)
- [ ] Notificación de disponibilidad de habitación

#### Semana 7: Self-Service
- [ ] Self check-in kiosk mode (tablet en lobby)
- [ ] Self check-out vía QR
- [ ] Digital folio: factura digital vía WhatsApp/email
- [ ] Local recommendations: restaurantes, playa, tours

#### Entregable Fase 2:
```
- Guest portal accesible vía QR
- WhatsApp integration funcional
- Self check-in/out en tablet
- Experiencia del huésped moderna
```

---

### Fase 3 — AI Engine (Semanas 8-10)
**Objetivo:** IA que ayuda tanto al staff como al huésped.

#### Semana 8: Staff AI Assistant
- [ ] MCP tools para HospitalityOS (ventas, disponibilidad, guests)
- [ ] Chat widget en el frontend (como Auron Suite)
- [ ] "¿Cuántas habitaciones libres?" → respuesta instantánea
- [ ] "¿Quién llega mañana?" → lista con detalles
- [ ] "¿Cuál fue mi RevPAR?" → métricas

#### Semana 9: Guest AI Chatbot
- [ ] Chatbot en el guest portal (QR → chat)
- [ ] Preguntas frecuentes: WiFi, horarios, servicios
- [ ] Room service ordering por chat
- [ ] Concierge: "¿dónde hay buen restaurante?"
- [ ] Multi-idioma: español, inglés, francés

#### Semana 10: Revenue AI
- [ ] Dynamic pricing automático
- [ ] Competitor price monitoring
- [ ] Event detection (festivales, feriados, conferencias)
- [ ] Revenue forecast: predicción de ingresos
- [ ] Alertas: "Mañana estarás 95% ocupado, subir precios"

#### Entregable Fase 3:
```
- AI assistant para staff (MCP)
- Guest chatbot funcional
- Dynamic pricing activo
- Predictive analytics
```

---

### Fase 4 — Channel Manager (Semanas 11-14)
**Objetivo:** Sincronización con OTAs en tiempo real.

#### Semana 11-12: Core Channel Manager
- [ ] OTA connector framework (plugin architecture)
- [ ] Booking.com XML integration (direct connection)
- [ ] Expedia XML integration
- [ ] Airbnb iCal + API integration
- [ ] Real-time sync: rates, availability, restrictions

#### Semana 13: Smart Channel Features
- [ ] Auto-pause: pausar OTAs cuando 95%+ ocupado
- [ ] Rate parity monitor: detectar violaciones de precio
- [ ] Channel performance analytics: ¿qué canal es más rentable?
- [ ] Commission calculator: cuánto pagaste en comisiones

#### Semana 14: Booking Engine
- [ ] Embeddable booking widget para websites
- [ ] Direct booking engine (0% comisión)
- [ ] Promo codes y descuentos
- [ ] Upselling: "Upgrade por $X" durante booking
- [ ] Multi-language, multi-currency

#### Entregable Fase 4:
```
- Booking.com + Expedia + Airbnb conectados
- Auto-pause funcional
- Booking engine embeddable
- Canal analytics
```

---

### Fase 5 — Operations (Semanas 15-17)
**Objetivo:** Optimizar la operación diaria del hotel.

#### Semana 15: Housekeeping Advanced
- [ ] Mobile app para housekeeping staff
- [ ] Room status real-time: dirty → cleaning → clean → inspected
- [ ] Task assignment automático
- [ ] Photo evidence: fotos de habitación limpia
- [ ] Time tracking: cuánto tarda cada limpieza

#### Semana 16: Maintenance
- [ ] Maintenance request system
- [ ] Work order tracking
- [ ] Preventive maintenance scheduling
- [ ] Asset tracking:Lifecycle de equipamiento
- [ ] Vendor management: proveedores de mantenimiento

#### Semana 17: Staff Management
- [ ] Shift scheduling
- [ ] Attendance tracking
- [ ] Performance metrics
- [ ] Payroll integration basics
- [ ] Staff notifications vía Telegram

#### Entregable Fase 5:
```
- Housekeeping mobile app
- Maintenance system
- Staff management básico
```

---

### Fase 6 — Payments + DGII (Semanas 18-19)
**Objetivo:** Pagos locales y compliance fiscal dominicano.

#### Semana 18: Payments
- [ ] Efectivo (checkout standard)
- [ ] Tarjeta de crédito/débito (Stripe/PayPal)
- [ ] Transferencia bancaria (BHD, BanReservas)
- [ ] QR payment (BCH)
- [ ] Split payment: múltiples métodos

#### Semana 19: DGII Compliance
- [ ] NCF generation (B01, B02, B04, B14, B15)
- [ ] ITBIS calculation (18%)
- [ ] Reporte 607 (compras)
- [ ] Reporte 608 (ventas)
- [ ] e-CF integration con auron-ecf-engine

#### Entregable Fase 6:
```
- Pagos con métodos locales
- DGII compliance completo
- Integración con e-CF engine
```

---

### Fase 7 — Revenue Management (Semanas 20-22)
**Objetivo:** Maximizar ingresos automáticamente.

#### Semana 20: Analytics Dashboard
- [ ] Occupancy rate, ADR, RevPAR en tiempo real
- [ ] Revenue by channel
- [ ] Guest demographics
- [ ] Seasonal trends
- [ ] Comparative reports (mes vs mes anterior)

#### Semana 21: Revenue Tools
- [ ] Rate plans: flexible, non-refundable, advance purchase
- [ ] Minimum length of stay restrictions
- [ ] Closed to arrival / departure
- [ ] Group blocks
- [ ] Corporate rates

#### Semana 22: Business Intelligence
- [ ] Forecast: occupancy next 30 days
- [ ] What-if scenarios: "¿qué pasa si subo precios 10%?"
- [ ] Market segmentation: leisure, business, group
- [ ] Competitive set analysis
- [ ] Export reports: PDF, Excel, CSV

#### Entregable Fase 7:
```
- Dashboard analytics completo
- Revenue management tools
- Business intelligence
```

---

### Fase 8 — Polish + Launch (Semanas 23-25)
**Objetivo:** Preparar para producción y lanzamiento.

#### Semana 23: Performance + Security
- [ ] Load testing: 100 concurrent users
- [ ] Security audit
- [ ] Rate limiting
- [ ] Backup system
- [ ] Disaster recovery plan

#### Semana 24: Multi-property
- [ ] Group management
- [ ] Cross-property analytics
- [ ] Centralized pricing
- [ ] Staff sharing between properties

#### Semana 25: Launch Prep
- [ ] Documentation completa
- [ ] Installation guide
- [ ] Video tutorials
- [ ] Beta testing con 3 hoteles reales
- [ ] Marketing website

#### Entregable Fase 8:
```
- Production-ready
- Documentado
- Beta test exitoso
- Listo para lanzar
```

---

## Tech Stack Final

| Capa | Tecnología | Razón |
|------|-----------|-------|
| **Backend** | Go + Chi | Rápido, poco RAM, concurrente |
| **Database** | PostgreSQL 16 | Robusto, JSON support, RLS |
| **Event Store** | PostgreSQL (custom) | No in-memory, durable |
| **Cache** | Redis | Sessions, rate limiting |
| **Queue** | Redis Streams | Background jobs |
| **Frontend** | Angular 21 + Tailwind v4 | Reutilizar Auron Suite |
| **Mobile** | PWA (Angular) | Sin app nativa, offline-ready |
| **AI** | MCP + Ollama (local) | Sin costo, offline |
| **WhatsApp** | WhatsApp Business API | RD vive en WhatsApp |
| **Payments** | Stripe + locales | Internacional + RD |
| **Deploy** | Docker Compose | Local-first, self-hostable |
| **CI/CD** | GitHub Actions | Automatizado |

---

## Métricas de Éxito

| Métrica | Target Fase 8 |
|---------|---------------|
| Response time API | < 100ms p95 |
| Uptime | 99.9% |
| Tests coverage | > 80% |
| Hotel beta testers | 3 |
| Feature completion | 100% Fase 1-8 |
| Documentation | 100% API docs |

---

## Orden de Prioridad (Resumen)

```
Fase 1: Core PMS           ──── SIN ESTO NO HAY NADA
Fase 2: Guest Experience   ──── DIFERENCIADOR vs competidores
Fase 3: AI Engine          ──── TU VENTAJA COMPETITIVA
Fase 4: Channel Manager    ──── NECESARIO PARA SER PMS COMPLETO
Fase 5: Operations         ──── FUNCIONALIDAD ESPERADA
Fase 6: Payments + DGII    ──── REQUISITO PARA RD
Fase 7: Revenue Management ──── VALUE ADD
Fase 8: Polish + Launch    ──── LISTO PARA PRODUCCIÓN
```

**Tiempo total estimado: 25 semanas (6 meses)**

**Versión MVP (para beta): Fase 1-3 = 10 semanas**

---

## Repositorios

| Repo | Contenido |
|------|-----------|
| `hospitalityos` | Backend Go (este repo) |
| `hospitalityos-web` | Frontend Angular (nuevo) |
| `hospitalityos-docs` | Documentación (nuevo) |

---

## Decisiones Pendientes

- [ ] ¿Nombre final del producto? ¿HospitalityOS o otro?
- [ ] ¿Branding? ¿Colores, logo?
- [ ] ¿Pricing exacto para RD?
- [ ] ¿Primer hotel beta? ¿Edén Hotel Samaná?
- [ ] ¿GitHub org o repo personal?
