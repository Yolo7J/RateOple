# RateOple Architecture (Current State)

Last updated: **May 14, 2026**

This document reflects the code currently present in the repository.

## Submission Runtime Notes

For a submitted ZIP or cloned repository on another machine:

- Backend HTTP launch profile runs at `http://localhost:5113`.
- Backend HTTPS launch profile runs at `https://localhost:7167` and also exposes `http://localhost:5113`.
- Frontend Vite development should use `frontend/.env.http.example` or `frontend/.env.https.example` copied to `frontend/.env.local` so `VITE_API_BASE_URL` matches the backend origin.
- When the frontend is built into `backend/RateOple/wwwroot`, the app uses same-origin `/api` calls behind the backend host.

Important external-service limitations in the submitted project:

- TMDB-backed movie and TV metadata/images require backend configuration key `Tmdb:ReadAccessToken`.
- Google OAuth requires backend keys `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret`.
- Cloudflare Turnstile CAPTCHA requires backend keys `Captcha:SiteKey` and `Captcha:SecretKey` when `Captcha:Enabled=true`.
- Those secrets are not expected to exist on another machine by default, so full media-image enrichment and Google auth are not guaranteed in a fresh submission environment.
- If a reviewer needs the project to function at 100%, they need the missing private configuration from the project author.

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
      -> Core application services
        -> ApplicationDbContext / EF Core / PostgreSQL
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
    Auth/ Collections/ Common/ Groups/ Media/ Moderation/ Social/ Users/ Validation/
  RateOple.Infrastructure/           # DbContext, entities, EF configs, migrations, infra middleware
    Data/Configurations/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Entities/{Collections,Groups,Media,Moderation,Social,Users}
    Data/Seeding/
    Middleware/
    Migrations/
    Security/
  RateOple.Constants/                # enums and constants
  RateOple.Core.Tests/               # service-layer and validation tests
  RateOple.Api.Tests/                # API/integration-style tests

frontend/
  src/app/                           # active router + provider composition
    AppRouter.jsx router.jsx providers.jsx
  src/layouts/                       # Admin/Auth/Group/Main/Page/Sidebar layouts
  src/context/                       # global contexts (auth/theme/language/media cart)
  src/hooks/                         # shared hooks (useTheme/useLanguage/useQueryResource)
  src/features/
    admin/ auth/ collections/ discovery/ groups/ media/ moderation/
    notifications/ ratings/ reviews/ users/
    # each feature uses pages/components/services/queries (+ hooks placeholders in some)
    # realtime hooks live under feature `realtime/` folders
  src/shared/
    api/                             # axios client, auth interceptor, React Query client, lookup helpers
    components/                      # shared Header/Footer/MediaCard
    ui/                              # layout primitives + picker/toggle/search/rating UI
    constants/ utils/
    signalr/                         # SignalR client
  src/locales/                       # i18n dictionaries
  src/assets/                        # bundled static assets
  tests/e2e/                         # Playwright browser coverage
```

## 3. Backend Startup Composition

`backend/RateOple/Program.cs` configures services in this order:

1. `AddDatabase`
2. `AddIdentityConfiguration`
3. `AddAuthorizationPolicies`
4. `AddJwtAuthentication`
5. `AddGoogleAuthenticationIfConfigured`
6. `AddCsrfProtection`
7. `AddApplicationServices`
8. `AddRateOpleRateLimiting`
9. `AddCorsConfiguration`
10. `AddApi` (`AddApi` registers controllers, ProblemDetails, OpenAPI, SignalR, and the SignalR user-id provider)

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
9. rate-limit metadata capture and ASP.NET Core rate limiter
10. authorization
11. controller + SignalR hub mapping
12. SPA fallback to `wwwroot/index.html` for non-API/non-hub frontend routes

Rate limiting is centralized in `Extensions/RateLimitingExtensions.cs`. v1 uses in-memory counters, which are correct only for the planned single backend instance. Multi-instance deployment requires a distributed counter implementation first.

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
- `POST /api/auth/confirm-email`
- `POST /api/auth/resend-confirmation`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/captcha-config`
- `GET /api/auth/google/login`
- `GET /api/auth/google/complete`

Register/password lifecycle emails are sent through `IAppEmailSender`; production targets Resend and development/test use the fake sender unless configured otherwise. Unconfirmed and suspended users can authenticate read-only. `/api/auth/me`, login, and refresh responses include account-state flags so the frontend can show confirmation/suspension UX while backend middleware remains the source of truth for blocking content mutations.

