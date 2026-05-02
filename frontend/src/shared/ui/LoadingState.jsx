import clsx from 'clsx';

export function Skeleton({ className }) {
  return <div className={clsx('ui-skeleton rounded-[var(--radius-md)]', className)} aria-hidden="true" />;
}

export default function LoadingState({ label = 'Loading...', className }) {
  return (
    <div className={clsx('ui-card flex items-center justify-center px-6 py-8 text-sm text-[var(--text-muted)]', className)} role="status" aria-live="polite">
      <span className="mr-3 h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true" />
      {label}
    </div>
  );
}
