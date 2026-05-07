# Media Detail Redesign Plan

Audit date: 2026-05-07

Scope inspected:
- `frontend/src/app/router.jsx`
- `frontend/src/features/media/pages/MediaDetailPage.jsx`
- `frontend/src/features/media/queries/`
- `frontend/src/features/media/services/`
- `frontend/src/features/reviews/queries/`
- `frontend/src/features/reviews/services/`
- `frontend/src/features/ratings/queries/`
- `frontend/src/features/ratings/services/`
- `frontend/src/features/collections/queries/`
- `frontend/src/features/collections/services/`
- `backend/RateOple/Controllers/Media/`
- `backend/RateOple/Controllers/Collections/`
- `backend/RateOple.Core/Media/`
- `backend/RateOple.Core/Social/`
- `backend/RateOple.Core/Collections/`
- `backend/RateOple.Infrastructure/Data/Entities/`

## 1. Current Frontend Routes

Current media-related routes in `frontend/src/app/router.jsx`:

- `/media` -> `MediaListPage`
- `/media/:id` -> `MediaDetailPage`
- `/media/add` -> `AddMediaPage`, authenticated Admin/SuperAdmin only
- `/media/:id/seasons` -> `SeasonManagerPage`, authenticated only
- `/admin/media` -> `AdminMediaPage`, authenticated Admin/SuperAdmin only
- `/admin/media/:id/edit` -> `EditMediaPage`, authenticated Admin/SuperAdmin only

There are no public season detail routes.

There are no public episode detail routes.

`/media/:id/seasons` is an authenticated management/editor route. It is not a public season detail page and it does not accept `seasonNumber` or `episodeNumber`.

Season and episode viewer routes are possible without backend changes because the current TV read contracts expose season numbers, season IDs, episode numbers, and episode IDs. A frontend route can load `/api/media/{id}` or `/api/media/{id}/seasons`, find the requested season or episode by number, then use the target ID for rating summaries and mutations.

The limitation is that this would be a derived frontend view, not a dedicated backend resource. It would fetch all seasons to render one season or episode, and it would not solve season/episode review feeds or containing collections.

## 2. TV Data Contract

TV data is currently available from two read paths:

- `GET /api/media/{id}` in `MediaController.GetById`, through `MediaService.GetByIdAsync`
- `GET /api/media/{id}/seasons` in `MediaController.GetSeasons`, through `TvSeriesService.GetSeasonsAsync`

Frontend usage:

- `useMediaDetailsQuery(id)` calls `mediaService.getMediaById(id)` -> `GET /api/media/{id}`
- `useTvSeriesSeasonsQuery(id)` calls `getSeasons(id)` -> `GET /api/media/{id}/seasons`

`GET /api/media/{id}` returns `MediaDetailDto`. For TV series it includes:

- `seasonsCount`
- `seasons: SeasonDto[]`
- each season has `id`, `seasonNumber`, and `episodes`
- each episode has `id`, `episodeNumber`, `title`, and `duration`

`GET /api/media/{id}/seasons` returns `SeasonDetailDto[]` with the same core shape:

- season `id`
- `seasonNumber`
- `episodes`
- episode `id`
- `episodeNumber`
- `title`
- `duration`

Does it include episodes? Yes.

Does it include season IDs? Yes.

Does it include episode IDs? Yes.

Does it include enough data to build season pages? Yes for a basic page: series context, season number, season rating summary by season ID, and an episodes list. It does not include season title, overview, air date, poster, or trailer metadata.

Does it include enough data to build episode pages? Yes for a basic page: series context, season number, episode number, episode title, duration, and episode rating summary by episode ID. It does not include episode overview, air date, still image, credits, or richer IMDb-style metadata.

There is no public single-season read endpoint such as `GET /api/media/{mediaId}/seasons/{seasonNumber}`.

There is no public single-episode read endpoint such as `GET /api/media/{mediaId}/seasons/{seasonNumber}/episodes/{episodeNumber}`.

Those endpoints are not strictly required for a first frontend route split, but they are recommended before optimizing the final user experience.

## 3. Rating Contract

Backend rating endpoints in `RatingsController`:

- `POST /api/media/{mediaId}/ratings`
- `POST /api/seasons/{seasonId}/ratings`
- `POST /api/episodes/{episodeId}/ratings`
- `DELETE /api/media/{mediaId}/ratings`
- `DELETE /api/seasons/{seasonId}/ratings`
- `DELETE /api/episodes/{episodeId}/ratings`
- `GET /api/media/{mediaId}/ratings/summary`
- `GET /api/seasons/{seasonId}/ratings/summary`
- `GET /api/episodes/{episodeId}/ratings/summary`

