import clsx from 'clsx';

export default function EmptyState({ title, description, action, className }) {
  return (
    <div className={clsx('ui-empty', className)}>
      {title ? <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3> : null}
      {description ? <p className="mx-auto mt-1 max-w-[58ch] text-sm">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
