import { useState } from "react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { useMediaCart } from "../../../context/MediaCartContext";
import { useMediaCommands } from "../queries/useMediaCommands";
import PageLayout from "../../../layouts/PageLayout";
import Container from "../../../shared/ui/Container";
import Stack from "../../../shared/ui/Stack";

const TYPE_COLOURS = {
  Movie: "bg-blue-500/20 text-blue-300",
  Book: "bg-emerald-500/20 text-emerald-300",
  TvSeries: "bg-[var(--accent)]/20 text-[var(--accent)]",
};

const STATUS = { idle: "idle", ok: "ok", error: "error" };

const styles = {
  wrapper: "mx-auto w-[min(1100px,calc(100vw-32px))] max-sm:w-[min(1100px,calc(100vw-20px))]",
  header: "mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
  title: "text-[clamp(1.5rem,2vw,1.9rem)] tracking-tight text-[var(--text-primary)]",
  count: "ml-2 text-sm font-medium text-[var(--text-muted)]",
  addMore: [
    "rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm",
    "text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]",
  ].join(" "),
  list: "flex flex-col gap-3",
  item: [
    "grid items-center gap-3 rounded-xl border border-[var(--border)]",
    "bg-[var(--card-bg)] p-3",
    "grid-cols-[86px_minmax(0,1fr)_28px_auto]",
    "max-[880px]:grid-cols-[74px_minmax(0,1fr)]",
  ].join(" "),
  itemOk: "border-emerald-500/40",
  itemError: "border-rose-400/40",
  thumb: "h-[108px] w-[76px] overflow-hidden rounded-lg bg-[var(--card-cover-bg)] max-[880px]:h-[106px] max-[880px]:w-[74px]",
  thumbImage: "h-full w-full object-cover",
  thumbPlaceholder: "grid h-full w-full place-items-center text-xs text-[var(--text-muted)]",
  itemInfo: "min-w-0",
  itemTop: "mb-1 flex items-center gap-2",
  typeBadge: "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
  releaseYear: "text-xs text-[var(--text-muted)]",
  itemTitle: "truncate text-sm font-semibold text-[var(--text-primary)]",
  itemMeta: "mt-1 text-xs text-[var(--text-muted)]",
  status: "text-center text-lg font-extrabold max-[880px]:hidden",
  statusOk: "text-emerald-400",
  statusError: "text-rose-400",
  actions: "flex gap-2 max-[880px]:col-span-2 max-[880px]:justify-start",
  actionBtn: [
    "rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-3 py-2 text-xs",
    "text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]",
  ].join(" "),
  actionDanger: "border-rose-400/40 text-rose-300",
  confirmRow: "flex justify-end max-sm:justify-stretch",
  confirmBtn: [
    "rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#151515]",
    "transition hover:bg-[var(--accent-strong)] disabled:opacity-60 disabled:cursor-not-allowed",
    "max-sm:w-full",
  ].join(" "),
  summary: "mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4",
  summaryText: "font-semibold text-[var(--text-primary)]",
  summaryNote: "mt-1 text-xs text-[var(--text-muted)]",
  emptyState: "min-h-[55vh] grid place-items-center gap-3 text-center text-[var(--text-muted)]",
  emptyBtn: [
    "rounded-xl border border-[var(--border)] bg-[var(--btn-bg)] px-4 py-2 text-sm",
    "text-[var(--text-primary)] transition hover:bg-[var(--btn-hover)]",
  ].join(" "),
  modalOverlay: "fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4",
  modal: "w-full max-w-[620px] max-h-[90vh] overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4",
  modalTitle: "mb-3 text-lg font-semibold text-[var(--text-primary)]",
  modalFields: "flex flex-col gap-3",
  field: "flex flex-col gap-1",
  fieldLabel: "text-xs font-semibold text-[var(--text-secondary)]",
  fieldInput: [
    "rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm",
    "text-[var(--text-primary)] outline-none focus:border-[var(--accent)]",
  ].join(" "),
  textarea: "min-h-[94px] resize-y",
  modalNote: "rounded-xl border border-dashed border-[var(--border)] p-3 text-xs text-[var(--text-muted)]",
  modalActions: "mt-4 flex justify-end gap-2",
};

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

      const createdItems = Array.isArray(result?.created)
        ? result.created
        : Array.isArray(result?.Created)
          ? result.Created
          : [];
      const errorItems = Array.isArray(result?.errors)
        ? result.errors
        : Array.isArray(result?.Errors)
          ? result.Errors
          : [];

      const createdTitles = new Set(createdItems.map((c) => c.title?.toLowerCase()).filter(Boolean));
      const errorTitles = new Set(errorItems.map((e) => e.title?.toLowerCase()).filter(Boolean));

      for (const item of items) {
        const key = item.data.title?.toLowerCase();
        if (createdTitles.has(key)) nextStatuses[item.id] = STATUS.ok;
        else if (errorTitles.has(key)) nextStatuses[item.id] = STATUS.error;
        else nextStatuses[item.id] = STATUS.error;
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
      <PageLayout>
        <Container>
          <div className={styles.emptyState}>
            <p>Your cart is empty.</p>
            <button onClick={() => navigate("/media/add")} className={styles.emptyBtn}>
              Back to Add Media
            </button>
          </div>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              Media Cart
              <span className={styles.count}>
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </h1>
            <button onClick={() => navigate("/media/add")} className={styles.addMore}>
              + Add more
            </button>
          </div>

          <div className={styles.list}>
            {items.map((item) => {
              const status = statuses[item.id] ?? STATUS.idle;
              const typeClass = TYPE_COLOURS[item.type] ?? "bg-slate-500/20 text-slate-300";

              return (
                <div
                  key={item.id}
                  className={clsx(styles.item, status === STATUS.ok && styles.itemOk, status === STATUS.error && styles.itemError)}
                >
                  <div className={styles.thumb}>
                    {item.data.coverUrl ? (
                      <img src={item.data.coverUrl} alt={item.data.title} className={styles.thumbImage} />
                    ) : (
                      <div className={styles.thumbPlaceholder}>No image</div>
                    )}
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.itemTop}>
                      <span className={`${styles.typeBadge} ${typeClass}`}>
                        {item.type === "TvSeries" ? "TV Series" : item.type}
                      </span>
                      {item.data.releaseYear && (
                        <span className={styles.releaseYear}>{item.data.releaseYear}</span>
                      )}
                    </div>

                    <p className={styles.itemTitle}>{item.data.title}</p>

                    {item.type === "Movie" && item.data.director && (
                      <p className={styles.itemMeta}>Dir. {item.data.director}</p>
                    )}
                    {item.type === "Book" && item.data.author && (
                      <p className={styles.itemMeta}>{item.data.author}</p>
                    )}
                    {item.type === "TvSeries" && item.data.seasons?.length > 0 && (
                      <p className={styles.itemMeta}>
                        {item.data.seasons.length} season
                        {item.data.seasons.length !== 1 ? "s" : ""}
                        {" · "}
                        {item.data.seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)} episodes
                      </p>
                    )}
                  </div>

                  <div className={styles.status} aria-hidden>
                    {status === STATUS.ok && <span className={styles.statusOk}>✓</span>}
                    {status === STATUS.error && <span className={styles.statusError}>✕</span>}
                  </div>

                  {!submitted ? (
                    <div className={styles.actions}>
                      <button onClick={() => setEditTarget(item)} className={styles.actionBtn}>
                        Edit
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <div className={styles.confirmRow}>
              <button
                onClick={handleConfirmAll}
                disabled={submitting || items.length === 0}
                className={styles.confirmBtn}
              >
                {submitting ? "Saving..." : `Confirm All (${items.length})`}
              </button>
            </div>
          ) : null}

          {submitted ? (
            <div className={styles.summary}>
              <p className={styles.summaryText}>
                {Object.values(statuses).filter((status) => status === STATUS.ok).length} saved
                {Object.values(statuses).filter((status) => status === STATUS.error).length > 0 &&
                  ` · ${Object.values(statuses).filter((status) => status === STATUS.error).length} failed`}
              </p>
              {Object.values(statuses).some((status) => status === STATUS.error) ? (
                <span className={styles.summaryNote}>Failed items remain in the cart. Fix and retry.</span>
              ) : null}
            </div>
          ) : null}

          {editTarget ? (
            <EditModal item={editTarget} onSave={handleEditSave} onClose={() => setEditTarget(null)} />
          ) : null}
        </div>
      </Container>
    </PageLayout>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [data, setData] = useState({ ...item.data });

  function set(field, value) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>
          Edit {item.type === "TvSeries" ? "TV Series" : item.type}
        </h2>

        <div className={styles.modalFields}>
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

          {item.type === "Movie" ? (
            <>
              <Field label="Director" value={data.director} onChange={(value) => set("director", value)} />
              <Field
                label="Duration (min)"
                value={data.duration}
                onChange={(value) => set("duration", value ? Number(value) : null)}
                type="number"
              />
            </>
          ) : null}

          {item.type === "Book" ? (
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
          ) : null}

          {item.type === "TvSeries" && data.seasons?.length > 0 ? (
            <div className={styles.modalNote}>
              {data.seasons.length} seasons · {data.seasons.reduce((acc, season) => acc + (season.episodes?.length ?? 0), 0)} episodes imported.
              Edit seasons from the season manager.
            </div>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.actionBtn}>
            Cancel
          </button>
          <button onClick={() => onSave(data)} className={styles.confirmBtn}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {textarea ? (
        <textarea
          className={`${styles.fieldInput} ${styles.textarea}`}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      ) : (
        <input
          className={styles.fieldInput}
          type={type}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      )}
    </label>
  );
}
