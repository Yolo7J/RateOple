import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  CloudDownload,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMediaDetailsQuery } from '../queries/useMediaDetailsQuery';
import { useTvSeriesSeasonsQuery } from '../queries/useTvSeriesSeasonsQuery';
import { useMediaCommands } from '../queries/useMediaCommands';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import Dialog from '../../../shared/ui/Dialog';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import '../media-management.css';

const emptyEpisode = (epNum) => ({ episodeNumber: epNum, title: '', duration: '' });
const emptySeasonForm = (nextNum) => ({
  seasonNumber: nextNum,
  episodes: [emptyEpisode(1)],
});

const Spinner = () => <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />;

const Field = ({ label, children, hint }) => (
  <label className="staff-field">
    <span className="staff-label">{label}</span>
    {children}
    {hint ? <span className="staff-field__hint">{hint}</span> : null}
  </label>
);

const getTmdbItems = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

export default function SeasonManagerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getTmdbSeriesDetails,
    searchTmdb,
    addSeason,
    updateSeason,
    deleteSeason,
    addEpisode,
    updateEpisode,
    deleteEpisode,
  } = useMediaCommands();
  const { data: mediaData, loading: mediaLoading, error: mediaError } = useMediaDetailsQuery(id);
  const {
    data: seasonsData,
    loading: seasonsLoading,
    error: seasonsError,
    refetch: refetchSeasons,
  } = useTvSeriesSeasonsQuery(id);

  const [media, setMedia] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [error, setError] = useState(null);
  const [openSeasonId, setOpenSeasonId] = useState(null);

  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);
  const [tmdbPreview, setTmdbPreview] = useState(null);
  const [tmdbImportResult, setTmdbImportResult] = useState(null);
  const [tmdbSyncingSeason, setTmdbSyncingSeason] = useState(null);
  const [activeTmdbId, setActiveTmdbId] = useState(null);
  const [tmdbLookupLoading, setTmdbLookupLoading] = useState(false);
  const [tmdbLookupError, setTmdbLookupError] = useState(null);
  const [tmdbCandidates, setTmdbCandidates] = useState([]);

  const [showAddSeason, setShowAddSeason] = useState(false);
  const [addSeasonForm, setAddSeasonForm] = useState(null);
  const [addSeasonSaving, setAddSeasonSaving] = useState(false);
  const [addSeasonError, setAddSeasonError] = useState(null);
  const [seasonEdit, setSeasonEdit] = useState(null);

  const [editingEpisode, setEditingEpisode] = useState(null);
  const [editEpForm, setEditEpForm] = useState({});
  const [editEpSaving, setEditEpSaving] = useState(false);
  const [editEpError, setEditEpError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadSeasons = useCallback(async () => {
    try {
      await refetchSeasons();
    } catch {
      setError('Failed to load seasons.');
    }
  }, [refetchSeasons]);

  useEffect(() => {
    if (mediaData) {
      if (mediaData.type !== 'TvSeries') {
        navigate(`/media/${id}`);
        return;
      }

      setMedia(mediaData);
      setActiveTmdbId(mediaData.tmdbId ?? null);
    }
  }, [id, mediaData, navigate]);

  useEffect(() => {
    if (Array.isArray(seasonsData)) {
      setSeasons(seasonsData);
    }
  }, [seasonsData]);

  useEffect(() => {
    if (mediaError || seasonsError) {
      setError('Failed to load series.');
    }
  }, [mediaError, seasonsError]);

  useEffect(() => {
    if (media?.tmdbId && seasons.length === 0) {
      autoLoadTmdb(media.tmdbId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.tmdbId, seasons.length]);

  async function autoLoadTmdb(tmdbId) {
    setTmdbLoading(true);
    setTmdbError(null);
    setTmdbImportResult(null);
    setTmdbLookupError(null);
    try {
      const details = await getTmdbSeriesDetails(tmdbId);
      setActiveTmdbId(tmdbId);
      setTmdbPreview(details.seasons ?? []);
    } catch {
      setTmdbError('Could not fetch seasons from TMDB.');
    } finally {
      setTmdbLoading(false);
    }
  }

  async function handleReloadTmdb() {
    const tmdbId = activeTmdbId ?? media?.tmdbId;
    if (!tmdbId) return;
    autoLoadTmdb(tmdbId);
  }

  async function handleLookupTmdbByTitle() {
    if (!media?.title?.trim()) return;
    setTmdbLookupLoading(true);
    setTmdbLookupError(null);
    try {
      const response = await searchTmdb(media.title.trim(), 'tv');
      const results = getTmdbItems(response);
      setTmdbCandidates(results);
      if (results.length === 0) {
        setTmdbLookupError('No TMDB matches found for this title.');
      }
    } catch {
      setTmdbLookupError('Could not search TMDB by title.');
      setTmdbCandidates([]);
    } finally {
      setTmdbLookupLoading(false);
    }
  }

  async function syncSingleTmdbSeason(tmdbSeason, existingSeasons = seasons) {
    const mappedEpisodes = (tmdbSeason.episodes ?? []).map((episode) => ({
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      duration: episode.duration ?? null,
    }));
    const existingSeason = existingSeasons.find((dbSeason) => dbSeason.seasonNumber === tmdbSeason.seasonNumber);

    if (!existingSeason) {
      await addSeason(id, {
        seasonNumber: tmdbSeason.seasonNumber,
        episodes: mappedEpisodes,
      });
      return { createdSeasons: 1, updatedSeasons: 0, addedEpisodes: mappedEpisodes.length };
    }

    const existingEpisodeNumbers = new Set(existingSeason.episodes.map((ep) => ep.episodeNumber));
    const missingEpisodesCount = mappedEpisodes.filter((ep) => !existingEpisodeNumbers.has(ep.episodeNumber)).length;

    await updateSeason(id, tmdbSeason.seasonNumber, {
      seasonNumber: tmdbSeason.seasonNumber,
      episodes: mappedEpisodes,
    });

    return { createdSeasons: 0, updatedSeasons: 1, addedEpisodes: missingEpisodesCount };
  }

  async function handleImportTmdb() {
    if (!tmdbPreview) return;
    setTmdbLoading(true);
    setTmdbError(null);
    setTmdbImportResult(null);
    try {
      let createdSeasons = 0;
      let updatedSeasons = 0;
      let addedEpisodes = 0;
      let workingSeasons = [...seasons];

      for (const season of tmdbPreview) {
        const result = await syncSingleTmdbSeason(season, workingSeasons);
        createdSeasons += result.createdSeasons;
        updatedSeasons += result.updatedSeasons;
        addedEpisodes += result.addedEpisodes;
        if (!workingSeasons.some((existingSeason) => existingSeason.seasonNumber === season.seasonNumber)) {
          workingSeasons.push({ seasonNumber: season.seasonNumber, episodes: season.episodes ?? [] });
        }
      }

      await loadSeasons();
      setTmdbImportResult({ createdSeasons, updatedSeasons, addedEpisodes });
      setTmdbPreview(null);
    } catch {
      setTmdbError('Import failed. Some seasons may not have been saved.');
    } finally {
      setTmdbLoading(false);
    }
  }

  function dismissTmdbSeason(seasonNumber) {
    setTmdbPreview((prev) => prev.filter((season) => season.seasonNumber !== seasonNumber));
  }

  async function handleSyncTmdbSeason(tmdbSeason) {
    setTmdbSyncingSeason(tmdbSeason.seasonNumber);
    setTmdbError(null);
    try {
      const result = await syncSingleTmdbSeason(tmdbSeason);
      await loadSeasons();
      setTmdbImportResult(result);
    } catch {
      setTmdbError(`Could not sync Season ${tmdbSeason.seasonNumber} from TMDB.`);
    } finally {
      setTmdbSyncingSeason(null);
    }
  }

  function openAddSeason() {
    const nextNum = seasons.length > 0
      ? Math.max(...seasons.map((season) => season.seasonNumber)) + 1
      : 1;
    setAddSeasonForm(emptySeasonForm(nextNum));
    setShowAddSeason(true);
    setAddSeasonError(null);
  }

  function updateAddSeasonEpisode(idx, field, value) {
    setAddSeasonForm((prev) => {
      const episodes = [...prev.episodes];
      episodes[idx] = { ...episodes[idx], [field]: value };
      return { ...prev, episodes };
    });
  }

  function addEpisodeToForm() {
    const nextEpisodeNumber =
      addSeasonForm.episodes.length > 0
        ? Math.max(...addSeasonForm.episodes.map((ep) => Number(ep.episodeNumber) || 0)) + 1
        : 1;

    setAddSeasonForm((prev) => ({
      ...prev,
      episodes: [...prev.episodes, emptyEpisode(nextEpisodeNumber)],
    }));
  }

  function removeEpisodeFromForm(idx) {
    setAddSeasonForm((prev) => ({
      ...prev,
      episodes: prev.episodes
        .filter((_, i) => i !== idx)
        .map((ep, i) => ({ ...ep, episodeNumber: i + 1 })),
    }));
  }

  async function handleSaveNewSeason() {
    if (!addSeasonForm) return;
    const seasonNumber = Number(addSeasonForm.seasonNumber);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
      setAddSeasonError('Season number must be a positive integer.');
      return;
    }

    if (seasons.some((season) => season.seasonNumber === seasonNumber)) {
      setAddSeasonError(`Season ${seasonNumber} already exists.`);
      return;
    }

    const episodesPayload = addSeasonForm.episodes.map((episode, index) => ({
      episodeNumber: Number(episode.episodeNumber) || index + 1,
      title: episode.title.trim() ? episode.title.trim() : null,
      duration: episode.duration ? Number(episode.duration) : null,
    }));

    setAddSeasonSaving(true);
    setAddSeasonError(null);
    try {
      await addSeason(id, {
        seasonNumber,
        episodes: episodesPayload,
      });
      await loadSeasons();
      setShowAddSeason(false);
      setAddSeasonForm(null);
    } catch (err) {
      setAddSeasonError(err?.response?.data || 'Failed to save season.');
    } finally {
      setAddSeasonSaving(false);
    }
  }

  function startEditEpisode(season, episode) {
    setEditingEpisode({ seasonNumber: season.seasonNumber, episodeNumber: episode.episodeNumber });
    setEditEpForm({ title: episode.title ?? '', duration: episode.duration ?? '' });
    setEditEpError('');
  }

  async function saveEditEpisode(season, episode) {
    setEditEpSaving(true);
    setEditEpError('');
    try {
      await updateEpisode(id, season.seasonNumber, episode.episodeNumber, {
        title: editEpForm.title || null,
        duration: editEpForm.duration ? Number(editEpForm.duration) : null,
      });
      await loadSeasons();
      setEditingEpisode(null);
    } catch (err) {
      setEditEpError(err?.response?.data || 'Failed to update episode.');
    } finally {
      setEditEpSaving(false);
    }
  }

  function startSeasonNumberEdit(season) {
    setSeasonEdit({
      seasonId: season.id,
      currentSeasonNumber: season.seasonNumber,
      newSeasonNumber: season.seasonNumber,
      saving: false,
      error: null,
    });
  }

  async function saveSeasonNumberEdit(season) {
    if (!seasonEdit) return;
    const parsedSeasonNumber = Number(seasonEdit.newSeasonNumber);
    if (!Number.isInteger(parsedSeasonNumber) || parsedSeasonNumber < 1) {
      setSeasonEdit((prev) => ({ ...prev, error: 'Season number must be a positive integer.' }));
      return;
    }

    const duplicateExists = seasons.some(
      (item) => item.id !== season.id && item.seasonNumber === parsedSeasonNumber
    );
    if (duplicateExists) {
      setSeasonEdit((prev) => ({ ...prev, error: `Season ${parsedSeasonNumber} already exists.` }));
      return;
    }

    setSeasonEdit((prev) => ({ ...prev, saving: true, error: null }));
    try {
      await updateSeason(id, season.seasonNumber, {
        seasonNumber: parsedSeasonNumber,
        episodes: [],
      });
      await loadSeasons();
      setSeasonEdit(null);
    } catch (err) {
      setSeasonEdit((prev) => ({
        ...prev,
        saving: false,
        error: err?.response?.data || 'Failed to update season number.',
      }));
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      if (confirmDelete.type === 'season') {
        await deleteSeason(id, confirmDelete.seasonNumber);
      } else {
        await deleteEpisode(id, confirmDelete.seasonNumber, confirmDelete.episodeNumber);
      }
      await loadSeasons();
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err?.response?.data || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  const loading = mediaLoading || seasonsLoading;
  const episodeCount = seasons.reduce((sum, season) => sum + season.episodes.length, 0);

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <LoadingState label="Loading series..." />
        </Container>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Container>
          <InlineMessage tone="error">
            {error}{' '}
            <button type="button" className="underline" onClick={() => navigate(-1)}>
              Go back
            </button>
          </InlineMessage>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container size="xxl">
        <div className="staff-workspace">
          <header className="staff-hero">
            <div className="staff-hero__content season-manager-hero">
              <div className="season-manager-hero__cover" aria-hidden={!media?.coverUrl}>
                {media?.coverUrl ? <img src={media.coverUrl} alt="" /> : null}
              </div>
              <div className="min-w-0">
                <p className="staff-eyebrow">TV catalog operations</p>
                <h1 className="staff-hero__title">Manage seasons & episodes</h1>
                <p className="staff-hero__copy">
                  Maintain the episode structure for {media?.title || 'this TV series'} without changing the parent media record.
                </p>
                <div className="staff-hero__meta">
                  <Badge tone="accent">{media?.title || 'TV Series'}</Badge>
                  <Badge>{seasons.length} season{seasons.length === 1 ? '' : 's'}</Badge>
                  <Badge>{episodeCount} episode{episodeCount === 1 ? '' : 's'}</Badge>
                </div>
                <div className="staff-hero__actions">
                  <Button as={Link} variant="ghost" to={`/media/${id}`}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to series
                  </Button>
                  <Button type="button" onClick={openAddSeason} disabled={showAddSeason}>
                    <Plus size={16} aria-hidden="true" />
                    Add season
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <section className="staff-panel" aria-labelledby="tmdb-import-title">
            <div className="staff-toolbar">
              <div>
                <h2 className="staff-form-section__title" id="tmdb-import-title">TMDB import</h2>
                <p className="staff-form-section__copy">Import missing seasons or refresh existing episode metadata when a TMDB match is available.</p>
              </div>
              <div className="staff-actions">
                {(media?.tmdbId || activeTmdbId) ? (
                  <Button type="button" onClick={handleReloadTmdb} disabled={tmdbLoading}>
                    {tmdbLoading ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />}
                    Load from TMDB
                  </Button>
                ) : (
                  <Button type="button" onClick={handleLookupTmdbByTitle} disabled={tmdbLookupLoading}>
                    {tmdbLookupLoading ? <Spinner /> : <Search size={16} aria-hidden="true" />}
                    Find by title
                  </Button>
                )}
              </div>
            </div>

            {tmdbError ? <InlineMessage tone="error">{tmdbError}</InlineMessage> : null}
            {tmdbLookupError ? <InlineMessage tone="error">{tmdbLookupError}</InlineMessage> : null}
            {tmdbImportResult ? (
              <InlineMessage tone="success">
                Synced {tmdbImportResult.createdSeasons} new season{tmdbImportResult.createdSeasons !== 1 ? 's' : ''},
                {' '}updated {tmdbImportResult.updatedSeasons} existing season{tmdbImportResult.updatedSeasons !== 1 ? 's' : ''},
                {' '}and added {tmdbImportResult.addedEpisodes} new episode{tmdbImportResult.addedEpisodes !== 1 ? 's' : ''}.
              </InlineMessage>
            ) : null}

            {tmdbCandidates.length > 0 ? (
              <div className="staff-chip-grid">
                {tmdbCandidates.map((candidate) => (
                  <Button
                    key={candidate.tmdbId}
                    type="button"
                    size="sm"
                    onClick={() => autoLoadTmdb(candidate.tmdbId)}
                  >
                    {candidate.title}
                    {candidate.releaseYear ? ` (${candidate.releaseYear})` : ''}
                  </Button>
                ))}
              </div>
            ) : null}

            {tmdbPreview ? (
              <div className="mt-4">
                {tmdbPreview.length > 0 ? (
                  <>
                    <p className="staff-form-section__copy">
                      {tmdbPreview.length} season{tmdbPreview.length !== 1 ? 's' : ''} found. Import all or handle seasons one at a time.
                    </p>
                    <div className="tmdb-import-grid">
                      {tmdbPreview.map((season) => {
                        const alreadyInDb = seasons.some((db) => db.seasonNumber === season.seasonNumber);
                        const isSyncing = tmdbSyncingSeason === season.seasonNumber;
                        return (
                          <article
                            key={season.seasonNumber}
                            className={clsx('tmdb-import-card', alreadyInDb && 'tmdb-import-card--saved')}
                          >
                            <div className="staff-toolbar">
                              <div>
                                <h3 className="staff-media-title">Season {season.seasonNumber}</h3>
                                <p className="staff-media-meta">{season.episodes?.length ?? 0} episodes</p>
                              </div>
                              {alreadyInDb ? <Badge tone="success">Saved</Badge> : <Badge tone="warning">New</Badge>}
                            </div>
                            <div className="staff-actions">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSyncTmdbSeason(season)}
                                disabled={isSyncing || tmdbLoading}
                              >
                                {isSyncing ? <Spinner /> : <CloudDownload size={14} aria-hidden="true" />}
                                {alreadyInDb ? 'Update' : 'Import'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => dismissTmdbSeason(season.seasonNumber)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="staff-actions mt-4">
                      <Button type="button" variant="primary" onClick={handleImportTmdb} disabled={tmdbLoading}>
                        {tmdbLoading ? <Spinner /> : <CloudDownload size={16} aria-hidden="true" />}
                        Import {tmdbPreview.filter((season) => !seasons.some((db) => db.seasonNumber === season.seasonNumber)).length} seasons
                      </Button>
                    </div>
                  </>
                ) : (
                  <InlineMessage tone="info">No seasons returned from TMDB.</InlineMessage>
                )}
              </div>
            ) : null}
          </section>

          <section className="staff-panel" aria-labelledby="season-list-title">
            <div className="staff-toolbar">
              <div>
                <h2 className="staff-form-section__title" id="season-list-title">Season list</h2>
                <p className="staff-form-section__copy">Open a season to review, edit, add, or remove episodes.</p>
              </div>
              <Button type="button" onClick={openAddSeason} disabled={showAddSeason}>
                <Plus size={16} aria-hidden="true" />
                Add season manually
              </Button>
            </div>

            <div className="season-manager-grid">
              {seasons.length === 0 && !tmdbPreview ? (
                <EmptyState title="No seasons yet" description="Import from TMDB or add a season manually." />
              ) : null}

              {seasons.map((season) => {
                const isOpen = openSeasonId === season.id;
                const isEditingSeason = seasonEdit?.seasonId === season.id;
                return (
                  <article key={season.id} className={clsx('season-card', isOpen && 'season-card--open')}>
                    <button
                      type="button"
                      className="season-card__button"
                      onClick={() => setOpenSeasonId(isOpen ? null : season.id)}
                      aria-expanded={isOpen}
                    >
                      {isEditingSeason ? (
                        <div className="season-number-edit" onClick={(event) => event.stopPropagation()}>
                          <Field label="Season number">
                            <input
                              className="ui-input max-w-[120px]"
                              type="number"
                              min="1"
                              value={seasonEdit.newSeasonNumber}
                              onChange={(event) =>
                                setSeasonEdit((prev) => ({ ...prev, newSeasonNumber: event.target.value }))
                              }
                            />
                          </Field>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => saveSeasonNumberEdit(season)}
                            disabled={seasonEdit.saving}
                          >
                            {seasonEdit.saving ? <Spinner /> : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSeasonEdit(null)}
                            disabled={seasonEdit.saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="season-card__title">Season {season.seasonNumber}</span>
                      )}
                      <span className="season-card__meta">
                        {season.episodes.length} episode{season.episodes.length !== 1 ? 's' : ''}
                      </span>
                      <span className="season-card__actions" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className="staff-icon-button"
                          aria-label={`Edit season ${season.seasonNumber} number`}
                          onClick={() => startSeasonNumberEdit(season)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="staff-icon-button staff-icon-button--danger"
                          aria-label={`Delete season ${season.seasonNumber}`}
                          onClick={() => setConfirmDelete({ type: 'season', seasonNumber: season.seasonNumber })}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </span>
                      <ChevronDown
                        className={clsx('h-5 w-5 text-[var(--text-muted)] transition', isOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen ? (
                      <div className="season-card__body">
                        {isEditingSeason && seasonEdit?.error ? (
                          <InlineMessage tone="error">{seasonEdit.error}</InlineMessage>
                        ) : null}
                        {season.episodes.length === 0 ? (
                          <InlineMessage tone="info">No episodes in this season.</InlineMessage>
                        ) : null}

                        {season.episodes.map((episode) => {
                          const isEditing =
                            editingEpisode?.seasonNumber === season.seasonNumber &&
                            editingEpisode?.episodeNumber === episode.episodeNumber;

                          if (isEditing) {
                            return (
                              <div key={episode.id} className="season-inline-form">
                                <span className="season-episode__number">E{episode.episodeNumber}</span>
                                <Field label={`Season ${season.seasonNumber} episode ${episode.episodeNumber} title`}>
                                  <input
                                    className="ui-input"
                                    value={editEpForm.title}
                                    onChange={(event) => setEditEpForm((prev) => ({ ...prev, title: event.target.value }))}
                                  />
                                </Field>
                                <Field label="Minutes">
                                  <input
                                    className="ui-input"
                                    type="number"
                                    value={editEpForm.duration}
                                    onChange={(event) => setEditEpForm((prev) => ({ ...prev, duration: event.target.value }))}
                                  />
                                </Field>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  onClick={() => saveEditEpisode(season, episode)}
                                  disabled={editEpSaving}
                                >
                                  {editEpSaving ? <Spinner /> : 'Save'}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingEpisode(null)}>
                                  Cancel
                                </Button>
                                {editEpError ? <InlineMessage tone="error" className="sm:col-span-full">{editEpError}</InlineMessage> : null}
                              </div>
                            );
                          }

                          return (
                            <div key={episode.id} className="season-episode">
                              <span className="season-episode__number">E{episode.episodeNumber}</span>
                              <span className="season-episode__title">{episode.title || `Episode ${episode.episodeNumber}`}</span>
                              <span className="season-episode__duration">{episode.duration ? `${episode.duration}m` : 'No runtime'}</span>
                              <span className="season-episode__actions">
                                <button
                                  type="button"
                                  className="staff-icon-button"
                                  aria-label={`Edit episode ${episode.episodeNumber}`}
                                  onClick={() => startEditEpisode(season, episode)}
                                >
                                  <Pencil size={15} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="staff-icon-button staff-icon-button--danger"
                                  aria-label={`Delete episode ${episode.episodeNumber}`}
                                  onClick={() =>
                                    setConfirmDelete({
                                      type: 'episode',
                                      seasonNumber: season.seasonNumber,
                                      episodeNumber: episode.episodeNumber,
                                    })
                                  }
                                >
                                  <Trash2 size={15} aria-hidden="true" />
                                </button>
                              </span>
                            </div>
                          );
                        })}

                        <AddEpisodeInline
                          seasonNumber={season.seasonNumber}
                          nextEpisodeNumber={
                            season.episodes.length > 0
                              ? Math.max(...season.episodes.map((episode) => episode.episodeNumber)) + 1
                              : 1
                          }
                          onAdd={async (dto) => {
                            await addEpisode(id, season.seasonNumber, dto);
                            await loadSeasons();
                          }}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          {showAddSeason ? (
            <section className="staff-form-section" aria-labelledby="new-season-title">
              <header className="staff-form-section__header">
                <div className="staff-toolbar">
                  <div>
                    <h2 className="staff-form-section__title" id="new-season-title">New season</h2>
                    <p className="staff-form-section__copy">Create a season with one or more episodes.</p>
                  </div>
                  <button
                    type="button"
                    className="staff-icon-button"
                    aria-label="Close new season form"
                    onClick={() => setShowAddSeason(false)}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </header>

              <Field label="Season number">
                <input
                  className="ui-input max-w-[140px]"
                  type="number"
                  min="1"
                  value={addSeasonForm?.seasonNumber ?? ''}
                  onChange={(event) =>
                    setAddSeasonForm((prev) => ({ ...prev, seasonNumber: event.target.value }))
                  }
                />
              </Field>

              <div className="staff-episode-list">
                <p className="staff-label">Episodes</p>
                {addSeasonForm?.episodes.map((episode, idx) => (
                  <div key={idx} className="staff-episode-row">
                    <span className="staff-episode-index">E{episode.episodeNumber}</span>
                    <Field label={`New episode ${episode.episodeNumber} title`}>
                      <input
                        className="ui-input"
                        value={episode.title}
                        onChange={(event) => updateAddSeasonEpisode(idx, 'title', event.target.value)}
                      />
                    </Field>
                    <Field label="Minutes">
                      <input
                        className="ui-input"
                        type="number"
                        value={episode.duration}
                        onChange={(event) => updateAddSeasonEpisode(idx, 'duration', event.target.value)}
                      />
                    </Field>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => removeEpisodeFromForm(idx)}
                      disabled={addSeasonForm.episodes.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div>
                  <Button type="button" size="sm" onClick={addEpisodeToForm}>
                    <Plus size={14} aria-hidden="true" />
                    Add episode
                  </Button>
                </div>
              </div>

              {addSeasonError ? <InlineMessage tone="error">{addSeasonError}</InlineMessage> : null}

              <div className="staff-actions">
                <Button type="button" variant="primary" onClick={handleSaveNewSeason} disabled={addSeasonSaving}>
                  {addSeasonSaving ? <Spinner /> : 'Save season'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddSeason(false)}>
                  Cancel
                </Button>
              </div>
            </section>
          ) : null}

          <Dialog
            open={Boolean(confirmDelete)}
            title="Confirm delete"
            description={confirmDelete?.type === 'season'
              ? `Delete Season ${confirmDelete?.seasonNumber} and all its episodes?`
              : `Delete Episode ${confirmDelete?.episodeNumber} from Season ${confirmDelete?.seasonNumber}?`}
            onClose={() => {
              if (!deleting) {
                setConfirmDelete(null);
                setDeleteError('');
              }
            }}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
          >
            <p className="text-sm text-[var(--text-muted)]">This is a soft delete. Data is kept in the database.</p>
            {deleteError ? <InlineMessage tone="error" className="mt-3">{deleteError}</InlineMessage> : null}
          </Dialog>
        </div>
      </Container>
    </PageLayout>
  );
}

function AddEpisodeInline({ seasonNumber, nextEpisodeNumber, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', duration: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        episodeNumber: nextEpisodeNumber,
        title: form.title.trim(),
        duration: form.duration ? Number(form.duration) : null,
      });
      setForm({ title: '', duration: '' });
      setOpen(false);
    } catch {
      setError('Failed to add episode.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        Add episode
      </Button>
    );
  }

  return (
    <div className="season-inline-form">
      <span className="season-episode__number">E{nextEpisodeNumber}</span>
      <Field label={`Season ${seasonNumber} new episode title`}>
        <input
          className="ui-input"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          autoFocus
        />
      </Field>
      <Field label="Minutes">
        <input
          className="ui-input"
          type="number"
          value={form.duration}
          onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
        />
      </Field>
      <Button type="button" size="sm" variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? <Spinner /> : 'Add'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error ? <InlineMessage tone="error" className="sm:col-span-full">{error}</InlineMessage> : null}
    </div>
  );
}
