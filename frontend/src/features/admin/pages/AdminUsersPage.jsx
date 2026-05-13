import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import Badge from '../../../shared/ui/Badge';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import adminUserService from '../services/adminUserService';
import '../admin.css';

const roleTone = (role) => {
  if (role === 'SuperAdmin') return 'accent';
  if (role === 'Admin') return 'warning';
  if (role === 'Moderator') return 'info';
  return 'neutral';
};

const getProblemMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  fallback
);

function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentRoles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user]);
  const isSuperAdmin = currentRoles.includes('SuperAdmin');
  const isAdmin = currentRoles.includes('Admin') || isSuperAdmin;
  const currentUserId = user?.id || user?.userId;

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', submittedSearch],
    queryFn: () => adminUserService.searchUsers({
      query: submittedSearch || undefined,
      page: 1,
      pageSize: 30,
    }),
  });

  const mutation = useMutation({
    mutationFn: async ({ type, targetUser }) => {
      if (type === 'grantAdmin') return adminUserService.grantAdmin(targetUser.id);
      if (type === 'revokeAdmin') return adminUserService.revokeAdmin(targetUser.id);
      if (type === 'grantModerator') return adminUserService.grantModerator(targetUser.id);
      if (type === 'revokeModerator') return adminUserService.revokeModerator(targetUser.id);
      throw new Error('Unsupported role action.');
    },
    onSuccess: async () => {
      setConfirmAction(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({ queryKey: ['moderation', 'assignments'] });
    },
    onError: (err) => {
      setActionError(getProblemMessage(err, 'Could not update user roles.'));
    },
  });

  const users = Array.isArray(data?.items) ? data.items : [];

  const submitSearch = (event) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const describeAction = (targetUser, type) => {
    const roles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
    const isSelf = currentUserId && targetUser.id === currentUserId;
    const targetIsSuperAdmin = roles.includes('SuperAdmin');
    const targetIsAdmin = roles.includes('Admin');
    const targetIsModerator = roles.includes('Moderator');

    if (isSelf) return 'You cannot alter your own global roles.';
    if (targetIsSuperAdmin && !isSuperAdmin) return 'Admins cannot modify SuperAdmins.';
    if (targetIsAdmin && !isSuperAdmin) return 'Admins cannot modify Admin users.';
    if ((type === 'grantAdmin' || type === 'revokeAdmin') && !isSuperAdmin) return 'Only SuperAdmins can manage Admin roles.';
    if ((type === 'grantModerator' || type === 'revokeModerator') && !isAdmin) return 'Only Admins and SuperAdmins can manage Moderator roles.';
    if (type === 'grantModerator' && targetIsAdmin) return 'Admins cannot be promoted through moderator assignment.';
    if (type === 'grantModerator' && targetIsSuperAdmin) return 'SuperAdmins cannot be promoted through moderator assignment.';
    if (type === 'grantModerator' && targetUser.isDeleted) return 'Deleted users cannot become Moderators.';
    if (type === 'grantModerator' && targetUser.isLockedOut) return 'Locked out users cannot become Moderators.';
    if (type === 'grantModerator' && !targetUser.emailConfirmed) return 'Only confirmed users can become Moderators.';
    if (type === 'grantAdmin' && targetIsAdmin) return 'This user is already an Admin.';
    if (type === 'revokeAdmin' && !targetIsAdmin) return 'This user is not an Admin.';
    if (type === 'grantModerator' && targetIsModerator) return 'This user is already a Moderator.';
    if (type === 'revokeModerator' && !targetIsModerator) return 'This user is not a Moderator.';
    if (type === 'revokeModerator') return 'Removing Moderator also removes all moderation assignments.';
    return '';
  };

  const canRunAction = (targetUser, type) => {
    const reason = describeAction(targetUser, type);
    if (type === 'revokeModerator')
      return reason === 'Removing Moderator also removes all moderation assignments.';
    return reason.length === 0;
  };

  const openConfirm = (targetUser, type) => {
    setActionError('');
    setConfirmAction({ targetUser, type });
  };

  const confirmTitle = confirmAction?.type === 'grantAdmin'
    ? 'Grant Admin role?'
    : confirmAction?.type === 'revokeAdmin'
      ? 'Revoke Admin role?'
      : confirmAction?.type === 'grantModerator'
        ? 'Grant Moderator role?'
        : 'Revoke Moderator role?';

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="admin-workspace">
          <header className="admin-hero">
            <p className="admin-eyebrow">Staff access</p>
            <h1 className="admin-hero__title">User roles</h1>
            <p className="admin-hero__copy">
              Search accounts, review global role chips, and apply audited Admin or Moderator role changes.
            </p>
          </header>

          <section className="admin-users-panel" aria-labelledby="admin-users-title">
            <div className="admin-users-panel__header">
              <div>
                <h2 id="admin-users-title">Role management</h2>
                <p>Group roles are separate and do not grant global staff access.</p>
              </div>
              <UserCog aria-hidden="true" />
            </div>

            <form className="admin-users-search" onSubmit={submitSearch}>
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by username, display name, or email"
                aria-label="Search users"
              />
              <Button type="submit" variant="primary">
                <Search size={16} aria-hidden="true" />
                Search
              </Button>
            </form>

            {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}
            {error ? <InlineMessage tone="error">Failed to load users.</InlineMessage> : null}
            {isLoading ? <LoadingState label="Loading users..." /> : null}

            {!isLoading && !error ? (
              users.length > 0 ? (
                <div className="admin-users-list">
                  {users.map((targetUser) => {
                    const roles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
                    const actionTypes = ['grantAdmin', 'revokeAdmin', 'grantModerator', 'revokeModerator'];
                    return (
                      <article key={targetUser.id} className="admin-user-card">
                        <div className="admin-user-card__identity">
                          <div>
                            <h3>{targetUser.displayName || targetUser.username}</h3>
                            <p>@{targetUser.username || 'unknown'}</p>
                          </div>
                          <div className="admin-user-card__chips" aria-label="Global roles">
                            {roles.length > 0 ? roles.map((role) => (
                              <Badge key={role} tone={roleTone(role)}>{role}</Badge>
                            )) : <Badge>Unassigned</Badge>}
                            {!targetUser.emailConfirmed ? <Badge tone="warning">Unconfirmed</Badge> : null}
                            {targetUser.isLockedOut ? <Badge tone="danger">Locked</Badge> : null}
                            {targetUser.isDeleted ? <Badge tone="danger">Deleted</Badge> : null}
                          </div>
                        </div>

                        <div className="admin-user-card__actions">
                          {actionTypes.map((type) => {
                            const reason = describeAction(targetUser, type);
                            const enabled = canRunAction(targetUser, type);
                            const label = {
                              grantAdmin: 'Grant Admin',
                              revokeAdmin: 'Revoke Admin',
                              grantModerator: 'Grant Moderator',
                              revokeModerator: 'Revoke Moderator',
                            }[type];
                            const Icon = type.includes('Admin') ? Shield : ShieldCheck;
                            return (
                              <div key={type} className="admin-user-action">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={type.startsWith('revoke') ? 'danger' : 'default'}
                                  disabled={!enabled || mutation.isPending}
                                  onClick={() => openConfirm(targetUser, type)}
                                >
                                  <Icon size={14} aria-hidden="true" />
                                  {label}
                                </Button>
                                {reason ? <span>{reason}</span> : <span>Allowed for your role.</span>}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No users found" description="Try another search term." />
              )
            ) : null}
          </section>
        </div>
      </Container>

      <Dialog
        open={Boolean(confirmAction)}
        title={confirmTitle}
        description={
          confirmAction?.type === 'revokeModerator'
            ? `Remove Moderator from ${confirmAction?.targetUser?.displayName || confirmAction?.targetUser?.username || 'this user'}? This also removes all moderation assignments.`
            : `Apply this global role change to ${confirmAction?.targetUser?.displayName || confirmAction?.targetUser?.username || 'this user'}?`
        }
        onClose={() => {
          if (!mutation.isPending) setConfirmAction(null);
        }}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={mutation.isPending}>Cancel</Button>
            <Button
              variant={confirmAction?.type?.startsWith('revoke') ? 'danger' : 'primary'}
              disabled={mutation.isPending}
              onClick={() => {
                if (confirmAction) mutation.mutate(confirmAction);
              }}
            >
              {mutation.isPending ? 'Applying...' : 'Confirm'}
            </Button>
          </>
        )}
      />
    </PageLayout>
  );
}

export default AdminUsersPage;
