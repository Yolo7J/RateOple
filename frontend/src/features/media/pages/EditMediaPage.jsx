import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useMediaGenresQuery } from '../queries/useMediaGenresQuery';
import * as mediaService from '../services/mediaService';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import Checkbox from '../../../shared/ui/Checkbox';
import FormField from '../../../shared/ui/FormField';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Input from '../../../shared/ui/Input';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';
import SectionCard from '../../../shared/ui/SectionCard';
import Textarea from '../../../shared/ui/Textarea';

const styles = {
  pageStack: 'gap-6',
  form: 'flex flex-col gap-5',
  formRow: 'grid grid-cols-1 gap-4 md:grid-cols-[minmax(130px,180px)_minmax(0,1fr)] items-start',
  cover: [
    'w-full max-w-[180px] aspect-[2/3] overflow-hidden rounded-xl border border-[var(--border)]',
    'bg-[var(--card-cover-bg)]',
  ].join(' '),
  coverImage: 'h-full w-full object-cover',
  fields: 'flex flex-col gap-4',
  formRow2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  genrePicker: 'flex flex-wrap gap-2',
  genreItem: [
    'inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs',
    'text-[var(--text-muted)] transition',
  ].join(' '),
  genreItemActive: 'border-[var(--accent)] bg-[var(--primary-color-alpha)] text-[var(--text-primary)]',
  helper: 'text-xs text-[var(--text-muted)]',
  actions: 'flex flex-wrap gap-3',
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
  const genres = useMemo(() => (Array.isArray(genresData) ? genresData : []), [genresData]);

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
          <PageHeader
            title={`Edit ${displayType || 'Media'}`}
            subtitle="Update catalog metadata while keeping season and episode edits in the dedicated manager."
            actions={(
              <>
                <Button as={Link} variant="ghost" to="/admin/media">Media Management</Button>
                {id ? (
                  <Button as={Link} to={`/media/${id}`}>View Details</Button>
                ) : null}
              </>
            )}
          />

          {loading ? <LoadingState label="Loading media details..." /> : null}
          {error ? (
            <InlineMessage tone="error">
              {error?.response?.data?.message || 'Unable to load this media item.'}
            </InlineMessage>
          ) : null}

          {saveSuccess ? (
            <InlineMessage tone="success">
              {saveSuccess}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => navigate('/admin/media')}
              >
                Back to list
              </button>
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
              <button
                type="button"
                className="underline"
                onClick={() => navigate('/admin/media')}
              >
                Back to list
              </button>
            </InlineMessage>
          ) : null}

          {!loading && media ? (
            <SectionCard>
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
                    <FormField label="Title">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          required
                          value={form.title}
                          onChange={setField('title')}
                        />
                      )}
                    </FormField>

                    <FormField label="Cover Image URL">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={form.coverUrl}
                          onChange={setField('coverUrl')}
                          placeholder="https://..."
                        />
                      )}
                    </FormField>

                  <div className={styles.formRow2}>
                    <FormField label="Release Year">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          type="number"
                          min="1800"
                          max="2100"
                          value={form.releaseYear}
                          onChange={setField('releaseYear')}
                        />
                      )}
                    </FormField>

                    {mediaType === 'Movie' ? (
                      <FormField label="Duration (min)">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            type="number"
                            min="1"
                            value={form.duration}
                            onChange={setField('duration')}
                          />
                        )}
                      </FormField>
                    ) : null}

                    {mediaType === 'Book' ? (
                      <FormField label="Pages">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            type="number"
                            min="1"
                            value={form.pages}
                            onChange={setField('pages')}
                          />
                        )}
                      </FormField>
                    ) : null}
                  </div>

                  {mediaType === 'Movie' ? (
                    <FormField label="Director">
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={form.director}
                          onChange={setField('director')}
                        />
                      )}
                    </FormField>
                  ) : null}

                  {mediaType === 'Book' ? (
                    <>
                      <FormField label="Author">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            value={form.author}
                            onChange={setField('author')}
                          />
                        )}
                      </FormField>
                      <FormField label="ISBN">
                        {(fieldProps) => (
                          <Input
                            {...fieldProps}
                            value={form.isbn}
                            onChange={setField('isbn')}
                          />
                        )}
                      </FormField>
                    </>
                  ) : null}
                </div>
              </div>

              <FormField label="Description">
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    rows={4}
                    value={form.description}
                    onChange={setField('description')}
                  />
                )}
              </FormField>

              {genres.length > 0 ? (
                <FormField label="Genres">
                  <div className={styles.genrePicker}>
                    {genres.map((genre) => (
                      <label
                        key={genre.id}
                        className={clsx(styles.genreItem, form.genreIds.includes(genre.id) && styles.genreItemActive)}
                      >
                        <Checkbox
                          checked={form.genreIds.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                </FormField>
              ) : null}

              {mediaType === 'TvSeries' ? (
                <p className={styles.helper}>
                  Season and episode changes should be handled from the season manager.
                  {' '}
                  <Link className="font-semibold text-[var(--accent)] underline" to={`/media/${id}/seasons`}>
                    Manage seasons
                  </Link>
                </p>
              ) : null}

              <div className={styles.actions}>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/admin/media')}>
                  Cancel
                </Button>
              </div>
            </form>
            </SectionCard>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
};

export default EditMediaPage;
