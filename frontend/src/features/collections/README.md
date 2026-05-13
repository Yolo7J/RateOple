# Collections Feature

Collections are user-created saved lists of media with hierarchy and follow support.

Current structure:

- `pages/CollectionsPage.jsx` lists visible collections.
- `pages/CollectionDetailPage.jsx` renders collection details, nested collections, item cards, management actions, and a defensive removed-media state for malformed legacy items.
- `pages/CreateCollectionPage.jsx` and `pages/EditCollectionPage.jsx` handle authenticated collection creation/editing.
- `components/CollectionCard.jsx` and `components/CollectionTree.jsx` provide reusable collection display pieces.
- `queries/` contains React Query hooks for collection list/detail, containing-media, and mutations.
- `services/collectionService.js` wraps `/api/collections` and `/api/media/{mediaId}/collections`.
- `services/collectionLookupService.js` backs picker workflows.
- `collections.css` owns feature-specific collection styles.

Contract notes:

- Public collection responses should show only visible, non-deleted media items.
- If an invalid item still reaches the frontend, detail renders a disabled "Removed media" placeholder instead of a normal media link.
- New collection workflows should use lookup/picker services rather than raw GUID input.
