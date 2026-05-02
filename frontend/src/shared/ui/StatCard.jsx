import clsx from 'clsx';

export default function StatCard({ label, value, hint, className }) {
  return (
    <div className={clsx('ui-card p-4', className)}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}
