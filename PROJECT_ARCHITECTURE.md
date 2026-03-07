# RateOple Architecture (Current State)

Last updated: **March 7, 2026**

This document describes the architecture that is actually implemented in the repository right now.

## 1. System Summary

RateOple is a full-stack media catalog/rating app with support for:

- Movies
- Books
- TV series (including seasons/episodes)

Core stack:

- Frontend: React + Vite SPA (`frontend/`)
- Backend: ASP.NET Core Web API on .NET 9 (`backend/RateOple`)
- Data: PostgreSQL via EF Core + Npgsql
- Auth: ASP.NET Identity + JWT access token in HttpOnly cookie + refresh-token rotation
- External data sources: TMDB + Open Library (server-to-server only)

Runtime request graph:

```text
Browser (React, Vite)
   -> Axios (withCredentials)
      -> ASP.NET Core API
         -> Core Services
            -> EF Core / PostgreSQL
            -> TMDB API
            -> Open Library API
```

## 2. Repository Layout

```text
backend/
  RateOple/                         # API host, controllers, DI extension setup
  RateOple.Core/                    # service implementations + contracts/DTOs
  RateOple.Infrastructure/          # DbContext, entities, EF configs/migrations, middleware
  RateOple.Constants/               # enums/constants (roles/policies/etc.)

frontend/
  src/app/                          # router table + router component
  src/pages/                        # page-level screens
  src/components/                   # layout + reusable UI components
  src/services/                     # Axios client + endpoint wrappers
  src/context/                      # auth/theme/language/cart global state
  src/locales/                      # i18n JSON files (en/bg)
```

## 3. Backend Architecture

### 3.1 Composition Root

`backend/RateOple/Program.cs` composes the app in this order:

1. `AddDatabase`
2. `AddIdentityConfiguration`
3. `AddAuthorizationPolicies`
4. `AddJwtAuthentication`
5. `AddCsrfProtection`
6. `AddApplicationServices`
7. `AddCorsConfiguration`
8. `AddApi`

After build:

- `SeedDatabaseAsync()` runs (roles/superadmin/genres seed flow lives in Infrastructure extensions).
- Middleware pipeline is configured via `ConfigureMiddleware`.

### 3.2 Middleware Pipeline

`Extensions/MiddlewareExtensions.cs` currently applies:

1. OpenAPI (development only)
2. `UseHttpsRedirection`
3. `UseSecurityHeaders`
4. `UseCors("AllowFrontend")`
5. `UseRouting`
6. `UseAuthentication`
7. Manual antiforgery validation for mutating verbs (`POST`, `PUT`, `DELETE`, `PATCH`) unless endpoint has `[IgnoreAntiforgeryToken]`
8. `UseAuthorization`
9. `MapControllers`

### 3.3 DI / Service Registration

`Extensions/ApplicationServicesExtensions.cs` registers:

- `IMediaService -> MediaService`
- `ITvSeriesService -> TvSeriesService`
- `IRatingService -> RatingService`
- `IFollowService -> FollowService`
- `IVisibilityService -> VisibilityService`
- `IJwtService -> JwtService`
- `ITmdbService -> TmdbService` (HttpClient)
- `IOpenLibraryService -> OpenLibraryService` (HttpClient)
- `ITmdbImportService -> TmdbImportService`

### 3.4 Layering Reality

The solution is a pragmatic layered monolith.

- API project depends on Core contracts/services.
- Core currently references Infrastructure entities/DbContext.
- This is not strict clean architecture inversion, but deliberate and functional for current scope.

## 4. Security, Auth, and Session Model

### 4.1 Authentication

`AuthController` implements:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Behavior:

- On login/refresh, backend issues:
  - `accessToken` cookie (HttpOnly, short-lived)
  - `refreshToken` cookie (HttpOnly, longer-lived)
- Refresh tokens are hashed before storage (`TokenHasher`).
- Refresh endpoint revokes old refresh token and rotates to a new one.

### 4.2 JWT Bearer Strategy

JWT auth is configured to read token from cookie (`accessToken`) rather than Authorization header.

Identity cookie redirect behavior is overridden so unauthorized API calls return HTTP status (`401/403`) instead of redirecting to MVC login pages.

### 4.3 CSRF Strategy

Antiforgery configured with:

- Header: `X-CSRF-TOKEN`
- Cookie: `X-CSRF-COOKIE`

Global middleware enforces CSRF validation for mutating methods unless endpoint opts out using `[IgnoreAntiforgeryToken]`.

Current API usage pattern:

