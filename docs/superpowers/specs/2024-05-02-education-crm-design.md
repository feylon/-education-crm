# Education CRM — Design Specification

Date: 2024-05-02

## 1. Intent

Education CRM is a business system for private learning centres. It manages students, teachers,
courses, groups, lessons, attendance, invoicing, payments, debt, scheduling, notifications and
reporting for the administrative staff (admins, managers, cashiers) and gives teachers and students
a scoped view of their own data.

Success means a reviewer can run `docker compose up -d`, open the frontend, log in with the demo
credentials, and exercise every business flow end to end: enrol a student into a group, see the
schedule, take attendance, generate invoices, receive a payment, watch the debt figure change, and
see notifications and dashboard figures update. Swagger documents every endpoint. Tests cover the
business rules. Documentation matches the code.

## 2. What the specification fixes (not open for redesign)

- Frontend: Vue 3 + TypeScript + Composition API, Vue Router, Pinia, Axios, SCSS, vue-i18n (uz/en/ru).
- Backend: NestJS + TypeScript, PostgreSQL, TypeORM migrations (no `synchronize`), REST, Swagger,
  JWT access/refresh, RBAC with a dynamic permission system, validation, global exception handling.
- Microservice architecture with an API Gateway and independently responsible services.
- Docker Compose with health checks; one command start.
- Seed data, demo credentials, tests, full Markdown documentation set.
- No comments anywhere in source code.
- Git history from 2024-05-02 to 2025-03-01, one commit per step.

## 3. Decisions made by this design

### 3.1 Monorepo and process layout

One NestJS monorepo under `backend/` with `apps/*` (one per service) and `libs/*` (shared code).
A single Docker image is built for the backend; each container runs a different entry point.
This keeps dependency versions identical across services and keeps the build fast.

Services and their responsibilities:

| Service | Owns (writes) | Responsibility |
| --- | --- | --- |
| gateway | — | HTTP/REST, Swagger, JWT verification, permission guards, rate limiting, Helmet, CORS, WebSocket push, request validation, response envelope, audit metadata |
| auth-service | refresh_tokens | Credential verification, token issuing and rotation, logout, current user resolution |
| user-service | users, roles, permissions, role_permissions, user_roles, audit_logs | Staff user management, dynamic roles and permissions, audit log persistence |
| student-service | students, parents | Student lifecycle, profile, parents and emergency contacts, enrolment history view |
| teacher-service | teachers | Teacher lifecycle, profile, salary information, teacher dashboard data |
| course-service | course_categories, courses | Course catalogue and pricing |
| group-service | groups, group_students | Groups, enrolment and leaving, group statistics |
| schedule-service | branches, rooms, schedules | Weekly schedule slots, rooms and branches, teacher and room conflict detection, calendar view |
| attendance-service | lessons, attendance_records | Lessons, marking attendance, attendance statistics |
| payment-service | invoices, payments | Monthly invoicing, payment recording and allocation, debt and balance calculation, debtor lists |
| notification-service | notifications | Domain-event driven notifications, scheduled payment and debt reminders |
| report-service | — | Dashboard figures, revenue and attendance aggregates, charts data |
| file-service | files | Upload storage and retrieval (student and teacher photos) |

### 3.2 Inter-service communication

NestJS Microservices over the Redis transport. Request/response patterns (`students.findAll`) are
used by the gateway; event patterns (`student.created`, `payment.created`, `invoice.overdue`) are
broadcast to every interested service. The gateway wraps every call with a timeout and translates
`RpcException` payloads into the standard HTTP error envelope. The gateway passes a `meta` object
(user id, roles, permissions, ip, user agent) with every request so services can enforce ownership
rules and emit audit records.

### 3.3 Database

One PostgreSQL database, one schema, shared TypeORM entity library. Each table has exactly one
writing service (table above). Cross-service reads are allowed through the shared entities, which
keeps reporting and profile aggregation efficient and avoids N+1 chatter between services.
Migrations live in `libs/database/migrations` and are run by a one-shot `migrator` application
before the services start. Seeds are idempotent.

### 3.4 Authentication and authorization

