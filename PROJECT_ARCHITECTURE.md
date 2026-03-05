# RateOple Project Architecture

## Executive Summary
RateOple is a comprehensive media rating and social platform built using **Clean Architecture** on the backend (.NET 9) and a modern **SPA (Single Page Application)** on the frontend (Vite + React 19). The system supports user ratings, reviews, collections, groups, and social features for movies, books, and TV series.

**Current Status:**
- ✅ **Backend**: Complete 4-layer architecture with **PostgreSQL** database. Ratings slice implemented.
- ✅ **Database**: PostgreSQL schema matching Prisma specification with 16+ entities, including constraints and aggregates.
- ✅ **Authentication**: ASP.NET Core Identity with role-based authorization.
- ⚠️ **Frontend**: Core architecture set up. Ratings UI integrated (`MediaCard`, `RatingStars`). Auth & other pages pending.

---

## 1. High-Level System Design

```mermaid
graph TD
    User[Client Browser] -->|HTTPS/JSON| Frontend[Frontend: Vite + React]
    Frontend -->|REST API Calls| Backend[Backend API: .NET 9]
    
    subgraph "Backend System - Clean Architecture"
        Backend -->|Controllers| API[RateOple API Layer]
        API -->|Uses| Core[RateOple.Core<br/>Domain + Services]
        API -->|Uses| Infra[RateOple.Infrastructure<br/>Data Access]
        API -->|Uses| Const[RateOple.Constants<br/>Enums + Constants]
        
        Infra -->|Implements| Core
        Infra -->|EF Core (Npgsql)| DB[(PostgreSQL Database)]
        
        Core -.-> Const
        Infra -.-> Const
    end
```

---

## 2. Frontend Architecture

### Tech Stack
- React 19.2.0, Vite 7.2.4, React Router DOM 7.9.6
- Axios 1.13.2 — `withCredentials: true`, base URL `http://localhost:5113/api`
- Context API: ThemeContext, LanguageContext, **AuthContext**

### Directory Structure
```
frontend/src/
├── app/               # AppRouter.jsx, routes.jsx
├── components/
│   ├── auth/          # AuthCard, LoginForm, RegisterForm
│   ├── layout/        # Header, Footer, Sidebar, Layout
│   ├── ui/            # Button, Card, RatingStars, ThemeToggle, LanguageToggle
│   └── media/         # MediaCard, MediaGrid, MediaFilters
├── pages/             # Home, LoginPage, RegisterPage
├── context/           # ThemeContext, LanguageContext, AuthContext
├── hooks/             # useTheme, useLanguage
├── services/          # api.js, authService.js, ratingService.js
├── locales/           # en.json, bg.json
├── App.jsx
└── main.jsx           # ThemeProvider > LanguageProvider > BrowserRouter > AuthProvider
```

---

## 3. Backend Architecture (.NET Clean Architecture)

### Technology Stack
- **Framework**: .NET 9 (ASP.NET Core Web API)
- **ORM**: Entity Framework Core 9 (Npgsql Provider)
- **Database**: PostgreSQL
- **Authentication**: ASP.NET Core Identity with JWT support
- **Authorization**: Policy-based with role hierarchies
- **API Documentation**: OpenAPI/Swagger
- **Architecture Pattern**: Clean Architecture (4-layer)

### Solution Structure

#### **Layer 1: RateOple (API/Presentation Layer)**
*Entry point - handles HTTP requests, dependency injection, middleware*

**Responsibilities:**
- API Controllers (`FollowsController`, `MediaController`, `RatingsController`)
- Program.cs (Service registration: `IRatingService`, `Npgsql`, Middleware)
##### Extension Methods (Program.cs)
- `AddDatabase` — Npgsql + EF Core
- `AddIdentityConfiguration` — ASP.NET Identity
- `AddJwtAuthentication` — JWT Bearer
- `AddCsrfProtection` — Antiforgery, `CookieSecurePolicy.SameAsRequest`
- `AddApplicationServices` — FollowService, VisibilityService, MediaService, RatingService, **JwtService**
- `AddCorsConfiguration` — `http://localhost:5173` with credentials
- `ConfigureMiddleware` — UseRouting → SecurityHeaders → CORS → Authentication → Antiforgery (respects `[IgnoreAntiforgeryToken]`) → Authorization → MapControllers
#####
- Authentication & authorization configuration
- CORS policy configuration

**Dependencies:** → Core, Infrastructure, Constants

---

#### **Layer 2: RateOple.Core (Domain Layer)**
*Enterprise logic and types - has NO dependencies on other projects*

