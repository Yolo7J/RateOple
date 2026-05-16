# RateOple Security and Deployment Readiness Plan

Last updated: May 14, 2026

This is an implementation plan plus the current completed hardening state. It is based on the current repository state:

- Backend: ASP.NET Core Web API on .NET 9, Identity users/roles, JWT access and refresh tokens in cookies, CSRF protection, EF Core/PostgreSQL, SignalR notifications.
- Frontend: React/Vite served either by Vite in development or from `backend/RateOple/wwwroot` after `npm run build:backend`.
- Existing protections verified in code: HttpOnly auth cookies, refresh token rotation, CSRF header flow, development-only CORS, security headers middleware, role guards, production static hosting, soft-deleted media filtering in core media/collection paths, email confirmation/resend, forgot/reset password, read-only unconfirmed/suspended account gating, stale-unconfirmed-account cleanup, and suspension appeals.
- Completed for v1 deployment hardening: GitHub Actions CI, integrated publish artifact creation, production startup guardrails, safe health endpoint, and production CSP review for Turnstile.
- Not found as completed features: analytics consent and provider-specific deployment automation.

## Deployment Readiness Priorities

Phase 1 should happen before public deployment:

1. Monitor and tune backend rate limits for auth, email, lookup, admin mutations, and user-generated-content mutations.
2. Monitor and tune server-side quotas for user-created resources.
3. Keep rate-limit counters single-instance for v1 only; move to distributed counters before multi-instance deployment.
4. Add analytics consent before enabling analytics.

Phase 2 should happen before broader usage:

1. Tighten production security headers and operational error handling.
2. Add cookie-consent infrastructure before any analytics.
3. Clean up CSS ownership and verify bundle/chunk budgets.
4. Add provider-specific deployment automation and post-deploy smoke execution. CI and publish artifact creation are implemented; actual host deployment remains provider-specific.

## 1. Bot and Spam Protection

### Backend Rate Limits

Implemented with ASP.NET Core rate limiting in `RateOple/Extensions/RateLimitingExtensions.cs`.

Recommended policies:

| Policy | Scope | Initial limit | Applies to |
| --- | --- | ---: | --- |
| `AuthRegister` | IP + normalized email | 3 per hour, 10 per day | `POST /api/auth/register` |
| `AuthLoginIp` | IP | 20 per 15 minutes | `POST /api/auth/login` |
| `AuthLoginAccount` | normalized email | 8 failed attempts per 15 minutes | login failure tracking |
| `AuthRefresh` | user/session/IP | 60 per 15 minutes | `POST /api/auth/refresh` |
| `EmailSend` | user/email + IP | 3 per 15 minutes, 10 per day | confirmation resend, password reset |
| `UgcWriteBurst` | authenticated user | 30 writes per 5 minutes | reviews, comments, posts, reports |
| `UgcWriteDaily` | authenticated user | 300 writes per day | broad write backstop |
| `LookupSearch` | user/IP | 120 per minute | picker/search lookup endpoints |
| `AdminMutation` | authenticated staff user | 120 per 15 minutes | admin/media/moderation mutations |

Implementation notes:

- Enforce limits server-side only. Frontend throttling can improve UX but must not be trusted.
- Use authenticated user ID when available, otherwise use IP plus a forwarded-header strategy configured by the deployment host.
- Return `429` with a consistent problem response and optional `Retry-After`.
- Do not rely on Identity lockout alone. Current login uses `UserManager.CheckPasswordAsync`, so failed attempts are not a complete rate-limit mechanism by themselves.
- Consider a persistent/distributed counter before multi-instance deployment. In-memory rate limits are acceptable only for a single instance.
- `ForwardedHeaders:KnownProxies` must list trusted deployment proxies; arbitrary forwarded headers are not trusted by default.

### User Resource Quotas

Implemented as `IUserQuotaService`/`UserQuotaService` in Core and called by domain services before writes. Quotas are checked inside backend services, close to the transaction that creates the resource.

Suggested initial quotas:

| Resource | Suggested limit | Enforce in |
| --- | ---: | --- |
| Collections per user | 100 | `CollectionService.CreateAsync` |
| Nested collections per parent | 25 | collection parent attach/update path |
| Collection nesting depth | 3 | create/update collection parent path |
| Collection items per collection | 250 | `CollectionService.AddItemAsync` |
| Followed collections per user | 500 | follow collection path |
| Groups owned per user | 10 | `GroupService.CreateGroupAsync` |
| Group memberships per user | 100 | join group path |
| Posts per group per user per day | 25 | create group post path |
| Comments per user per day | 150 | comment create paths |
| Reviews per user per day | 50 | `ReviewService.CreateReviewAsync` |
| Reports per user per day | 25 | `ModerationService.CreateReportAsync` |
| Ratings per user per day | 300 | rating upsert paths |
| Pinned media per group | 25 | group pinned-media path |
| Staff messages per group per day | 100 | staff message path |

Quota behavior:

- Return `403` or `429` with a clear problem response such as `"Collection item limit reached."`.
- Count only active user-visible resources unless a domain explicitly needs lifetime limits.
- Keep admin/staff bypasses narrow and explicit. Do not let normal users bypass quotas through alternate endpoints.
- Add indexes for count-heavy quota checks where needed.
- Defaults are configurable under `UserQuotas`.

## 2. CAPTCHA

Implemented for v1 using a provider abstraction so business logic is not tied to one vendor:

```csharp
public interface ICaptchaVerifier
{
    Task<CaptchaVerificationResult> VerifyAsync(
        string token,
        string action,
        string? remoteIp,
        CancellationToken cancellationToken = default);
}
```

Providers live behind configuration:

- `Captcha:Provider`: `Turnstile`, `Fake`, `Noop`
- `Captcha:SiteKey`
- `Captcha:SecretKey`
- `Captcha:VerifyUrl`
- `Captcha:Enabled`
- `Captcha:LoginFailureThreshold`

Production uses Cloudflare Turnstile. `Fake` and `Noop` are development/test-only and production startup rejects disabled, fake, noop, or missing Turnstile key configuration.

Registration flow:

1. Frontend loads the configured site key.
2. User completes CAPTCHA on `/register`.
3. Frontend sends `captchaToken` with the register payload.
4. Backend verifies with `ICaptchaVerifier` before creating the Identity user.
5. Backend returns a validation problem when the token is missing, expired, invalid, or action-mismatched.

Login flow:

1. First login attempts do not require CAPTCHA.
2. Backend tracks failed attempts by normalized email and IP.
3. After the threshold, backend returns a response such as `403 captcha_required` or includes `requiresCaptcha: true` in a standardized error body.
4. Frontend renders CAPTCHA and resubmits `captchaToken`.
5. Backend verifies CAPTCHA before checking password once a challenge is required.

Rules:

- Never accept a frontend-only CAPTCHA result.
- Do not hard-code Turnstile/hCaptcha/reCAPTCHA logic inside controllers.
- Bypass only in test/development using explicit configuration, not by missing secrets in production.

Current scope:

- Registration requires `captchaToken` and verifies it before user creation.
- Login tracks failed attempts by normalized email and IP, then returns `captcha_required` once the configured threshold is reached.
- Forgot-password and resend-confirmation remain enumeration-safe but do not yet escalate to CAPTCHA. Add this with the planned auth/email rate-limit phase so repeated-attempt counters and challenge behavior are shared.

## 3. Input Validation and Safe Rendering

### Backend Validation

Current DTOs already use many data annotations for required fields, max lengths, ranges, and paging limits. Before deployment, add a validation inventory for every user-generated endpoint and fill gaps.

User-generated payloads to audit:

- Register/login and profile/account updates.
- Collections: title, description, cover URL, nesting, sort mode.
- Groups: group name/description, posts, comments, staff messages, bans, pinned media.
- Reviews and rating-linked review updates.
- Reports and moderation notes/status reason fields.
- Media status/watchlist metadata.
- Admin media fields if public users can influence imported data through search/cart flows.

Validation rules:

- Trim strings server-side before storing.
- Reject empty strings after trimming.
- Normalize and validate URLs; allow only `http`/`https` image URLs where URL fields are supported.
- Enforce max lengths in DTOs and database configuration consistently.
- Validate enum values explicitly where numeric enum binding is accepted.
- Validate pagination bounds everywhere.
- Reject invalid GUIDs and missing targets before side effects.

### Sanitization and Rendering

Current frontend scan found no `dangerouslySetInnerHTML` usage. Keep that rule unless a dedicated sanitized rich-text feature is deliberately introduced.

Rendering rules:

- Treat user text as plain text.
- Let React escape text by default.
- Do not render user-provided HTML.
- If Markdown/rich text is added later, sanitize server-side and client-side with an allowlist and add tests for script/event-handler stripping.