Registration and suspicious login attempts are protected by `ICaptchaVerifier`. The v1 provider is Cloudflare Turnstile, with fake and noop implementations restricted to explicit development/test configuration. Registration verifies CAPTCHA before creating the Identity user. Login tracks failed attempts by normalized email plus IP and requires server-verified CAPTCHA once the configured threshold is reached.

Google OAuth is backend-mediated only. It registers only when `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` are configured. The frontend starts the flow by navigating to `/api/auth/google/login`; the backend handles the Google completion endpoint, creates or links an ASP.NET Identity user, issues the normal HttpOnly app cookies, and redirects back to a local frontend route.
The current frontend callback route is `/auth/callback`, which refreshes `/api/auth/me`, handles success/failure redirect state, and then navigates to the intended local route.

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

Global staff role hierarchy:

- `SuperAdmin` can manage global `Admin` and `Moderator` roles, manage all moderator assignments, and access all admin/moderation tools.
- `Admin` can use existing admin/catalog permissions, manage reports, grant/revoke global `Moderator`, and create/remove moderator assignments. Admins cannot manage `Admin` roles, modify `SuperAdmin` users, modify other `Admin` users, or alter their own global roles.
- `Moderator` can enter moderation tools, but actionable report access comes from `ModeratorAssignment` records. A global assignment sees all report scopes; scoped assignments see only matching group/media-backed report targets; no active assignment yields an empty actionable queue.
- `User` has normal account access only.

Group membership roles are not Identity roles and must not grant global admin/moderation permissions. `GroupAdmin` and `GroupModerator` authority stays inside the group domain.

## 5. Layer Structure and Architecture Rules

RateOple currently uses a pragmatic layered architecture. It is not a strict clean-architecture implementation.

The intentional current model is:

- `RateOple` is the API host. It owns controllers, auth setup, middleware, SignalR hubs, endpoint mapping, HTTP error shaping, and dependency injection.
- `RateOple.Core` is an application/service layer. It owns DTOs, service interfaces, and business rules. Core services may inject `ApplicationDbContext` directly for now.
- `RateOple.Infrastructure` owns EF Core persistence: entities, configurations, migrations, `ApplicationDbContext`, seeding, and infrastructure helpers.
- `RateOple.Constants` owns cross-project enums/constants.

This means `RateOple.Core` currently references `RateOple.Infrastructure`. That is an explicit tradeoff for this application, not an accidental claim of clean architecture. A large inversion that moves all entities and persistence boundaries into Core is not planned unless the project reaches a point where that cost clearly buys better testing or composition.

### Architecture Rules

- Controllers should stay thin: bind HTTP inputs, read the authenticated user, call services, and return normal success results.
- Controllers should not repeat user ID parsing or map common service exceptions by hand.
- Services own business rules, permission decisions that require domain data, and transaction-oriented behavior.
- Infrastructure owns EF Core entities, configurations, migrations, database-specific behavior, and seeding.
- Core services may use `ApplicationDbContext` directly while the project remains an EF-backed service layer.
- Do not introduce repository abstractions unless they solve a concrete testing, composition, or persistence boundary problem.
- New business logic must have targeted backend tests.
- Keep API contracts stable unless the old contract is unsafe or impossible to validate correctly.

### Transactional Side Effects

Mandatory side effects run in the same EF Core transaction as the user-visible mutation when they are performed synchronously:

- rating aggregate refreshes for media, season, and episode rating changes
- rating-created and review-created interactions
- media-status-changed interactions
- synchronous taste recalculation caused by rating, review, interaction, and status writes
- moderation audit logs for moderation mutations
- persisted moderation notifications created as part of report status and assignment changes

Best-effort side effects should happen after the database transaction commits:

- realtime SignalR delivery for moderation updates and notification fanout
- future non-persistent delivery integrations such as email or push notifications

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

Shared support folders:

- `Common`
- `Validation`

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

## 6. Testing Shape

Backend test coverage is split across two projects:

- `RateOple.Core.Tests` for service-layer, validation, and seeding behavior
- `RateOple.Api.Tests` for HTTP/API, auth, authorization, CSRF, lookup, and endpoint-level behavior

Frontend browser coverage lives under `frontend/tests/e2e` and currently focuses on smoke coverage with Playwright.

Current recorded verification snapshot as of May 11, 2026:

- `dotnet test backend/RateOple.sln` passed with 327 backend tests in the latest recorded full backend run in `results.txt`.
- `cd frontend && npm run lint` passes.
- `cd frontend && npm run build` passes.
- `cd frontend && npm run test:e2e` passes with 2 Playwright smoke tests.

Note: Entities are physically domain-grouped in folders but currently share namespace `RateOple.Infrastructure.Data.Entities`.

## Pre-deployment Hardening Roadmap

