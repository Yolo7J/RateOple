import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useMediaGenresQuery } from '../queries/useMediaGenresQuery';
import * as mediaService from '../services/mediaService';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  header: 'flex flex-wrap items-start justify-between gap-3',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  subtitle: 'text-sm text-[var(--text-muted)]',
  backLink: [
    'inline-flex items-center gap-2 rounded-xl border border-[var(--border)]',
    'bg-[var(--btn-bg)] px-4 py-2 text-sm text-[var(--text-primary)]',
    'transition hover:bg-[var(--btn-hover)]',
  ].join(' '),
  banner: [
    'rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3',
  ].join(' '),
  bannerSuccess: 'border-emerald-500/40 text-emerald-300',
  bannerError: 'border-[#ff6d75]/60 text-[#ff6d75]',
  form: 'flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5',
  formRow: 'grid grid-cols-1 gap-4 md:grid-cols-[minmax(130px,180px)_minmax(0,1fr)] items-start',
  cover: [
    'w-full max-w-[180px] aspect-[2/3] overflow-hidden rounded-xl border border-[var(--border)]',
    'bg-[var(--card-cover-bg)]',
  ].join(' '),
  coverImage: 'h-full w-full object-cover',
  fields: 'flex flex-col gap-4',
  formRow2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  label: 'flex flex-col gap-1 text-xs font-semibold text-[var(--text-secondary)]',
  input: [
    'w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm',
    'text-[var(--text-primary)] outline-none focus:border-[var(--accent)]',
  ].join(' '),
  textarea: 'min-h-[92px] resize-y',
  genrePicker: 'flex flex-wrap gap-2',
  genreItem: [
    'inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs',
    'text-[var(--text-muted)] transition cursor-pointer',
  ].join(' '),
  genreItemActive: 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]',
  genreInput: 'sr-only',
  helper: 'text-xs text-[var(--text-muted)]',
  actions: 'flex flex-wrap gap-3',
  saveBtn: [
    'rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#151515]',
    'transition hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed',
  ].join(' '),
  cancelBtn: [
    'rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm font-semibold',
    'text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]',
  ].join(' '),
  loading: 'text-sm text-[var(--text-muted)]',
};

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

const EditMediaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: media, loading, error } = useMediaDetailsQuery(id);
  const { data: genresData, loading: genresLoading } = useMediaGenresQuery();
  const genres = Array.isArray(genresData) ? genresData : [];

  const [form, setForm] = useState(() => createFormState(null, []));
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const mediaType = media?.type ?? '';
  const displayType = useMemo(() => {
    if (!mediaType) return '';
    return mediaType.toLowerCase() === 'tvseries' ? 'TV Series' : mediaType;
  }, [mediaType]);

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

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <Link className={styles.backLink} to="/admin/media">
            ← Back to Media Management
          </Link>

          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Edit {displayType || 'Media'}</h1>
              <p className={styles.subtitle}>Update the core details for this title.</p>
            </div>
            {id ? (
              <Link className={styles.backLink} to={`/media/${id}`}>
                View Details
              </Link>
            ) : null}
          </div>

          {loading ? <p className={styles.loading}>Loading media details...</p> : null}
          {error ? (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              {error?.response?.data?.message || 'Unable to load this media item.'}
            </div>
          ) : null}

          {saveSuccess ? (
            <div className={`${styles.banner} ${styles.bannerSuccess}`}>
              {saveSuccess}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => navigate('/admin/media')}
              >
                Back to list
              </button>
            </div>
          ) : null}

          {saveError ? (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              {saveError}
            </div>
          ) : null}

          {!loading && media ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                {form.coverUrl ? (
                  <div className={styles.cover}>
                    <img
                      className={styles.coverImage}
                      src={form.coverUrl}
                      alt="Cover preview"
                      onError={(event) => { event.target.style.display = 'none'; }}
                    />
                  </div>
                ) : null}

                <div className={styles.fields}>
                  <label className={styles.label}>
                    Title *
                    <input
                      className={styles.input}
                      required
                      value={form.title}
                      onChange={setField('title')}
                    />
                  </label>

                  <label className={styles.label}>
                    Cover Image URL
                    <input
                      className={styles.input}
                      value={form.coverUrl}
                      onChange={setField('coverUrl')}
                      placeholder="https://..."
                    />
                  </label>

                  <div className={styles.formRow2}>
                    <label className={styles.label}>
                      Release Year
                      <input
                        className={styles.input}
                        type="number"
                        min="1800"
                        max="2100"
                        value={form.releaseYear}
                        onChange={setField('releaseYear')}
                      />
                    </label>

                    {mediaType === 'Movie' ? (
                      <label className={styles.label}>
                        Duration (min)
                        <input
                          className={styles.input}
                          type="number"
                          min="1"
                          value={form.duration}
                          onChange={setField('duration')}
                        />
                      </label>
                    ) : null}

                    {mediaType === 'Book' ? (
                      <label className={styles.label}>
                        Pages
                        <input
                          className={styles.input}
                          type="number"
                          min="1"
                          value={form.pages}
                          onChange={setField('pages')}
                        />
                      </label>
                    ) : null}
                  </div>

                  {mediaType === 'Movie' ? (
                    <label className={styles.label}>
                      Director
                      <input
                        className={styles.input}
                        value={form.director}
                        onChange={setField('director')}
                      />
                    </label>
                  ) : null}

                  {mediaType === 'Book' ? (
                    <>
                      <label className={styles.label}>
                        Author
                        <input
                          className={styles.input}
                          value={form.author}
                          onChange={setField('author')}
                        />
                      </label>
                      <label className={styles.label}>
                        ISBN
                        <input
                          className={styles.input}
                          value={form.isbn}
                          onChange={setField('isbn')}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </div>

              <label className={styles.label}>
                Description
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  rows={4}
                  value={form.description}
                  onChange={setField('description')}
                />
              </label>

              {genres.length > 0 ? (
                <div className={styles.label}>
                  Genres
                  <div className={styles.genrePicker}>
                    {genres.map((genre) => (
                      <label
                        key={genre.id}
                        className={clsx(styles.genreItem, form.genreIds.includes(genre.id) && styles.genreItemActive)}
                      >
                        <input
                          type="checkbox"
                          className={styles.genreInput}
                          checked={form.genreIds.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {mediaType === 'TvSeries' ? (
                <p className={styles.helper}>
                  Season and episode changes should be handled from the season manager.
                  {' '}
                  <Link className="underline" to={`/media/${id}/seasons`}>
                    Manage seasons
                  </Link>
                </p>
              ) : null}

              <div className={styles.actions}>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => navigate('/admin/media')}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default EditMediaPage;
