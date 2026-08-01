export function Badge({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <span className={`badge badge--${variant} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