Before public deployment, RateOple should prioritize server-side abuse controls and account lifecycle hardening over additional UI polish.

The detailed implementation plan is maintained in [SECURITY_AND_DEPLOYMENT_PLAN.md](SECURITY_AND_DEPLOYMENT_PLAN.md). The near-term roadmap is:

- Add backend rate limits for auth, email, lookup, and user-generated-content writes.
- Add server-side quotas for collections, nested collections, collection items, groups, posts, comments, reviews, reports, and ratings.
- Add a CAPTCHA provider abstraction and wire CAPTCHA to registration plus suspicious login attempts.
- Require confirmed email before content creation, and add confirmation resend plus password reset flows.
- Tighten production security headers/CORS/CSP policies against the final deployment host and providers.
- Keep analytics disabled until cookie consent and security work are complete.
- Continue performance cleanup by keeping `index.css` global-only, preserving route-level lazy loading, and standardizing lazy images/poster placeholders.
- Add focused backend tests for quotas, validation, CAPTCHA, email confirmation permissions, rate limits, role guards, and soft-deleted media filtering.
- Add lean Playwright smoke coverage for public routes, auth validation, protected redirects, and responsive overflow without turning E2E into the primary test layer.

## 7. Controllers by Domain

`backend/RateOple/Controllers`:

- `Auth`
- `Media`
- `Discovery`
- `Collections`
- `Users`
- `Groups`
- `Moderation`

## 8. Database Model (Current)

### 8.1 Media Domain

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

### 8.2 Social Domain

- `Rating` (exactly one target: media/season/episode)
- `Review` (1:1 with `Rating`)
- `Comment` (polymorphic: review/group post/reply hierarchy)
- `Follow` (user-to-user)
- `MediaInteraction`
- `UserGenreScore`

### 8.3 Collections Domain

- `Collection` (hierarchical parent/child, owner type, sort mode)
- `CollectionItem` (ordered media in collection)
- `FollowCollection`

On user account deletion, user-owned collections and nested children/items are deleted as private/account-owned data. Group-owned collections remain tied to the group owner model.

### 8.4 Groups Domain

- `Group` (owner, visibility, archive/read-only state)
- `GroupBan`
- `GroupMembership`
- `GroupPost`
- `GroupPostVote`
- `GroupMedia` (pinned media)
- `GroupStaffMessage`
- `PostMedia` (media attached to group posts)

Group owner deletion transfers ownership to the oldest eligible active confirmed GroupAdmin, then GroupModerator, then Member. If no eligible successor exists, the group is archived, hidden from normal discovery, and treated as read-only. Owners can manually transfer ownership to an eligible member; Admin/SuperAdmin callers can force-transfer through the same backend rule set.

### 8.5 Users Domain

- `User` (Identity)
- `UserProfile`
- `RefreshToken`
- `UserMediaStatus`
- `Notification`

### 8.6 Moderation Domain

- `Report`
- `ModeratorAssignment`
- `ModerationAuditLog`

## 9. Service Registration (DI)

`AddApplicationServices` currently registers:

- Auth: `IJwtService`
- Media: `IMediaService`, `ITvSeriesService`, `ITmdbService`, `IOpenLibraryService`, `ITmdbImportService`, `IDiscoveryService`
- Social: `IRatingService`, `IReviewService`, `IFollowService`, `IInteractionService`, `IUserTasteService`, `IVisibilityService`
- Collections: `ICollectionService`
- Users: `IUserProfileService`, `IUserMediaStatusService`, `INotificationService`, `INotificationPublisher` (SignalR)
- Groups: `IGroupService`
- Moderation: `IModerationService`, `IModerationAuditService`, `IModerationRealtimePublisher` (SignalR)

## 10. API Surface

### 10.1 Auth and CSRF

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/csrf`

### 10.2 Discovery

- `GET /api/discovery/trending`
- `GET /api/discovery/popular`
- `GET /api/discovery/recommended`
- `GET /api/media/{id}/similar`

### 10.3 Media

Read/query:

- `GET /api/media`
- `GET /api/media/{id}`
- `GET /api/media/{mediaId}/collections`
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

### 10.4 TMDB Alternate Controller

Separate controller still exists:

- `GET /api/tmdb/search`
- `GET /api/tmdb/details`
- `POST /api/tmdb/import-series/{tmdbId}`

`POST /api/tmdb/import-series/{tmdbId}` requires the `RequireAdmin` policy.

### 10.5 Ratings and Reviews

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
- `GET /api/seasons/{seasonId}/reviews`
- `GET /api/episodes/{episodeId}/reviews`

### 10.6 Users

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
- `GET /ratings`
- `GET /reviews`
- `GET /favorite-genres`

Notifications:

- `GET /api/notifications`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`

