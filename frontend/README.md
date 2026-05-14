# RateOple Frontend

The RateOple frontend is a React 19 + Vite application that talks to the ASP.NET Core backend over cookie-authenticated HTTP APIs and SignalR. In development it runs on the Vite dev server. In production the compiled Vite output can be copied into `backend/RateOple/wwwroot` and served by the backend.

## Prerequisites

- Node.js `^20.19.0 || >=22.12.0` to match the installed Vite 7 toolchain
- npm
- The backend API running locally at `http://localhost:5113/api` unless you override `VITE_API_BASE_URL`
- Playwright browser binaries installed before the first e2e run:

```bash
npx playwright install chromium
```

## Environment Variables

Create a local `.env` file or export variables in your shell when needed:

```bash
VITE_API_BASE_URL=http://localhost:5113/api
```

- `src/shared/api/apiClient.js` falls back to `http://localhost:5113/api` when `VITE_API_BASE_URL` is omitted.
- The shared API config keeps CSRF, Google OAuth entry URLs, and API requests on the same backend origin as `VITE_API_BASE_URL`.
- In production the frontend is expected to run same-origin with the backend, with compiled assets served from `backend/RateOple/wwwroot`.

Switching between local HTTP and HTTPS backends:

- Use `frontend/.env.http.example` as the template when running the backend on `http://localhost:5113`
- Use `frontend/.env.https.example` as the template when running the backend on `https://localhost:7167`
- Copy the one you want to `frontend/.env.local`
- When the frontend is served by the backend from `backend/RateOple/wwwroot`, the shared API config falls back to same-origin `/api` automatically, so no frontend env override is required
- For submission/review on another machine, this `.env.local` step is required so the frontend points to the correct local backend protocol

## Local Development

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

Expected backend API base URL during local development:

```text
http://localhost:5113/api
```

The backend must also allow the Vite dev origin in its development CORS policy when you are using cookie auth across origins.

If you want to test Google auth or same-origin cookies over HTTPS instead, set:

```text
https://localhost:7167/api
```

and run the backend HTTPS launch profile.

Submission note:

- TMDB-backed movie and TV images will not fully work on another machine unless the backend has a valid `Tmdb:ReadAccessToken`.
- Google sign-in will not work on another machine unless the backend has valid `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` values.
- Those secrets are not included in the repository by default.

## Auth and CSRF Model

RateOple uses HttpOnly cookie authentication.

- Axios requests use `withCredentials: true` in `src/shared/api/apiClient.js`.
- Access and refresh tokens are not stored in `localStorage`.
- Mutating requests use the shared interceptor in `src/shared/api/authInterceptor.js`.
- The interceptor fetches a CSRF token from `GET /api/csrf`.
- Mutating requests send the token in the `X-CSRF-TOKEN` header.
- On `401` responses, the shared client can attempt `/auth/refresh` before retrying the original request.
- Google OAuth is backend-mediated only. The frontend starts the flow by navigating the browser to `GET /api/auth/google/login`.
- The backend handles the Google challenge/callback, issues the normal RateOple HttpOnly cookies, and redirects back to the frontend callback route at `/auth/callback`.
- The frontend callback route refreshes `GET /api/auth/me` and then navigates to the intended local route.
- The frontend never receives or stores Google access tokens.

Use the shared API client for authenticated feature work instead of creating ad hoc `fetch` or Axios instances.

## API Client Conventions

Shared HTTP behavior lives here:

- `src/shared/api/apiClient.js`
- `src/shared/api/authInterceptor.js`
- `src/shared/api/lookupApi.js`

Conventions:

- Feature services should import and use the shared client.
- Keep cookie, CSRF, and refresh logic centralized in the shared API layer.
- Lookup services used by picker workflows should wrap `lookupApi` instead of duplicating endpoint normalization.
- Existing lookup helpers cover media, public users, moderation users, groups, collections, and moderation scopes.

## Routing

The active router is `src/app/router.jsx`, and `src/app/AppRouter.jsx` renders it.

- Do not add parallel route maps or duplicate routing sources of truth.
- Keep route definitions in `router.jsx`.
- Auth redirects preserve safe local `returnUrl` values through the login/register pages and the `/auth/callback` route.
- Use query params for route state such as search, filters, sort, and pagination where that improves deep linking and reload behavior.
- Production frontend routes are served through the backend SPA fallback after `build:backend`.

## EntityPicker and Lookup Workflows

Do not build user-facing forms that ask for raw GUIDs.

Use lookup endpoints, feature lookup services, and the shared picker UI:

- `src/shared/ui/EntityPicker`
- `src/shared/api/lookupApi.js`
- `src/features/media/services/mediaLookupService.js`
- `src/features/users/services/userLookupService.js`
- `src/features/groups/services/groupLookupService.js`
- `src/features/collections/services/collectionLookupService.js`
- `src/features/moderation/services/scopeLookupService.js`

