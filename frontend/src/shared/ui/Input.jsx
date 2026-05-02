import clsx from 'clsx';

export default function Input({ className, ...props }) {
  return <input className={clsx('ui-input', className)} {...props} />;
}
