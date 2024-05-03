# Education CRM — Implementation Plan

Date: 2024-05-03. Companion to `../specs/2024-05-02-education-crm-design.md`.

Each phase ends with a compile check (`tsc --noEmit` for the touched project), test run and a commit.

## Phase 1 — Project architecture
- Repository layout, backend monorepo (`nest-cli.json`, `tsconfig`, `package.json`), frontend Vite scaffold.
- Shared libraries skeleton: `@app/common`, `@app/database`.

## Phase 2 — Database architecture
- Entities with relations, indexes, unique constraints, soft deletes.
- TypeORM data source, initial migration, migration npm scripts, migrator application.

## Phase 3 — Backend core
- Config module with validation, logger, response envelope interceptor, exception filter,
  pagination helpers, RPC client wrapper with timeout and error translation, event names, patterns.

## Phase 4 — Authentication / authorization
- Auth service (login, refresh rotation, logout, me), JWT strategy in gateway, permission guard,
  decorators, roles and permissions administration in user service, seed of default roles.

## Phase 5 — Microservices
- Bootstrap every service on the Redis transport, gateway hybrid app, health endpoints,
  audit event publishing and persistence.

## Phase 6 — Student / Teacher / Course / Group
- CRUD with search, filters, sorting and pagination; profiles; enrolment; group statistics.

## Phase 7 — Attendance
- Lessons, marking, bulk marking, statistics per student, group, teacher and month.

## Phase 8 — Payments
- Invoices, generation, payments, FIFO allocation, balance and debt, debtors list, monthly job.

## Phase 9 — Schedule
- Branches, rooms, slots, conflict detection, calendar week view, lesson generation.

## Phase 10 — Notifications
- Event consumers, reminder jobs, Socket.IO push from the gateway, read state.

## Phase 11 — Dashboard / Reports
- Report service aggregates, dashboard endpoint, chart series, teacher dashboard.

## Phase 12 — Frontend UI/UX
- Design tokens, UI kit, layouts, router with guards, auth, i18n, every module page,
  dashboard charts, real-time notifications, language switcher.

## Phase 13 — Swagger
- DTO decorators, tags, bearer auth, response schemas.

## Phase 14 — Testing
- Unit tests for business rules, gateway integration tests.

## Phase 15 — Docker
- Backend image, frontend image with nginx, compose with health checks, dev compose.

## Phase 16 — Documentation
- README and the `docs/` set reflecting the final code.

## Phase 17 — Final verification
- Full compose build and run, endpoint and UI checks, checklist.
