# RateOple Architecture (Current State)

Last updated: **April 26, 2026**

This document reflects the code currently present in the repository.

## 1. System Summary

RateOple is a full-stack media catalog and social platform with:

- Media catalog for Movies, Books, TV series (with seasons/episodes)
- Ratings and reviews (media, seasons, episodes)
- User follows
- Hierarchical collections with follow support
- User media status tracking
- Media tags
- Group system with posts, comments, votes, staff messages, bans, and pinned media
- Moderation/reporting and moderator assignments
- Admin panel with dashboard + media management (add/edit/delete)
- Database-backed notifications with SignalR realtime delivery

Core stack:

- Frontend: React + Vite (`frontend/`)
- Backend: ASP.NET Core Web API on .NET 9 (`backend/RateOple`)
- Data: PostgreSQL via EF Core + Npgsql
- Auth: ASP.NET Identity + JWT in HttpOnly cookies + refresh token rotation
- External integrations: TMDB and Open Library (server-side)

Runtime flow:

```text
Browser (React)
  -> Axios (withCredentials) + SignalR client
    -> ASP.NET Core API
      -> Core Services
        -> EF Core / PostgreSQL
        -> TMDB API
        -> Open Library API
```

Development serves React through Vite and the API through ASP.NET Core with a development-only CORS policy. Production serves compiled Vite artifacts from `backend/RateOple/wwwroot`, with API routes under `/api`, SignalR under `/hubs`, and frontend routes falling back to `index.html`.

## 2. Repository Layout

