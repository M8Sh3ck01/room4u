export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-MW', { month: 'short', day: 'numeric', year: 'numeric' });
}
