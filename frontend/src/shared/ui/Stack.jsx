import clsx from 'clsx';

const Stack = ({
  as: Component = 'div',
  className,
  gap = 'gap-4',
  children,
  ...props
}) => {
  return (
    <Component className={clsx('flex flex-col', gap, className)} {...props}>
      {children}
    </Component>
  );
};

export default Stack;
