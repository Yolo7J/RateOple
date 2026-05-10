import clsx from 'clsx';
import { createElement } from 'react';

export default function SectionCard({ title, subtitle, actions, className, children, as: Component = 'section', ...props }) {
  return createElement(
    Component,
    { className: clsx('ui-card p-4 sm:p-5', className), ...props },
    <>
      {(title || subtitle || actions) ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="ui-section-title">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </>,
  );
}
