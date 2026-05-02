import clsx from 'clsx';

export default function Toggle({ checked = false, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={clsx(
        'inline-flex h-6 w-11 items-center rounded-full border border-[var(--border)] p-0.5 transition',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-secondary)]',
        className,
      )}
      {...props}
    >
      <span
        className={clsx(
          'h-4 w-4 rounded-full bg-[var(--bg-elevated)] shadow transition',
          checked && 'translate-x-5 bg-[#121212]',
        )}
      />
    </button>
  );
}
