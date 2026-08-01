export function Input({ className = '', ...rest }) {
  return <input className={`input ${className}`.trim()} {...rest} />;
}
