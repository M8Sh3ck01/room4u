export function EmptyState({ title, body, action, children }) {
  return (
    <div className="empty-state">
      {children}
      {title && <h3>{title}</h3>}
      {body && <p className="text-muted">{body}</p>}
      {action}
    </div>
  );
}
