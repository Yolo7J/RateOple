import clsx from 'clsx';
import { createElement } from 'react';

const Stack = ({
  as: Component = 'div',
  className,
  gap = 'gap-4',
  children,
  ...props
}) => {
  return createElement(Component, { className: clsx('flex flex-col', gap, className), ...props }, children);
};

export default Stack;
