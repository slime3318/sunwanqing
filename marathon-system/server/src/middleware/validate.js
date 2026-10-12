import { ApiError } from '../utils/apiError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('请求参数校验失败', details));
  }

  if (source === 'query') {
    Object.defineProperty(req, 'query', { value: result.data, writable: true });
  } else {
    req[source] = result.data;
  }
  return next();
};
