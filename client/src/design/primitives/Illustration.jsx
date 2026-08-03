export function Illustration({ className = '', ...rest }) {
  return (
    <svg
      className={`illustration ${className}`.trim()}
      viewBox="0 0 320 180"
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <circle className="illustration-accent" cx="60" cy="46" r="13" />
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <line x1="60" y1="21" x2="60" y2="15" />
        <line x1="85" y1="46" x2="91" y2="46" />
        <line x1="35" y1="46" x2="29" y2="46" />
      </g>
      <line x1="40" y1="160" x2="280" y2="160" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 78 L160 32 L268 78" />
        <rect x="72" y="78" width="176" height="80" />
        <rect x="218" y="42" width="22" height="36" />
        <rect x="92" y="96" width="40" height="40" rx="6" />
        <line x1="112" y1="96" x2="112" y2="136" />
        <line x1="92" y1="116" x2="132" y2="116" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="160" y="110" width="72" height="48" rx="6" />
        <line x1="160" y1="124" x2="232" y2="124" />
        <rect x="168" y="116" width="24" height="14" rx="4" />
        <line x1="160" y1="110" x2="160" y2="100" />
      </g>
    </svg>
  );
}
