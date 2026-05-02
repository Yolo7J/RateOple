import clsx from 'clsx';

export default function Checkbox({ className, ...props }) {
  return <input type="checkbox" className={clsx('ui-checkbox', className)} {...props} />;
}
