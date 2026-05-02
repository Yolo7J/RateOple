import clsx from 'clsx';
import { createElement } from 'react';

export default function Panel({ as: Component = 'div', className, children, ...props }) {
  return createElement(Component, { className: clsx('ui-panel', className), ...props }, children);
}