SignalR hubs:

- `GET/POST /hubs/notifications` (SignalR)

### 10.7 Collections

- `GET /api/collections`
- `GET /api/collections/{id}`
- `GET /api/media/{mediaId}/collections`
- `POST /api/collections`
- `PUT /api/collections/{id}`
- `DELETE /api/collections/{id}`
- `POST /api/collections/{id}/items`
- `DELETE /api/collections/{id}/items/{mediaId}`
- `PUT /api/collections/{id}/items/reorder`
- `POST /api/collections/{id}/follow`
- `DELETE /api/collections/{id}/follow`

### 10.8 Groups

- `GET /api/groups`
- `GET /api/groups/{id}`
- `GET /api/groups/{id}/members`
- `POST /api/groups`
- `POST /api/groups/{id}/join`
- `DELETE /api/groups/{id}/leave`
- `POST /api/groups/{id}/members/{userId}/role`
- `POST /api/groups/{id}/ownership`
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

### 10.9 Moderation

- `POST /api/moderation/reports`
- `GET /api/moderation/reports`
- `PUT /api/moderation/reports/{id}/status`
- `DELETE /api/moderation/reports/{id}/target`
- `POST /api/moderation/assignments`
- `GET /api/moderation/assignments`
- `DELETE /api/moderation/assignments`
- `GET /api/moderation/audit-logs`

### 10.10 Lookup

Lookup endpoints back picker workflows and keep raw IDs out of user-facing forms:

- `GET /api/media/lookup`
- `GET /api/users/lookup`
- `GET /api/admin/users/lookup`
- `GET /api/groups/lookup`
- `GET /api/collections/lookup`
- `GET /api/moderation/scopes/lookup`

## 11. Frontend Contract Snapshot

- Primary routing is in `frontend/src/app/router.jsx` (rendered by `AppRouter.jsx`).
- Providers are composed in `frontend/src/app/providers.jsx`:
  Theme -> Language -> React Query -> BrowserRouter -> Auth -> MediaCart.
- API access goes through `frontend/src/shared/api/apiClient.js` with:
  - auth/csrf interceptors (`authInterceptor.js`)
  - credentials-enabled cookie auth
- Server state is fetched through feature query hooks (React Query), commonly wrapped by
  `frontend/src/hooks/useQueryResource.js`.

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

## 12. Frontend Visual System and Role UX

The frontend has a shared visual foundation under `frontend/src/shared/ui`, `frontend/src/shared/components`, `frontend/src/layouts`, and global token/class definitions in `frontend/src/index.css`.

Shared primitives include:

- Layout: `Container`, `Grid`, `Stack`, `Flex`, `PageHeader`, `SectionCard`, `Panel`, `StatCard`
- Controls: `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `FormField`
- Feedback and state: `InlineMessage`, `EmptyState`, `LoadingState`, `Skeleton`, `Dialog`
- Data and navigation UI: `Badge`, `DataTable`, `Tabs`, `RouteFallback`
- Composite/shared controls: `EntityPicker`, `MultiEntityPicker`, `SearchBar`, `RatingStars`

Shared composite components cover the main header, navigation dropdowns, footer, and reusable media cards.

Current visual/UX application:

- Normal user surfaces: discovery, media list/detail, account, watchlist, groups, collection detail, notifications, ratings, and reviews use the shared page rhythm and state patterns.
- Admin surfaces: admin dashboard, media management, add/edit media, media cart, and season manager use shared headers, cards, controls, messages, and confirmations.
- Moderator/admin operational surfaces: moderation queues, assignment management, audit logs, group moderation actions, report status updates, group ban/unban actions, and destructive workflows use shared badges, action rows, inline feedback, and dialogs.
- Global states: major touched pages now use common loading, empty, error, success/info, and confirmation patterns.

Current design rule: prefer shared primitives and `ui-*` classes before creating page-local button, field, card, dialog, table, or message styling.

## 13. External Integrations

### 13.1 TMDB

`TmdbService` provides:

- movie/tv search
- details
- full TV series data with seasons and episodes

`TmdbImportService` imports a TMDB series into local media records.

### 13.2 Open Library

`OpenLibraryService` provides:

- book search mapping to app DTOs
- book details mapping from OL work endpoint

## 14. Notification Design (Realtime)

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

## 15. Delivery Stage Status (8-Stage Plan)

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

## 16. Entity Picker and Lookup Workflow Status

Raw database identifiers are no longer intended to be copied into user-facing group, collection, or moderation forms.

Current lookup/picker state:

- Backend lookup endpoints exist for media, public users, moderation users, groups, collections, and moderation scopes.
- Frontend lookup service wrappers normalize those endpoints behind feature-level search helpers.
- Shared `EntityPicker` and `MultiEntityPicker` components provide async search, selected previews, removable pills, empty/error/loading states, and keyboard basics.
- Group pinned-media and group post attachment workflows use media pickers.
- Collection add-media uses the shared media picker and blocks existing media before submit.
- Moderation assignment uses user and scope-aware pickers; group ban controls use user/group pickers.
- IDs remain internal route parameters and API payload values, not manual user inputs.
- Future workflows that need a user, media item, group, collection, or moderation scope should use lookup endpoints and picker UI instead of raw ID text boxes.

Guardrail coverage:

- Playwright smoke tests currently cover shared UI rendering and horizontal overflow behavior on desktop and mobile Chromium.
- Earlier picker/search flows are represented in the UI architecture and should be restored or extended with targeted Playwright coverage as the smoke suite grows.

## 17. Architecture Quality Audit (May 11, 2026)

The current structure is feature-rich but still carries product and architecture debt that should be treated as roadmap input, not cosmetic cleanup.

Resolved guardrails:

- CSRF enforcement is restored for mutating cookie-auth API endpoints; SignalR remains the documented exemption.
- Seeding is controlled by `Seed:Mode`; production rejects `Demo` mode and placeholder privileged credentials.
- Raw GUID workflows are replaced by lookup/entity picker flows and protected by Playwright smoke tests.
- Global header search submits to `/media?search=<query>`, the media listing consumes query params as route state, and Playwright smoke tests cover desktop/mobile search behavior.
- Group browsing no longer exposes fake media-type/tag filters; the UI only shows backend-supported search and visibility controls, with Playwright smoke tests covering the contract.
- Shared frontend UI primitives now exist and are applied across user, moderator, admin, and super-admin-facing screens.
- Common loading, empty, error, success/info, and destructive confirmation patterns are standardized across major touched pages.
- Admin/media and moderation operational screens now use the shared visual language instead of rough isolated styles.

Remaining risks:

- Auth, admin, moderation, account, groups, collections, and media-detail surfaces are visually aligned, but authenticated mutation-flow Playwright coverage is still thin.
- Some feature pages still keep local class maps and could be decomposed into smaller shared form/card/list components when the same pattern repeats.
- Season manager is visually aligned but still dense; a dedicated compact episode table/editor could improve admin ergonomics.
- Frontend bundle and CSS ownership should continue to be monitored; `index.css` is still large and should remain limited to global tokens, base rules, and shared `ui-*` primitives.
- Demo seed data remains thin for media, tags, collections, groups, posts, reports, assignments, notifications, and ratings.
- Pre-deployment security work still pending: CAPTCHA, app-level rate limits, server-side content quotas, analytics consent, and CI/CD deployment automation. Email confirmation gating, resend confirmation, password reset, stale unconfirmed cleanup, and suspension appeals are implemented for v1 and documented in `SECURITY_AND_DEPLOYMENT_PLAN.md`.
- `frontend/README.md`, code-structure docs, and architecture docs should stay aligned as UI/testing/security workflows evolve.

Documentation note: the full prioritized critique and remediation backlog lives in `PROJECT_CRITIQUE_AND_RECOMMENDATIONS.txt`.

## 18. Recommended Architecture Direction

Immediate architecture work should be ordered by risk and product leverage:

1. Keep CSRF, seed-mode, lookup/picker, global search, and honest group filter behavior as regression guardrails when adding new workflows.
2. Extend lookup/picker patterns to any future workflow that selects existing entities.
3. Add targeted Playwright smoke coverage for admin media edit/cart, moderation report status dialogs, moderator assignment removal, group ban confirmation, and collection item removal.
4. Improve Google OAuth frontend polish and any remaining dense operational screens.
5. Decide whether `RateOple.Core` is intended to be a clean domain layer or an EF-backed service layer. Right now it references Infrastructure and injects `ApplicationDbContext`, so the honest current model is a pragmatic service layer over EF Core.
6. Normalize DTO validation and API error responses with ProblemDetails.
7. Add representative development/demo seeds for media, tags, collections, groups, posts, reports, assignments, notifications, and ratings.
8. Keep RateOple-specific README and code-structure documentation current as UI and contract behavior changes.
9. Split the frontend bundle further by route or feature once product behavior is covered.

The most important product rule for future architecture: do not design API or UI flows that require users, admins, or moderators to know database identifiers. IDs should remain implementation details behind lookup/search/select workflows.
