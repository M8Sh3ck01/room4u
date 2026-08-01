export function Alert({ variant = 'info', className = '', children, ...rest }) {
  return (
    <div className={`alert alert--${variant} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
