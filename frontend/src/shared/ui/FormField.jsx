import { useId } from 'react';
import clsx from 'clsx';

export default function FormField({ label, hint, error, children, className, id }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  return (
    <div className={clsx('ui-field', className)}>
      {label ? <label className="ui-label" htmlFor={controlId}>{label}</label> : null}
      {typeof children === 'function' ? children({ id: controlId, 'aria-invalid': Boolean(error) }) : children}
      {hint && !error ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
      {error ? <p className="text-xs text-[var(--status-danger)]">{error}</p> : null}
    </div>
  );
}
