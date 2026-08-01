export function Spinner({ className = '', ...rest }) {
  return (
    <span className={`spinner ${className}`.trim()} role="status" aria-label="Loading" {...rest} />
  );
}
