# RateOple Architecture (Current State)

Last updated: **March 8, 2026**

This document reflects the code currently present in the repository.

## 1. System Summary

RateOple is a full-stack media catalog and social platform with:

- Media catalog for Movies, Books, TV series (with seasons/episodes)
- Ratings and reviews
- User follows
- Hierarchical collections with follow support
- User media status tracking
- Media tags
- Group system with posts and pinned media
- Moderation/reporting and moderator assignments
- Database-backed notifications (with publisher abstraction for future realtime delivery)

Core stack:

- Frontend: React + Vite (`frontend/`)
- Backend: ASP.NET Core Web API on .NET 9 (`backend/RateOple`)
- Data: PostgreSQL via EF Core + Npgsql
- Auth: ASP.NET Identity + JWT in HttpOnly cookies + refresh token rotation
- External integrations: TMDB and Open Library (server-side)

Runtime flow:

```text
Browser (React)
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
  RateOple/                          # API host, controllers, middleware wiring, DI setup
    Controllers/
      Auth/ Collections/ Discovery/ Groups/ Media/ Moderation/ Users/
    Extensions/                      # DI + middleware composition
  RateOple.Core/                     # domain services, interfaces, DTOs
    Auth/ Collections/ Groups/ Media/ Moderation/ Social/ Users/
  RateOple.Infrastructure/           # DbContext, entities, EF configs, migrations, infra middleware
    Data/Configurations/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Entities/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Seeding/
    Migrations/
  RateOple.Constants/                # enums and constants

frontend/
  src/app/                           # router + provider composition
  src/layouts/                       # Main/Auth/Group/Admin layouts
  src/context/                       # global contexts (auth/theme/language/cart)
  src/features/
    auth/ collections/ discovery/ groups/ media/ moderation/
    notifications/ ratings/ reviews/ users/
    # each feature uses pages/components/services/queries (+ hooks placeholders in some)
  src/shared/
    api/                             # axios client, query client, auth interceptor
    components/                      # shared Header/Footer
    ui/                              # reusable toggles/search/rating UI
    constants/ utils/
  src/components/ + src/services/ + src/pages/
    # legacy modules still present and partly referenced
```

## 3. Backend Startup Composition

`backend/RateOple/Program.cs` configures services in this order:

1. `AddDatabase`
2. `AddIdentityConfiguration`
3. `AddAuthorizationPolicies`
4. `AddJwtAuthentication`
5. `AddCsrfProtection`
6. `AddApplicationServices`
7. `AddCorsConfiguration`
8. `AddApi`

Then:

- `SeedDatabaseAsync()` runs (roles, super admin, genres)
- middleware pipeline is configured via `ConfigureMiddleware`

## 4. Middleware, Auth, Security

### 4.1 Middleware Pipeline

Configured in `Extensions/MiddlewareExtensions.cs`:

1. OpenAPI map in development
2. HTTPS redirection
3. security headers middleware
4. CORS (`AllowFrontend`)
5. routing
6. authentication
7. antiforgery validation for mutating verbs unless endpoint has `[IgnoreAntiforgeryToken]`
8. authorization
9. controller mapping

### 4.2 Authentication Model

- Identity user store + role model
- JWT Bearer configured as default auth scheme
- JWT is read from `accessToken` cookie
- refresh token rotation with hashed refresh tokens in DB

Auth endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 4.3 CSRF and CORS

- CSRF endpoint: `GET /api/csrf`
- Antiforgery header: `X-CSRF-TOKEN`
- CORS policy allows local frontend origins with credentials

### 4.4 Authorization Policies

Defined in `AuthorizationExtensions`:

- `RequireAdmin`
- `RequireModerator`
- `CanModerateContent`
- `CanManageGroups`

## 5. Layer Structure

### 5.1 Core Layer (`RateOple.Core`)

Domain folders:

- `Auth`
- `Media`
- `Collections`
- `Users`
- `Social`
- `Groups`
- `Moderation`

Each domain follows `DTOs`, `Interfaces`, `Services`.

### 5.2 Infrastructure Layer (`RateOple.Infrastructure`)

Entity folders:

- `Data/Entities/Media`
- `Data/Entities/Collections`
- `Data/Entities/Social`
- `Data/Entities/Groups`
- `Data/Entities/Users`
- `Data/Entities/Moderation`

Configuration folders mirror entity domains:

- `Data/Configurations/Media`
- `Data/Configurations/Collections`
- `Data/Configurations/Social`
- `Data/Configurations/Groups`
- `Data/Configurations/Users`
- `Data/Configurations/Moderation`