## 4. Email Confirmation and Account Lifecycle

### Email Confirmation

Implemented for v1. Registration creates an unconfirmed user, sends a confirmation email through the app email abstraction, allows read-only login before confirmation, and blocks user-generated-content mutations server-side until the email is confirmed.

Current flow:

1. `POST /api/auth/register` creates user and sends confirmation email.
2. `POST /api/auth/confirm-email` verifies the ASP.NET Identity token.
3. `POST /api/auth/resend-confirmation` sends a new confirmation link with an enumeration-safe response.
4. Login is allowed for unconfirmed users, but `/api/auth/me` and login responses expose `emailConfirmed`, `isReadOnly`, `isSuspended`, and `accountState`.
5. The account-state middleware blocks covered user-generated-content mutations with 403 ProblemDetails and code `email_not_confirmed`.

Content creation that should require confirmed email:

- Collections and collection items.
- Groups, joins, posts, comments, votes, pinned media, staff messages.
- Reviews, ratings, watchlist/status changes.
- Reports and moderation-facing user reports.
- Follows and collection follows.

Read-only behavior for unconfirmed accounts:

- Can log in if desired.
- Can view public catalog, groups, and collections.
- Can manage basic account settings and resend confirmation.
- Cannot create or mutate user-generated content.

### Password Reset

Implemented endpoints:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Rules:

- Always return a generic success response for forgot-password to avoid email enumeration.
- Rate-limit by email and IP. Not implemented yet; track under Phase 5 rate-limit infrastructure.
- Log mail send failures server-side without exposing provider details.
- Invalidate/rotate refresh tokens after successful reset.

Email provider:

- `IAppEmailSender` abstracts provider delivery.
- `ResendEmailSender` is the production target.
- `FakeEmailSender` is used for development/test when `Email:Provider` is not `Resend`.
- Production requires `Email:Provider=Resend`, `Email:From`, `Email:FrontendBaseUrl`, and `Resend:ApiKey`.

Unconfirmed-account cleanup:

- Hosted cleanup runs on `UnconfirmedAccountCleanup` settings.
- Deletes unconfirmed accounts older than the configured max age only when safe: no privileged roles, no moderator assignments, no UGC rows, no suspension conflict, and related refresh/profile/auth artifacts are removable.

### Account States

Define and enforce:

| State | Login | Content creation | Public visibility |
| --- | --- | --- | --- |
| Unconfirmed | Allowed read-only | Blocked | Username reserved while pending; stale safe accounts are cleaned up |
| Confirmed | Allowed | Allowed subject to quotas/rate limits | Normal |
| Suspended/banned | Allowed read-only | Blocked except suspension appeals | Existing content remains unless moderated |
| Deleted | Blocked | Blocked | Profile anonymized/hidden; public UGC renders as Deleted user |

Current account deletion anonymizes/locks the user in `UserProfileService` and keeps the Identity row for foreign-key integrity. It revokes refresh tokens, removes external login bindings, clears personal profile fields, sets the profile display name to `Deleted user`, clears email/password hash, rotates stamps, sets permanent lockout, and writes moderation audit entries.

Deletion does not move content to a shared fake account. Reviews, group posts, comments, ratings, reports, and audit rows keep their original internal user relationship where needed. Normal public rendering must show `Deleted user` with no profile/avatar exposure. User-owned collections and nested items are deleted. Follow rows, media statuses, taste scores, interactions, and notifications owned by the deleted user are removed as private/social account data.

Owned groups transfer on deletion to the oldest eligible active confirmed GroupAdmin, then GroupModerator, then Member. The deleting user's membership is removed. If there is no eligible successor, the group is archived, hidden from normal discovery, and read-only. Manual owner transfer is exposed through `POST /api/groups/{id}/ownership`; the old owner becomes GroupAdmin, and Admin/SuperAdmin callers can force-transfer to an eligible member. Global Admin/SuperAdmin callers can also override group ban/unban endpoints while direct owner bans remain blocked to avoid orphaning ownership.

## 5. Security Hardening

### Cookies

Current auth cookie helper sets `HttpOnly`, `SameSite=Lax`, and `Secure=!development`; refresh cookie is scoped to `/api/auth`.

Before deployment:

- Confirm production runs HTTPS only so `Secure` is always true.
- Consider `SameSite=Strict` for refresh cookies if OAuth and same-origin behavior allow it.
- Keep refresh cookie path scoped to `/api/auth`.
- Keep access token lifetime short and refresh rotation enabled.
- Ensure logout and account deletion delete cookies using the same options used when setting them.

