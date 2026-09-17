export function toRejection(error) {
  const details = error?.details;
  const fieldErrors = Array.isArray(details)
    ? details.reduce((acc, item) => {
        if (item?.field) acc[item.field] = item.message;
        return acc;
      }, {})
    : {};

  return {
    message: error?.message || '操作失败，请稍后重试',
    status: error?.status,
    fieldErrors,
  };
}

export function started(state) {
  state.status = 'loading';
  state.error = null;
  state.fieldErrors = {};
}

export function failed(state, action) {
  state.status = 'failed';
  state.error = action.payload?.message || action.error?.message || '操作失败';
  state.fieldErrors = action.payload?.fieldErrors || {};
}

export function messageOf(error) {
  return error?.message || '操作失败，请稍后重试';
}

/**
 * 分页接口的返回值兜底：任何异常形状都不允许把 undefined 写进 state，
 * 否则列表页在渲染时会对 undefined 调用 .map/.slice 而白屏。
 */
export function listOf(payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
}

export function paginationOf(payload, fallback) {
  const pagination = payload?.pagination;
  if (!pagination || typeof pagination !== 'object') return fallback;
  return {
    page: Number(pagination.page) || fallback.page,
    pageSize: Number(pagination.pageSize) || fallback.pageSize,
    total: Number(pagination.total) || 0,
    totalPages: Number(pagination.totalPages) || 1,
  };
}