- Access token: 15 minutes, signed with `JWT_SECRET`, payload `{ sub, email, roles, permissions }`.
- Refresh token: 7 days, signed with `JWT_REFRESH_SECRET`, stored hashed, rotated on use, revoked on logout.
- Passwords hashed with bcrypt (cost 10).
- Roles and permissions are rows, not code. The seed creates the six default roles and the full
  permission catalogue; admins may create roles and assign any permission. `SUPER_ADMIN` bypasses
  permission checks. Permission codes follow `module.action`.
- Teachers see only their groups, lessons and students; students see only their own profile,
  attendance, invoices and payments.

### 3.5 Billing model

- `Course.price` is the monthly fee. `Group.monthlyFee` defaults to it and may be overridden.
- Enrolment (`GroupStudent`) carries an optional discount percentage.
- Invoices are generated per active enrolment per calendar month (on demand through the API and by
  a scheduled job on the first day of the month). Amount = group fee × (1 − discount).
- Payments are allocated to a specific invoice or, when none is given, to the student's oldest
  unpaid invoices (FIFO). Invoice status moves through PENDING → PARTIALLY_PAID → PAID; invoices
  past their due date with an outstanding amount become OVERDUE.
- Student balance = total payments − total invoiced. Debt = max(0, −balance). Debtors are
  students with debt greater than zero.

### 3.6 Scheduling and attendance

- A `Schedule` row is a weekly slot: group, room, weekday, start and end time, with an effective
  date range. Conflict detection rejects a slot whose time range overlaps another slot for the same
  teacher (through the group) or the same room on the same weekday within overlapping date ranges.
- A `Lesson` is a concrete occurrence on a date. Lessons are generated from schedule slots for a
  date range and may also be created manually. Attendance is recorded per lesson per enrolled
  student with status PRESENT, ABSENT, LATE or EXCUSED.
- Statistics: student attendance %, group attendance %, teacher statistics and monthly series.

### 3.7 Notifications

The notification service listens to domain events and creates per-user notification rows for the
relevant audience (admins and managers for new students and payments, the teacher of a group for
group changes, students with user accounts for their own payments and reminders). A daily job
creates debt reminders. Each created notification is published as `notification.created`; the
gateway pushes it over Socket.IO to the room `user:<id>`.

### 3.8 Audit log

Services emit `audit.log` events with user, action, entity, entity id, old and new values, ip and
user agent after every create, update, delete and other sensitive operation. The user service
persists them. Password hashes and tokens are never included.

### 3.9 API conventions

- Base path `/api/v1`, Swagger at `/api/docs` with Bearer auth.
- Success envelope `{ success: true, statusCode, data }`.
- Error envelope `{ success: false, statusCode, message, errors[], path, timestamp }`.
- List endpoints accept `page`, `limit`, `search`, `sortBy`, `sortOrder` and module filters and
  return `{ items, meta: { page, limit, total, totalPages } }`.

### 3.10 Frontend

Vite + Vue 3.4 application. Layers: `api/` (typed HTTP services), `stores/` (Pinia), `composables/`
(pagination, form validation, confirm, toast, permissions), `components/ui` (in-house component
set: button, input, select, modal, drawer, table, pagination, tabs, dropdown, toast, confirm, badge,
card, empty/loading/error states, charts), `components/layout` (sidebar, header, breadcrumbs),
`views/<module>` (pages), `router/` (guards for auth and permissions), `i18n/` (uz, en, ru,
persisted language). Desktop-first responsive SCSS with design tokens.

### 3.11 Docker

`docker compose up -d` starts postgres, redis, migrator (migrations + seed), the thirteen backend
processes and the frontend (nginx serving the build and proxying `/api` and `/socket.io` to the
gateway). Health checks gate start-up order. A development compose file runs infrastructure only.

### 3.12 Testing

Jest unit tests for the business rules (token issuing and refresh rotation, permission guard,
schedule conflict detection, payment allocation and debt calculation, attendance statistics,
invoice generation) and integration tests for the gateway auth flow and response envelope.

## 4. Out of scope

Payroll calculation, online payments through external providers, SMS/email delivery (notifications
are in-app and real-time only), multi-tenant isolation beyond branches, mobile applications.
