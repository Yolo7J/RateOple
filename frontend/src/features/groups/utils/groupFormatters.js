export const GROUP_ROLE = {
  Member: 1,
  GroupModerator: 2,
  GroupAdmin: 3,
  Owner: 4,
};

const ROLE_LABELS = {
  [GROUP_ROLE.Member]: 'Member',
  [GROUP_ROLE.GroupModerator]: 'Moderator',
  [GROUP_ROLE.GroupAdmin]: 'Admin',
  [GROUP_ROLE.Owner]: 'Owner',
  GroupModerator: 'Moderator',
  GroupAdmin: 'Admin',
};

const VISIBILITY_LABELS = {
  1: 'Public',
  2: 'Private',
  Public: 'Public',
  Private: 'Private',
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const getRoleValue = (role) => {
  if (role == null) return null;
  if (typeof role === 'number') return role;
  if (GROUP_ROLE[role]) return GROUP_ROLE[role];

  const parsed = Number(role);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatRoleLabel = (role) => {
  if (role == null) return '';
  return ROLE_LABELS[role] ?? ROLE_LABELS[getRoleValue(role)] ?? String(role);
};

export const getVisibilityValue = (visibility) => {
  if (visibility == null) return null;
  if (typeof visibility === 'number') return visibility;
  if (visibility === 'Public') return 1;
  if (visibility === 'Private') return 2;

  const parsed = Number(visibility);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatVisibilityLabel = (visibility) => (
  VISIBILITY_LABELS[visibility] ?? VISIBILITY_LABELS[getVisibilityValue(visibility)] ?? 'Public'
);

export const isPublicGroup = (group) => getVisibilityValue(group?.visibility) !== 2;

export const canModerateGroup = (role) => {
  const value = getRoleValue(role);
  return value === GROUP_ROLE.Owner || value === GROUP_ROLE.GroupAdmin || value === GROUP_ROLE.GroupModerator;
};

export const canManageGroupRoles = (role) => {
  const value = getRoleValue(role);
  return value === GROUP_ROLE.Owner || value === GROUP_ROLE.GroupAdmin;
};

export const formatCount = (value) => new Intl.NumberFormat().format(Number(value) || 0);

export const pluralize = (value, singular, plural = `${singular}s`) => {
  const count = Number(value) || 0;
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
};

const formatDateValue = (value, formatter) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatter.format(date);
};

export const formatDate = (value) => formatDateValue(value, dateFormatter);

export const formatDateTime = (value) => formatDateValue(value, dateTimeFormatter);

export const getPostAuthorLabel = (post) => (
  post?.displayName ||
  post?.authorName ||
  post?.username ||
  post?.userName ||
  (post?.authorId ? 'Group member' : 'Former member')
);

export const getCommentAuthorLabel = (comment) => (
  comment?.displayName ||
  comment?.authorName ||
  comment?.username ||
  comment?.userName ||
  (comment?.authorId || comment?.userId ? 'Group member' : 'Former member')
);
