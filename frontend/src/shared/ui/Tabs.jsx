import clsx from 'clsx';

export default function Tabs({ tabs, value, onChange, ariaLabel = 'Tabs', className }) {
  return (
    <div className={clsx('flex flex-wrap gap-2 border-b border-[var(--border)] pb-2', className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const key = tab.value ?? tab;
        const label = tab.label ?? tab;
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
              active
                ? 'border-[var(--accent)] bg-[var(--primary-color-alpha)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--button-hover-bg)] hover:text-[var(--text-primary)]',
            )}
            onClick={() => onChange?.(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
