export function Logo({ className = '', ...rest }) {
  return (
    <svg
      className={`logo ${className}`.trim()}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <circle className="logo-accent" cx="18" cy="15" r="8" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <line x1="18" y1="23" x2="18" y2="41" />
        <line x1="10" y1="33" x2="18" y2="33" />
        <line x1="13" y1="39" x2="18" y2="39" />
      </g>
    </svg>
  );
}
