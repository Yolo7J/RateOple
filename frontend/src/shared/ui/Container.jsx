import clsx from 'clsx';

const SIZE_CLASSES = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  xxl: 'max-w-7xl',
  full: 'max-w-none',
};

const Container = ({
  as: Component = 'div',
  size = 'xl',
  className,
  children,
  ...props
}) => {
  return (
    <Component
      className={clsx(
        'w-full mx-auto px-4 sm:px-6 lg:px-8',
        SIZE_CLASSES[size] ?? SIZE_CLASSES.xl,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Container;
