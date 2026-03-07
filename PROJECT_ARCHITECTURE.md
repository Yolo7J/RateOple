# RateOple Architecture (Current)

## 1. System Overview
RateOple is a full-stack media platform for movies, books, and TV series.

- Frontend: React SPA (`frontend/`) served by Vite.
- Backend: ASP.NET Core Web API (`backend/RateOple`) on .NET 9.
- Database: PostgreSQL via EF Core/Npgsql.
- Auth model: ASP.NET Core Identity + JWT in HttpOnly cookies + refresh-token rotation.

High-level flow:

```text
Browser (React) -> REST API (.NET) -> EF Core -> PostgreSQL
                    \-> TMDB API (server-to-server)
                    \-> Open Library API (server-to-server)
```

---

## 2. Repository Layout

```text
backend/
  RateOple/                # API entrypoint, controllers, DI, middleware setup
  RateOple.Core/           # service implementations + contracts/DTOs
  RateOple.Infrastructure/ # DbContext, entities, EF configs, migrations, middleware, security helpers
  RateOple.Constants/      # enums and policy/role constants

frontend/
  src/app/                 # route table + AppRouter
  src/pages/               # page-level screens
  src/components/          # reusable UI and layout components
  src/services/            # Axios client + API wrappers
  src/context/             # Auth, Theme, Language, MediaCart state
```

---

## 3. Backend Architecture

### 3.1 Composition and Startup
`backend/RateOple/Program.cs` wires the app through extension methods:

- Database: `AddDatabase` -> `ApplicationDbContext` with Npgsql.
- Identity: `AddIdentityConfiguration` with custom `User` (`IdentityUser<Guid>`).
- Authorization: role/policy registration (`RequireAdmin`, `RequireModerator`, etc.).
- Authentication: JWT bearer configured to read `accessToken` from cookie.
- Antiforgery: header `X-CSRF-TOKEN`, cookie `X-CSRF-COOKIE`.
- App services: domain services + HTTP clients for TMDB/Open Library.
- API: Controllers + OpenAPI.

Startup also runs `SeedDatabaseAsync()` to seed roles, superadmin, and genres.

### 3.2 Runtime Middleware Order
Configured in `Extensions/MiddlewareExtensions.cs`:

1. OpenAPI (development)
2. HTTPS redirection
3. Security headers middleware
4. CORS (`http://localhost:5173`, credentials enabled)
5. Routing
6. Authentication
7. Manual antiforgery validation for mutating verbs (unless `[IgnoreAntiforgeryToken]`)
8. Authorization
9. Controller endpoints

### 3.3 Layering (as implemented)

- `RateOple` (API layer): controllers and host configuration.
- `RateOple.Core`: service logic + contracts/DTOs.
- `RateOple.Infrastructure`: EF models/configurations/migrations and security/middleware helpers.
- `RateOple.Constants`: shared enums/constants.

Note: `RateOple.Core` currently references `RateOple.Infrastructure` (project reference), so the code is not strictly dependency-inverted clean architecture; it is a pragmatic layered monolith.

### 3.4 Implemented API Slices

- Auth (`/api/auth`): register, login, refresh, logout, me.
- Media (`/api/media`): list/detail/genres, create/update/delete, bulk create.
- TV Series management (`/api/media/{id}/seasons...`): season/episode CRUD (soft-delete based).
- Ratings (`/api/media/{mediaId}/ratings`): create/delete + summary.
- Follow graph (`/api/follows`): follow/unfollow/status.
- External source endpoints:
  - `/api/media/tmdb/*` and `/api/tmdb/*`
  - `/api/media/books/*` (Open Library proxy)
- CSRF token endpoint: `/api/csrf`.

---

## 4. Data Architecture

### 4.1 Persistence Model
`ApplicationDbContext` includes Identity tables plus core domain sets:

- Media hierarchy: `Media`, `Movie`, `Book`, `TvSeries`, `Season`, `Episode`
- Discovery: `Genre`, `MediaGenre`
- Social/content: `Follow`, `Rating`, `Review`, `Comment`
- Community: `Group`, `GroupMembership`, `GroupPost`, `GroupMedia`
- Library: `Collection`, `CollectionItem`
- Auth sessions: `RefreshToken`

### 4.2 Key Modeling Choices

- Soft delete is used for `Media`, `Season`, and `Episode`.
- `Media` stores denormalized rating aggregates (`AverageRating`, `RatingsCount`) maintained by `RatingService`.
- EF configuration classes in `Infrastructure/Data/Configurations` define constraints and indexes.
- Migrations are tracked in `Infrastructure/Migrations`.

---

## 5. Authentication and Security

- Login creates short-lived JWT access token and long-lived refresh token.
- Both tokens are stored as HttpOnly cookies.
- Refresh tokens are hashed before DB storage (`TokenHasher`).
- Refresh endpoint revokes old token and rotates both tokens.
- Security headers middleware sets CSP, frame/content/referrer/permissions policies, HSTS (HTTPS only), and strips server banners.
- CORS is credential-enabled for local frontend origin.

Antiforgery model:

- Global middleware enforces CSRF on mutating methods.
- Endpoints explicitly marked `[IgnoreAntiforgeryToken]` bypass that check.
- Dedicated endpoint exists to fetch token (`/api/csrf`).

---

## 6. Frontend Architecture

### 6.1 App Shell and Routing

- Root providers in `src/main.jsx`:
  - `ThemeProvider` -> `LanguageProvider` -> `BrowserRouter` -> `AuthProvider` -> `MediaCartProvider`
- `Header` and `Footer` wrap all routes globally.
- Route mapping is centralized in `src/app/routes.jsx`.

Current routed pages:

- `/` home
- `/login`, `/register`
- `/media` list
- `/media/add`
- `/media/:id`
- `/media/:id/seasons`
- `/cart`

### 6.2 State and Service Boundaries

- `AuthContext`: boot-time session restore (`/auth/me`, fallback `/auth/refresh`), login/register/logout actions.
- `MediaCartContext`: localStorage-backed staging area for bulk media creation.
- `services/api.js`: shared Axios instance (`withCredentials: true`, base URL `http://localhost:5113/api`).
- Feature services (`mediaService`, `tvSeriesService`, `ratingService`, `tmdbService`) wrap endpoint calls.

### 6.3 Current Feature Coverage

Implemented UI flows:

- Media browsing with filters/sort/search/pagination.
- Media detail view.
- Add media workflow with TMDB/Open Library assisted autofill.
- Cart-based bulk submission.
- TV season/episode manager with TMDB preview/import support.
- Login/register and session-aware header.

---

## 7. End-to-End Request Flow (Typical)

Example: user rates a media item.

1. React calls `POST /api/media/{id}/ratings` with credentials.
2. API authenticates via JWT cookie.
3. Antiforgery middleware validates request unless endpoint is opted out.
4. `RatingsController` delegates to `RatingService`.
5. Service upserts user rating, recalculates media aggregates, persists via EF Core.
6. Updated summary is available via `GET /api/media/{id}/ratings/summary`.

---

## 8. Architecture Notes (Current Reality)

- The codebase is modular and layered, but not fully strict clean architecture because Core depends on Infrastructure.
- API surface is ahead of frontend in some slices (e.g., groups/collections/reviews entities exist but are not yet first-class UI flows).
- There are two TMDB entrypoint styles (`/api/tmdb/*` and `/api/media/tmdb/*`); both are currently used by frontend services/pages.

This document reflects the repository state as of **March 7, 2026**.
