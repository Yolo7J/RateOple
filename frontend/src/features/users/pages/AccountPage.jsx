import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAccountQuery } from '../queries/useAccountQuery';
import { useMyProfileQuery } from '../queries/useMyProfileQuery';
import { useProfileMutations } from '../queries/useProfileMutations';
import AccountSection from '../components/AccountSection';
import './AccountPage.css';

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
    <main className="ro-page ro-account-page">
      <div className="ro-account-head">
        <h1>Account</h1>
        <button className="ro-back" onClick={() => navigate('/account/watchlist')}>Open watchlist</button>
      </div>

      {loading ? <p>Loading account...</p> : null}
      {error ? <p className="ro-error">{errorMessage}</p> : null}
      {actionError ? <p className="ro-error">{actionError}</p> : null}

      {!loading && !error ? (
        <div className="ro-account-grid">
          <AccountSection title="Profile">
            <form className="ro-collection-create" onSubmit={handleProfileSave}>
              <input
                placeholder="Display name"
                value={mergedProfile.displayName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))}
              />
              <textarea
                rows={3}
                placeholder="Bio"
                value={mergedProfile.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
              <input
                placeholder="Location"
                value={mergedProfile.location}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
              />
              <input
                placeholder="Favorite genres (comma-separated)"
                value={mergedProfile.favoriteGenres}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteGenres: e.target.value }))}
              />
              <button type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save profile'}</button>
            </form>
          </AccountSection>

          <AccountSection title="Security">
            <form className="ro-collection-create" onSubmit={handlePasswordChange}>
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <button type="submit" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Change password'}</button>
            </form>

            <form className="ro-collection-create" onSubmit={handleDeleteAccount}>
              <input
                type="password"
                placeholder="Confirm password to delete account"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
              <button type="submit" disabled={profileSaving}>Delete account</button>
            </form>
          </AccountSection>

          <AccountSection title="User ratings">
            <ul className="ro-account-list">
              {ratings.slice(0, 20).map((item) => (
                <li key={item.id}>{item.value}/10 · {item.mediaTitle || item.mediaId || item.seasonId || item.episodeId}</li>
              ))}
              {!ratings.length ? <li>No ratings yet.</li> : null}
            </ul>
          </AccountSection>

          <AccountSection title="User reviews">
            <ul className="ro-account-list">
              {reviews.slice(0, 20).map((item) => (
                <li key={item.id}>{item.content}</li>
              ))}
              {!reviews.length ? <li>No reviews yet.</li> : null}
            </ul>
          </AccountSection>

          <AccountSection title="Watchlist">
            <ul className="ro-account-list">
              {statuses.slice(0, 20).map((item, idx) => (
                <li key={`${item.mediaId ?? item.id}-${idx}`}>{item.title || item.mediaTitle || item.mediaId} · {item.status}</li>
              ))}
              {!statuses.length ? <li>No watchlist items.</li> : null}
            </ul>
          </AccountSection>

          <AccountSection title="Favorite genres">
            <div className="ro-chip-list">
              {topGenres.map((genre, idx) => (
                <span key={`${genre.name ?? genre}-${idx}`} className="ro-chip">{genre.name ?? genre}</span>
              ))}
              {!topGenres.length ? <span className="ro-muted">No favorite genres yet.</span> : null}
            </div>
          </AccountSection>
        </div>
      ) : null}
    </main>
  );
}

export default AccountPage;
