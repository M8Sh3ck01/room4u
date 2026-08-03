export function Logo({ className = '', ...rest }) {
  return (
    <svg
      className={`logo ${className}`.trim()}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <circle className="logo-accent" cx="24" cy="20" r="4" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="10" />
        <line x1="18" y1="24" x2="24" y2="42" />
        <line x1="30" y1="24" x2="24" y2="42" />
      </g>
    </svg>
  );
}
