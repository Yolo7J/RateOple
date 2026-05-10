import { createElement, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookmarkCheck,
  Compass,
  KeyRound,
  Library,
  MessageSquare,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAccountQuery } from '../queries/useAccountQuery';
import { useMyProfileQuery } from '../queries/useMyProfileQuery';
import { useProfileMutations } from '../queries/useProfileMutations';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import SectionCard from '../../../shared/ui/SectionCard';
import Textarea from '../../../shared/ui/Textarea';
import { formatDate } from '../../../shared/utils/formatDate';
import '../users.css';

const styles = {
  pageStack: 'gap-6',
  form: 'grid gap-4',
};

const buildReviewRoute = (review) => {
  if (!review?.mediaId) return '/media';
  if (review.targetType === 'Episode' && review.seasonNumber && review.episodeNumber) {
    return `/media/${review.mediaId}/seasons/${review.seasonNumber}/episodes/${review.episodeNumber}`;
  }
  if (review.targetType === 'Season' && review.seasonNumber) {
    return `/media/${review.mediaId}/seasons/${review.seasonNumber}`;
  }
  return `/media/${review.mediaId}`;
};

const getRatingTargetLabel = (rating) => {
  if (rating.mediaId) return 'Media rating';
  if (rating.seasonId) return 'Season rating';
  if (rating.episodeId) return 'Episode rating';
  return 'Rating';
};

const getProgressLabel = (item) => {
  const parts = [];
  if (item?.progressSeason) parts.push(`S${item.progressSeason}`);
  if (item?.progressEpisode) parts.push(`E${item.progressEpisode}`);
  if (item?.progressPages) parts.push(`${item.progressPages} pages`);
  return parts.join(' / ');
};

