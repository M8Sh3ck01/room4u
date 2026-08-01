export function Skeleton({ className = '', style, ...rest }) {
  return <div className={`skeleton ${className}`.trim()} style={style} {...rest} />;
}
