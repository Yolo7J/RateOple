import clsx from 'clsx';

export default function Select({ className, children, ...props }) {
  return (
    <select className={clsx('ui-input pr-9', className)} {...props}>
      {children}
    </select>
  );
}
