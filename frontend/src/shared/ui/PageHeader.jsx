import clsx from 'clsx';

export default function PageHeader({ title, subtitle, actions, eyebrow, className }) {
  return (
    <header className={clsx('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">{eyebrow}</p> : null}
        <h1 className="ui-page-title">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
