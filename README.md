# HospitalityOS

**El primer PMS del mundo con AI nativo, offline-first, open source, y optimizado para Latinoamérica.**

## Qué es

HospitalityOS es un Property Management System (PMS) para hoteles, hecho en Go + Angular. Diseñado para hoteles independientes en Rep Dominicana y Latinoamérica.

## Features principales

- **PMS Core** — Reservaciones, check-in/out, habitaciones, huéspedes
- **AI-Nativo** — Asistente IA para staff y chatbot para huéspedes
- **Offline-First** — Funciona sin internet, sincroniza cuando vuelve
- **Open Source** — Self-hosteable, sin lock-in, customizable
- **DGII Compliance** — NCF, ITBIS, reportes 607/608
- **WhatsApp Integration** — Check-in, confirmaciones, feedback por WhatsApp
- **Dynamic Pricing** — Pricing automático basado en demanda
- **Channel Manager** — Sync con Booking.com, Expedia, Airbnb

## Stack técnico

- **Backend:** Go + Chi + PostgreSQL + Redis
- **Frontend:** Angular 21 + Tailwind CSS v4
- **AI:** MCP + Ollama (local, sin costo)
- **Deploy:** Docker Compose (local-first)

## Quick Start

```bash
# Clonar
git clone https://github.com/alexandevs2309/hospitalityos.git
cd hospitalityos

# Correr con Docker
docker-compose up -d

# Abrir
open http://localhost:8080
```

## Documentación

- [Roadmap](ROADMAP.md) — Plan completo de desarrollo
- [Architecture](docs/ARCHITECTURE.md) — Diseño del sistema
- [API](docs/API.md) — Referencia de endpoints

## Licencia

MIT — Open source, úsalo como quieras.

## Estado

🚧 En desarrollo — Fase 1 (Core PMS)