Frontend rating service support:

- `ratingService.rateMedia(mediaId, value)`
- `ratingService.rateSeason(seasonId, value)`
- `ratingService.rateEpisode(episodeId, value)`
- `ratingService.deleteMediaRating(mediaId)`
- `ratingService.deleteSeasonRating(seasonId)`
- `ratingService.deleteEpisodeRating(episodeId)`
- `ratingService.getMediaSummary(mediaId)`
- `ratingService.getSeasonSummary(seasonId)`
- `ratingService.getEpisodeSummary(episodeId)`

Frontend hooks currently exist for:

- media summary
- season summary
- episode summary
- rate media
- rate season
- rate episode
- delete media rating

Frontend hooks do not currently exist for deleting season or episode ratings, although the frontend service and backend endpoints support those deletes.

Can the frontend rate media, season, and episode independently? Yes. `RatingDto` has nullable `mediaId`, `seasonId`, and `episodeId`, and `RatingService` enforces exactly one target per rating.

Can ratings be deleted independently? Yes at the backend contract and frontend service level. The current UI only has a ready mutation hook for media rating deletion. Season and episode delete hooks should be added before exposing clear/delete controls on the new season and episode pages.

Important rating semantics issue:

- `GET /api/media/{mediaId}/ratings/summary` returns ratings where `Rating.MediaId == mediaId`, so it is a direct media-level summary.
- `MediaDetailDto.AverageRating` and `RatingsCount` come from `Media.AverageRating` and `Media.RatingsCount`.
- `RatingService.RefreshMediaAggregateAsync` aggregates media ratings plus season ratings plus episode ratings into the stored media aggregate.

For a proper TV detail system, the product needs explicit labels for these two concepts:

- direct series rating
- aggregate rating across series, seasons, and episodes

Without that distinction, the series hero can appear inconsistent with the series rating controls.

## 4. Review Contract

Backend review endpoints in `ReviewsController`:

- `POST /api/reviews`
- `PUT /api/reviews/{reviewId}`
- `DELETE /api/reviews/{reviewId}?deleteRating={bool}`
- `GET /api/media/{mediaId}/reviews`

There is also an authenticated current-user endpoint outside the media controller scope:

- `GET /api/users/me/reviews`

Frontend review service support:

- `reviewService.getMediaReviews(mediaId)` -> `GET /api/media/{mediaId}/reviews`
- `reviewService.createReview(payload)` -> `POST /api/reviews`
- `reviewService.updateReview(reviewId, payload)` -> `PUT /api/reviews/{reviewId}`
- `reviewService.deleteReview(reviewId, deleteRating)` -> `DELETE /api/reviews/{reviewId}`
- `reviewService.getMyReviews()` -> `GET /api/users/me/reviews`

Is there only `GET /api/media/{mediaId}/reviews` for media detail review fetching? Yes.

Are there endpoints for season reviews? No.

Are there endpoints for episode reviews? No.

Does `ReviewDto` expose target type? No.

Does `ReviewDto` expose `seasonId`? No.

Does `ReviewDto` expose `episodeId`? No.

Does `ReviewDto` expose season number? No.

Does `ReviewDto` expose episode number? No.

Does `ReviewDto` expose target title? No.

Does `ReviewDto` expose rating value? No, even though the frontend `ReviewCard` checks for `review.ratingValue`.

Why the current TV review feed is unsafe:

- A review is created from a `RatingId`.
- The rating can target media, season, or episode.
- `ReviewService.CreateReviewAsync` stores `Review.MediaId` as the owner media ID for all three target types.
- For a season review, `Review.MediaId` becomes the TV series media ID.
- For an episode review, `Review.MediaId` becomes the TV series media ID.
- `GetMediaReviewsAsync(mediaId)` returns every review where `Review.MediaId == mediaId`.
- `ReviewDto` only exposes `mediaId` and `ratingId`, not the target identity from the related `Rating`.

Can the frontend safely separate series reviews from season or episode reviews? No.

The frontend cannot safely infer target type from the current review payload. It also cannot fetch a review's rating target by `ratingId` for arbitrary users.

Backend changes needed for reviews:

- Extend `ReviewDto` with target metadata:
  - `targetType`: `Media`, `Season`, or `Episode`
  - `ratingValue`
  - `seasonId`
  - `episodeId`
  - `seasonNumber`
  - `episodeNumber`
  - `targetTitle`
  - optionally `mediaTitle` for user review lists
