import { useEffect } from 'react';
import clsx from 'clsx';
import Button from './Button';

export default function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  className,
  initialFocusRef,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => initialFocusRef?.current?.focus?.(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [initialFocusRef, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={onClose}>
      <div
        className={clsx('ui-card w-full max-w-[560px] p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.75)]', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {actions ? <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
