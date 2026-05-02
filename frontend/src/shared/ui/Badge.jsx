import clsx from 'clsx';

const TONES = {
  neutral: 'ui-badge',
  accent: 'ui-badge border-[var(--accent)]/50 bg-[var(--primary-color-alpha)] text-[var(--text-primary)]',
  success: 'ui-badge border-[var(--status-success)]/40 bg-[var(--status-success-bg)] text-[var(--status-success)]',
  warning: 'ui-badge border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  danger: 'ui-badge border-[var(--status-danger)]/40 bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
  info: 'ui-badge border-[var(--status-info)]/40 bg-[var(--status-info-bg)] text-[var(--status-info)]',
};

export default function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span className={clsx(TONES[tone] ?? TONES.neutral, className)} {...props}>
      {children}
    </span>
  );
}
