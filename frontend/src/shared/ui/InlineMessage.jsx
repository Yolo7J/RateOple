import clsx from 'clsx';

const TONES = {
  neutral: 'ui-message',
  info: 'ui-message ui-message-info',
  success: 'ui-message ui-message-success',
  warning: 'ui-message ui-message-warning',
  danger: 'ui-message ui-message-danger',
  error: 'ui-message ui-message-danger',
};

export default function InlineMessage({ tone = 'neutral', className, children, role, ...props }) {
  const resolvedRole = role ?? (tone === 'danger' || tone === 'error' ? 'alert' : 'status');

  return (
    <div className={clsx(TONES[tone] ?? TONES.neutral, className)} role={resolvedRole} {...props}>
      {children}
    </div>
  );
}