`ApplicationDbContext` applies all configurations via `ApplyConfigurationsFromAssembly`.

Note: Entities are physically domain-grouped in folders but currently share namespace `RateOple.Infrastructure.Data.Entities`.

### 5.3 Controllers by Domain

`backend/RateOple/Controllers`:

- `Auth`
- `Media`
- `Discovery`
- `Collections`
- `Users`
- `Groups`
- `Moderation`

## 6. Database Model (Current)

### 6.1 Media Domain

- `Media` (soft delete, aggregate ratings)
- `Movie` (1:1 with `Media`)
- `Book` (1:1)
- `TvSeries` (1:1)
- `Season` (TV child, soft delete)
- `Episode` (Season child, soft delete)
- `Genre`
- `MediaGenre` (many-to-many)
- `Tag`
- `MediaTag` (many-to-many)

### 6.2 Social Domain

- `Rating` (exactly one target: media/season/episode)
- `Review` (1:1 with `Rating`)
- `Comment` (polymorphic: review/group post/reply hierarchy)
- `Follow` (user-to-user)
- `MediaInteraction`
- `UserGenreScore`

### 6.3 Collections Domain

- `Collection` (hierarchical parent/child, owner type, sort mode)
- `CollectionItem` (ordered media in collection)
- `FollowCollection`

### 6.4 Groups Domain

- `Group`
- `GroupMembership`
- `GroupPost`
- `GroupMedia` (pinned media)
- `PostMedia` (media attached to group posts)

### 6.5 Users Domain

- `User` (Identity)
- `UserProfile`
- `RefreshToken`
- `UserMediaStatus`
- `Notification`

### 6.6 Moderation Domain

- `Report`
- `ModeratorAssignment`

## 7. Service Registration (DI)

`AddApplicationServices` currently registers:

- Auth: `IJwtService`
- Media: `IMediaService`, `ITvSeriesService`, `ITmdbService`, `IOpenLibraryService`, `ITmdbImportService`, `IDiscoveryService`
- Social: `IRatingService`, `IReviewService`, `IFollowService`, `IInteractionService`, `IUserTasteService`, `IVisibilityService`
- Collections: `ICollectionService`
- Users: `IUserProfileService`, `IUserMediaStatusService`, `INotificationService`, `INotificationPublisher` (noop)
- Groups: `IGroupService`
- Moderation: `IModerationService`

## 8. API Surface

### 8.1 Auth and CSRF

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/csrf`

### 8.2 Discovery

- `GET /api/discovery/trending`
- `GET /api/discovery/popular`
- `GET /api/discovery/recommended`
- `GET /api/media/{id}/similar`

### 8.3 Media

Read/query:

- `GET /api/media`
- `GET /api/media/{id}`
- `GET /api/media/genres`
- `GET /api/media/tags`

External proxy endpoints (media namespace):

- `GET /api/media/tmdb/search`
- `GET /api/media/tmdb/details/{tmdbId}`
- `GET /api/media/tmdb/series/{tmdbId}`
- `GET /api/media/books/search`
- `GET /api/media/books/details`

Mutation:

- `POST /api/media/movies`
- `POST /api/media/books`
- `POST /api/media/tvseries`
- `POST /api/media/bulk`
- `PUT /api/media/{id}/movie`
- `PUT /api/media/{id}/book`
- `PUT /api/media/{id}/tvseries`
- `DELETE /api/media/{id}`

TV management:

- `GET /api/media/{id}/seasons`
- `POST /api/media/{id}/seasons`
- `PUT /api/media/{id}/seasons/{seasonNumber}`
- `DELETE /api/media/{id}/seasons/{seasonNumber}`
- `POST /api/media/{id}/seasons/{seasonNumber}/episodes`
- `PUT /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}`
- `DELETE /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}`

Tags and status:

- `POST /api/media/{id}/tags`
- `DELETE /api/media/{id}/tags/{tagId}`
- `POST /api/media/{id}/status`

### 8.4 TMDB Alternate Controller

Separate controller still exists:

- `GET /api/tmdb/search`
- `GET /api/tmdb/details`
- `POST /api/tmdb/import-series/{tmdbId}`

### 8.5 Ratings and Reviews

Ratings:

- `POST /api/media/{mediaId}/ratings`
- `POST /api/seasons/{seasonId}/ratings`
- `POST /api/episodes/{episodeId}/ratings`
- `DELETE /api/media/{mediaId}/ratings`
- `DELETE /api/seasons/{seasonId}/ratings`
- `DELETE /api/episodes/{episodeId}/ratings`
- `GET /api/media/{mediaId}/ratings/summary`
- `GET /api/seasons/{seasonId}/ratings/summary`
- `GET /api/episodes/{episodeId}/ratings/summary`

Reviews:

- `POST /api/reviews`
- `PUT /api/reviews/{reviewId}`
- `DELETE /api/reviews/{reviewId}`
- `GET /api/media/{mediaId}/reviews`

### 8.6 Users

Follows:

- `POST /api/follows/{userId}`
- `DELETE /api/follows/{userId}`
- `GET /api/follows/{userId}/status`

Under `/api/users/me`:

- `GET /profile`
- `PUT /profile`
- `POST /change-password`
- `DELETE /`
- `GET /status`

Notifications:

- `GET /api/notifications`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`