**Structure:**
```

RateOple.Core/
├── Contracts/
│   ├── DTOs/
        ├── Auth 
        |        Core DTOs
        |        - `LoginDto`: `{ Email, Password }`
        |        - `RegisterDto`: `{ Username, Email, Password }`
│   │   ├── MediaDetailsDto.cs       # Detailed media info
│   │   ├── MediaListDto.cs          # List view media info 
│   │   ├── MediaRatingSummaryDto.cs # Rating aggregates 
│   │   └── RatingDto.cs             # Individual ratings
│   ├── IFollowService.cs
│   ├── IMediaService.cs
│   ├── IRatingService.cs
│   └── IVisibilityService.cs
    └── IJwtService.cs
└── Services/
    ├── FollowService.cs
    ├── MediaService.cs
    ├── RatingService.cs     # Handles logic + aggregation
    └── VisibilityService.cs
    └── JwtService.cs - generates access + refresh tokens
```

**Key Services:**
- `IRatingService`: Rate media, delete ratings, calculate aggregates.
- `IMediaService`: Get media lists and details.
- `IFollowService`: User follow logic.

**Dependencies:** None (pure domain layer)

---

#### **Layer 3: RateOple.Infrastructure (Data Access Layer)**
*Implements Core contracts - handles database operations*

**Structure:**
```
RateOple.Infrastructure/
├── Data/
│   ├── ApplicationDbContext.cs
│   ├── Models/              
│   │   ├── Media.cs (Base), Movie.cs, Book.cs, TvSeries.cs, Episode.cs, Season.cs
│   │   ├── User.cs, Follow.cs
│   │   ├── Rating.cs, Review.cs, Comment.cs
│   │   ├── Collection.cs, CollectionItem.cs
│   │   ├── Group.cs, GroupMembership.cs, GroupPost.cs, GroupMedia.cs
│   ├── Configurations/      
│   │   ├── MediaConfiguration.cs  # Aggregates config + Indexes
│   │   ├── RatingConfiguration.cs # Check Constraint (1-10)
│   │   ├── UserConfiguration.cs   # Unique Username Constraint
│   │   └── RefreshTokenConfiguration.cs # PK + FK mapping
│   │   └── ... (Configs for all entities)
├── Migrations/          # PostgreSQL migrations
├── Middleware
    ├── SecurityHeadersMiddleware.cs
    ├── SecurityHeadersExtension.cs
├── Security
    ├── TokenHasher.cs
```

**Database Provider:** `Npgsql.EntityFrameworkCore.PostgreSQL`

**Dependencies:** → Core

---

#### **Layer 4: RateOple.Constants (Shared Constants)**
*Enums and constant values used across all layers*

Includes `MediaType`, `UserVisibility`, `RoleConstants`, etc.

---

## 4. Database Schema

### Entity Relationship Diagram
(Standard ERD + Aggregates)

### Key Relationships & Constraints

**User Relationships:**
- One-to-Many: User → {Ratings, Reviews, Collections, GroupMemberships, OwnedGroups, GroupPosts, Comments}
- Self-Referencing Many-to-Many: User ↔ User (via Follow)

**New Constraints & Features:**
- **Unique Users**: `NormalizedUserName` is strictly unique at the database level.
- **Rating Validation**: SQL Check Constraint on `Rating` table (`"Value" >= 1 AND "Value" <= 10`).
- **Media Aggregates**: Denormalized `AverageRating` (double) and `RatingsCount` (int) on `Media` table for performance.
- **Indexes**: Added indexes for `AverageRating` for sorting "Top Rated" media.
- **Refresh Tokens**: Dedicated `RefreshTokens` table for JWT session management with cascade delete on User removal.

**Polymorphic Relationships (Comment):**
- Comments use nullable foreign keys (`ReviewId?`, `GroupPostId?`, `ParentCommentId?`).

---

## 5. Authentication & Authorization

### Identity Configuration
- **User Model**: Custom `User` entity inheriting from `IdentityUser<Guid>`
- **Role Model**: `IdentityRole<Guid>`
- **Password Policy**: Min 6 chars, requires digit, upper, lower case

### Role Hierarchy & Policies
- **Roles**: SuperAdmin > Admin > Moderator > User
- **Policies**: RequireAdmin, RequireModerator, CanModerateContent, CanManageGroups

### 5.1 Auth Flow
1. **Register** `POST /api/auth/register` → creates user, assigns "User" role
2. **Login** `POST /api/auth/login` → finds by email → issues `accessToken` (15min) + `refreshToken` (7d) as HttpOnly cookies → returns `{ id, userName, roles }`
3. **Refresh** `POST /api/auth/refresh` → validates hash → rotates both tokens
4. **Logout** `POST /api/auth/logout` → revokes token → clears cookies

**Cookie policy:** HttpOnly, SameSite=Strict, Secure=false in dev / true in prod.

---


## 6. API Endpoints

| Controller | Method | Route | Description |
|---|---|---|---|
| Auth | POST | `/api/auth/register` | Create account |
| Auth | POST | `/api/auth/login` | Login → cookies |
| Auth | POST | `/api/auth/refresh` | Rotate tokens |
| Auth | POST | `/api/auth/logout` | Revoke + clear |
| Ratings | POST | `/api/media/{id}/ratings` | Rate (1–10) |
| Ratings | DELETE | `/api/media/{id}/ratings` | Remove rating |
| Ratings | GET | `/api/media/{id}/ratings/summary` | Aggregate |
| Follows | POST | `/api/follows/{userId}` | Follow user |
| Follows | DELETE | `/api/follows/{userId}` | Unfollow |
| Follows | GET | `/api/follows/{userId}/status` | Check status |
| Media | GET | `/api/media` | List all |
| Media | GET | `/api/media/{id}` | Details |

