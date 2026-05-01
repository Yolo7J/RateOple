const styles = {
  option: [
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left',
    'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] focus:bg-[var(--bg-secondary)]',
  ].join(' '),
  image: 'h-10 w-10 flex-none rounded-md object-cover bg-[var(--bg-secondary)]',
  fallback: [
    'flex h-10 w-10 flex-none items-center justify-center rounded-md',
    'bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-muted)]',
  ].join(' '),
  label: 'text-sm font-medium',
  subtitle: 'text-xs text-[var(--text-muted)]',
};

export default function EntityPickerOption({ option, onSelect }) {
  const initial = option?.label?.trim()?.[0]?.toUpperCase() ?? '?';

  return (
    <button className={styles.option} type="button" onClick={() => onSelect(option)}>
      {option.imageUrl ? (
        <img className={styles.image} src={option.imageUrl} alt="" loading="lazy" />
      ) : (
        <span className={styles.fallback} aria-hidden="true">{initial}</span>
      )}
      <span className="min-w-0">
        <span className={styles.label}>{option.label}</span>
        {option.subtitle ? <span className={`block truncate ${styles.subtitle}`}>{option.subtitle}</span> : null}
      </span>
    </button>
  );
}