- Many mutating endpoints are explicitly marked with `[IgnoreAntiforgeryToken]`.
- `GET /api/csrf` exists and returns a request token for clients that choose to use CSRF-protected mutations.

### 4.4 CORS and Security Headers

CORS policy `AllowFrontend` allows:

- Origin: `http://localhost:5173`
- Any method/header
- Credentials

Custom security middleware sets:

- `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, HSTS (HTTPS only)
- Removes `Server` and `X-Powered-By` headers

## 5. Data Architecture

### 5.1 DbContext

`ApplicationDbContext` includes Identity + domain sets:

- Media domain: `Media`, `Movie`, `Book`, `TvSeries`, `Season`, `Episode`
- Discovery: `Genre`, `MediaGenre`
- Social/content: `Follow`, `Rating`, `Review`, `Comment`
- Groups/community: `Group`, `GroupMembership`, `GroupPost`, `GroupMedia`
- Collections: `Collection`, `CollectionItem`
- Auth/session: `RefreshToken`

### 5.2 Data Modeling Notes

- Soft-delete is used for `Media`, `Season`, `Episode`.
- `Media` stores denormalized rating aggregates (`AverageRating`, `RatingsCount`).
- TV seasons/episodes are represented as child entities under `TvSeries`.
- EF configurations are split by entity under `Infrastructure/Data/Configurations`.
- Migrations are under `Infrastructure/Migrations`.

## 6. API Surface (Current)

### 6.1 Media (`/api/media`)

Read:

- `GET /api/media` (paged query, filters/sort/search)
- `GET /api/media/{id}`
- `GET /api/media/genres`

External proxy (media namespace):

- `GET /api/media/tmdb/search`
- `GET /api/media/tmdb/details/{tmdbId}`
- `GET /api/media/tmdb/series/{tmdbId}`
- `GET /api/media/books/search`
- `GET /api/media/books/details`

Create/update/delete:

- `POST /api/media/movies`
- `POST /api/media/books`
- `POST /api/media/tvseries`
- `POST /api/media/bulk`
- `PUT /api/media/{id}/movie`
- `PUT /api/media/{id}/book`
- `PUT /api/media/{id}/tvseries`
- `DELETE /api/media/{id}` (soft delete)

TV season/episode management (nested):

- `GET /api/media/{id}/seasons`
- `POST /api/media/{id}/seasons`
- `PUT /api/media/{id}/seasons/{seasonNumber}`
- `DELETE /api/media/{id}/seasons/{seasonNumber}`
- `POST /api/media/{id}/seasons/{seasonNumber}/episodes`
- `PUT /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}`
- `DELETE /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}`

### 6.2 Auth (`/api/auth`)

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me`

### 6.3 Ratings

`/api/media/{mediaId}/ratings`

- `POST` rate/update rating
- `DELETE` delete rating
- `GET /summary` aggregate + optional user rating

### 6.4 Follows

`/api/follows` (authorized)

- `POST /{userId}`
- `DELETE /{userId}`
- `GET /{userId}/status`

### 6.5 TMDB Alternate Controller

There is also a second TMDB controller under `/api/tmdb`:

- `GET /api/tmdb/search`
- `GET /api/tmdb/details`
- `POST /api/tmdb/import-series/{tmdbId}`

This overlaps with `/api/media/tmdb/*` endpoints and both are currently used by frontend code.

## 7. DTO and Contract Shape

### 7.1 `MediaDetailDto`

Returns common fields plus media-type specifics.

Common:

- `id`, `type`, `title`, `description`, `coverUrl`, `releaseYear`, `averageRating`, `ratingsCount`, `genres`

Type-specific currently included:

- Movie: `director`, `duration`, `tmdbId`
- Book: `author`, `pages`, `isbn`, `olId`
- TV: `seasonsCount`, `seasons[]`, `tmdbId`

### 7.2 TV DTOs

- Create TV series supports full season+episode tree:
  - `CreateTvSeriesDto.Seasons -> List<CreateSeasonDto>`
- Season update endpoint uses upsert style:
  - `UpsertSeasonDto` with `SeasonNumber` and `Episodes` list
- Episode upsert uses `EpisodeNumber` as match key.

## 8. Frontend Architecture

### 8.1 Root Composition

`frontend/src/main.jsx` wraps providers in this order:

1. `ThemeProvider`
2. `LanguageProvider`
3. `BrowserRouter`
4. `AuthProvider`
5. `MediaCartProvider`

`Header` and `Footer` are mounted globally around `<App />`.

### 8.2 Routing

`frontend/src/app/routes.jsx` currently defines:

- `/` -> `Home`
- `/login` -> `LoginPage`
- `/register` -> `RegisterPage`
- `/media` -> `MediaListPage`
- `/media/add` -> `AddMediaPage`
- `/media/:id` -> `MediaDetailPage`
- `/media/:id/seasons` -> `SeasonManagerPage`
- `/cart` -> `CartPage`
- `*` -> `Home`

### 8.3 Global State Contexts

- `AuthContext`
  - On app load: tries `/auth/me`, then fallback `/auth/refresh`.
  - Exposes `user`, `login`, `register`, `logout`.
- `MediaCartContext`
  - LocalStorage-backed staged creation payloads for bulk submit.
- `ThemeContext`
  - Stores theme in localStorage + `data-theme` on root.
- `LanguageContext`
  - Stores language in localStorage + `lang` attribute, supports `t()` key lookup with interpolation.

### 8.4 Frontend Service Layer

Core API wrappers:

- `services/api.js` -> Axios instance (`baseURL=http://localhost:5113/api`, `withCredentials: true`)
- `services/mediaService.js`
- `services/tvSeriesService.js`
- `services/ratingService.js`
- `services/tmdbService.js` (alternate TMDB route family)

## 9. Implemented Product Flows

### 9.1 Media Discovery

`MediaListPage` supports:

- Search
- Type and genre filters
- Sort options
- Pagination
- URL query-state synchronization

### 9.2 Media Details

`MediaDetailPage` supports:

- Hero section with cover and metadata
- Season accordion for TV content
- Direct navigation to season manager
- Back button route is hardcoded to `/media`

### 9.3 Add Media + Cart + Bulk Submit

`AddMediaPage` is a multistep wizard:

1. Select type (Movie/Book/TV)
2. Search external source (TMDB/Open Library) or skip
3. Fill/edit form and add to cart

TV-specific behavior:

- Can include seasons/episodes at creation time
- Can prefill TV seasons from TMDB series details

`CartPage`:

- Edits/removes staged items
- Submits all via `POST /api/media/bulk`
- Tracks per-item success/error state from bulk response

### 9.4 TV Season Manager

`SeasonManagerPage` provides:

Manual management:

- Add season with episodes
- Rename season number
- Delete season
- Add episode
- Edit episode title/duration
- Delete episode

TMDB-assisted management:

- Load TMDB seasons preview from stored `tmdbId`
- If no stored `tmdbId`, find candidate series by title and select one
- Sync/import all previewed seasons
- Sync/import a single season
- Merge behavior updates existing seasons and inserts missing episodes

## 10. External Integrations

### 10.1 TMDB

`TmdbService` does:

- Search (`movie`/`tv`)
- Details for movie or TV
- Full series graph retrieval with seasons+episodes

Implementation notes:

- Uses read-access token from configuration (`Tmdb:ReadAccessToken`)
- Keeps API key/token off the browser
- Skips season 0 (specials)
- Fetches each season in parallel for full series details

### 10.2 Open Library

`OpenLibraryService` does:

- Search endpoint mapping to lightweight DTO
- Details by work id (`/works/...`)
- Normalizes optional fields and cover URLs

## 11. Known Gaps / Inconsistencies (Current)

These are present in code and should be considered architecture debt:

1. Duplicate TMDB API families
- Both `/api/media/tmdb/*` and `/api/tmdb/*` exist.
- Frontend uses both (`mediaService` and `tmdbService`).

2. Route mismatches in frontend navigation
- `CartPage` currently navigates to `/admin` in several places.
- `/admin` route is not defined in `routes.jsx`.

3. Header links to non-existent routes
- Header actions include `/account` and nav includes `/about`.
- Neither route currently exists in router table.

4. DTO/UI shape mismatch for genres in details page
- `MediaDetailDto.Genres` is currently `List<string>`.
- `MediaDetailPage` renders `g.name`, implying object shape.

5. Ratings controller vs service contract mismatch
- `ratingService.getUserRatings` calls `/users/{id}/ratings`, but that endpoint is not implemented in shown controllers.

## 12. Practical Extension Points

Most natural extension seams in current architecture:

- Add missing route pages (`/about`, `/account`, optional `/admin`) or align existing navigations.
- Consolidate TMDB API surface to one route family and one frontend service abstraction.
- Move more business invariants into service layer validation (season/episode numbering constraints, additional duplicate guards).
- Add integration tests around TV season manager merge semantics (manual + TMDB sync).
- Introduce stricter architectural boundaries (Core abstractions over persistence) if project complexity grows.

