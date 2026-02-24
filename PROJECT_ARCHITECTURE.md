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

## 2. Frontend Architecture (React + Vite)

### Technology Stack
- **Framework**: React 19.2.0 (functional components with Hooks)
- **Build Tool**: Vite 7.2.4 (fast HMR and bundling)
- **Routing**: React Router DOM 7.9.6 (configured via `AppRouter` and `routes.jsx`)
- **HTTP Client**: Axios 1.13.2 (configured with interceptors)
- **State Management**: Context API (ThemeContext, LanguageContext)
- **Styling**: Vanilla CSS with modern design patterns (`MediaCard` uses CSS variables)
- **Internationalization**: Custom language system (English/Bulgarian)

### Current Implementation
- ✅ **API Layer**: Centralized `api.js` with Axios instance and base URL configuration.
- ✅ **Bindings**: `AppRouter.jsx` and `routes.jsx` for centralized routing.
- ✅ **Ratings Slice**: 
    - `ratingService.js`: Methods for rating, deleting, and fetching summaries.
    - `RatingStars`: Interactive star rating component (1-10 scale).
    - `MediaCard`: Integrated with rating display and interaction.
- ✅ **Core Layout**: Header, Footer, Theme/Language toggles.
- ⚠️ **Auth Integration**: Pending connection to backend auth endpoints.

### Directory Structure
```
frontend/
├── src/
│   ├── app/                 # AppRouter.jsx, routes.jsx
│   ├── components/
│   │   ├── layout/          # Header, Footer, Sidebar, Layout
│   │   ├── ui/              # Button, Card, SearchBar, ThemeToggle, LanguageToggle, RatingStars
│   │   └── media/           # MediaCard (integrated), MediaGrid, MediaFilters
│   ├── pages/               # Home (Currently implemented)
│   ├── context/             # ThemeContext.jsx, LanguageContext.jsx
│   ├── hooks/               # useTheme.js, useLanguage.js
│   ├── services/            # api.js (Axios), ratingService.js, auth.js
│   ├── locales/             # en.json, bg.json
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
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
│   │   ├── MediaDetailsDto.cs       # Detailed media info
│   │   ├── MediaListDto.cs          # List view media info
│   │   ├── MediaRatingSummaryDto.cs # Rating aggregates
│   │   └── RatingDto.cs             # Individual ratings
│   ├── IFollowService.cs
│   ├── IMediaService.cs
│   ├── IRatingService.cs
│   └── IVisibilityService.cs
└── Services/
    ├── FollowService.cs
    ├── MediaService.cs
    ├── RatingService.cs     # Handles logic + aggregation
    └── VisibilityService.cs
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
│   └── Migrations/          # PostgreSQL migrations
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

---

## 6. API Endpoints (Current)

### RatingsController (`/api/media/{mediaId}/ratings`)
- `POST /` - Rate a media item (1-10)
- `DELETE /` - Remove rating
- `GET /summary` - Get average rating, count, and user's rating

### FollowsController (`/api/follows`)
- `POST /{userId}` - Follow a user
- `DELETE /{userId}` - Unfollow a user
- `GET /{userId}/status` - Check if following a user

### MediaController (`/api/media`)
- `GET /` - Get all media
- `GET /{id}` - Get media details

---

## 7. Configuration

### Connection String (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=RateOple;Username=postgres;Password=<PASSWORD>"
  }
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

### Backend
- [ ] Implement Reviews Slice (`ReviewService`, `ReviewsController`)
- [ ] Implement Collections/Groups
- [ ] Add Pagination & Filtering
- [ ] Secure endpoints with JWT implementation

### Frontend
- [ ] Connect Authentication (Login/Register pages)
- [ ] Build Media Listings (Grid)
- [ ] Implement Review submission forms
- [ ] User Profile pages
