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
