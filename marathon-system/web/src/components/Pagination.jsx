export default function Pagination({ pagination, onChange, disabled }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);

  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="pagination" aria-label="分页">
      <button type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      {start > 1 ? <span className="pagination__gap">…</span> : null}
      {pages.map((item) => (
        <button
          type="button"
          key={item}
          className={item === page ? 'is-active' : ''}
          disabled={disabled}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      {end < totalPages ? <span className="pagination__gap">…</span> : null}
      <button type="button" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
      <span className="pagination__total">共 {total} 条</span>
    </nav>
  );
}
