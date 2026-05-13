# Moderation Feature

Moderation provides staff-facing report queues, report status actions, scoped target availability, moderator assignments, audit logs, and realtime updates.

Current structure:

- `pages/ModerationPage.jsx` renders the moderation dashboard, report filters, assignment tools, and dense report table.
- `pages/AuditLogPage.jsx` renders moderation audit history.
- `components/ModerationReportRow.jsx` owns per-report operational actions.
- `components/ModeratorAssignmentList.jsx` displays active assignments and removal actions.
- `queries/` contains React Query hooks for reports, assignments, audit logs, and mutations.
- `realtime/useModerationRealtime.js` subscribes to moderation SignalR events.
- `services/moderationService.js` wraps `/api/moderation` endpoints.
- `services/scopeLookupService.js` backs moderation scope pickers.
- `moderation.css` owns feature-specific moderation styles.

Contract notes:

- Assignment workflows use shared `EntityPicker` controls backed by lookup endpoints.
- Target removal is shown only as available when the backend marks the report target removable; unavailable target types keep their explanation visible in the queue.
- Moderator/admin visibility in the frontend is not the security boundary; backend policies and services remain authoritative.
- The shared picker closes on outside pointerdown, Escape, and selection while preserving existing assignment payloads.
