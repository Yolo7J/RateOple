# Groups Feature

Groups provide community spaces around media, with membership, posts, comments, votes, staff tools, bans, staff messages, and pinned media.

Current structure:

- `pages/GroupsPage.jsx` lists visible groups.
- `pages/GroupDetailPage.jsx` handles group overview, join/leave, post creation, pinned media, member tools, bans, and staff messages according to user role.
- `pages/GroupPostDetailPage.jsx` renders a single post, voting, linked media, and comments.
- `pages/CreateGroupPage.jsx` handles authenticated group creation.
- `components/GroupCard.jsx` and `components/GroupPostCard.jsx` provide reusable list/feed cards.
- `queries/` contains React Query hooks for groups, details, posts, comments, members, pinned media, staff messages, and mutations.
- `services/groupService.js` wraps `/api/groups` endpoints.
- `services/groupLookupService.js` backs group picker workflows.
- `utils/groupFormatters.js` centralizes group labels, role formatting, and date/count helpers.
- `groups.css` owns feature-specific group styles.

Contract notes:

- User-facing media/user/group selection should use lookup and picker components, not raw GUID inputs.
- Staff-only controls are UI-gated by role data but must remain server-authorized by backend policy/service checks.