Use `EntityPicker` or `MultiEntityPicker` for workflows that select existing media, users, groups, collections, or moderation scopes.

## Shared UI and Visual System

RateOple uses a lightweight shared UI foundation built from React components, Tailwind utility classes, and global CSS tokens in `src/index.css`.

Use the shared primitives before adding new page-local control styles:

- `src/shared/ui/Button.jsx`
- `src/shared/ui/Input.jsx`
- `src/shared/ui/Textarea.jsx`
- `src/shared/ui/Select.jsx`
- `src/shared/ui/Checkbox.jsx`
- `src/shared/ui/Toggle.jsx`
- `src/shared/ui/FormField.jsx`
- `src/shared/ui/Badge.jsx`
- `src/shared/ui/InlineMessage.jsx`
- `src/shared/ui/EmptyState.jsx`
- `src/shared/ui/LoadingState.jsx`
- `src/shared/ui/Dialog.jsx`
- `src/shared/ui/PageHeader.jsx`
- `src/shared/ui/SectionCard.jsx`
- `src/shared/ui/Panel.jsx`
- `src/shared/ui/StatCard.jsx`
- `src/shared/ui/DataTable.jsx`
- `src/shared/ui/Tabs.jsx`
- `src/shared/ui/Container.jsx`, `Grid.jsx`, `Stack.jsx`, and `Flex.jsx`

Composite shared UI lives in:

- `src/shared/components/Header`
- `src/shared/components/Footer`
- `src/shared/components/MediaCard`
- `src/shared/ui/SearchBar`
- `src/shared/ui/RatingStars`
- `src/shared/ui/EntityPicker`

Current UI conventions:

- `src/index.css` is only for tokens/base/shared primitives; feature styles belong in feature CSS.
- Prefer Tailwind utility classes in components for small/static styling; add a feature CSS file only when the style is too broad, stateful, or selector-heavy to keep readable in JSX.
- Use `PageHeader` for primary page titles and action bars.
- Use `SectionCard` or `Panel` for framed content instead of hand-rolled card classes.
- Use `InlineMessage` for error, warning, success, and info feedback.
- Use `LoadingState` or `Skeleton` for loading surfaces.
- Use `EmptyState` for no-data surfaces.
- Use `Dialog` for confirmations and destructive actions instead of `window.confirm` or `window.prompt`.
- Keep action rows wrapping on mobile and avoid fixed-width content that can cause horizontal overflow.
- Preserve shared `ui-*` focus and interaction styles unless a feature has a strong reason to customize.

The shared system has been applied across media browse/detail, account, watchlist, groups, collections, notifications, admin media workflows, moderation queues, audit logs, and moderator assignment workflows.

## Testing

Available scripts:

```bash
npm run lint
npm run build
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

Notes:

- Playwright smoke tests currently rely on route mocks for fast browser coverage rather than a seeded full-stack environment.
- `tests/e2e/shared-ui.spec.js` covers shared UI rendering and horizontal-overflow smoke behavior on desktop and mobile Chromium.
- If browser binaries are missing, run `npx playwright install chromium`.
- `playwright.config.js` starts the Vite dev server automatically for e2e runs.

## Production Build

Build the standalone frontend:

```bash
npm run build
```

Build and copy the compiled frontend into the backend host:

```bash
npm run build:backend
```

`build:backend` runs Vite, then copies `frontend/dist` into `backend/RateOple/wwwroot`. React source remains in `frontend/`; `wwwroot` is compiled deployment output only.

## Project Structure

- `src/app` - router and provider composition
- `src/features` - feature pages, components, services, queries, and realtime hooks
- `src/shared/api` - Axios client, auth/CSRF interceptor, React Query client, and lookup API helpers
- `src/shared/ui` - shared UI primitives, visual states, layout helpers, dialogs, data tables, tabs, and `EntityPicker`
- `src/shared/components` - shared composite components such as header, footer, and media cards
- `src/context` - auth, theme, language, and media cart contexts
- `src/layouts` - main/auth/group/admin layout shells
- `src/locales` - translation dictionaries
- `tests/e2e` - Playwright smoke tests

## Common Troubleshooting

- CORS or credential failures: verify `VITE_API_BASE_URL`, backend development CORS origins, and that requests use the shared client with `withCredentials`.
- CSRF `400` errors: confirm `GET /api/csrf` is reachable from the frontend and that the request goes through the shared API client/interceptor path.
- Auth appears logged out after refresh: inspect browser cookies and confirm the backend host matches the cookie and API base URL expectations.
- Google sign-in returns to login with an error: verify `Authentication:Google:ClientId` and `Authentication:Google:ClientSecret` are configured on the backend, and confirm the frontend is pointing at that backend host.
- Playwright browsers missing: run `npx playwright install chromium`.
- Large bundle warning during `npm run build`: route-level splitting should keep the main chunk below the old warning threshold; if the warning returns, inspect authenticated realtime imports and newly eager route dependencies.
