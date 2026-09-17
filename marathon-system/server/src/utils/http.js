export function ok(res, data, message = 'ok', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function paginated(res, items, { page, pageSize, total }, message = 'ok') {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    },
  });
}

export function parsePagination(query, { defaultPageSize = 20, maxPageSize = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawSize = Number.parseInt(query.pageSize, 10) || defaultPageSize;
  const pageSize = Math.min(Math.max(1, rawSize), maxPageSize);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
