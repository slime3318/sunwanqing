export default function Badge({ tone = 'muted', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function StatusBadge({ status, labels, tones }) {
  const tone = tones?.[status] || 'muted';
  const label = labels?.[status] || status || '-';
  return <Badge tone={tone}>{label}</Badge>;
}
