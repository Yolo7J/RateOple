import clsx from 'clsx';

const PageLayout = ({
  as: Component = 'main',
  className,
  children,
  ...props
}) => {
  return (
    <Component className={clsx('py-6 sm:py-8 lg:py-10', className)} {...props}>
      {children}
    </Component>
  );
};

export default PageLayout;