### CSRF

Current CSRF design:

- `GET /api/csrf`
- `X-CSRF-TOKEN` header
- mutating verbs validated in middleware
- SignalR hub excluded

Before deployment:

- Keep all mutating JSON endpoints covered unless a route has a documented reason to opt out.
- Add regression tests for any new auth/email/CAPTCHA endpoints that mutate state.
- Ensure frontend continues to use the shared credentials-enabled API client and CSRF interceptor.

### CORS

Current production model is same-origin backend hosting. Development CORS is local-only.

Before deployment:

- Keep CORS disabled in production unless a separate frontend origin is intentionally deployed.
- If a separate frontend origin is used, configure a specific production origin list. Never use wildcard origins with credentials.

### CSP and Security Headers

Current middleware sets CSP, `X-Frame-Options`, `X-Content-Type-Options`, referrer policy, permissions policy, COOP/CORP, and HSTS on HTTPS.

Before deployment:

- CSP currently allows same-origin scripts plus Cloudflare Turnstile scripts/frames, same-origin connections plus WebSocket transports for SignalR, inline styles for the current frontend, and HTTPS images for catalog covers.
- Google OAuth is backend-mediated redirect flow and does not require broad script/frame allowances.
- TMDB/Open Library and staff-managed external covers are image-only; do not add wildcard script sources for them.
- Prefer nonces or hashes if inline styles/scripts are introduced; current CSP permits inline styles.
- `upgrade-insecure-requests` is added in production.
- Add reporting-only CSP first if the deployment environment is uncertain.

### Error Handling

Current backend uses problem details and a global exception handler.

Before deployment:

- Ensure production responses do not expose exception stack traces, connection strings, provider secrets, or SQL details.
- Log correlation/trace IDs server-side.
- Return consistent problem responses for quota, rate-limit, CAPTCHA, email confirmation, and validation failures.

### Admin and Moderation Protection

Current router and API policies use role guards for admin/moderation areas. Global role-management hardening is now implemented for v1:

- `POST/DELETE /api/admin/users/{userId}/roles/admin` is SuperAdmin-only.
- `POST/DELETE /api/admin/users/{userId}/roles/moderator` is Admin/SuperAdmin-only.
- Admins cannot modify SuperAdmins, Admin users, or their own global roles.
- Removing global Moderator removes active moderator assignments and writes audit entries.
- Moderator assignment creation requires the target already has the global Moderator role.
- Moderator candidate lookup is backend-filtered and excludes Admins, SuperAdmins, locked/deleted users, and users already assigned to the selected scope.
- Moderator report visibility/actionability is assignment-scoped: global assignment sees all reports, scoped assignments see matching group/media-backed report targets, and no assignment sees no actionable queue.
- Report actions now include in-review, resolve, reject, escalate-to-admin, and optional audit notes. Status changes notify the reporter through the existing report-status notification path and publish moderation realtime updates after commit.
- Moderation queue target removal is intentionally narrow for v1: only leaf group-post comments can be removed from the queue, with audit logging and the existing `CommentRemoved` notification to the affected author. User, review, group post, media catalog, collection, and group target removal remain unavailable unless safe domain endpoints are added.
- Group membership roles remain separate from global Identity roles.

Suspension is now represented by user account state plus `SuspensionAppeal`. Suspended users can log in read-only, cannot create content or normal reports, can submit one pending appeal, are blocked for 7 days after a rejected appeal, and have a local max-three-attempts-per-24-hours safeguard. Only Admin/SuperAdmin can suspend/lift suspension through admin endpoints. Broader rate limiting for appeal spam remains a Phase 5 infrastructure task.

Before deployment:

- Keep role checks server-side on every staff mutation.
- Keep tests that normal users cannot reach admin media, moderation reports, assignments, audit logs, TMDB import, or role-changing/group moderation actions.
- Do not expose staff links in public navigation for unauthorized users.
- Define super-admin creation strategy through secure seed configuration only.

### Swagger and Dev Tooling

Current OpenAPI mapping is development-only.

Before deployment:

- Keep Swagger/OpenAPI disabled in production unless protected behind authentication and IP restrictions.
- Reject `Seed:Mode=Demo` in production; current seeding rules already enforce this and should remain tested.
- Keep appsettings secrets out of source control and deployment artifacts.

