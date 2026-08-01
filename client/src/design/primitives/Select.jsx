export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`select ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}
