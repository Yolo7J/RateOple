# RateOple Security and Deployment Readiness Plan

Last updated: May 11, 2026

This is an implementation plan, not a completed-feature report. It is based on the current repository state:

- Backend: ASP.NET Core Web API on .NET 9, Identity users/roles, JWT access and refresh tokens in cookies, CSRF protection, EF Core/PostgreSQL, SignalR notifications.
- Frontend: React/Vite served either by Vite in development or from `backend/RateOple/wwwroot` after `npm run build:backend`.
- Existing protections verified in code: HttpOnly auth cookies, refresh token rotation, CSRF header flow, development-only CORS, security headers middleware, role guards, production static hosting, soft-deleted media filtering in core media/collection paths.
- Not found as completed features: CAPTCHA, app-level rate limiting, server-side user content quotas, email confirmation gating before content creation, resend confirmation, forgot/reset password, analytics consent.

## Deployment Readiness Priorities

Phase 1 should happen before public deployment:

1. Add backend rate limits for auth, email, and user-generated-content mutations.
2. Add server-side quotas for user-created resources.
3. Add CAPTCHA provider abstraction and wire CAPTCHA to registration plus suspicious login attempts.
4. Require confirmed email before content creation.
5. Add email confirmation, resend confirmation, and password reset flows with rate limits.
6. Add tests for the new enforcement paths.

Phase 2 should happen before broader usage:

1. Tighten production security headers and operational error handling.
2. Add cookie-consent infrastructure before any analytics.
3. Clean up CSS ownership and verify bundle/chunk budgets.
4. Add CI/CD with deploy and post-deploy smoke checks.

## 1. Bot and Spam Protection

### Backend Rate Limits

Add ASP.NET Core rate limiting in the API host, preferably in a dedicated extension such as `RateOple/Extensions/RateLimitingExtensions.cs`.

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

### User Resource Quotas

Add a quota service in Core, for example `IUserQuotaService`, called by domain services before writes. Quotas must be checked inside backend services, close to the transaction that creates the resource.

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

## 2. CAPTCHA

Add a provider abstraction so business logic is not tied to one vendor:

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

Providers can live behind configuration:

- `Captcha:Provider`: `None`, `Turnstile`, `HCaptcha`, `Recaptcha`
- `Captcha:SiteKey`
- `Captcha:SecretKey`
- `Captcha:VerifyUrl`
- `Captcha:Enabled`
- `Captcha:LoginFailureThreshold`

Registration flow:

1. Frontend loads the configured site key.
2. User completes CAPTCHA on `/register`.
3. Frontend sends `captchaToken` with the existing register payload once the backend contract is extended.
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

Current registration creates a user without confirmed email, but login and content creation do not appear to require confirmation. Change this before public deployment.

Required flow:

1. `POST /api/auth/register` creates user and sends confirmation email.
2. New endpoint: `GET/POST /api/auth/confirm-email` verifies the Identity token.
3. New endpoint: `POST /api/auth/resend-confirmation` sends a new confirmation link.
4. Login can be allowed for unconfirmed users only if content creation remains blocked and the UI clearly prompts confirmation.
5. All content-creation services reject unconfirmed users.

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

Add:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Rules:

- Always return a generic success response for forgot-password to avoid email enumeration.
- Rate-limit by email and IP.
- Log mail send failures server-side without exposing provider details.
- Invalidate/rotate refresh tokens after successful reset.

### Account States

Define and enforce:

| State | Login | Content creation | Public visibility |
| --- | --- | --- | --- |
| Unconfirmed | Optional allowed | Blocked | Existing public profile can be minimal or hidden until confirmed |
| Confirmed | Allowed | Allowed subject to quotas/rate limits | Normal |
| Suspended/banned | Blocked or read-only, policy-defined | Blocked | Existing content remains unless moderated |
| Deleted | Blocked | Blocked | Profile anonymized/hidden; content behavior follows existing account deletion policy |

Current account deletion anonymizes/locks the user in `UserProfileService`; keep that semantics documented and test it when lifecycle work changes.

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

- Review CSP against actual providers: Google OAuth redirects, CAPTCHA scripts/frames, TMDB/Open Library images, optional email tracking links, and any future analytics.
- Prefer nonces or hashes if inline styles/scripts are introduced; current CSP permits inline styles.
- Add `upgrade-insecure-requests` in production when all assets are HTTPS.
- Add reporting-only CSP first if the deployment environment is uncertain.

### Error Handling

Current backend uses problem details and a global exception handler.

Before deployment:

- Ensure production responses do not expose exception stack traces, connection strings, provider secrets, or SQL details.
- Log correlation/trace IDs server-side.
- Return consistent problem responses for quota, rate-limit, CAPTCHA, email confirmation, and validation failures.

### Admin and Moderation Protection

Current router and API policies use role guards for admin/moderation areas.

Before deployment:

- Keep role checks server-side on every staff mutation.
- Add tests that normal users cannot reach admin media, moderation reports, assignments, audit logs, TMDB import, or role-changing/group moderation actions.
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

Recommended GitHub Actions stages:

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
4. Deploy:
   - Deploy published backend with `wwwroot` included.
   - Run migrations through a controlled deployment step.
5. Post-deploy smoke:
   - Health/API status route if added.
   - Fetch `/`, `/api/csrf`, `/media`, `/login`.
   - Verify HTTPS, HSTS, static assets, and API same-origin behavior.

Required secrets/environment variables:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `Authentication__Google__ClientId`
- `Authentication__Google__ClientSecret`
- `Tmdb__ReadAccessToken`
- `Captcha__Provider`
- `Captcha__SiteKey`
- `Captcha__SecretKey`
- SMTP/email provider settings
- Production allowed frontend/API origins if separate-origin deployment is chosen
- Seed super-admin settings, used only for the controlled initial admin strategy
- Deployment provider credentials

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
- Post-deploy smoke checks pass on the backend HTTPS host.

## Open Questions for Implementation

- Which CAPTCHA provider should be used first: Cloudflare Turnstile, hCaptcha, or reCAPTCHA?
- Which email provider should send confirmation and reset mail?
- Should unconfirmed users be allowed to log in read-only, or should login itself be blocked until confirmation?
- Is production a single backend instance or multiple instances? This decides whether in-memory rate limits are acceptable temporarily.
- Should suspended users retain read-only login access, or be blocked from login entirely?
- What are the final production domain(s), OAuth callback URL(s), and allowed origins?
