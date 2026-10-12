export default function Alert({ tone = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="alert__body">{children}</span>
      {onClose ? (
        <button type="button" className="alert__close" onClick={onClose} aria-label="关闭提示">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function FormErrors({ errors, order }) {
  const entries = order
    ? order.filter((key) => errors?.[key]).map((key) => [key, errors[key]])
    : Object.entries(errors || {}).map(([key, value]) => [key, value]);

  if (!entries.length) return null;

  return (
    <Alert tone="danger">
      <ul className="error-list">
        {entries.map(([key, value]) => (
          <li key={key}>{value}</li>
        ))}
      </ul>
    </Alert>
  );
}

export function Spinner({ label = '加载中…' }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__dot" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = '暂无数据', description, action }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? <p className="empty-state__desc">{description}</p> : null}
      {action}
    </div>
  );
}