## 6. Cookie Consent and Analytics

Do not add analytics before the security work above.

Cookie categories:

- Necessary: auth cookies, refresh cookie, CSRF cookie, provider session cookies required for login/OAuth, and strictly necessary app preferences if stored in cookies.
- Non-essential: analytics, tracking pixels, advertising, session replay, heatmaps, A/B testing.

Plan:

1. Add a consent model before adding analytics.
2. Load analytics only after explicit consent.
3. Keep consent state versioned so policy changes can re-prompt.
4. Provide a settings path to revoke consent.
5. Document each cookie/localStorage key and its purpose.

## 7. Performance Plan

### CSS Ownership

Current CSS line-count snapshot:

- `frontend/src/index.css`: about 4,173 lines.
- Feature CSS files exist for admin, auth, collections, groups, media management, moderation, notifications, and users.

Plan:

- Keep `index.css` for design tokens, reset/base rules, focus rings, shared `ui-*` primitives, and truly global layout utilities.
- Move page/feature-specific selectors from `index.css` into feature CSS files during future feature work.
- Avoid adding new feature selectors to `index.css`.
- Keep shared component styles either in `index.css` if broadly reused or in colocated feature CSS if not.
- Add a lightweight CSS ownership note to frontend docs after cleanup starts.

### React Code Splitting

Current router already lazy-loads the major routes, including admin, moderation, auth, account/watchlist, media detail, season/episode pages, collections, and groups.

Plan:

- Keep route-level lazy loading.
- Inspect production chunks after `npm run build`; watch for shared chunks that pull admin/moderation code into public routes.
- If needed, split heavy pickers, charts, or admin-only editors with component-level `lazy`.
- Keep Playwright smoke tests pointed at the backend-hosted build after `npm run build:backend`.

### Images

Plan:

- Use lazy loading for non-critical posters/covers.
- Keep hero images eager only when they are above the fold and materially improve perceived load.
- Normalize poster placeholder strategy across media cards, collections, groups, watchlist, and detail pages.
- Prefer backend/image-helper URL normalization and avoid mixed-content HTTP images in production.
- Set width/height or aspect-ratio constraints to avoid layout shift.

## 8. Test Plan

### Backend Tests

Add focused tests, not broad slow suites:

- Rate limits: auth register/login/refresh, email-send flows, UGC write burst, lookup search.
- Quotas: collections, nested collections, collection items, groups, posts, comments, reviews, reports, ratings.
- CAPTCHA: register requires valid token; suspicious login requires token; invalid/expired/provider-failure cases.
- Email confirmation: unconfirmed users cannot create content; confirmed users can; resend is rate-limited; password reset is enumeration-safe.
- Validation: max lengths, trimmed empty strings, invalid URLs, invalid enum values, pagination bounds.
- Role guards: admin/moderator endpoints reject unauthenticated and normal users.
- Soft-deleted media: collection detail/list previews, containing-media, watchlist/status, reviews, ratings, discovery, group pinned/attached media.
- Security: CSRF on new mutating endpoints; production-like CORS/security-header behavior where practical.

### Frontend Tests

Keep Playwright coverage focused:

- Public smoke: `/`, `/media`, media detail, `/collections`, collection detail, `/groups`, `/login`, `/register`.
- Auth validation: register required fields, CAPTCHA render path when configured, login challenge UI when backend says CAPTCHA required.
- Protected redirects: account, watchlist, admin, moderation.
- Responsive overflow smoke: 320px and desktop for major public and protected redirect routes.
- Avoid exhaustive admin CRUD E2E unless a bug repeatedly escapes unit/integration tests.

## 9. CI/CD Plan

Implemented GitHub Actions stages:

1. Frontend quality:
   - `cd frontend && npm ci`
   - `cd frontend && npm run lint`
   - `cd frontend && npm run build`
   - `cd frontend && npm run test:e2e`
2. Backend quality:
   - `cd backend && dotnet restore RateOple.sln`
   - `cd backend && dotnet build RateOple.sln --configuration Release --no-restore`
   - `cd backend && dotnet test RateOple.sln --configuration Release --no-build`
3. Integrated build:
   - `cd frontend && npm run build:backend`
   - `cd backend && dotnet publish RateOple/RateOple.csproj --configuration Release`
   - Upload the publish output as the `rateople-publish` artifact.
