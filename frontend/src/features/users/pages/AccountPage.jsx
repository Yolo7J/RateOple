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

const styles = {
  pageStack: 'gap-6',
  header: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  grid: 'gap-4',
  form: 'grid gap-3 max-w-2xl',
  input: [
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  list: 'grid gap-2',
  listItem: 'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3',
  chips: 'flex flex-wrap gap-2',
  chip: 'rounded-full border border-[var(--border)] px-3 py-1 text-sm',
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
          <div className={styles.header}>
            <h1 className={styles.title}>Account</h1>
            <button className={styles.button} onClick={() => navigate('/account/watchlist')}>
              Open watchlist
            </button>
          </div>

          {loading ? <p className={styles.muted}>Loading account...</p> : null}
          {error ? <p className={styles.error}>{errorMessage}</p> : null}
          {actionError ? <p className={styles.error}>{actionError}</p> : null}

          {!loading && !error ? (
            <Grid cols="grid-cols-1 lg:grid-cols-2" className={styles.grid}>
              <AccountSection title="Profile">
                <form className={styles.form} onSubmit={handleProfileSave}>
                  <input
                    className={styles.input}
                    placeholder="Display name"
                    value={mergedProfile.displayName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  />
                  <textarea
                    className={styles.input}
                    rows={3}
                    placeholder="Bio"
                    value={mergedProfile.bio}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                  />
                  <input
                    className={styles.input}
                    placeholder="Location"
                    value={mergedProfile.location}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                  <input
                    className={styles.input}
                    placeholder="Favorite genres (comma-separated)"
                    value={mergedProfile.favoriteGenres}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteGenres: e.target.value }))}
                  />
                  <button className={styles.button} type="submit" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save profile'}
                  </button>
                </form>
              </AccountSection>

              <AccountSection title="Security">
                <Stack className="gap-4">
                  <form className={styles.form} onSubmit={handlePasswordChange}>
                    <input
                      className={styles.input}
                      type="password"
                      placeholder="Current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <input
                      className={styles.input}
                      type="password"
                      placeholder="New password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <button className={styles.button} type="submit" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Change password'}
                    </button>
                  </form>

                  <form className={styles.form} onSubmit={handleDeleteAccount}>
                    <input
                      className={styles.input}
                      type="password"
                      placeholder="Confirm password to delete account"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                    />
                    <button className={styles.button} type="submit" disabled={profileSaving}>
                      Delete account
                    </button>
                  </form>
                </Stack>
              </AccountSection>

              <AccountSection title="User ratings">
                <ul className={styles.list}>
                  {ratings.slice(0, 20).map((item) => (
                    <li key={item.id} className={styles.listItem}>
                      {item.value}/10 · {item.mediaTitle || item.mediaId || item.seasonId || item.episodeId}
                    </li>
                  ))}
                  {!ratings.length ? <li className={styles.listItem}>No ratings yet.</li> : null}
                </ul>
              </AccountSection>

              <AccountSection title="User reviews">
                <ul className={styles.list}>
                  {reviews.slice(0, 20).map((item) => (
                    <li key={item.id} className={styles.listItem}>{item.content}</li>
                  ))}
                  {!reviews.length ? <li className={styles.listItem}>No reviews yet.</li> : null}
                </ul>
              </AccountSection>

              <AccountSection title="Watchlist">
                <ul className={styles.list}>
                  {statuses.slice(0, 20).map((item, idx) => (
                    <li key={`${item.mediaId ?? item.id}-${idx}`} className={styles.listItem}>
                      {item.title || item.mediaTitle || item.mediaId} · {item.status}
                    </li>
                  ))}
                  {!statuses.length ? <li className={styles.listItem}>No watchlist items.</li> : null}
                </ul>
              </AccountSection>

              <AccountSection title="Favorite genres">
                <div className={styles.chips}>
                  {topGenres.map((genre, idx) => (
                    <span key={`${genre.name ?? genre}-${idx}`} className={styles.chip}>
                      {genre.name ?? genre}
                    </span>
                  ))}
                  {!topGenres.length ? (
                    <span className={styles.muted}>No favorite genres yet.</span>
                  ) : null}
                </div>
              </AccountSection>
            </Grid>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default AccountPage;