- Update `ReviewService` projections to include `Rating`, `Rating.Season`, and `Rating.Episode`.
- Keep `POST /api/reviews` based on `ratingId`; this creation contract is acceptable.
- Keep `Review.MediaId` as owner media if desired; the target can be resolved from `Review.Rating`.
- Add target-specific fetch contracts:
  - `GET /api/media/{mediaId}/reviews?target=media` for direct movie/book/series reviews
  - `GET /api/media/{mediaId}/reviews?target=all` for aggregate media-owned reviews, with target metadata
  - `GET /api/seasons/{seasonId}/reviews`
  - `GET /api/episodes/{episodeId}/reviews`
- Add tests proving that a series review, season review, and episode review are returned by the correct target endpoints and labeled correctly in aggregate responses.

Until this backend work exists, a proper TV Reviews tab, Season Reviews section, and Episode Reviews section cannot be implemented honestly.

## 5. Collections Contract

Backend collection endpoints in `CollectionsController`:

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

Is there an endpoint for collections containing a media item? No.

Does `/api/collections?mediaId=...` actually filter by media? No.

`CollectionQueryDto` supports:

- `ownerType`
- `ownerId`
- `parentCollectionId`
- `page`
- `pageSize`

It does not include `mediaId`, and `CollectionService.QueryAsync` does not filter through `CollectionItems` by media ID.

Does the frontend collection service support containing-media lookup? No.

`collectionService.query(params)` can call `/collections` with params, but `useCollectionsQuery` only forwards `ownerType`, `ownerId`, `parentCollectionId`, `page`, and `pageSize`.

Current `/collections?mediaId=...` frontend behavior:

- `CollectionsPage` reads `mediaId` only to auto-add that media when creating a new collection.
- `CollectionDetailPage` reads `mediaId` only to add that media to an existing collection.
- It is not a containing collections filter.

Backend endpoint to add:

- `GET /api/media/{mediaId}/collections?page=1&pageSize=12`

Recommended service shape:

- Add `ICollectionService.GetContainingMediaAsync(Guid mediaId, CollectionQueryDto query, Guid? viewerId)`
- Query `CollectionItems` where `MediaId == mediaId`
- Join to collections
- Apply the same visibility rules used by collection query/details
- Return a paged collection summary DTO

The endpoint can return `PagedCollectionsDto`, but a lighter `PagedCollectionSummariesDto` would be better for a media detail tab because the UI does not need every item in each collection.

## 6. Recommended Final Route Architecture

Recommended routes:

- `/media/:id`
- `/media/:id/seasons/:seasonNumber`
- `/media/:id/seasons/:seasonNumber/episodes/:episodeNumber`

Recommended v1 approach: hybrid, with full pages for season and episode detail, and inline panels or drawers only for actions such as rating, status, and writing a review.

Do not make season or episode detail primarily modal-based. Full pages give users shareable URLs, browser history, refresh safety, and a cleaner IMDb-style hierarchy. Modals/drawers are appropriate for short-lived actions, not for the resource itself.

The first split can use existing backend TV data by loading the series plus all seasons and matching `seasonNumber` and `episodeNumber` in the frontend. That is safe for an architectural split, but target review feeds and containing collections should remain explicitly unavailable until the backend contracts exist.

## 7. Recommended UX

### Movie Detail: `/media/:id`

Content:

- hero with poster, title, year, runtime, genres, overview
- direct movie rating and clear rating
- watch status
- movie reviews from direct media review endpoint
- collections containing this movie
- similar media

Backend dependency:

- usable today except containing collections
- reviews need `ratingValue` added to `ReviewDto` for proper review cards and rating sort

### Book Detail: `/media/:id`

Content:

- hero with cover, title, author, year, pages, genres, overview
- direct book rating and clear rating
- reading status
- book reviews from direct media review endpoint
- collections containing this book
- similar media

Backend dependency:

- usable today except containing collections
- reviews need `ratingValue` added to `ReviewDto` for proper review cards and rating sort

### TV Series Detail: `/media/:id`

Content:

- hero with poster, title, year, genres, overview
- clearly labeled direct series rating/status
- optionally labeled aggregate rating if product keeps the all-target aggregate
- series reviews only
- seasons list with season cards linking to season pages
- collections containing this series
- similar media

Do not render every episode rating/review form on the series page.

Backend dependency:

- seasons list is usable today
- direct series reviews require review target filtering or metadata
- containing collections require a new endpoint
- rating semantics should distinguish direct series rating from aggregate TV rating

### Season Detail: `/media/:id/seasons/:seasonNumber`

Content:

- season header with series title, Season N, episode count, breadcrumb back to series
- season rating and clear rating
- write season review action
- season reviews if supported
- episode list with each episode linking to its episode detail page

