import clsx from 'clsx';

const VARIANTS = {
  default: 'ui-button',
  primary: 'ui-button ui-button-primary',
  danger: 'ui-button ui-button-danger',
  ghost: 'ui-button ui-button-ghost',
};

const SIZES = {
  sm: 'ui-button-sm',
  md: '',
  lg: 'ui-button-lg',
};

export default function Button({
  as: Component = 'button',
  variant = 'default',
  size = 'md',
  className,
  children,
  type,
  ...props
}) {
  const resolvedType = Component === 'button' ? (type ?? 'button') : type;

  return (
    <Component
      className={clsx(VARIANTS[variant] ?? VARIANTS.default, SIZES[size], className)}
      type={resolvedType}
      {...props}
    >
      {children}
    </Component>
  );
}
