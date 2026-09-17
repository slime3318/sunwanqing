import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`接口不存在: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let statusCode = error.statusCode || 500;
  let message = error.message || '服务器内部错误';
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = '数据校验失败';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || {}).join(', ');
    message = `数据已存在${field ? `（${field}）` : ''}`;
  }

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.isProd || statusCode < 500 ? {} : { stack: error.stack }),
  });
}