Backend dependency:

- basic header, rating, and episode list are usable today by deriving from `/api/media/{id}/seasons`
- season review feed requires `GET /api/seasons/{seasonId}/reviews`
- clear rating needs frontend delete hook

### Episode Detail: `/media/:id/seasons/:seasonNumber/episodes/:episodeNumber`

Content:

- episode header with series title, Season N, Episode N, episode title, duration, breadcrumb back to season
- episode rating and clear rating
- write episode review action
- episode reviews if supported

Backend dependency:

- basic header and rating are usable today by deriving from `/api/media/{id}/seasons`
- episode review feed requires `GET /api/episodes/{episodeId}/reviews`
- clear rating needs frontend delete hook

## 8. Backend Changes Needed

Required for a proper final system:

1. Review target metadata and target review endpoints

Files to change:

- `backend/RateOple/Controllers/Media/ReviewsController.cs`
- `backend/RateOple.Core/Social/DTOs/ReviewDtos.cs`
- `backend/RateOple.Core/Social/Interfaces/IReviewService.cs`
- `backend/RateOple.Core/Social/Services/ReviewService.cs`
- backend tests for review target filtering and DTO metadata

Endpoint additions:

- `GET /api/media/{mediaId}/reviews?target=media`
- `GET /api/media/{mediaId}/reviews?target=all`
- `GET /api/seasons/{seasonId}/reviews`
- `GET /api/episodes/{episodeId}/reviews`

DTO additions:

- `targetType`
- `ratingValue`
- `seasonId`
- `episodeId`
- `seasonNumber`
- `episodeNumber`
- `targetTitle`
- optional `mediaTitle`

No database migration appears necessary for these fields because `Review` already links to `Rating`, and `Rating` already has `MediaId`, `SeasonId`, and `EpisodeId`.

2. Containing collections endpoint

Files to change:

- `backend/RateOple/Controllers/Media/MediaController.cs` or a dedicated media collections controller
- `backend/RateOple.Core/Collections/DTOs/CollectionDtos.cs`
- `backend/RateOple.Core/Collections/Interfaces/ICollectionService.cs`
- `backend/RateOple.Core/Collections/Services/CollectionService.cs`
- backend tests for public/private visibility and media filtering

Endpoint addition:

- `GET /api/media/{mediaId}/collections?page=1&pageSize=12`

3. Optional but recommended TV read endpoints

Files to change:

- `backend/RateOple/Controllers/Media/MediaController.cs`
- `backend/RateOple.Core/Media/DTOs/UpdateDtos.cs` or a new TV read DTO file
- `backend/RateOple.Core/Media/Interfaces/ITvSeriesService.cs`
- `backend/RateOple.Core/Media/Services/TvSeriesService.cs`

Endpoint additions:

- `GET /api/media/{mediaId}/seasons/{seasonNumber}`
- `GET /api/media/{mediaId}/seasons/{seasonNumber}/episodes/{episodeNumber}`

These are not blockers for route splitting, but they avoid fetching every episode for an episode detail page.

4. Optional but recommended rating contract cleanup

Files to inspect/change:

- `backend/RateOple.Core/Social/DTOs/MediaRatingSummaryDto.cs`
- `backend/RateOple.Core/Social/Services/RatingService.cs`
- `backend/RateOple.Core/Media/DTOs/MediaDtos.cs`

Recommended contract clarity:

- expose direct media rating summary separately from all-target aggregate rating
- name the all-target aggregate explicitly if it remains on media detail/list DTOs
- ensure TV hero labels match the data source

## 9. Frontend Changes Needed

Routes to add in `frontend/src/app/router.jsx`:

- `/media/:id/seasons/:seasonNumber` -> new `SeasonDetailPage`
- `/media/:id/seasons/:seasonNumber/episodes/:episodeNumber` -> new `EpisodeDetailPage`

Pages to create:

- `frontend/src/features/media/pages/SeasonDetailPage.jsx`
- `frontend/src/features/media/pages/EpisodeDetailPage.jsx`

Components to extract or create:

- `MediaDetailHero`
- `MediaRatingPanel`
- `MediaReviewSection`
- `MediaCollectionsSection`
- `MediaSimilarSection`
- `TvSeasonsList`
- `SeasonHeader`
- `SeasonRatingPanel`
- `SeasonReviewsSection`
- `EpisodeList`
- `EpisodeHeader`
- `EpisodeRatingPanel`
- `EpisodeReviewsSection`

Queries/services to add or change:

- Add frontend route helpers to find season/episode by number from `useTvSeriesSeasonsQuery`.
- Add `useSeasonReviewsQuery(seasonId)` after backend support exists.
- Add `useEpisodeReviewsQuery(episodeId)` after backend support exists.
- Add `reviewService.getSeasonReviews(seasonId)`.
- Add `reviewService.getEpisodeReviews(episodeId)`.
- Add optional `reviewService.getMediaReviews(mediaId, { target })`.
- Add `collectionService.getMediaCollections(mediaId, params)`.
- Add `useMediaCollectionsQuery(mediaId, params)`.
- Add `useDeleteSeasonRatingMutation`.
- Add `useDeleteEpisodeRatingMutation`.

Current files likely to change:

- `frontend/src/app/router.jsx`
- `frontend/src/features/media/pages/MediaDetailPage.jsx`
- `frontend/src/features/media/pages/SeasonDetailPage.jsx`
- `frontend/src/features/media/pages/EpisodeDetailPage.jsx`
- `frontend/src/features/media/queries/useTvSeriesSeasonsQuery.js`
- `frontend/src/features/media/services/tvSeriesService.js`
- `frontend/src/features/reviews/queries/useReviewsQuery.js`
- `frontend/src/features/reviews/services/reviewService.js`
- `frontend/src/features/ratings/queries/useDeleteMediaRatingMutation.js` or new sibling delete hooks
- `frontend/src/features/ratings/services/ratingService.js`
- `frontend/src/features/collections/queries/useCollectionsQuery.js` or new `useMediaCollectionsQuery.js`
- `frontend/src/features/collections/services/collectionService.js`
- `frontend/src/index.css`

Testing targets:

- direct `/media/:id`
- TV `/media/:id`
- season route happy path
- episode route happy path
- invalid season number
- invalid episode number
- logged-out rating/review affordances
- logged-in rating and clear rating for media, season, and episode
- review sections after backend review endpoints exist
- containing collections after backend endpoint exists
- mobile overflow at 320px, 375px, 430px
- backend-hosted app through HTTPS, not direct Vite

## 10. Implementation Order

### Stage 1: Frontend Route and Component Split Without Backend Changes

Goal: establish the IMDb-style information architecture without pretending missing contracts exist.

Work:

- Add public season and episode routes.
- Create `SeasonDetailPage` and `EpisodeDetailPage`.
- Derive season and episode records from `GET /api/media/{id}/seasons`.
- Move the TV series page toward a hub model: hero, series rating/status, seasons list, similar, collections placeholder.
- Link season rows to season pages.
- Link episode rows to episode pages.
- Support media, season, and episode rating using existing endpoints.
- Add season and episode delete rating hooks if clear controls are shown.
- Keep TV series, season, and episode review feeds explicitly blocked or explanatory until Stage 2.
- Keep containing collections explicitly blocked or explanatory until Stage 3.

Safe because:

- no backend contract changes are required
- season IDs and episode IDs already exist in DTOs
- rating endpoints already exist

Limitations:

- no real series-only review feed
- no season review feed
- no episode review feed
- no containing collections feed
- one route may fetch the full season tree

### Stage 2: Backend Review Target Metadata and Endpoints

Goal: make reviews target-aware.

Work:

- Extend `ReviewDto` with target metadata and `ratingValue`.
- Add target filtering to media reviews.
- Add season reviews endpoint.
- Add episode reviews endpoint.
- Update frontend review services and queries.
- Render series-only reviews on TV detail.
- Render season reviews on season detail.
- Render episode reviews on episode detail.
- Update review sorting to use real `ratingValue`.

This stage is required before the TV review experience can be considered correct.

### Stage 3: Containing Collections Endpoint

Goal: replace the placeholder collections tab with real collection appearances.

Work:

- Add `GET /api/media/{mediaId}/collections`.
- Apply existing collection visibility rules.
- Add frontend service/query.
- Render collections containing this title on movie, book, and TV pages.
- Keep `/collections?mediaId=...` only as an add/create flow, not as a containing filter.

This stage is required before the collections tab can be considered real.

### Stage 4: Final UI Polish

Goal: polish once the data contracts are honest.

Work:

- Tighten visual hierarchy across movie, book, series, season, and episode pages.
- Add breadcrumbs and route-aware CTAs.
- Ensure TV series page is not overloaded by episode-level controls.
- Confirm all review and collection states use real backend data.
- Verify desktop and mobile layouts through the backend HTTPS host.
- Run `cd frontend && npm run build:backend` after code changes.

Final recommendation:

Do not do another large visual pass on the current single-page TV detail screen. Split the route architecture first, then make the backend review and collection contracts target-aware, then polish.
