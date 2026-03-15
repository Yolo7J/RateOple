import clsx from 'clsx';

const GRID_VARIANTS = {
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  sidebar: 'grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]',
  mediaHero: 'grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]',
};

const Grid = ({
  as: Component = 'div',
  className,
  cols,
  gap = 'gap-4',
  variant,
  children,
  ...props
}) => {
  return (
    <Component
      className={clsx('grid', gap, variant ? GRID_VARIANTS[variant] : cols, className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Grid;
