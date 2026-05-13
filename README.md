# RateOple

RateOple is a full-stack media catalog and social platform for tracking, rating, reviewing, and discussing movies, books, and TV series.

## Stack

- Frontend: React 19 + Vite
- Backend: ASP.NET Core Web API on .NET 9
- Data: PostgreSQL via EF Core
- Auth: ASP.NET Identity + JWT in HttpOnly cookies + refresh token rotation
- Account lifecycle: email confirmation, resend confirmation, forgot/reset password, stale unconfirmed cleanup, and read-only unconfirmed/suspended states
- Realtime: SignalR notifications
- External media sources: TMDB and Open Library

## Core Product Areas

- Media catalog and discovery
- Ratings and reviews for media, seasons, and episodes
- User follows and profile/account management
- Collections with hierarchy and follow support
- Media status tracking and watchlist flows
- Groups with posts, comments, votes, staff messages, bans, and pinned media
- Moderation reports, assignments, audit logging, and realtime updates
- Admin media management and dashboard views
- Shared frontend visual system for user, moderator, admin, and super-admin screens

## Current Frontend UX State

The frontend now uses a lightweight shared UI layer rather than page-local styling for common interface patterns. The shared system covers:

- Page and section headers
- Cards, panels, stats, tables, and tabs
- Buttons, inputs, textareas, selects, checkboxes, toggles, and form fields
- Badges/chips and status color treatments
- Loading, empty, error, success, and info states
- Dialogs and destructive-action confirmations
- Shared layout shells for normal, auth, group, admin, and sidebar pages

The latest polish pass applied these patterns across high-traffic user pages, admin/media workflows, moderation workflows, group pages, collection detail, account, and watchlist surfaces. The goal is a cohesive, calm, production-ready interface without changing backend contracts or major product flows.

## Account Lifecycle Configuration

Production email delivery targets Resend through the backend email abstraction. Do not store API keys in source. Required production settings:

- `Email:Provider=Resend`
- `Email:From`
- `Email:FrontendBaseUrl`
- `Resend:ApiKey`
- `UnconfirmedAccountCleanup:Enabled`
- `UnconfirmedAccountCleanup:MaxAgeHours`
- `UnconfirmedAccountCleanup:IntervalMinutes`

Development/test can use `Email:Provider=Fake`. Unconfirmed and suspended users may log in read-only, but backend account-state middleware blocks user-generated-content mutations until confirmation or suspension resolution.

## Repository Layout

```text
backend/
  RateOple/                  API host, controllers, middleware, SignalR, production static hosting
  RateOple.Core/             DTOs, interfaces, validation, and business services
  RateOple.Infrastructure/   EF Core entities, DbContext, configurations, migrations, seeding
  RateOple.Constants/        shared enums and constants
  RateOple.Core.Tests/       backend service/unit tests
  RateOple.Api.Tests/        API/integration-style tests

frontend/
  src/app/                   router and provider composition
  src/features/              feature-based pages/components/services/queries
  src/shared/                shared API, UI primitives, composite components, utilities, and SignalR client
  src/context/               auth/theme/language/media cart state
  tests/e2e/                 Playwright browser coverage
```

## Submission and Local Loading Guide

This repository can be submitted as a ZIP. To run the project locally on another machine, use the steps below.

### 1. Prerequisites

- .NET 9 SDK
- Node.js `^20.19.0 || >=22.12.0`
- npm
- PostgreSQL

### 2. Backend startup

Build the backend solution:

```bash
cd backend
dotnet build RateOple.sln
```

### 2.1 Database setup before running the backend

The backend requires a PostgreSQL database and a valid `ConnectionStrings:DefaultConnection` value in:

- `backend/RateOple/appsettings.json`

If the examiner wants to create/update the database from the existing EF Core migrations, use:

```bash
cd backend
dotnet tool restore
dotnet ef database update --project RateOple.Infrastructure --startup-project RateOple
```

Useful EF Core migration commands:

Create a new migration:

```bash
cd backend
dotnet tool restore
dotnet ef migrations add MigrationName --project RateOple.Infrastructure --startup-project RateOple
```

Remove the last unapplied migration:

```bash
cd backend
dotnet tool restore
dotnet ef migrations remove --project RateOple.Infrastructure --startup-project RateOple
```

Apply migrations to the configured database:

```bash
cd backend
dotnet tool restore
dotnet ef database update --project RateOple.Infrastructure --startup-project RateOple
```