function StatCard({ icon, label, value, hint }) {
  return (
    <article className="account-stat-card">
      <span className="account-stat-icon" aria-hidden="true">
        {createElement(icon, { size: 18, strokeWidth: 2 })}
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}

function QuickAction({ icon, title, description, to }) {
  return (
    <Link className="account-action-card" to={to}>
      <span className="account-action-icon" aria-hidden="true">
        {createElement(icon, { size: 19, strokeWidth: 2 })}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Link>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data, loading, error } = useAccountQuery();
  const { data: profile } = useMyProfileQuery();
  const { updateProfile, changePassword, deleteAccount, loading: profileSaving } = useProfileMutations();

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    bio: '',
    location: '',
    favoriteGenres: '',
  });
  const [profileTouched, setProfileTouched] = useState(false);
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
  const topGenres = useMemo(() => (Array.isArray(data?.genres) ? data.genres.slice(0, 12) : []), [data]);
  const errorMessage = error?.response?.data?.message || 'Failed to load account data.';
  const displayName = profile?.displayName || user?.username || 'Your profile';
  const recentReviews = reviews.slice(0, 3);
  const recentStatuses = statuses.slice(0, 4);
  const recentRatings = ratings.slice(0, 5);
  const profileDefaults = useMemo(() => ({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    favoriteGenres: profile?.favoriteGenres || '',
  }), [profile]);
  const profileValues = profileTouched ? profileForm : profileDefaults;

  const updateProfileField = (field, value) => {
    setProfileTouched(true);
    setProfileForm((prev) => ({
      ...(profileTouched ? prev : profileDefaults),
      [field]: value,
    }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await updateProfile({
        displayName: profileValues.displayName.trim() || null,
        bio: profileValues.bio.trim() || null,
        location: profileValues.location.trim() || null,
        favoriteGenres: profileValues.favoriteGenres.trim() || null,
      });
      setProfileTouched(false);
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
          <section className="account-hero" aria-labelledby="account-title">
            <div className="account-hero-main">
              <div className="account-avatar" aria-hidden="true">
                <User size={30} strokeWidth={1.9} />
              </div>
              <div className="account-title-group">
                <p className="account-eyebrow">Personal hub</p>
                <h1 id="account-title">Welcome back, {displayName}</h1>
                <p>
                  Keep your tracked media, ratings, reviews, profile, and notifications in one place.
                </p>
                <div className="account-identity-row" aria-label="Account summary">
                  {user?.username ? <Badge tone="accent">@{user.username}</Badge> : null}
                  {profile?.location ? <Badge>{profile.location}</Badge> : null}
                  {profile?.privacySetting ? <Badge>{profile.privacySetting}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="account-hero-actions">
              <Button as={Link} to="/media" variant="primary">
                Browse media
              </Button>
              <Button as={Link} to="/account/watchlist">
                Open watchlist
              </Button>
            </div>
          </section>

          {loading ? <LoadingState label="Loading account..." /> : null}
          {error ? <InlineMessage tone="error">{errorMessage}</InlineMessage> : null}
          {actionError ? <InlineMessage tone="error">{actionError}</InlineMessage> : null}

          {!loading && !error ? (
            <>
              <section className="account-stat-grid" aria-label="Personal media stats">
                <StatCard icon={Star} label="Ratings" value={ratings.length} hint="From your rating history" />
                <StatCard icon={MessageSquare} label="Reviews" value={reviews.length} hint="Written by you" />
                <StatCard icon={BookmarkCheck} label="Tracked titles" value={statuses.length} hint="Across every status" />
                <StatCard icon={Tags} label="Favorite genres" value={topGenres.length} hint="Based on your activity" />
              </section>

              <section className="account-action-grid" aria-label="Quick actions">
                <QuickAction icon={Compass} title="Browse media" description="Find movies, TV series, and books" to="/media" />
                <QuickAction icon={BookmarkCheck} title="Watchlist" description="Plan, follow, finish, or drop titles" to="/account/watchlist" />
                <QuickAction icon={MessageSquare} title="My reviews" description="Jump to your written reviews" to="/account#my-reviews" />
                <QuickAction icon={Library} title="Collections" description="Open the collection shelves" to="/collections" />
                <QuickAction icon={Users} title="Groups" description="Follow community conversations" to="/groups" />
                <QuickAction icon={Bell} title="Notifications" description="Review unread account events" to="/notifications" />
              </section>

              <div className="account-dashboard-grid">
                <SectionCard
                  title="Profile"
                  subtitle="Public-facing details supported by the current profile endpoint."
                  className="account-section"
                >
                  <div className="account-profile-summary">
                    {profile?.bio ? <p>{profile.bio}</p> : <p className="account-muted">Add a bio to make your profile feel lived in.</p>}
                    <div className="account-profile-facts">
                      {profile?.location ? <span>{profile.location}</span> : <span>No location set</span>}
                      {profile?.favoriteGenres ? <span>{profile.favoriteGenres}</span> : <span>No favorite genres saved</span>}
                    </div>
                  </div>
                  <form className={styles.form} onSubmit={handleProfileSave}>
                    <FormField label="Display name">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          placeholder="Display name"
                          value={profileValues.displayName}
                          onChange={(e) => updateProfileField('displayName', e.target.value)}
                        />
                      )}
                    </FormField>
                    <FormField label="Bio" hint="A short profile note shown where profile data is available.">
                      {(fieldProps) => (
                        <Textarea
                          {...fieldProps}
                          rows={4}
                          placeholder="What kinds of stories do you follow?"
                          value={profileValues.bio}
                          onChange={(e) => updateProfileField('bio', e.target.value)}
                        />
                      )}
                    </FormField>
                    <div className="account-form-row">
                      <FormField label="Location">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            placeholder="City or region"
                            value={profileValues.location}
                            onChange={(e) => updateProfileField('location', e.target.value)}
                          />
                        )}
                      </FormField>
                      <FormField label="Favorite genres" hint="Use commas between genres.">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            placeholder="Drama, Sci-Fi, Comedy"
                            value={profileValues.favoriteGenres}
                            onChange={(e) => updateProfileField('favoriteGenres', e.target.value)}
                          />
                        )}
                      </FormField>
                    </div>
                    <div className="account-form-actions">
                      <Button variant="primary" type="submit" disabled={profileSaving}>
                        {profileSaving ? 'Saving...' : 'Save profile'}
                      </Button>
                    </div>
                  </form>
                </SectionCard>

                <SectionCard
                  title="Security"
                  subtitle="Password and account controls stay separate from your media activity."
                  className="account-section"
                >
                  <div className="account-security-grid">
                    <form className="account-security-panel" onSubmit={handlePasswordChange}>
                      <div className="account-security-heading">
                        <KeyRound size={18} aria-hidden="true" />
                        <h3>Change password</h3>
                      </div>
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

                    <form className="account-security-panel account-danger-panel" onSubmit={handleDeleteAccount}>
                      <div className="account-security-heading">
                        <Trash2 size={18} aria-hidden="true" />
                        <h3>Delete account</h3>
                      </div>
                      <p>
                        Enter your password before continuing. You will confirm once more before the account is removed.
                      </p>
                      <FormField label="Password">
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
                  </div>
                </SectionCard>
              </div>

              <div className="account-dashboard-grid account-dashboard-grid--activity">
                <SectionCard
                  title="Tracked media"
                  subtitle="Recently updated watchlist entries."
                  actions={<Button as={Link} to="/account/watchlist" size="sm">View all</Button>}
                  className="account-section"
                >
                  <div className="account-list">
                    {recentStatuses.map((item) => (
                      <Link key={item.mediaId} className="account-track-row" to={`/media/${item.mediaId}`}>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{getProgressLabel(item) || formatDate(item.updatedAt) || 'No progress saved'}</small>
                        </span>
                        <Badge tone="accent">{item.status}</Badge>
                      </Link>
                    ))}
                    {!recentStatuses.length ? (
                      <EmptyState
                        title="No tracked media yet"
                        description="Mark a title as Plan, On it, Done, or Dropped to build your shelf."
                        action={<Button as={Link} to="/media">Browse media</Button>}
                      />
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard
                  id="my-reviews"
                  title="My reviews"
                  subtitle="Your latest written reviews with their target context."
                  className="account-section"
                >
                  <div className="account-review-list">
                    {recentReviews.map((review) => (
                      <article key={review.id} className="account-review-card">
                        <div className="account-review-card__header">
                          <div>
                            <h3>{review.mediaTitle || review.targetTitle || 'Review'}</h3>
                            <p>
                              {review.targetType}
                              {review.targetTitle && review.targetTitle !== review.mediaTitle ? ` / ${review.targetTitle}` : ''}
                            </p>
                          </div>
                          <Badge tone="accent">{review.ratingValue}/10</Badge>
                        </div>
                        <p className="account-review-content">{review.content}</p>
                        <div className="account-review-footer">
                          <span>{formatDate(review.updatedAt || review.createdAt)}</span>
                          <Link to={buildReviewRoute(review)}>Open target</Link>
                        </div>
                      </article>
                    ))}
                    {!recentReviews.length ? (
                      <EmptyState title="No reviews yet" description="No reviews yet. Rate a title to write your first review." />
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Ratings"
                  subtitle="The rating endpoint currently exposes values and target identifiers."
                  className="account-section"
                >
                  <div className="account-rating-list">
                    {recentRatings.map((rating) => (
                      <article key={rating.id} className="account-rating-row">
                        <span className="account-rating-score">
                          <Star size={15} aria-hidden="true" fill="currentColor" />
                          {rating.value}/10
                        </span>
                        <span>
                          <strong>{getRatingTargetLabel(rating)}</strong>
                          <small>{formatDate(rating.updatedAt || rating.createdAt)}</small>
                        </span>
                        {rating.mediaId ? <Link to={`/media/${rating.mediaId}`}>Open</Link> : null}
                      </article>
                    ))}
                    {!recentRatings.length ? (
                      <EmptyState title="No ratings yet" description="Ratings you add across media, seasons, and episodes will appear here." />
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard title="Favorite genres" className="account-section">
                  <div className="account-genre-cloud">
                    {topGenres.map((genre, idx) => (
                      <Badge key={`${genre.name ?? genre}-${idx}`} tone="info">
                        {genre.name ?? genre}
                      </Badge>
                    ))}
                    {!topGenres.length ? <p className="account-muted">No favorite genres yet.</p> : null}
                  </div>
                </SectionCard>
              </div>

              <section className="account-integrity-note" aria-label="Account data note">
                <ShieldCheck size={18} aria-hidden="true" />
                <p>
                  Counts and lists here come from your current RateOple account endpoints. Collection and group totals are left out until those APIs expose user-specific counts.
                </p>
              </section>
            </>
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
