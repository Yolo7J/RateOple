import clsx from 'clsx';

export default function Textarea({ className, rows = 4, ...props }) {
  return <textarea className={clsx('ui-input min-h-[96px] resize-y', className)} rows={rows} {...props} />;
}