Important note about `dotnet-ef`:

- `backend/.config/dotnet-tools.json` contains the local `dotnet-ef` tool manifest.
- In the current repository, `backend/.config` is present, so `dotnet tool restore` can restore the local `dotnet-ef` tool.
- If a submitted archive excludes `backend/.config`, install `dotnet-ef` globally or restore the tool manifest before running migration commands.

Run one of the backend launch profiles:

HTTP:

```bash
cd backend/RateOple
dotnet run --launch-profile http
```

Backend URL:

```text
http://localhost:5113
```

HTTPS:

```bash
cd backend/RateOple
dotnet run --launch-profile https
```

Backend URLs:

```text
https://localhost:7167
http://localhost:5113
```

### 3. Frontend startup

Open a second terminal and start the Vite app:

```bash
cd frontend
npm install
npm run dev
```

### 4. Frontend `.env.local` setup

The frontend must point to the same backend protocol/origin you are using.

If the backend is running on HTTP:

```bash
cd frontend
cp .env.http.example .env.local
```

If the backend is running on HTTPS:

```bash
cd frontend
cp .env.https.example .env.local
```

Those files set:

- `VITE_API_BASE_URL=http://localhost:5113/api`
- `VITE_API_BASE_URL=https://localhost:7167/api`

### 5. What should open

- Frontend app: usually `http://localhost:5173`
- Backend API over HTTP: `http://localhost:5113/api`
- Backend API over HTTPS: `https://localhost:7167/api`

### 6. Important submission limitations on another machine

- Movie and TV series images and some external media data depend on TMDB and will not fully load without a valid backend `Tmdb:ReadAccessToken`.
- Google authentication will not work locally on another machine without valid backend `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` values.
- Those secrets are not included in the submitted repository.
- Because of that, the project will not function at 100% on another PC out of the box.
- If the examiners want the project to function fully, they should contact me for the missing private configuration.

### 7. Backend configuration reminders

Main backend configuration file:

- `backend/RateOple/appsettings.json`

Important settings:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`
- `Tmdb:ReadAccessToken`
- `Authentication:Google:ClientId`
- `Authentication:Google:ClientSecret`

## Local Development

Useful backend verification commands:

```bash
cd backend
dotnet test RateOple.sln
dotnet run --project RateOple
```

Useful frontend verification commands:

```bash
cd frontend
npm run lint
npm run build
npm run test:e2e
```

The current smoke suite uses Playwright route mocks for fast browser checks, including shared UI rendering and horizontal-overflow coverage on desktop and mobile Chromium.

## Auth Model

- The frontend talks to the backend with `withCredentials` enabled.
- Access and refresh tokens are issued by the backend and stored in HttpOnly cookies.
- Mutating requests use CSRF protection through `GET /api/csrf` and the `X-CSRF-TOKEN` header.
- Google OAuth is backend-mediated and redirects the browser back to the frontend route at `/auth/callback`.
- Google OAuth requires backend Google credentials and is not expected to work on another machine without those secrets.

## External Service Limits in Submitted ZIP

- TMDB-backed movie/TV images and related enrichment require `Tmdb:ReadAccessToken`.
- Google sign-in requires `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret`.
- These secrets are intentionally not included in the repository ZIP/commit.
- Without them, the submitted project is still reviewable, but external-media and Google-auth behavior are partially disabled.

## Production Build

To build the frontend and copy the compiled assets into the backend host:

```bash
cd frontend
npm run build:backend
```

This writes the deployment-ready frontend bundle into `backend/RateOple/wwwroot`.

## Additional Documentation

- [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)
- [SECURITY_AND_DEPLOYMENT_PLAN.md](SECURITY_AND_DEPLOYMENT_PLAN.md)
- [backend/BACKEND_CODE_STRUCTURE.txt](backend/BACKEND_CODE_STRUCTURE.txt)
- [frontend/FRONTEND_CODE_STRUCTURE.txt](frontend/FRONTEND_CODE_STRUCTURE.txt)
- [frontend/README.md](frontend/README.md)

## Latest Verification Snapshot

As of the latest recorded full checks in `results.txt`:

- `dotnet test backend/RateOple.sln` passed with 327 backend tests.
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.
- `cd frontend && npm run test:e2e` passed with 2 Playwright smoke tests.
- `cd frontend && npm run build:backend` passed and copied the Vite output to `backend/RateOple/wwwroot`.
