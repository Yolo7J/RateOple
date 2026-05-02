const styles = {
  pill: 'ui-badge max-w-full px-3 py-1.5 text-sm text-[var(--text-primary)]',
  image: 'h-5 w-5 flex-none rounded-full object-cover bg-[var(--card-bg)]',
  remove: [
    'inline-flex h-5 w-5 items-center justify-center rounded-full',
    'text-[var(--text-muted)] hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)]',
  ].join(' '),
};

export default function SelectedEntityPill({ option, onRemove, disabled = false }) {
  return (
    <span className={styles.pill}>
      {option.imageUrl ? <img className={styles.image} src={option.imageUrl} alt="" loading="lazy" /> : null}
      <span className="truncate">{option.label}</span>
      {onRemove ? (
        <button
          className={styles.remove}
          type="button"
          onClick={() => onRemove(option)}
          disabled={disabled}
          aria-label={`Remove ${option.label}`}
          title={`Remove ${option.label}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
