import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useMediaGenresQuery } from '../queries/useMediaGenresQuery';
import * as mediaService from '../services/mediaService';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import Badge from '../../../shared/ui/Badge';
import '../media-management.css';

const normalizeGenreIds = (mediaGenres, availableGenres) => {
  if (!Array.isArray(mediaGenres) || !Array.isArray(availableGenres)) return [];
  const lookup = new Map(availableGenres.map((genre) => [genre.name?.toLowerCase(), genre.id]));
  return mediaGenres
    .map((name) => lookup.get(String(name).toLowerCase()))
    .filter((id) => Number.isFinite(id));
};

const createFormState = (media, genreIds) => ({
  title: media?.title ?? '',
  description: media?.description ?? '',
  coverUrl: media?.coverUrl ?? '',
  releaseYear: media?.releaseYear ? String(media.releaseYear) : '',
  director: media?.director ?? '',
  duration: media?.duration != null ? String(media.duration) : '',
  author: media?.author ?? '',
  pages: media?.pages != null ? String(media.pages) : '',
  isbn: media?.isbn ?? '',
  genreIds: genreIds ?? [],
});

const getDisplayType = (type) => {
  if (!type) return 'Media';
  return type.toLowerCase() === 'tvseries' ? 'TV Series' : type;
};

const FormSection = ({ title, description, children }) => (
  <section className="staff-form-section" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-section`}>
    <header className="staff-form-section__header">
      <h2 className="staff-form-section__title" id={`${title.toLowerCase().replaceAll(' ', '-')}-section`}>
        {title}
      </h2>
      {description ? <p className="staff-form-section__copy">{description}</p> : null}
    </header>
    {children}
  </section>
);

const Field = ({ label, children, hint }) => (
  <label className="staff-field">
    <span className="staff-label">{label}</span>
    {children}
    {hint ? <span className="staff-field__hint">{hint}</span> : null}
  </label>
);

const EditMediaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: media, loading, error } = useMediaDetailsQuery(id);
  const { data: genresData, loading: genresLoading } = useMediaGenresQuery();
  const genres = useMemo(() => (Array.isArray(genresData) ? genresData : []), [genresData]);

  const [form, setForm] = useState(() => createFormState(null, []));
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const mediaType = media?.type ?? '';
  const displayType = getDisplayType(mediaType);

  useEffect(() => {
    if (!media || initialized) return;
    if (genresLoading && Array.isArray(media.genres) && media.genres.length > 0) return;
    const preselectedGenres = normalizeGenreIds(media.genres, genres);
    setForm(createFormState(media, preselectedGenres));
    setInitialized(true);
  }, [media, genres, genresLoading, initialized]);

  const toggleGenre = (idValue) => {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(idValue)
        ? prev.genreIds.filter((gid) => gid !== idValue)
        : [...prev.genreIds, idValue],
    }));
  };

  const setField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!mediaType) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
      releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
      genreIds: form.genreIds,
    };

    try {
      if (mediaType === 'Movie') {
        await mediaService.updateMovie(id, {
          ...payload,
          director: form.director.trim() || null,
          duration: form.duration ? Number(form.duration) : null,
        });
      } else if (mediaType === 'Book') {
        await mediaService.updateBook(id, {
          ...payload,
          author: form.author.trim() || null,
          pages: form.pages ? Number(form.pages) : null,
          isbn: form.isbn.trim() || null,
        });
      } else if (mediaType === 'TvSeries') {
        await mediaService.updateTvSeries(id, payload);
      }

      setSaveSuccess('Changes saved successfully.');
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.response?.data
        || 'Failed to update media.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await mediaService.deleteMedia(id);
      navigate('/admin/media');
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'Failed to archive media.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="staff-workspace">
          <header className="staff-hero">
            <div className="staff-hero__content">
              <p className="staff-eyebrow">Catalog operations</p>
              <h1 className="staff-hero__title">{media?.title ? `Edit ${media.title}` : 'Edit media'}</h1>
              <p className="staff-hero__copy">
                Update catalog metadata for this {displayType.toLowerCase()} while keeping season and episode changes in their dedicated workflow.
              </p>
              <div className="staff-hero__meta">
                {mediaType ? <Badge tone="accent">{displayType}</Badge> : null}
                {media?.releaseYear ? <Badge>{media.releaseYear}</Badge> : null}
              </div>
              <div className="staff-hero__actions">
                <Button as={Link} variant="ghost" to="/admin/media">
                  <ArrowLeft size={16} aria-hidden="true" />
                  Media management
                </Button>
                {id ? (
                  <Button as={Link} to={`/media/${id}`}>
                    <Eye size={16} aria-hidden="true" />
                    View details
                  </Button>
                ) : null}
              </div>
            </div>
          </header>

          {loading ? <LoadingState label="Loading media details..." /> : null}
          {error ? (
            <InlineMessage tone="error">
              {error?.response?.data?.message || 'Unable to load this media item.'}
            </InlineMessage>
          ) : null}

          {saveSuccess ? (
            <InlineMessage tone="success">
              {saveSuccess}
            </InlineMessage>
          ) : null}

          {saveError ? (
            <InlineMessage tone="error">
              {saveError}
            </InlineMessage>
          ) : null}

          {!loading && !error && !media ? (
            <InlineMessage tone="error">
              Media item not found.{' '}
              <button type="button" className="underline" onClick={() => navigate('/admin/media')}>
                Back to list
              </button>
            </InlineMessage>
          ) : null}

          {!loading && media ? (
            <>
              <form className="staff-form" onSubmit={handleSubmit}>
                <FormSection
                  title="Basic identity"
                  description="Core fields used for catalog discovery, detail pages, and staff lists."
                >
                  <div className="staff-form-grid staff-form-grid--two">
                    <Field label="Title *">
                      <input className="ui-input" required value={form.title} onChange={setField('title')} />
                    </Field>
                    <Field label="Type">
                      <input className="ui-input" value={displayType} readOnly />
                    </Field>
                    <Field label="Release year">
                      <input
                        className="ui-input"
                        type="number"
                        min="1800"
                        max="2100"
                        value={form.releaseYear}
                        onChange={setField('releaseYear')}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Artwork"
                  description="Poster or cover imagery shown across RateOple."
                >
                  <div className="staff-form-grid staff-form-grid--artwork">
                    <div className="staff-cover-preview" aria-label="Cover preview">
                      {form.coverUrl ? (
                        <img
                          src={form.coverUrl}
                          alt="Cover preview"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <ImageIcon size={24} aria-hidden="true" />
                      )}
                    </div>
                    <Field label="Cover image URL" hint="Use a direct URL for the public poster or cover.">
                      <input
                        className="ui-input"
                        value={form.coverUrl}
                        onChange={setField('coverUrl')}
                        placeholder="https://..."
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Metadata"
                  description="The editor only sends fields supported by this media type."
                >
                  <div className="staff-form-grid staff-form-grid--two">
                    {mediaType === 'Movie' ? (
                      <>
                        <Field label="Director">
                          <input className="ui-input" value={form.director} onChange={setField('director')} />
                        </Field>
                        <Field label="Runtime in minutes">
                          <input
                            className="ui-input"
                            type="number"
                            min="1"
                            value={form.duration}
                            onChange={setField('duration')}
                          />
                        </Field>
                      </>
                    ) : null}

                    {mediaType === 'Book' ? (
                      <>
                        <Field label="Author">
                          <input className="ui-input" value={form.author} onChange={setField('author')} />
                        </Field>
                        <Field label="Pages">
                          <input
                            className="ui-input"
                            type="number"
                            min="1"
                            value={form.pages}
                            onChange={setField('pages')}
                          />
                        </Field>
                        <Field label="ISBN">
                          <input className="ui-input" value={form.isbn} onChange={setField('isbn')} />
                        </Field>
                      </>
                    ) : null}
                  </div>

                  {genres.length > 0 ? (
                    <fieldset className="staff-field">
                      <legend className="staff-label">Genres</legend>
                      <div className="staff-chip-grid">
                        {genres.map((genre) => (
                          <label key={genre.id} className="staff-chip">
                            <input
                              className="ui-checkbox"
                              type="checkbox"
                              checked={form.genreIds.includes(genre.id)}
                              onChange={() => toggleGenre(genre.id)}
                            />
                            {genre.name}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}

                  {mediaType === 'TvSeries' ? (
                    <InlineMessage tone="info">
                      Season and episode changes are handled from the season manager.{' '}
                      <Link className="font-semibold underline" to={`/media/${id}/seasons`}>
                        Manage seasons
                      </Link>
                    </InlineMessage>
                  ) : null}
                </FormSection>

                <FormSection
                  title="Description"
                  description="Overview copy used on the public media detail page."
                >
                  <Field label="Description">
                    <textarea
                      className="ui-input min-h-[132px] resize-y"
                      rows={5}
                      value={form.description}
                      onChange={setField('description')}
                    />
                  </Field>
                </FormSection>

                <div className="staff-sticky-actions">
                  <span className="text-sm text-[var(--text-muted)]">
                    Save keeps the current media type and payload shape unchanged.
                  </span>
                  <div className="staff-actions">
                    <Button type="submit" variant="primary" disabled={saving}>
                      <Save size={16} aria-hidden="true" />
                      {saving ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate('/admin/media')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>

              <section className="staff-danger-zone" aria-labelledby="delete-media-title">
                <div className="staff-danger-zone__body">
                  <div>
                    <h2 className="staff-form-section__title" id="delete-media-title">Danger zone</h2>
                    <p className="staff-form-section__copy">
                      Archive removes this item from public catalog and collection media cards while retaining the record.
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={16} aria-hidden="true" />
                    Archive media
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </Container>

      <Dialog
        open={deleteOpen}
        title="Archive media?"
        description={`Remove ${media?.title || 'this media item'} from the public catalog and collection media cards? Existing records are retained for staff and audit history.`}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteError('');
          }
        }}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Archiving...' : 'Archive media'}
            </Button>
          </>
        )}
      >
        {deleteError ? <InlineMessage tone="error">{deleteError}</InlineMessage> : null}
      </Dialog>
    </PageLayout>
  );
};

export default EditMediaPage;
