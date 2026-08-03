export function Logo({ className = '', ...rest }) {
  return (
    <svg
      className={`logo ${className}`.trim()}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <circle className="logo-accent" cx="12" cy="10" r="4.5" />
      <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 26 L24 10 L42 26" />
        <rect x="12" y="26" width="24" height="16" />
        <rect x="21" y="30" width="6" height="12" rx="1" />
      </g>
    </svg>
  );
}