```text
backend/
  RateOple/                          # API host, controllers, middleware wiring, DI setup
    Controllers/
      Auth/ Collections/ Discovery/ Groups/ Media/ Moderation/ Users/
    Hubs/                            # SignalR hubs + user id provider
    Notifications/                   # SignalR publishers
    Extensions/                      # DI + middleware composition
    wwwroot/                         # compiled frontend build output for production hosting
  RateOple.Core/                     # domain services, interfaces, DTOs
    Auth/ Collections/ Groups/ Media/ Moderation/ Social/ Users/
  RateOple.Infrastructure/           # DbContext, entities, EF configs, migrations, infra middleware
    Data/Configurations/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Entities/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Seeding/
    Middleware/
    Migrations/
    Security/
  RateOple.Constants/                # enums and constants

frontend/
  src/app/                           # router + provider composition
    AppRouter.jsx router.jsx routes.jsx providers.jsx
  src/layouts/                       # Admin/Auth/Group/Main/Page/Sidebar layouts
  src/context/                       # global contexts (auth/theme/language/media cart)
  src/hooks/                         # shared hooks (useTheme/useLanguage/useQueryResource)
  src/features/
    admin/ auth/ collections/ discovery/ groups/ media/ moderation/
    notifications/ ratings/ reviews/ users/
    # each feature uses pages/components/services/queries (+ hooks placeholders in some)
    # realtime hooks live under feature `realtime/` folders
  src/shared/
    api/                             # axios client, auth interceptor, React Query client
    components/                      # shared Header/Footer/MediaCard
    ui/                              # layout primitives + toggles/search/rating UI
    constants/ utils/
    signalr/                         # SignalR client
  src/locales/                       # i18n dictionaries
  src/assets/                        # bundled static assets
  src/styles/                        # placeholder for global styles
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
9. `AddSignalR` + `IUserIdProvider` for `NameIdentifier` mapping

Then:

- `SeedDatabaseAsync()` runs according to explicit `Seed:Mode`
- middleware pipeline is configured via `ConfigureMiddleware`

Seed modes:

- `None`: no app data seeding.
- `Required`: roles and genres; super-admin only when valid `Seed:SuperAdmin` settings are provided.
- `Demo`: development-only; roles, genres, configured super-admin, and configured demo users.

No seeder uses fallback passwords. Production rejects `Demo` mode and known placeholder super-admin passwords.

## 4. Middleware, Auth, Security

### 4.1 Middleware Pipeline

Configured in `Extensions/MiddlewareExtensions.cs`:

1. OpenAPI map in development
2. HTTPS redirection
3. security headers middleware
4. default/static files from `wwwroot`
5. development-only CORS (`AllowFrontend`)
6. routing
7. authentication
8. antiforgery validation for mutating verbs unless endpoint has `[IgnoreAntiforgeryToken]`
   (SignalR hub endpoints are excluded from antiforgery)
9. authorization
10. controller + SignalR hub mapping
11. SPA fallback to `wwwroot/index.html` for non-API/non-hub frontend routes

Production frontend build command:

```bash
cd frontend
npm run build:backend
```

This builds Vite and copies `frontend/dist` into `backend/RateOple/wwwroot`. React source files stay in `frontend/`; `wwwroot` is only for compiled deployment artifacts.

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
- `GET /api/auth/google/login`
- `GET /api/auth/google/callback`

Google OAuth is backend-mediated only. It registers only when `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` are configured. The frontend starts the flow by navigating to `/api/auth/google/login`; the backend handles the Google callback, creates or links an ASP.NET Identity user, issues the normal HttpOnly app cookies, and redirects back to a local frontend route.

### 4.3 CSRF and CORS

- CSRF endpoint: `GET /api/csrf`
- Antiforgery header: `X-CSRF-TOKEN`
- CORS policy allows local frontend origins with credentials
- Mutating API endpoints require antiforgery validation when using cookie auth.
- The SignalR hub is the only documented antiforgery exemption because negotiate/connect transport requests do not behave like normal JSON mutations.

### 4.4 Authorization Policies

Defined in `AuthorizationExtensions`:

- `RequireAdmin`
- `RequireModerator`
- `CanModerateContent`
- `CanManageGroups`

Roles:

- Global (Identity): `SuperAdmin`, `Admin`, `Moderator`, `User`
- GroupMembership: `Owner`, `GroupAdmin`, `GroupModerator`, `Member`

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
- `GroupBan`
- `GroupMembership`
- `GroupPost`
- `GroupPostVote`
- `GroupMedia` (pinned media)
- `GroupStaffMessage`
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
- `ModerationAuditLog`

## 7. Service Registration (DI)

`AddApplicationServices` currently registers:

- Auth: `IJwtService`
- Media: `IMediaService`, `ITvSeriesService`, `ITmdbService`, `IOpenLibraryService`, `ITmdbImportService`, `IDiscoveryService`
- Social: `IRatingService`, `IReviewService`, `IFollowService`, `IInteractionService`, `IUserTasteService`, `IVisibilityService`
- Collections: `ICollectionService`
- Users: `IUserProfileService`, `IUserMediaStatusService`, `INotificationService`, `INotificationPublisher` (SignalR)
- Groups: `IGroupService`
- Moderation: `IModerationService`, `IModerationAuditService`, `IModerationRealtimePublisher` (SignalR)

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
  
Catalog mutations require the `RequireAdmin` policy; user status updates require authentication.

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

`POST /api/tmdb/import-series/{tmdbId}` requires the `RequireAdmin` policy.

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
SignalR hubs:

- `GET/POST /hubs/notifications` (SignalR)

### 8.7 Collections

- `GET /api/collections`
- `GET /api/collections/{id}`
- `POST /api/collections`
- `PUT /api/collections/{id}`
- `DELETE /api/collections/{id}`
- `POST /api/collections/{id}/items`
- `DELETE /api/collections/{id}/items/{mediaId}`
- `PUT /api/collections/{id}/items/reorder`
- `POST /api/collections/{id}/follow`
- `DELETE /api/collections/{id}/follow`

### 8.8 Groups

- `GET /api/groups`
- `GET /api/groups/{id}`
- `GET /api/groups/{id}/members`
- `POST /api/groups`
- `POST /api/groups/{id}/join`
- `DELETE /api/groups/{id}/leave`
- `POST /api/groups/{id}/members/{userId}/role`
- `POST /api/groups/{id}/posts`
- `GET /api/groups/{id}/posts`
- `GET /api/groups/{id}/posts/{postId}`
- `POST /api/groups/{id}/posts/{postId}/vote`
- `GET /api/groups/{id}/posts/{postId}/comments`
- `POST /api/groups/{id}/posts/{postId}/comments`
- `DELETE /api/groups/{id}/posts/{postId}/comments/{commentId}`
- `POST /api/groups/{id}/bans`
- `DELETE /api/groups/{id}/bans/{userId}`
- `GET /api/groups/{id}/staff/messages`
- `POST /api/groups/{id}/staff/messages`
- `POST /api/groups/{id}/pinned-media`
- `GET /api/groups/{id}/pinned-media`

### 8.9 Moderation

- `POST /api/moderation/reports`
- `GET /api/moderation/reports`
- `PUT /api/moderation/reports/{id}/status`
- `POST /api/moderation/assignments`
- `GET /api/moderation/assignments`
- `DELETE /api/moderation/assignments`
- `GET /api/moderation/audit-logs`

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
- `GET /api/groups`
- `GET /api/groups/{id}`
- `POST /api/groups`
- `POST /api/groups/{id}/join`
- `DELETE /api/groups/{id}/leave`
- `GET /api/groups/{id}/members`
- `POST /api/groups/{id}/members/{userId}/role`
- `GET /api/groups/{id}/posts`
- `POST /api/groups/{id}/posts`
- `GET /api/groups/{id}/posts/{postId}`
- `POST /api/groups/{id}/posts/{postId}/vote`
- `GET /api/groups/{id}/posts/{postId}/comments`
- `POST /api/groups/{id}/posts/{postId}/comments`
- `DELETE /api/groups/{id}/posts/{postId}/comments/{commentId}`
- `POST /api/groups/{id}/bans`
- `DELETE /api/groups/{id}/bans/{userId}`
- `GET /api/groups/{id}/staff/messages`
- `POST /api/groups/{id}/staff/messages`
- `GET /api/groups/{id}/pinned-media`
- `POST /api/groups/{id}/pinned-media`

Related contracts currently in use:

- `POST /api/media/{id}/status`
- notifications endpoints under `/api/notifications`
- moderation endpoints under `/api/moderation/*`
- collection reordering under `/api/collections/{id}/items/reorder`

Realtime clients:

- Notifications: `frontend/src/features/notifications/realtime/useNotificationRealtime.js`
- Moderation: `frontend/src/features/moderation/realtime/useModerationRealtime.js`

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

## 11. Notification Design (Realtime)

Notifications are persisted first (DB is source of truth), then pushed in realtime via SignalR with polling fallback.

Realtime wiring:

- `NotificationHub` at `/hubs/notifications`
- `INotificationPublisher` -> `SignalRNotificationPublisher`
- `IModerationRealtimePublisher` -> `SignalRModerationRealtimePublisher`
- Clients use authenticated identity (`NameIdentifier`) for `Clients.User(userId)` routing

Current notification hooks:

- moderation report status updates notify the report reporter
- moderator assignments notify the assigned user

Moderation realtime events:

- `ReportUpdated`
- `AssignmentUpdated`

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

## 13. Architecture Quality Audit (April 26, 2026)

The current structure is feature-rich but still carries product and architecture debt that should be treated as roadmap input, not cosmetic cleanup.

Highest-priority risks:

- Several user-facing workflows still require raw GUID entry. Examples include group pinned media, group post media attachments, group ban controls in moderation, and scoped moderator assignment.
- Backend contracts often expose only IDs for operations where the UI needs searchable user/media/group/collection pickers.
- Cookie-based JWT auth is paired with many `[IgnoreAntiforgeryToken]` mutating endpoints. That weakens the intended CSRF model described by the frontend interceptor.
- Startup seeding creates hardcoded privileged/demo accounts and is not clearly environment-gated.
- There are no backend test projects covering service logic, controller contracts, seeding, authorization, or aggregate behavior.
- Frontend routing has a stale route map artifact (`src/app/routes.jsx`) while `src/app/router.jsx` is the active router.
- The frontend has no project-specific README and the global search bar is still a TODO.

Documentation note: the full prioritized critique and remediation backlog lives in `PROJECT_CRITIQUE_AND_RECOMMENDATIONS.txt`.

## 14. Recommended Architecture Direction

Immediate architecture work should be ordered by risk:

1. Secure seeding and CSRF behavior before adding more product surface.
2. Add backend test projects and cover the high-risk service rules first: auth refresh rotation, ratings aggregates, group permissions, collection reorder, moderation assignments, account deletion.
3. Add lookup/query endpoints for entity pickers so the frontend can stop asking for raw IDs.
4. Build shared frontend primitives for buttons, fields, dialogs, entity pickers, data tables, badges, and empty states.
5. Decide whether `RateOple.Core` is intended to be a clean domain layer or an EF-backed service layer. Right now it references Infrastructure and injects `ApplicationDbContext`, so the honest current model is a pragmatic service layer over EF Core.
6. Normalize DTO validation and API error responses with ProblemDetails.
7. Add representative development/demo seeds for media, tags, collections, groups, posts, reports, assignments, notifications, and ratings.

The most important product rule for future architecture: do not design API or UI flows that require users, admins, or moderators to know database identifiers. IDs should remain implementation details behind lookup/search/select workflows.