### 8.7 Collections

- `GET /api/collections`
- `GET /api/collections/{id}`
- `POST /api/collections`
- `PUT /api/collections/{id}`
- `DELETE /api/collections/{id}`
- `POST /api/collections/{id}/items`
- `DELETE /api/collections/{id}/items/{mediaId}`
- `POST /api/collections/{id}/follow`
- `DELETE /api/collections/{id}/follow`

### 8.8 Groups

- `GET /api/groups`
- `GET /api/groups/{id}`
- `POST /api/groups`
- `POST /api/groups/{id}/join`
- `DELETE /api/groups/{id}/leave`
- `POST /api/groups/{id}/members/{userId}/role`
- `POST /api/groups/{id}/posts`
- `GET /api/groups/{id}/posts`
- `POST /api/groups/{id}/pinned-media`
- `GET /api/groups/{id}/pinned-media`

### 8.9 Moderation

- `POST /api/moderation/reports`
- `GET /api/moderation/reports`
- `PUT /api/moderation/reports/{id}/status`
- `POST /api/moderation/assignments`
- `GET /api/moderation/assignments`
- `DELETE /api/moderation/assignments`

## 9. Frontend Contract Snapshot

- Primary routing is in `frontend/src/app/router.jsx` (rendered by `AppRouter.jsx`).
- `frontend/src/app/routes.jsx` exists as a route map artifact but is not the active router.
- Providers are composed in `frontend/src/app/providers.jsx`:
  Theme -> Language -> React Query -> BrowserRouter -> Auth -> MediaCart.
- API access goes through `frontend/src/shared/api/apiClient.js` with:
  - auth/csrf interceptors (`authInterceptor.js`)
  - credentials-enabled cookie auth
- Server state is fetched through feature query hooks (React Query), commonly wrapped by
  `frontend/src/shared/utils/useQueryResource.js`.

Current frontend/backend user contract is aligned for:

- `GET /api/users/me/profile`
- `PUT /api/users/me/profile`
- `POST /api/users/me/change-password`
- `DELETE /api/users/me`
- `GET /api/users/me/status`
- `GET /api/users/me/ratings`
- `GET /api/users/me/reviews`
- `GET /api/users/me/favorite-genres`

Related contracts currently in use:

- `POST /api/media/{id}/status`
- notifications endpoints under `/api/notifications`
- moderation endpoints under `/api/moderation/*`

## 10. External Integrations

### 10.1 TMDB

`TmdbService` provides:

- movie/tv search
- details
- full TV series data with seasons and episodes

`TmdbImportService` imports a TMDB series into local media records.

### 10.2 Open Library

`OpenLibraryService` provides:

- book search mapping to app DTOs
- book details mapping from OL work endpoint

## 11. Notification Design (Future Realtime Ready)

Notifications are persisted first (DB is source of truth).

Realtime extension point:

- `INotificationPublisher`
- current implementation: `NoopNotificationPublisher`
- future websocket/signalR delivery can replace noop publisher without changing notification service interface.

Current notification hooks:

- moderation report status updates notify the report reporter
- moderator assignments notify the assigned user

## 12. Delivery Stage Status (8-Stage Plan)

Completed:

- Stage 1: Architecture refactor (domain folders for entities/configurations/core/controllers)
- Stage 2: User profile system
- Stage 3: Collection improvements (hierarchy, ownership, follow)
- Stage 4: Media status tracking
- Stage 5: Tag system
- Stage 6: Groups
- Stage 7: Moderation (reports + assignments)
- Stage 8: Notifications

Not yet implemented from larger long-form roadmap:

- Unified comment target model redesign (current model is still legacy polymorphic shape)
- Review voting
- Additional moderation role expansion beyond current implementation details
- websocket-based notification delivery (abstraction is in place)
