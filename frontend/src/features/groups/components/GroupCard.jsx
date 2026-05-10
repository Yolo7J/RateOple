import { ArrowRight, Crown, Lock, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../../../shared/ui/Badge';
import {
  formatDate,
  formatRoleLabel,
  formatVisibilityLabel,
  getRoleValue,
  GROUP_ROLE,
  pluralize,
} from '../utils/groupFormatters';

const getRoleTone = (role) => {
  const value = getRoleValue(role);
  if (value === GROUP_ROLE.Owner) return 'accent';
  if (value === GROUP_ROLE.GroupAdmin || value === GROUP_ROLE.GroupModerator) return 'info';
  if (value === GROUP_ROLE.Member) return 'success';
  return 'neutral';
};

function GroupCard({ group }) {
  const roleLabel = formatRoleLabel(group.viewerRole);
  const visibilityLabel = formatVisibilityLabel(group.visibility);
  const isPrivate = visibilityLabel === 'Private';
  const isStaff =
    getRoleValue(group.viewerRole) === GROUP_ROLE.Owner ||
    getRoleValue(group.viewerRole) === GROUP_ROLE.GroupAdmin ||
    getRoleValue(group.viewerRole) === GROUP_ROLE.GroupModerator;

  return (
    <article className="group-card">
      <Link to={`/groups/${group.id}`} className="group-card__link" aria-label={`Open ${group.name}`}>
        <div className="group-card__topline">
          <Badge tone={isPrivate ? 'warning' : 'success'}>
            {isPrivate ? <Lock aria-hidden="true" /> : <Users aria-hidden="true" />}
            {visibilityLabel}
          </Badge>
          {roleLabel ? (
            <Badge tone={getRoleTone(group.viewerRole)}>
              {getRoleValue(group.viewerRole) === GROUP_ROLE.Owner ? (
                <Crown aria-hidden="true" />
              ) : isStaff ? (
                <ShieldCheck aria-hidden="true" />
              ) : null}
              {roleLabel}
            </Badge>
          ) : null}
        </div>

        <div className="group-card__body">
          <h2>{group.name}</h2>
          {group.description ? (
            <p>{group.description}</p>
          ) : (
            <p className="group-card__muted">No description yet.</p>
          )}
        </div>

        <dl className="group-card__stats" aria-label={`${group.name} statistics`}>
          <div>
            <dt><Users aria-hidden="true" /> Members</dt>
            <dd>{pluralize(group.membersCount, 'member')}</dd>
          </div>
          <div>
            <dt><MessageSquare aria-hidden="true" /> Posts</dt>
            <dd>{pluralize(group.postsCount, 'post')}</dd>
          </div>
        </dl>

        <div className="group-card__footer">
          {group.createdAt ? <span>Created {formatDate(group.createdAt)}</span> : <span />}
          <span className="group-card__open">
            Open group
            <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}

export default GroupCard;
