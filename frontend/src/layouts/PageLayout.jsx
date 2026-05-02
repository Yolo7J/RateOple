import clsx from 'clsx';
import { createElement } from 'react';

const PageLayout = ({
  as: Component = 'main',
  className,
  children,
  ...props
}) => {
  return createElement(
    Component,
    {
      className: clsx('min-w-0 py-6 sm:py-8 lg:py-10', className),
      ...props,
    },
    children,
  );
};

export default PageLayout;
