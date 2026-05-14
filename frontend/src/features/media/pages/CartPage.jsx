import { useState } from "react";
import clsx from "clsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMediaCart } from "../../../context/MediaCartContext";
import { useMediaCommands } from "../queries/useMediaCommands";
import PageLayout from "../../../layouts/PageLayout";
import Container from "../../../shared/ui/Container";
import Stack from "../../../shared/ui/Stack";
import Badge from "../../../shared/ui/Badge";
import Button from "../../../shared/ui/Button";
import Dialog from "../../../shared/ui/Dialog";
import EmptyState from "../../../shared/ui/EmptyState";
import FormField from "../../../shared/ui/FormField";
import Input from "../../../shared/ui/Input";
import InlineMessage from "../../../shared/ui/InlineMessage";
import PageHeader from "../../../shared/ui/PageHeader";
import SectionCard from "../../../shared/ui/SectionCard";
import Textarea from "../../../shared/ui/Textarea";

const STATUS = { idle: "idle", ok: "ok", error: "error" };

const styles = {
  pageStack: "gap-6",
  list: "flex flex-col gap-3",
  item: [
    "ui-card grid items-center gap-3 p-3",
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
  releaseYear: "text-xs text-[var(--text-muted)]",
  itemTitle: "truncate text-sm font-semibold text-[var(--text-primary)]",
  itemMeta: "mt-1 text-xs text-[var(--text-muted)]",
  status: "text-center text-lg font-extrabold max-[880px]:hidden",
  statusOk: "text-emerald-400",
  statusError: "text-rose-400",
  actions: "flex gap-2 max-[880px]:col-span-2 max-[880px]:justify-start",
  confirmRow: "flex justify-end max-sm:justify-stretch",
  summaryText: "font-semibold text-[var(--text-primary)]",
  summaryNote: "mt-1 text-xs text-[var(--text-muted)]",
  modalFields: "flex flex-col gap-3",
};

const typeTone = (type) => {
  if (type === "Movie") return "info";
  if (type === "Book") return "success";
  if (type === "TvSeries") return "accent";
  return "neutral";
};

export default function CartPage() {
  const { items, removeItem, editItem, clearCart } = useMediaCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminFlow = searchParams.get("from") === "admin";
  const addMediaPath = isAdminFlow ? "/media/add?from=admin" : "/media/add";
  const postSuccessPath = isAdminFlow ? "/admin/media" : addMediaPath;
  const { bulkCreateMedia } = useMediaCommands();

  const [statuses, setStatuses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const allSucceeded = submitted && Object.values(statuses).length > 0
    && Object.values(statuses).every((status) => status === STATUS.ok);

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
        setTimeout(() => navigate(postSuccessPath), 1500);
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
        <EmptyState
          title="Your cart is empty"
          description="Add media items before confirming a bulk import."
          action={<Button onClick={() => navigate(addMediaPath)}>Back to Add Media</Button>}
        />
      </Container>
    </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <PageHeader
            title="Media Cart"
            subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} ready for review before saving.`}
            actions={<Button onClick={() => navigate(addMediaPath)}>Add more</Button>}
          />

          <div className={styles.list}>
            {items.map((item) => {
              const status = statuses[item.id] ?? STATUS.idle;

              return (
                <div
                  key={item.id}
                  className={clsx(styles.item, status === STATUS.ok && styles.itemOk, status === STATUS.error && styles.itemError)}
                >
                  <div className={styles.thumb}>
                    {item.data.coverUrl ? (
                      <img src={item.data.coverUrl} alt={item.data.title} className={styles.thumbImage} loading="lazy" decoding="async" />
                    ) : (
                      <div className={styles.thumbPlaceholder}>No image</div>
                    )}
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.itemTop}>
                      <Badge tone={typeTone(item.type)}>
                        {item.type === "TvSeries" ? "TV Series" : item.type}
                      </Badge>
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
                      <Button size="sm" onClick={() => setEditTarget(item)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <div className={styles.confirmRow}>
              <Button
                variant="primary"
                onClick={handleConfirmAll}
                disabled={submitting || items.length === 0}
                className="max-sm:w-full"
              >
                {submitting ? "Saving..." : `Confirm All (${items.length})`}
              </Button>
            </div>
          ) : null}

          {submitted ? (
            <SectionCard>
              <p className={styles.summaryText}>
                {Object.values(statuses).filter((status) => status === STATUS.ok).length} saved
                {Object.values(statuses).filter((status) => status === STATUS.error).length > 0 &&
                  ` · ${Object.values(statuses).filter((status) => status === STATUS.error).length} failed`}
              </p>
              {allSucceeded ? (
                <span className={styles.summaryNote}>
                  All items saved. Redirecting to {isAdminFlow ? "Media Management" : "Add Media"}...
                </span>
              ) : null}
              {!allSucceeded && Object.values(statuses).some((status) => status === STATUS.error) ? (
                <InlineMessage tone="warning" className="mt-3">Failed items remain in the cart. Fix and retry.</InlineMessage>
              ) : null}
            </SectionCard>
          ) : null}

          {editTarget ? (
            <EditModal item={editTarget} onSave={handleEditSave} onClose={() => setEditTarget(null)} />
          ) : null}
        </Stack>
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
    <Dialog
      open
      title={`Edit ${item.type === "TvSeries" ? "TV Series" : item.type}`}
      onClose={onClose}
      actions={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(data)}>Save</Button>
        </>
      )}
    >
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
            <InlineMessage tone="info">
              {data.seasons.length} seasons · {data.seasons.reduce((acc, season) => acc + (season.episodes?.length ?? 0), 0)} episodes imported.
              Edit seasons from the season manager.
            </InlineMessage>
          ) : null}
        </div>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }) {
  return (
    <FormField label={label}>
      {(fieldProps) => (
        textarea ? (
          <Textarea
            {...fieldProps}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
          />
        ) : (
          <Input
            {...fieldProps}
            type={type}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
          />
        )
      )}
    </FormField>
  );
}