---


## 7. Configuration

### Connection String (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=RateOple;Username=postgres;Password="
  },
  "Jwt": {
    "Key": "",
    "Issuer": "RateOple",
    "Audience": "RateOple"
  },
  "AllowedHosts": "*"
}
```

### CORS Policy
- **Allowed Origin**: `http://localhost:5173` (Vite dev server)
- **Allow Credentials**: `true` (Enabled for Identity cookies/auth)

---

## 8. Development Workflow

### Building the Project
```bash
cd backend
dotnet build RateOple.sln
```

### Running the API
```bash
cd backend/RateOple
dotnet run
```
**Swagger UI**: `https://localhost:7167/swagger`

### Running the Frontend
```bash
cd frontend
npm run dev
```
**Dev Server**: `http://localhost:5173`

### Creating Migrations (Postgres)
```bash
cd backend
dotnet ef migrations add <MigrationName> --project RateOple.Infrastructure --startup-project RateOple
dotnet ef database update --project RateOple.Infrastructure --startup-project RateOple
```

---

## 9. Next Steps

# RateOple — Feature Roadmap

Priority levels: 🔴 Crucial | 🟡 Important | 🟢 Second grade

---

## ✅ Done

- [x] Backend Clean Architecture (4 layers)
- [x] PostgreSQL schema (16+ entities)
- [x] JWT auth via HttpOnly cookies (register, login, logout, refresh)
- [x] Frontend AuthContext + forms connected to backend
- [x] Ratings UI (RatingStars, MediaCard)

---

## 🔴 Crucial — Do Next
Done
### 1. Logout button in Header // Done
The `AuthContext` already has `logout()`. The Header needs a logout button visible when `user` is not null.
- Frontend only: update `Header.jsx` to read `useAuth()` and show Logout button when logged in.
### 2. Media Management (Add & View) // Partially done - have to Make it admin-only and to make the book adding with the third part API availble
Users need to browse media. Admins add it. This is the core of the product.

**Backend:**
- `MediaController` — extend `POST /api/media` (admin only, `[Authorize(Policy = "RequireAdmin")]`)
- DTOs: `CreateMovieDto`, `CreateBookDto`, `CreateTvSeriesDto`
- Service methods: `AddMedia`, `GetAllMedia` (with filters/pagination), `GetMediaById`

**Frontend:**
- `MediaListPage` — grid of all media with filters (type, genre, rating)
- `MediaDetailPage` — single media with rating, reviews
- Admin-only: `AddMediaForm` — select type (Movie/Book/TvSeries), fill fields, submit

---

## 🟡 Important

### 3. Admin Panel
Only admins can add media in the finished product.
- Frontend: `/admin` route, protected by role check (`user.roles.includes("Admin")`)
- Includes: Add Media form, user management (list users, change roles)
- Backend: admin-only endpoints already covered by `RequireAdmin` policy

### 4. Follow System
Already modeled in DB (`Follow` table) and `FollowsController` exists.
- Frontend: Follow/Unfollow button on user profiles
- `UserProfilePage` — shows user's ratings, reviews, collections
- Feed: activity from followed users

### 5. Collections ("My Christmas Watch")
Users group any media into named collections.
- Already modeled: `Collection`, `CollectionItem`
- Backend: `CollectionsController` (CRUD)
- Frontend: `CollectionPage`, "Add to Collection" button on `MediaDetailPage`

---

## 🟢 Second Grade (after above is stable)

### 6. Account Settings in Header
- Dropdown from avatar/username when logged in
- Links to: Profile, Settings, Logout
- `AccountSettingsPage`: change username, email, password, avatar, theme preference

### 7. Groups
Users with shared interests join or create groups.
- Already modeled: `Group`, `GroupMembership`, `GroupPost`, `GroupMedia`
- Backend: `GroupsController` (create, join, post, add media)
- Frontend: `GroupsPage`, `GroupDetailPage`

---

## Open Questions / Suggestions

1. **Media images** — where do cover images come from? Options: admin uploads a URL, integrate a public API (TMDB for movies, Open Library for books), or file upload to S3/local storage. Recommend TMDB + Open Library to avoid manual data entry.

2. **Pagination** — `GET /api/media` will grow large fast. Add cursor or page-based pagination before the media list is built.

3. **Route guards** — currently a logged-in user can still visit `/login` and `/register`. Add a simple guard: if `user` exists, redirect away from auth pages.

4. **Token refresh on 401** — the Axios response interceptor currently just logs a warning on 401. It should automatically call `POST /api/auth/refresh` and retry the original request before logging the user out.

5. **Review system** — not yet planned in detail. Needed alongside media pages: `ReviewsController`, `ReviewService`, review form on `MediaDetailPage`.