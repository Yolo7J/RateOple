import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMediaById, getTmdbSeriesDetails } from "../../services/mediaService";
import {
  getSeasons,
  addSeason,
  updateSeason,
  deleteSeason,
  addEpisode,
  updateEpisode,
  deleteEpisode,
} from "../../services/tvSeriesService";

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

export default function SeasonManagerPage() {
  const { id } = useParams();        // mediaId (Guid)
  const navigate = useNavigate();

  const [media, setMedia] = useState(null);
  const [seasons, setSeasons] = useState([]);   // from DB (authoritative)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which season accordion is open
  const [openSeasonId, setOpenSeasonId] = useState(null);

  // TMDB import state
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState(null);
  const [tmdbPreview, setTmdbPreview] = useState(null); // raw TMDB seasons before import

  // Add season form
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [addSeasonForm, setAddSeasonForm] = useState(null);
  const [addSeasonSaving, setAddSeasonSaving] = useState(false);
  const [addSeasonError, setAddSeasonError] = useState(null);

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
      const data = await getSeasons(id);
      setSeasons(data);
    } catch {
      setError("Failed to load seasons.");
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      try {
        const [m, s] = await Promise.all([getMediaById(id), getSeasons(id)]);
        if (m.type !== "TvSeries") {
          navigate(`/media/${id}`);
          return;
        }
        setMedia(m);
        setSeasons(s);

        // Auto-load TMDB seasons if series has a tmdbId and no seasons yet
        if (m.tmdbId && s.length === 0) {
          autoLoadTmdb(m.tmdbId);
        }
      } catch {
        setError("Failed to load series.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  // ── TMDB auto/manual load ───────────────────────────────────────────────────
  async function autoLoadTmdb(tmdbId) {
    setTmdbLoading(true);
    setTmdbError(null);
    try {
      const details = await getTmdbSeriesDetails(tmdbId);
      setTmdbPreview(details.seasons ?? []);
    } catch {
      setTmdbError("Could not fetch seasons from TMDB.");
    } finally {
      setTmdbLoading(false);
    }
  }

  async function handleReloadTmdb() {
    if (!media?.tmdbId) return;
    autoLoadTmdb(media.tmdbId);
  }

  // ── Import all TMDB preview seasons into DB ─────────────────────────────────
  async function handleImportTmdb() {
    if (!tmdbPreview) return;
    setTmdbLoading(true);
    setTmdbError(null);
    try {
      for (const s of tmdbPreview) {
        // Skip seasons already in DB
        const exists = seasons.some((dbS) => dbS.seasonNumber === s.seasonNumber);
        if (exists) continue;

        await addSeason(id, {
          seasonNumber: s.seasonNumber,
          episodes: (s.episodes ?? []).map((e) => ({
            episodeNumber: e.episodeNumber,
            title: e.title,
            duration: e.duration ?? null,
          })),
        });
      }
      await loadSeasons();
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
    setAddSeasonForm((prev) => ({
      ...prev,
      episodes: [...prev.episodes, emptyEpisode(prev.episodes.length + 1)],
    }));
  }

  function removeEpisodeFromForm(idx) {
    setAddSeasonForm((prev) => ({
      ...prev,
      episodes: prev.episodes.filter((_, i) => i !== idx),
    }));
  }

  async function handleSaveNewSeason() {
    if (!addSeasonForm) return;
    setAddSeasonSaving(true);
    setAddSeasonError(null);
    try {
      await addSeason(id, {
        seasonNumber: Number(addSeasonForm.seasonNumber),
        episodes: addSeasonForm.episodes
          .filter((e) => e.title.trim())
          .map((e) => ({
            episodeNumber: Number(e.episodeNumber),
            title: e.title.trim(),
            duration: e.duration ? Number(e.duration) : null,
          })),
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
  if (loading) {
    return (
      <div className="season-manager-loading">
        <Spinner />
        <span>Loading series…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="season-manager-error">
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>← Go back</button>
      </div>
    );
  }

  return (
    <>
      <div className="sm-page">
        {/* Header */}
        <div className="sm-header">
          <button className="sm-back" onClick={() => navigate(`/media/${id}`)}>
            ← Back to series
          </button>
          <div className="sm-title-row">
            {media?.coverUrl && (
              <img src={media.coverUrl} alt={media.title} className="sm-cover" />
            )}
            <div>
              <h1 className="sm-title">{media?.title}</h1>
              <p className="sm-meta">
                {seasons.length} season{seasons.length !== 1 ? "s" : ""} ·{" "}
                {seasons.reduce((a, s) => a + s.episodes.length, 0)} episodes in database
              </p>
            </div>
          </div>
        </div>

        {/* TMDB banner */}
        {(tmdbPreview || tmdbLoading || tmdbError) && (
          <div className="sm-tmdb-banner">
            <div className="sm-tmdb-banner-header">
              <span className="sm-tmdb-label">🎬 TMDB Import</span>
              {media?.tmdbId && (
                <button
                  className="sm-tmdb-reload"
                  onClick={handleReloadTmdb}
                  disabled={tmdbLoading}
                >
                  {tmdbLoading ? <Spinner /> : "↺ Reload from TMDB"}
                </button>
              )}
            </div>

            {tmdbError && <p className="sm-tmdb-error">{tmdbError}</p>}

            {tmdbPreview && tmdbPreview.length > 0 && (
              <>
                <p className="sm-tmdb-sub">
                  {tmdbPreview.length} season{tmdbPreview.length !== 1 ? "s" : ""} found.
                  Remove any you don't want, then import.
                </p>
                <div className="sm-tmdb-seasons">
                  {tmdbPreview.map((s) => {
                    const alreadyInDb = seasons.some((db) => db.seasonNumber === s.seasonNumber);
                    return (
                      <div key={s.seasonNumber} className={`sm-tmdb-season ${alreadyInDb ? "sm-tmdb-season--exists" : ""}`}>
                        <div className="sm-tmdb-season-header">
                          <span className="sm-tmdb-season-name">
                            Season {s.seasonNumber}
                            {alreadyInDb && <span className="sm-badge sm-badge--exists">already saved</span>}
                          </span>
                          <span className="sm-tmdb-ep-count">{s.episodes?.length ?? 0} eps</span>
                          {!alreadyInDb && (
                            <button
                              className="sm-tmdb-dismiss"
                              onClick={() => dismissTmdbSeason(s.seasonNumber)}
                              title="Remove from import"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="sm-btn sm-btn--primary"
                  onClick={handleImportTmdb}
                  disabled={tmdbLoading}
                >
                  {tmdbLoading ? <><Spinner /> Importing…</> : `Import ${tmdbPreview.filter(s => !seasons.some(db => db.seasonNumber === s.seasonNumber)).length} seasons`}
                </button>
              </>
            )}

            {tmdbPreview && tmdbPreview.length === 0 && (
              <p className="sm-tmdb-sub">No seasons returned from TMDB.</p>
            )}
          </div>
        )}

        {/* TMDB reload button when no preview shown */}
        {!tmdbPreview && !tmdbLoading && media?.tmdbId && (
          <div className="sm-tmdb-trigger">
            <button className="sm-btn sm-btn--ghost" onClick={handleReloadTmdb}>
              🎬 Load seasons from TMDB
            </button>
          </div>
        )}

        {/* Seasons accordion */}
        <div className="sm-seasons">
          {seasons.length === 0 && !tmdbPreview && (
            <div className="sm-empty">
              No seasons yet. Import from TMDB or add one manually.
            </div>
          )}

          {seasons.map((season) => {
            const isOpen = openSeasonId === season.id;
            return (
              <div key={season.id} className={`sm-season ${isOpen ? "sm-season--open" : ""}`}>
                {/* Season header */}
                <button
                  className="sm-season-header"
                  onClick={() => setOpenSeasonId(isOpen ? null : season.id)}
                >
                  <span className="sm-season-num">Season {season.seasonNumber}</span>
                  <span className="sm-season-ep-count">
                    {season.episodes.length} episode{season.episodes.length !== 1 ? "s" : ""}
                  </span>
                  <div className="sm-season-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="sm-icon-btn sm-icon-btn--danger"
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
                  <div className="sm-episodes">
                    {season.episodes.length === 0 && (
                      <p className="sm-no-episodes">No episodes in this season.</p>
                    )}

                    {season.episodes.map((ep) => {
                      const isEditing =
                        editingEpisode?.seasonNumber === season.seasonNumber &&
                        editingEpisode?.episodeNumber === ep.episodeNumber;

                      return (
                        <div key={ep.id} className={`sm-episode ${isEditing ? "sm-episode--editing" : ""}`}>
                          <span className="sm-ep-num">E{ep.episodeNumber}</span>

                          {isEditing ? (
                            <div className="sm-ep-edit">
                              <input
                                className="sm-ep-input"
                                value={editEpForm.title}
                                onChange={(e) => setEditEpForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="Title"
                              />
                              <input
                                className="sm-ep-input sm-ep-input--short"
                                type="number"
                                value={editEpForm.duration}
                                onChange={(e) => setEditEpForm((p) => ({ ...p, duration: e.target.value }))}
                                placeholder="min"
                              />
                              <button
                                className="sm-btn sm-btn--xs sm-btn--primary"
                                onClick={() => saveEditEpisode(season, ep)}
                                disabled={editEpSaving}
                              >
                                {editEpSaving ? <Spinner /> : "Save"}
                              </button>
                              <button
                                className="sm-btn sm-btn--xs sm-btn--ghost"
                                onClick={() => setEditingEpisode(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="sm-ep-title">{ep.title}</span>
                              {ep.duration && (
                                <span className="sm-ep-duration">{ep.duration}m</span>
                              )}
                              <div className="sm-ep-actions">
                                <button
                                  className="sm-icon-btn"
                                  title="Edit episode"
                                  onClick={() => startEditEpisode(season, ep)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="sm-icon-btn sm-icon-btn--danger"
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
                      seasonNumber={season.seasonNumber}
                      existingCount={season.episodes.length}
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
        <div className="sm-add-season-row">
          {!showAddSeason ? (
            <button className="sm-btn sm-btn--secondary" onClick={openAddSeason}>
              + Add Season Manually
            </button>
          ) : (
            <div className="sm-add-season-form">
              <div className="sm-add-season-form-header">
                <h3>New Season</h3>
                <button className="sm-icon-btn" onClick={() => setShowAddSeason(false)}>✕</button>
              </div>

              <label className="sm-form-label">
                Season Number
                <input
                  className="sm-form-input"
                  type="number"
                  min="1"
                  value={addSeasonForm?.seasonNumber ?? ""}
                  onChange={(e) =>
                    setAddSeasonForm((p) => ({ ...p, seasonNumber: e.target.value }))
                  }
                />
              </label>

              <div className="sm-new-episodes">
                <p className="sm-new-ep-label">Episodes</p>
                {addSeasonForm?.episodes.map((ep, idx) => (
                  <div key={idx} className="sm-new-ep-row">
                    <span className="sm-ep-num">E{ep.episodeNumber}</span>
                    <input
                      className="sm-ep-input"
                      placeholder="Title"
                      value={ep.title}
                      onChange={(e) => updateAddSeasonEpisode(idx, "title", e.target.value)}
                    />
                    <input
                      className="sm-ep-input sm-ep-input--short"
                      type="number"
                      placeholder="min"
                      value={ep.duration}
                      onChange={(e) => updateAddSeasonEpisode(idx, "duration", e.target.value)}
                    />
                    <button
                      className="sm-icon-btn sm-icon-btn--danger"
                      onClick={() => removeEpisodeFromForm(idx)}
                      disabled={addSeasonForm.episodes.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className="sm-btn sm-btn--ghost sm-btn--xs" onClick={addEpisodeToForm}>
                  + Add episode
                </button>
              </div>

              {addSeasonError && <p className="sm-form-error">{addSeasonError}</p>}

              <div className="sm-form-actions">
                <button
                  className="sm-btn sm-btn--primary"
                  onClick={handleSaveNewSeason}
                  disabled={addSeasonSaving}
                >
                  {addSeasonSaving ? <><Spinner /> Saving…</> : "Save Season"}
                </button>
                <button
                  className="sm-btn sm-btn--ghost"
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
          <div className="sm-modal-overlay">
            <div className="sm-modal">
              <h3 className="sm-modal-title">Confirm Delete</h3>
              <p className="sm-modal-body">
                {confirmDelete.type === "season"
                  ? `Delete Season ${confirmDelete.seasonNumber} and all its episodes?`
                  : `Delete Episode ${confirmDelete.episodeNumber} from Season ${confirmDelete.seasonNumber}?`}
                <br />
                <span className="sm-modal-note">This is a soft delete — data is kept in the database.</span>
              </p>
              <div className="sm-modal-actions">
                <button
                  className="sm-btn sm-btn--danger"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? <Spinner /> : "Delete"}
                </button>
                <button
                  className="sm-btn sm-btn--ghost"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Add episode inline sub-component ─────────────────────────────────────────
function AddEpisodeInline({ seasonNumber, existingCount, onAdd }) {
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
        episodeNumber: existingCount + 1,
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
      <button className="sm-add-ep-btn" onClick={() => setOpen(true)}>
        + Add episode
      </button>
    );
  }

  return (
    <div className="sm-add-ep-form">
      <span className="sm-ep-num">E{existingCount + 1}</span>
      <input
        className="sm-ep-input"
        placeholder="Episode title"
        value={form.title}
        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
        autoFocus
      />
      <input
        className="sm-ep-input sm-ep-input--short"
        type="number"
        placeholder="min"
        value={form.duration}
        onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
      />
      {error && <span className="sm-form-error">{error}</span>}
      <button className="sm-btn sm-btn--xs sm-btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? <Spinner /> : "Add"}
      </button>
      <button className="sm-btn sm-btn--xs sm-btn--ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}