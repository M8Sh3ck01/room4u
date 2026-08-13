export function EmptyState({ title, body, action, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
      {children}
      {title && <h3 className="mb-0">{title}</h3>}
      {body && <p className="mb-0">{body}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}