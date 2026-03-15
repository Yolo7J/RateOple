import clsx from 'clsx';

const DIRECTION_CLASSES = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
};

const ALIGN_CLASSES = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY_CLASSES = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const Flex = ({
  as: Component = 'div',
  className,
  gap = 'gap-4',
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  children,
  ...props
}) => {
  return (
    <Component
      className={clsx(
        'flex',
        gap,
        DIRECTION_CLASSES[direction],
        ALIGN_CLASSES[align],
        JUSTIFY_CLASSES[justify],
        wrap ? 'flex-wrap' : 'flex-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Flex;
