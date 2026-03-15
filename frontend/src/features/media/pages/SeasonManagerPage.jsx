import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import { useParams, useNavigate } from "react-router-dom";
import { useMediaDetailsQuery } from "../queries/useMediaDetailsQuery";
import { useTvSeriesSeasonsQuery } from "../queries/useTvSeriesSeasonsQuery";
import { useMediaCommands } from "../queries/useMediaCommands";
import PageLayout from "../../../layouts/PageLayout";
import Container from "../../../shared/ui/Container";

// ── Icons (inline SVG to avoid deps) ─────────────────────────────────────────
const ChevronDown = ({ open }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Spinner = () => (
  <div style={{
    width: 20, height: 20, border: "2px solid #e5e7eb",
    borderTopColor: "#6366f1", borderRadius: "50%",
    animation: "spin 0.7s linear infinite", display: "inline-block"
  }} />
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyEpisode = (epNum) => ({ episodeNumber: epNum, title: "", duration: "" });
const emptySeasonForm = (nextNum) => ({
  seasonNumber: nextNum,
  episodes: [emptyEpisode(1)],
});

const styles = {
  page: "mx-auto max-w-[1120px] px-4 py-6 pb-16 text-[var(--text-primary)]",
  header: "mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5",
  back: "mb-3 text-sm text-indigo-500 hover:underline",
  titleRow: "flex items-center gap-4",
  cover: "h-[126px] w-[90px] rounded-xl object-cover shadow-[0_10px_28px_rgba(0,0,0,0.2)]",
  title: "text-3xl font-extrabold",
  meta: "text-base text-[var(--text-muted)]",
  tmdbBanner: "mb-6 rounded-2xl border border-indigo-200/60 bg-indigo-50 p-5",
  tmdbBannerHeader: "mb-2 flex items-center justify-between gap-3",
  tmdbLabel: "text-sm font-semibold text-indigo-700",
  tmdbReload: "inline-flex items-center gap-2 rounded-md border border-indigo-200 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100",
  tmdbSub: "text-sm text-[var(--text-muted)]",
  tmdbError: "text-sm text-red-600",
  tmdbSuccess: "text-sm text-green-700",
  tmdbSeasons: "mt-2 flex flex-wrap gap-2",
  tmdbSeason: "rounded-lg border border-indigo-100 bg-[var(--bg-secondary)] px-3 py-2 text-xs",
  tmdbSeasonExists: "opacity-50",
  tmdbSeasonHeader: "flex items-center gap-2",
  tmdbSeasonName: "font-semibold",
  tmdbEpCount: "text-[10px] text-[var(--text-muted)]",
  tmdbSeasonActions: "mt-2 flex items-center gap-2",
  tmdbDismiss: "text-xs text-[var(--text-muted)] hover:text-red-500",
  badge: "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700",
  tmdbTrigger: "mb-6",
  tmdbCandidates: "mt-3 flex flex-wrap gap-2",
  seasons: "mb-6 flex flex-col gap-3",
  empty: "rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]",
  season: "rounded-xl border border-[var(--border)] bg-[var(--card-bg)]",
  seasonOpen: "border-indigo-200 shadow-[0_4px_16px_rgba(99,102,241,0.1)]",
  seasonHeader: "flex w-full items-center gap-3 px-4 py-3 text-left",
  seasonNum: "flex-1 text-base font-semibold",
  seasonEpCount: "text-sm text-[var(--text-muted)]",
  seasonActions: "flex gap-1",
  seasonEdit: "flex flex-1 items-center gap-2",
  seasonEditInput: "w-[90px]",
  episodes: "border-t border-[var(--border)] px-3 py-3",
  noEpisodes: "text-sm text-[var(--text-muted)]",
  episode: "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition hover:bg-[var(--card-hover)]",
  episodeEditing: "bg-indigo-50",
  epNum: "min-w-[28px] text-xs font-bold text-[var(--text-muted)]",
  epTitle: "flex-1",
  epDuration: "text-xs text-[var(--text-muted)]",
  epActions: "flex gap-1 opacity-0 transition group-hover:opacity-100",
  epEdit: "flex flex-1 flex-wrap items-center gap-2",
  epInput: "flex-1 min-w-[120px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-primary)]",
  epInputShort: "w-[64px]",
  addEpBtn: "w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)] hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50",
  addEpForm: "mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--bg-secondary)] p-2",
  addSeasonRow: "mt-2",
  addSeasonForm: "rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5",
  addSeasonFormHeader: "mb-4 flex items-center justify-between",
  newEpisodes: "my-4",
  newEpLabel: "mb-2 text-xs font-semibold text-[var(--text-muted)]",
  newEpRow: "mb-2 flex items-center gap-2",
  formLabel: "mb-3 flex flex-col gap-1 text-xs font-medium text-[var(--text-muted)]",
  formInput: "w-[120px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]",
  formError: "text-xs text-red-600",
  formActions: "mt-4 flex gap-3",
  btn: "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
  btnPrimary: "bg-indigo-500 text-white hover:bg-indigo-600",
  btnSecondary: "border border-[var(--border)] bg-[var(--button-bg)] text-[var(--text-primary)] hover:bg-[var(--button-hover-bg)]",
  btnGhost: "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--button-hover-bg)]",
  btnDanger: "bg-red-500 text-white hover:bg-red-600",
  btnXs: "px-2.5 py-1 text-xs",
  iconBtn: "rounded-md p-1 text-sm text-[var(--text-muted)] hover:bg-[var(--button-hover-bg)]",
  iconBtnDanger: "text-red-500 hover:bg-red-100",
  loading: "flex min-h-[40vh] flex-col items-center justify-center gap-4 text-[var(--text-muted)]",
  modalOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
  modal: "w-full max-w-[420px] rounded-2xl bg-[var(--card-bg)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)]",
  modalTitle: "mb-3 text-lg font-semibold",
  modalBody: "mb-4 text-sm text-[var(--text-secondary)]",
  modalNote: "text-xs text-[var(--text-muted)]",
  modalActions: "flex gap-3",
};

export default function SeasonManagerPage() {
  const { id } = useParams();        // mediaId (Guid)
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
  const [seasons, setSeasons] = useState([]);   // from DB (authoritative)
  const [error, setError] = useState(null);

  // Which season accordion is open
  const [openSeasonId, setOpenSeasonId] = useState(null);

  // TMDB import state
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);
  const [tmdbPreview, setTmdbPreview] = useState(null); // raw TMDB seasons before import
  const [tmdbImportResult, setTmdbImportResult] = useState(null);
  const [tmdbSyncingSeason, setTmdbSyncingSeason] = useState(null);
  const [activeTmdbId, setActiveTmdbId] = useState(null);
  const [tmdbLookupLoading, setTmdbLookupLoading] = useState(false);
  const [tmdbLookupError, setTmdbLookupError] = useState(null);
  const [tmdbCandidates, setTmdbCandidates] = useState([]);

  // Add season form
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [addSeasonForm, setAddSeasonForm] = useState(null);
  const [addSeasonSaving, setAddSeasonSaving] = useState(false);
  const [addSeasonError, setAddSeasonError] = useState(null);
  const [seasonEdit, setSeasonEdit] = useState(null);

  // Per-episode inline edit: { seasonNumber, episodeNumber } | null
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [editEpForm, setEditEpForm] = useState({});
  const [editEpSaving, setEditEpSaving] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'season'|'episode', seasonNumber, episodeNumber? }
  const [deleting, setDeleting] = useState(false);

  // ── Load media + seasons ────────────────────────────────────────────────────
  const loadSeasons = useCallback(async () => {
    try {
      await refetchSeasons();
    } catch {
      setError("Failed to load seasons.");
    }
  }, [refetchSeasons]);

  useEffect(() => {
    if (mediaData) {
      if (mediaData.type !== "TvSeries") {
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
      setError("Failed to load series.");
    }
  }, [mediaError, seasonsError]);

  useEffect(() => {
    if (media?.tmdbId && seasons.length === 0) {
      autoLoadTmdb(media.tmdbId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.tmdbId, seasons.length]);

  // ── TMDB auto/manual load ───────────────────────────────────────────────────
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
      setTmdbError("Could not fetch seasons from TMDB.");
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
      const results = await searchTmdb(media.title.trim(), "tv");
      setTmdbCandidates(results ?? []);
      if (!results || results.length === 0) {
        setTmdbLookupError("No TMDB matches found for this title.");
      }
    } catch {
      setTmdbLookupError("Could not search TMDB by title.");
      setTmdbCandidates([]);
    } finally {
      setTmdbLookupLoading(false);
    }
  }

  async function syncSingleTmdbSeason(tmdbSeason, existingSeasons = seasons) {
    const mappedEpisodes = (tmdbSeason.episodes ?? []).map((e) => ({
      episodeNumber: e.episodeNumber,
      title: e.title,
      duration: e.duration ?? null,
    }));
    const existingSeason = existingSeasons.find((dbS) => dbS.seasonNumber === tmdbSeason.seasonNumber);

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

  // ── Import all TMDB preview seasons into DB ─────────────────────────────────
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

      for (const s of tmdbPreview) {
        const result = await syncSingleTmdbSeason(s, workingSeasons);
        createdSeasons += result.createdSeasons;
        updatedSeasons += result.updatedSeasons;
        addedEpisodes += result.addedEpisodes;
        if (!workingSeasons.some((season) => season.seasonNumber === s.seasonNumber)) {
          workingSeasons.push({ seasonNumber: s.seasonNumber, episodes: s.episodes ?? [] });
        }
      }

      await loadSeasons();
      setTmdbImportResult({ createdSeasons, updatedSeasons, addedEpisodes });
      setTmdbPreview(null);
    } catch {
      setTmdbError("Import failed. Some seasons may not have been saved.");
    } finally {
      setTmdbLoading(false);
    }
  }

  // ── Dismiss a single season from TMDB preview ───────────────────────────────
  function dismissTmdbSeason(seasonNumber) {
    setTmdbPreview((prev) => prev.filter((s) => s.seasonNumber !== seasonNumber));
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

  // ── Add season (manual) ─────────────────────────────────────────────────────
  function openAddSeason() {
    const nextNum = seasons.length > 0
      ? Math.max(...seasons.map((s) => s.seasonNumber)) + 1
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
      setAddSeasonError("Season number must be a positive integer.");
      return;
    }

    if (seasons.some((s) => s.seasonNumber === seasonNumber)) {
      setAddSeasonError(`Season ${seasonNumber} already exists.`);
      return;
    }

    const episodesPayload = addSeasonForm.episodes.map((e, index) => ({
      episodeNumber: Number(e.episodeNumber) || index + 1,
      title: e.title.trim() ? e.title.trim() : null,
      duration: e.duration ? Number(e.duration) : null,
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
      setAddSeasonError(err?.response?.data || "Failed to save season.");
    } finally {
      setAddSeasonSaving(false);
    }
  }

  // ── Inline episode edit ─────────────────────────────────────────────────────
  function startEditEpisode(season, episode) {
    setEditingEpisode({ seasonNumber: season.seasonNumber, episodeNumber: episode.episodeNumber });
    setEditEpForm({ title: episode.title, duration: episode.duration ?? "" });
  }

  async function saveEditEpisode(season, episode) {
    setEditEpSaving(true);
    try {
      await updateEpisode(id, season.seasonNumber, episode.episodeNumber, {
        title: editEpForm.title || null,
        duration: editEpForm.duration ? Number(editEpForm.duration) : null,
      });
      await loadSeasons();
      setEditingEpisode(null);
    } catch {
      // keep editing open, user can retry
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
      setSeasonEdit((prev) => ({ ...prev, error: "Season number must be a positive integer." }));
      return;
    }

    const duplicateExists = seasons.some(
      (s) => s.id !== season.id && s.seasonNumber === parsedSeasonNumber
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
        error: err?.response?.data || "Failed to update season number.",
      }));
    }
  }

  // ── Delete (season or episode) ──────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "season") {
        await deleteSeason(id, confirmDelete.seasonNumber);
      } else {
        await deleteEpisode(id, confirmDelete.seasonNumber, confirmDelete.episodeNumber);
      }
      await loadSeasons();
    } catch {
      // silent — could show a toast here
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const loading = mediaLoading || seasonsLoading;

  if (loading) {
    return (
      <PageLayout>
        <Container>
          <div className={styles.loading}>
            <Spinner />
            <span>Loading series…</span>
          </div>
        </Container>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Container>
          <div className={styles.loading}>
            <p>{error}</p>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => navigate(-1)}>
              ← Go back
            </button>
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.back} onClick={() => navigate(`/media/${id}`)}>
            ← Back to series
          </button>
          <div className={styles.titleRow}>
            {media?.coverUrl && (
              <img src={media.coverUrl} alt={media.title} className={styles.cover} />
            )}
            <div>
              <h1 className={styles.title}>{media?.title}</h1>
              <p className={styles.meta}>
                {seasons.length} season{seasons.length !== 1 ? "s" : ""} ·{" "}
                {seasons.reduce((a, s) => a + s.episodes.length, 0)} episodes in database
              </p>
            </div>
          </div>
        </div>

        {/* TMDB banner */}
        {(tmdbPreview || tmdbLoading || tmdbError) && (
          <div className={styles.tmdbBanner}>
            <div className={styles.tmdbBannerHeader}>
              <span className={styles.tmdbLabel}>🎬 TMDB Import</span>
              {media?.tmdbId && (
                <button
                  className={styles.tmdbReload}
                  onClick={handleReloadTmdb}
                  disabled={tmdbLoading}
                >
                  {tmdbLoading ? <Spinner /> : "↺ Reload from TMDB"}
                </button>
              )}
            </div>

            {tmdbError && <p className={styles.tmdbError}>{tmdbError}</p>}
            {tmdbImportResult && (
              <p className={styles.tmdbSuccess}>
                Synced {tmdbImportResult.createdSeasons} new season{tmdbImportResult.createdSeasons !== 1 ? "s" : ""},{" "}
                updated {tmdbImportResult.updatedSeasons} existing season{tmdbImportResult.updatedSeasons !== 1 ? "s" : ""},{" "}
                and added {tmdbImportResult.addedEpisodes} new episode{tmdbImportResult.addedEpisodes !== 1 ? "s" : ""}.
              </p>
            )}

            {tmdbPreview && tmdbPreview.length > 0 && (
              <>
                <p className={styles.tmdbSub}>
                  {tmdbPreview.length} season{tmdbPreview.length !== 1 ? "s" : ""} found.
                  Remove any you don't want, then import.
                </p>
                <div className={styles.tmdbSeasons}>
                  {tmdbPreview.map((s) => {
                    const alreadyInDb = seasons.some((db) => db.seasonNumber === s.seasonNumber);
                    const isSyncing = tmdbSyncingSeason === s.seasonNumber;
                    return (
                      <div key={s.seasonNumber} className={clsx(styles.tmdbSeason, alreadyInDb && styles.tmdbSeasonExists)}>
                        <div className={styles.tmdbSeasonHeader}>
                          <span className={styles.tmdbSeasonName}>
                            Season {s.seasonNumber}
                            {alreadyInDb && <span className={styles.badge}>already saved</span>}
                          </span>
                          <span className={styles.tmdbEpCount}>{s.episodes?.length ?? 0} eps</span>
                        </div>
                        <div className={styles.tmdbSeasonActions}>
                          <button
                            className={`${styles.btn} ${styles.btnXs} ${styles.btnSecondary}`}
                            onClick={() => handleSyncTmdbSeason(s)}
                            disabled={isSyncing || tmdbLoading}
                          >
                            {isSyncing ? <><Spinner /> Syncing…</> : alreadyInDb ? "Update from TMDB" : "Import from TMDB"}
                          </button>
                          <button
                            className={styles.tmdbDismiss}
                            onClick={() => dismissTmdbSeason(s.seasonNumber)}
                            title="Remove from list"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleImportTmdb}
                  disabled={tmdbLoading}
                >
                  {tmdbLoading ? <><Spinner /> Importing…</> : `Import ${tmdbPreview.filter(s => !seasons.some(db => db.seasonNumber === s.seasonNumber)).length} seasons`}
                </button>
              </>
            )}

            {tmdbPreview && tmdbPreview.length === 0 && (
              <p className={styles.tmdbSub}>No seasons returned from TMDB.</p>
            )}
          </div>
        )}

        {/* TMDB reload button when no preview shown */}
        {!tmdbPreview && !tmdbLoading && (media?.tmdbId || activeTmdbId) && (
          <div className={styles.tmdbTrigger}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReloadTmdb}>
              🎬 Load seasons from TMDB
            </button>
          </div>
        )}

        {!tmdbPreview && !tmdbLoading && !media?.tmdbId && !activeTmdbId && (
          <div className={styles.tmdbTrigger}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={handleLookupTmdbByTitle}
              disabled={tmdbLookupLoading}
            >
              {tmdbLookupLoading ? <><Spinner /> Searching TMDB…</> : "🎬 Find on TMDB by title"}
            </button>
            {tmdbLookupError && <p className={styles.tmdbError}>{tmdbLookupError}</p>}
            {tmdbCandidates.length > 0 && (
              <div className={styles.tmdbCandidates}>
                {tmdbCandidates.map((candidate) => (
                  <button
                    key={candidate.tmdbId}
                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnXs}`}
                    onClick={() => autoLoadTmdb(candidate.tmdbId)}
                  >
                    {candidate.title}
                    {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Seasons accordion */}
        <div className={styles.seasons}>
          {seasons.length === 0 && !tmdbPreview && (
            <div className={styles.empty}>
              No seasons yet. Import from TMDB or add one manually.
            </div>
          )}

          {seasons.map((season) => {
            const isOpen = openSeasonId === season.id;
            const isEditingSeason = seasonEdit?.seasonId === season.id;
            return (
              <div key={season.id} className={clsx(styles.season, isOpen && styles.seasonOpen)}>
                {/* Season header */}
                <button
                  className={styles.seasonHeader}
                  onClick={() => setOpenSeasonId(isOpen ? null : season.id)}
                >
                  {isEditingSeason ? (
                    <div className={styles.seasonEdit} onClick={(e) => e.stopPropagation()}>
                      <input
                        className={`${styles.formInput} ${styles.seasonEditInput}`}
                        type="number"
                        min="1"
                        value={seasonEdit.newSeasonNumber}
                        onChange={(e) =>
                          setSeasonEdit((prev) => ({ ...prev, newSeasonNumber: e.target.value }))
                        }
                      />
                      <button
                        className={`${styles.btn} ${styles.btnXs} ${styles.btnPrimary}`}
                        onClick={() => saveSeasonNumberEdit(season)}
                        disabled={seasonEdit.saving}
                      >
                        {seasonEdit.saving ? <Spinner /> : "Save"}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnXs} ${styles.btnGhost}`}
                        onClick={() => setSeasonEdit(null)}
                        disabled={seasonEdit.saving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className={styles.seasonNum}>Season {season.seasonNumber}</span>
                  )}
                  <span className={styles.seasonEpCount}>
                    {season.episodes.length} episode{season.episodes.length !== 1 ? "s" : ""}
                  </span>
                  <div className={styles.seasonActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={styles.iconBtn}
                      title="Edit season number"
                      onClick={() => startSeasonNumberEdit(season)}
                    >
                      ✏️
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title="Delete season"
                      onClick={() => setConfirmDelete({ type: "season", seasonNumber: season.seasonNumber })}
                    >
                      🗑
                    </button>
                  </div>
                  <ChevronDown open={isOpen} />
                </button>

                {/* Episodes */}
                {isOpen && (
                  <div className={styles.episodes}>
                    {isEditingSeason && seasonEdit?.error && (
                      <p className={styles.formError}>{seasonEdit.error}</p>
                    )}
                    {season.episodes.length === 0 && (
                      <p className={styles.noEpisodes}>No episodes in this season.</p>
                    )}

                    {season.episodes.map((ep) => {
                      const isEditing =
                        editingEpisode?.seasonNumber === season.seasonNumber &&
                        editingEpisode?.episodeNumber === ep.episodeNumber;

                      return (
                        <div key={ep.id} className={clsx("group", styles.episode, isEditing && styles.episodeEditing)}>
                          <span className={styles.epNum}>E{ep.episodeNumber}</span>

                          {isEditing ? (
                            <div className={styles.epEdit}>
                              <input
                                className={styles.epInput}
                                value={editEpForm.title}
                                onChange={(e) => setEditEpForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="Title"
                              />
                              <input
                                className={`${styles.epInput} ${styles.epInputShort}`}
                                type="number"
                                value={editEpForm.duration}
                                onChange={(e) => setEditEpForm((p) => ({ ...p, duration: e.target.value }))}
                                placeholder="min"
                              />
                              <button
                                className={`${styles.btn} ${styles.btnXs} ${styles.btnPrimary}`}
                                onClick={() => saveEditEpisode(season, ep)}
                                disabled={editEpSaving}
                              >
                                {editEpSaving ? <Spinner /> : "Save"}
                              </button>
                              <button
                                className={`${styles.btn} ${styles.btnXs} ${styles.btnGhost}`}
                                onClick={() => setEditingEpisode(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.epTitle}>{ep.title}</span>
                              {ep.duration && (
                                <span className={styles.epDuration}>{ep.duration}m</span>
                              )}
                              <div className={styles.epActions}>
                                <button
                                  className={styles.iconBtn}
                                  title="Edit episode"
                                  onClick={() => startEditEpisode(season, ep)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                  title="Delete episode"
                                  onClick={() =>
                                    setConfirmDelete({
                                      type: "episode",
                                      seasonNumber: season.seasonNumber,
                                      episodeNumber: ep.episodeNumber,
                                    })
                                  }
                                >
                                  🗑
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add episode inline */}
                    <AddEpisodeInline
                      nextEpisodeNumber={
                        season.episodes.length > 0
                          ? Math.max(...season.episodes.map((ep) => ep.episodeNumber)) + 1
                          : 1
                      }
                      onAdd={async (dto) => {
                        await addEpisode(id, season.seasonNumber, dto);
                        await loadSeasons();
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add season button */}
        <div className={styles.addSeasonRow}>
          {!showAddSeason ? (
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={openAddSeason}>
              + Add Season Manually
            </button>
          ) : (
            <div className={styles.addSeasonForm}>
              <div className={styles.addSeasonFormHeader}>
                <h3>New Season</h3>
                <button className={styles.iconBtn} onClick={() => setShowAddSeason(false)}>✕</button>
              </div>

              <label className={styles.formLabel}>
                Season Number
                <input
                  className={styles.formInput}
                  type="number"
                  min="1"
                  value={addSeasonForm?.seasonNumber ?? ""}
                  onChange={(e) =>
                    setAddSeasonForm((p) => ({ ...p, seasonNumber: e.target.value }))
                  }
                />
              </label>

              <div className={styles.newEpisodes}>
                <p className={styles.newEpLabel}>Episodes</p>
                {addSeasonForm?.episodes.map((ep, idx) => (
                  <div key={idx} className={styles.newEpRow}>
                    <span className={styles.epNum}>E{ep.episodeNumber}</span>
                    <input
                      className={styles.epInput}
                      placeholder="Title"
                      value={ep.title}
                      onChange={(e) => updateAddSeasonEpisode(idx, "title", e.target.value)}
                    />
                    <input
                      className={`${styles.epInput} ${styles.epInputShort}`}
                      type="number"
                      placeholder="min"
                      value={ep.duration}
                      onChange={(e) => updateAddSeasonEpisode(idx, "duration", e.target.value)}
                    />
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => removeEpisodeFromForm(idx)}
                      disabled={addSeasonForm.episodes.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={addEpisodeToForm}>
                  + Add episode
                </button>
              </div>

              {addSeasonError && <p className={styles.formError}>{addSeasonError}</p>}

              <div className={styles.formActions}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleSaveNewSeason}
                  disabled={addSeasonSaving}
                >
                  {addSeasonSaving ? <><Spinner /> Saving…</> : "Save Season"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setShowAddSeason(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete confirmation modal */}
        {confirmDelete && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3 className={styles.modalTitle}>Confirm Delete</h3>
              <p className={styles.modalBody}>
                {confirmDelete.type === "season"
                  ? `Delete Season ${confirmDelete.seasonNumber} and all its episodes?`
                  : `Delete Episode ${confirmDelete.episodeNumber} from Season ${confirmDelete.seasonNumber}?`}
                <br />
                <span className={styles.modalNote}>This is a soft delete — data is kept in the database.</span>
              </p>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? <Spinner /> : "Delete"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </Container>
    </PageLayout>
  );
}

// ── Add episode inline sub-component ─────────────────────────────────────────
function AddEpisodeInline({ nextEpisodeNumber, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", duration: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        episodeNumber: nextEpisodeNumber,
        title: form.title.trim(),
        duration: form.duration ? Number(form.duration) : null,
      });
      setForm({ title: "", duration: "" });
      setOpen(false);
    } catch {
      setError("Failed to add episode.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className={styles.addEpBtn} onClick={() => setOpen(true)}>
        + Add episode
      </button>
    );
  }

  return (
    <div className={styles.addEpForm}>
      <span className={styles.epNum}>E{nextEpisodeNumber}</span>
      <input
        className={styles.epInput}
        placeholder="Episode title"
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        autoFocus
      />
      <input
        className={`${styles.epInput} ${styles.epInputShort}`}
        type="number"
        placeholder="min"
        value={form.duration}
        onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
      />
      {error && <span className={styles.formError}>{error}</span>}
      <button className={`${styles.btn} ${styles.btnXs} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
        {saving ? <Spinner /> : "Add"}
      </button>
      <button className={`${styles.btn} ${styles.btnXs} ${styles.btnGhost}`} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
