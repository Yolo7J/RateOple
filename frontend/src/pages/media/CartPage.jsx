import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaCart } from "../../context/MediaCartContext";
import { bulkCreateMedia } from "../../services/mediaService";

// ── Status badge colours ──────────────────────────────────────────────────────
const TYPE_COLOURS = {
  Movie: "bg-blue-100 text-blue-800",
  Book: "bg-green-100 text-green-800",
  TvSeries: "bg-purple-100 text-purple-800",
};

// ── Per-item submission status ────────────────────────────────────────────────
const STATUS = { idle: "idle", ok: "ok", error: "error" };

export default function CartPage() {
  const { items, removeItem, editItem, clearCart } = useMediaCart();
  const navigate = useNavigate();

  // Map from cart item id → STATUS
  const [statuses, setStatuses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null); // { id, type, data }

  async function handleConfirmAll() {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      const result = await bulkCreateMedia(items);

      // Mark each item as ok or error based on backend response
      const nextStatuses = {};

      // Successful items: match by title+type (best we can without per-item IDs)
      const createdTitles = new Set(result.created.map((c) => c.title?.toLowerCase()));
      const errorTitles = new Set(result.errors.map((e) => e.title?.toLowerCase()));

      for (const item of items) {
        const key = item.data.title?.toLowerCase();
        if (createdTitles.has(key)) nextStatuses[item.id] = STATUS.ok;
        else if (errorTitles.has(key)) nextStatuses[item.id] = STATUS.error;
        else nextStatuses[item.id] = STATUS.ok; // assume ok if not in errors
      }

      setStatuses(nextStatuses);
      setSubmitted(true);

      // Auto-clear successful items after a short delay
      const failedIds = Object.entries(nextStatuses)
        .filter(([, v]) => v === STATUS.error)
        .map(([k]) => k);

      if (failedIds.length === 0) {
        clearCart();
        setTimeout(() => navigate("/admin"), 1500);
      } else {
        // Keep only failed items in the cart
        for (const item of items) {
          if (!failedIds.includes(item.id)) removeItem(item.id);
        }
      }
    } catch (err) {
      // Network / server error — mark all as failed
      const nextStatuses = {};
      for (const item of items) nextStatuses[item.id] = STATUS.error;
      setStatuses(nextStatuses);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit modal save ───────────────────────────────────────────────────────
  function handleEditSave(updatedData) {
    editItem(editTarget.id, updatedData);
    setEditTarget(null);
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p className="text-xl">Your cart is empty.</p>
        <button
          onClick={() => navigate("/admin")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          ← Back to Add Media
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Media Cart
          <span className="ml-2 text-sm font-normal text-gray-500">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </h1>
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-indigo-600 hover:underline"
        >
          + Add more
        </button>
      </div>

      {/* Item list */}
      <div className="space-y-3 mb-8">
        {items.map((item) => {
          const status = statuses[item.id];
          return (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition
                ${status === STATUS.ok
                  ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                  : status === STATUS.error
                  ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
                }`}
            >
              {/* Cover thumbnail */}
              <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-700">
                {item.data.coverUrl ? (
                  <img
                    src={item.data.coverUrl}
                    alt={item.data.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      TYPE_COLOURS[item.type] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.type === "TvSeries" ? "TV Series" : item.type}
                  </span>
                  {item.data.releaseYear && (
                    <span className="text-xs text-gray-400">{item.data.releaseYear}</span>
                  )}
                </div>
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {item.data.title}
                </p>
                {item.type === "Movie" && item.data.director && (
                  <p className="text-xs text-gray-500">Dir. {item.data.director}</p>
                )}
                {item.type === "Book" && item.data.author && (
                  <p className="text-xs text-gray-500">{item.data.author}</p>
                )}
                {item.type === "TvSeries" && item.data.seasons?.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {item.data.seasons.length} season{item.data.seasons.length !== 1 ? "s" : ""}
                    {" · "}
                    {item.data.seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)} episodes
                  </p>
                )}
              </div>

              {/* Status indicator */}
              {status === STATUS.ok && (
                <span className="text-green-600 font-bold text-lg" title="Saved">✓</span>
              )}
              {status === STATUS.error && (
                <span className="text-red-500 font-bold text-lg" title="Failed">✕</span>
              )}

              {/* Actions (only when not yet submitted) */}
              {!submitted && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditTarget(item)}
                    className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50
                               dark:border-gray-600 dark:hover:bg-gray-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-sm px-3 py-1 rounded-lg border border-red-200 text-red-600
                               hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm All button */}
      {!submitted && (
        <div className="flex justify-end">
          <button
            onClick={handleConfirmAll}
            disabled={submitting || items.length === 0}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl
                       hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Saving…" : `Confirm All (${items.length})`}
          </button>
        </div>
      )}

      {/* Post-submit summary */}
      {submitted && (
        <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-white mb-1">
            {Object.values(statuses).filter((s) => s === STATUS.ok).length} saved
            {Object.values(statuses).filter((s) => s === STATUS.error).length > 0 &&
              ` · ${Object.values(statuses).filter((s) => s === STATUS.error).length} failed`}
          </p>
          {Object.values(statuses).some((s) => s === STATUS.error) && (
            <p className="text-sm text-gray-500">
              Failed items remain in the cart — fix them and try again.
            </p>
          )}
        </div>
      )}

      {/* ── Inline edit modal ── */}
      {editTarget && (
        <EditModal
          item={editTarget}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

// ── Simple edit modal — shows all fields for the given type ──────────────────

function EditModal({ item, onSave, onClose }) {
  const [data, setData] = useState({ ...item.data });

  function set(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          Edit — {item.type === "TvSeries" ? "TV Series" : item.type}
        </h2>

        <div className="space-y-3">
          <Field label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <Field label="Description" value={data.description} onChange={(v) => set("description", v)} textarea />
          <Field label="Cover URL" value={data.coverUrl} onChange={(v) => set("coverUrl", v)} />
          <Field label="Release Year" value={data.releaseYear} onChange={(v) => set("releaseYear", v ? Number(v) : null)} type="number" />

          {item.type === "Movie" && (
            <>
              <Field label="Director" value={data.director} onChange={(v) => set("director", v)} />
              <Field label="Duration (min)" value={data.duration} onChange={(v) => set("duration", v ? Number(v) : null)} type="number" />
            </>
          )}

          {item.type === "Book" && (
            <>
              <Field label="Author" value={data.author} onChange={(v) => set("author", v)} />
              <Field label="Pages" value={data.pages} onChange={(v) => set("pages", v ? Number(v) : null)} type="number" />
              <Field label="ISBN" value={data.isbn} onChange={(v) => set("isbn", v)} />
            </>
          )}

          {item.type === "TvSeries" && data.seasons?.length > 0 && (
            <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              {data.seasons.length} seasons · {data.seasons.reduce((a, s) => a + (s.episodes?.length ?? 0), 0)} episodes imported from TMDB.
              Season/episode editing is not available here — remove and re-import if needed.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(data)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }) {
  const base = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{label}</span>
      {textarea ? (
        <textarea
          className={base + " resize-none h-20"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      ) : (
        <input
          className={base}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}
    </label>
  );
}
