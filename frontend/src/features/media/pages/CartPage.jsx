import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMediaCart } from "../../../context/MediaCartContext";
import { useMediaCommands } from "../queries/useMediaCommands";
import "./CartPage.css";

const TYPE_COLOURS = {
  Movie: "cart-type cart-type--movie",
  Book: "cart-type cart-type--book",
  TvSeries: "cart-type cart-type--tv",
};

const STATUS = { idle: "idle", ok: "ok", error: "error" };

export default function CartPage() {
  const { items, removeItem, editItem, clearCart } = useMediaCart();
  const navigate = useNavigate();
  const { bulkCreateMedia } = useMediaCommands();

  const [statuses, setStatuses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  async function handleConfirmAll() {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      const result = await bulkCreateMedia(items);
      const nextStatuses = {};

      const createdTitles = new Set(result.created.map((c) => c.title?.toLowerCase()));
      const errorTitles = new Set(result.errors.map((e) => e.title?.toLowerCase()));

      for (const item of items) {
        const key = item.data.title?.toLowerCase();
        if (createdTitles.has(key)) nextStatuses[item.id] = STATUS.ok;
        else if (errorTitles.has(key)) nextStatuses[item.id] = STATUS.error;
        else nextStatuses[item.id] = STATUS.ok;
      }

      setStatuses(nextStatuses);
      setSubmitted(true);

      const failedIds = Object.entries(nextStatuses)
        .filter(([, value]) => value === STATUS.error)
        .map(([id]) => id);

      if (failedIds.length === 0) {
        clearCart();
        setTimeout(() => navigate("/media/add"), 1500);
      } else {
        for (const item of items) {
          if (!failedIds.includes(item.id)) removeItem(item.id);
        }
      }
    } catch {
      const nextStatuses = {};
      for (const item of items) nextStatuses[item.id] = STATUS.error;
      setStatuses(nextStatuses);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditSave(updatedData) {
    editItem(editTarget.id, updatedData);
    setEditTarget(null);
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="cart-empty-state">
        <p>Your cart is empty.</p>
        <button onClick={() => navigate("/media/add")} className="cart-empty-btn">
          Back to Add Media
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1 className="cart-title">
          Media Cart
          <span className="cart-count">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </h1>
        <button onClick={() => navigate("/media/add")} className="cart-add-more-btn">
          + Add more
        </button>
      </div>

      <div className="cart-list">
        {items.map((item) => {
          const status = statuses[item.id] ?? STATUS.idle;
          const typeClass = TYPE_COLOURS[item.type] ?? "cart-type";

          return (
            <div key={item.id} className={`cart-item cart-item--${status}`}>
              <div className="cart-thumb">
                {item.data.coverUrl ? (
                  <img src={item.data.coverUrl} alt={item.data.title} />
                ) : (
                  <div className="cart-thumb-placeholder">No image</div>
                )}
              </div>

              <div className="cart-item-info">
                <div className="cart-item-top">
                  <span className={typeClass}>
                    {item.type === "TvSeries" ? "TV Series" : item.type}
                  </span>
                  {item.data.releaseYear && (
                    <span className="cart-release-year">{item.data.releaseYear}</span>
                  )}
                </div>

                <p className="cart-item-title">{item.data.title}</p>

                {item.type === "Movie" && item.data.director && (
                  <p className="cart-item-meta">Dir. {item.data.director}</p>
                )}
                {item.type === "Book" && item.data.author && (
                  <p className="cart-item-meta">{item.data.author}</p>
                )}
                {item.type === "TvSeries" && item.data.seasons?.length > 0 && (
                  <p className="cart-item-meta">
                    {item.data.seasons.length} season
                    {item.data.seasons.length !== 1 ? "s" : ""}
                    {" · "}
                    {item.data.seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)} episodes
                  </p>
                )}
              </div>

              <div className="cart-item-status" aria-hidden>
                {status === STATUS.ok && <span className="cart-status-ok">✓</span>}
                {status === STATUS.error && <span className="cart-status-error">✕</span>}
              </div>

              {!submitted && (
                <div className="cart-item-actions">
                  <button onClick={() => setEditTarget(item)} className="cart-action-btn">
                    Edit
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="cart-action-btn cart-action-btn--danger"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div className="cart-confirm-row">
          <button
            onClick={handleConfirmAll}
            disabled={submitting || items.length === 0}
            className="cart-confirm-btn"
          >
            {submitting ? "Saving..." : `Confirm All (${items.length})`}
          </button>
        </div>
      )}

      {submitted && (
        <div className="cart-summary">
          <p>
            {Object.values(statuses).filter((status) => status === STATUS.ok).length} saved
            {Object.values(statuses).filter((status) => status === STATUS.error).length > 0 &&
              ` · ${Object.values(statuses).filter((status) => status === STATUS.error).length} failed`}
          </p>
          {Object.values(statuses).some((status) => status === STATUS.error) && (
            <span>Failed items remain in the cart. Fix and retry.</span>
          )}
        </div>
      )}

      {editTarget && (
        <EditModal item={editTarget} onSave={handleEditSave} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [data, setData] = useState({ ...item.data });

  function set(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="cart-modal-overlay">
      <div className="cart-modal">
        <h2 className="cart-modal-title">Edit {item.type === "TvSeries" ? "TV Series" : item.type}</h2>

        <div className="cart-modal-fields">
          <Field label="Title" value={data.title} onChange={(value) => set("title", value)} />
          <Field
            label="Description"
            value={data.description}
            onChange={(value) => set("description", value)}
            textarea
          />
          <Field label="Cover URL" value={data.coverUrl} onChange={(value) => set("coverUrl", value)} />
          <Field
            label="Release Year"
            value={data.releaseYear}
            onChange={(value) => set("releaseYear", value ? Number(value) : null)}
            type="number"
          />

          {item.type === "Movie" && (
            <>
              <Field label="Director" value={data.director} onChange={(value) => set("director", value)} />
              <Field
                label="Duration (min)"
                value={data.duration}
                onChange={(value) => set("duration", value ? Number(value) : null)}
                type="number"
              />
            </>
          )}

          {item.type === "Book" && (
            <>
              <Field label="Author" value={data.author} onChange={(value) => set("author", value)} />
              <Field
                label="Pages"
                value={data.pages}
                onChange={(value) => set("pages", value ? Number(value) : null)}
                type="number"
              />
              <Field label="ISBN" value={data.isbn} onChange={(value) => set("isbn", value)} />
            </>
          )}

          {item.type === "TvSeries" && data.seasons?.length > 0 && (
            <div className="cart-modal-note">
              {data.seasons.length} seasons · {data.seasons.reduce((acc, season) => acc + (season.episodes?.length ?? 0), 0)} episodes imported.
              Edit seasons from the season manager.
            </div>
          )}
        </div>

        <div className="cart-modal-actions">
          <button onClick={onClose} className="cart-action-btn">
            Cancel
          </button>
          <button onClick={() => onSave(data)} className="cart-confirm-btn">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }) {
  return (
    <label className="cart-field">
      <span>{label}</span>
      {textarea ? (
        <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      )}
    </label>
  );
}