4. Render Docker build:
   - Configure the Render Web Service with Docker environment, Dockerfile path `./Dockerfile`, and repository-root build context.
   - The Dockerfile runs `npm run build:backend`, publishes `backend/RateOple/RateOple.csproj`, and runs the backend from the ASP.NET runtime image.
   - The container entrypoint sets `ASPNETCORE_URLS=http://0.0.0.0:${PORT}` so the app listens on Render's provided port.
   - Keep production secrets in Render environment variables or secret files only; do not copy local env files or production secrets into the image.
5. Optional browser smoke:
   - Install Chromium with Playwright.
   - `cd frontend && npm run test:e2e`
6. Deploy:
   - Deploy published backend with `wwwroot` included.
   - Run migrations through a controlled deployment step.
7. Post-deploy smoke:
   - Fetch `/api/health`, `/`, `/api/csrf`, `/media`, `/login`.
   - Verify HTTPS, HSTS, static assets, and API same-origin behavior.

Required secrets/environment variables:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `Jwt__Issuer`
- `Jwt__Audience`
- `App__PublicOrigin` or `Email__FrontendBaseUrl`
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`
- `Tmdb__ReadAccessToken`
- `Captcha__Enabled`
- `Captcha__Provider`
- `Captcha__SiteKey`
- `Captcha__SecretKey`
- `Captcha__VerifyUrl`
- `Captcha__LoginFailureThreshold`
- `Email__Provider=Resend`
- `Email__From`
- `Resend__ApiKey`
- Production allowed frontend/API origins if separate-origin deployment is chosen
- `Seed__Mode`
- `Seed__SuperAdmin__Enabled`, `Seed__SuperAdmin__Email`, `Seed__SuperAdmin__Username`, and `Seed__SuperAdmin__Password`, used only for the controlled initial admin strategy
- Deployment provider credentials

Production startup guardrails currently reject:

- Missing required production connection, JWT, origin, Google, TMDB, email, or CAPTCHA configuration.
- Weak or placeholder `Jwt:Key`.
- Non-HTTPS or localhost public origin.
- `Seed:Mode=Demo`.
- Weak or placeholder super-admin seed passwords.
- Disabled, fake, noop, or non-Turnstile CAPTCHA in production.
- Missing Turnstile site key, secret key, or HTTPS verify URL.
- Non-Resend email provider or missing sender/API key in production.

## 10. Deployment Checklist

Before public launch:

- HTTPS is enforced end-to-end.
- HSTS is enabled after confirming HTTPS is stable.
- Production database is PostgreSQL with migrations applied.
- Database backups and restore procedure are configured and tested.
- Connection string and secrets are environment-provided, not committed.
- `Seed:Mode` is not `Demo` in production.
- Super-admin account creation strategy is documented and uses a strong secret.
- Google OAuth callback URLs match the production host.
- CAPTCHA provider is configured and tested in production mode.
- Email provider is configured with verified sender/domain, SPF/DKIM/DMARC where applicable.
- Email confirmation and password reset links use the production public origin.
- Rate limits and quotas are enabled server-side.
- CSRF token flow works from the backend-hosted frontend.
- CORS is disabled or restricted to exact production origins.
- CSP allows only required production providers.
- Swagger/OpenAPI is disabled in production unless explicitly protected.
- Logs include trace IDs but not secrets or PII-heavy payload dumps.
- Static frontend was built with `cd frontend && npm run build:backend`.
- Published artifact includes `backend/RateOple/wwwroot`.
- Render Docker deployments use the root `Dockerfile`, repository-root build context, and host-provided environment variables for all production secrets.
- Post-deploy smoke checks pass on the backend HTTPS host.

Migration/deploy rules:

- Back up the production PostgreSQL database before every migration.
- Apply migrations from the deployment process using the production connection string from the secret store.
- The current startup migration hook is part of the seeding path and only runs when seeding is enabled; do not depend on it as the normal production migration strategy.
- Rollback means restoring the database backup and redeploying the previous artifact unless a tested forward-fix is safer.
- Do not rely on committed appsettings for production secrets; committed files contain placeholders only.

## Open Questions for Implementation

- Which email provider should send confirmation and reset mail?
- Should unconfirmed users be allowed to log in read-only, or should login itself be blocked until confirmation?
- Is production a single backend instance or multiple instances? This decides whether in-memory rate limits are acceptable temporarily.
- Should suspended users retain read-only login access, or be blocked from login entirely?
- What are the final production domain(s), OAuth callback URL(s), and allowed origins?
