import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAccountQuery } from '../queries/useAccountQuery';
import { useMyProfileQuery } from '../queries/useMyProfileQuery';
import { useProfileMutations } from '../queries/useProfileMutations';
import AccountSection from '../components/AccountSection';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Grid from '../../../shared/ui/Grid';
import Stack from '../../../shared/ui/Stack';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import Textarea from '../../../shared/ui/Textarea';

const styles = {
  pageStack: 'gap-6',
  muted: 'text-[var(--text-muted)]',
  grid: 'gap-4',
  form: 'grid max-w-2xl gap-4',
  list: 'grid gap-2',
  listItem: 'ui-panel p-3 text-sm text-[var(--text-primary)]',
  chips: 'flex flex-wrap gap-2',
};

function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data, loading, error } = useAccountQuery();
  const { data: profile } = useMyProfileQuery();
  const { updateProfile, changePassword, deleteAccount, loading: profileSaving } = useProfileMutations();

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    favoriteGenres: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState('');

  const ratings = data?.ratings ?? [];
  const reviews = data?.reviews ?? [];
  const statuses = data?.statuses ?? [];
  const errorMessage = error?.response?.data?.message || 'Failed to load account data.';
  const topGenres = useMemo(() => (Array.isArray(data?.genres) ? data.genres.slice(0, 12) : []), [data]);

  const mergedProfile = {
    displayName: profileForm.displayName || profile?.displayName || '',
    bio: profileForm.bio || profile?.bio || '',
    location: profileForm.location || profile?.location || '',
    favoriteGenres: profileForm.favoriteGenres || profile?.favoriteGenres || '',
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await updateProfile({
        displayName: mergedProfile.displayName.trim() || null,
        bio: mergedProfile.bio.trim() || null,
        location: mergedProfile.location.trim() || null,
        favoriteGenres: mergedProfile.favoriteGenres.trim() || null,
      });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not update profile.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not change password.');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setConfirmingDelete(true);
  };

  const handleConfirmDeleteAccount = async () => {
    setActionError('');
    try {
      await deleteAccount(deletePassword);
      await logout();
      navigate('/login');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Could not delete account.');
    }
  };

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader
            title="Account"
            subtitle="Manage your profile, security, ratings, and saved media."
            actions={(
              <Button onClick={() => navigate('/account/watchlist')}>
                Open watchlist
              </Button>
            )}
          />

          {loading ? <LoadingState label="Loading account..." /> : null}
          {error ? <InlineMessage tone="error">{errorMessage}</InlineMessage> : null}
          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          {!loading && !error ? (
            <Grid cols="grid-cols-1 lg:grid-cols-2" className={styles.grid}>
              <AccountSection title="Profile">
                <form className={styles.form} onSubmit={handleProfileSave}>
                  <FormField label="Display name">
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        placeholder="Display name"
                        value={mergedProfile.displayName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      />
                    )}
                  </FormField>
                  <FormField label="Bio">
                    {(fieldProps) => (
                      <Textarea
                        {...fieldProps}
                        rows={3}
                        placeholder="Bio"
                        value={mergedProfile.bio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                      />
                    )}
                  </FormField>
                  <FormField label="Location">
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        placeholder="Location"
                        value={mergedProfile.location}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
                      />
                    )}
                  </FormField>
                  <FormField label="Favorite genres" hint="Use commas between genres.">
                    {(fieldProps) => (
                      <Input
                        {...fieldProps}
                        placeholder="Drama, Sci-Fi, Comedy"
                        value={mergedProfile.favoriteGenres}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteGenres: e.target.value }))}
                      />
                    )}
                  </FormField>
                  <Button variant="primary" type="submit" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save profile'}
                  </Button>
                </form>
              </AccountSection>

              <AccountSection title="Security">
                <Stack className="gap-4">
                  <form className={styles.form} onSubmit={handlePasswordChange}>
                    <FormField label="Current password">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          type="password"
                          placeholder="Current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          required
                        />
                      )}
                    </FormField>
                    <FormField label="New password">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          type="password"
                          placeholder="New password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          required
                        />
                      )}
                    </FormField>
                    <Button type="submit" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Change password'}
                    </Button>
                  </form>

                  <form className={styles.form} onSubmit={handleDeleteAccount}>
                    <FormField label="Delete account" hint="Enter your password before continuing.">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          type="password"
                          placeholder="Confirm password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          required
                        />
                      )}
                    </FormField>
                    <Button variant="danger" type="submit" disabled={profileSaving}>
                      Delete account
                    </Button>
                  </form>
                </Stack>
              </AccountSection>

              <AccountSection title="User ratings">
                <ul className={styles.list}>
                  {ratings.slice(0, 20).map((item) => (
                    <li key={item.id} className={styles.listItem}>
                      <Badge tone="accent">{item.value}/10</Badge>{' '}
                      {item.mediaTitle || item.mediaId || item.seasonId || item.episodeId}
                    </li>
                  ))}
                  {!ratings.length ? (
                    <li className="list-none">
                      <EmptyState title="No ratings yet" description="Your recent ratings will appear here." />
                    </li>
                  ) : null}
                </ul>
              </AccountSection>

              <AccountSection title="User reviews">
                <ul className={styles.list}>
                  {reviews.slice(0, 20).map((item) => (
                    <li key={item.id} className={styles.listItem}>{item.content}</li>
                  ))}
                  {!reviews.length ? (
                    <li className="list-none">
                      <EmptyState title="No reviews yet" description="Reviews you write will appear here." />
                    </li>
                  ) : null}
                </ul>
              </AccountSection>

              <AccountSection title="Watchlist">
                <ul className={styles.list}>
                  {statuses.slice(0, 20).map((item, idx) => (
                    <li key={`${item.mediaId ?? item.id}-${idx}`} className={styles.listItem}>
                      {item.title || item.mediaTitle || item.mediaId}{' '}
                      <Badge>{item.status}</Badge>
                    </li>
                  ))}
                  {!statuses.length ? (
                    <li className="list-none">
                      <EmptyState title="No watchlist items" description="Saved media will appear here." />
                    </li>
                  ) : null}
                </ul>
              </AccountSection>

              <AccountSection title="Favorite genres">
                <div className={styles.chips}>
                  {topGenres.map((genre, idx) => (
                    <Badge key={`${genre.name ?? genre}-${idx}`} tone="info">
                      {genre.name ?? genre}
                    </Badge>
                  ))}
                  {!topGenres.length ? (
                    <span className={styles.muted}>No favorite genres yet.</span>
                  ) : null}
                </div>
              </AccountSection>
            </Grid>
          ) : null}

          <Dialog
            open={confirmingDelete}
            title="Delete account?"
            description="This removes your account and signs you out. This action cannot be undone."
            onClose={() => setConfirmingDelete(false)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleConfirmDeleteAccount} disabled={profileSaving}>
                  {profileSaving ? 'Deleting...' : 'Delete account'}
                </Button>
              </>
            )}
          />
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default AccountPage;
