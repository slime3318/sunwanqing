export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = '请求参数错误', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = '请先登录') {
    return new ApiError(401, message);
  }

  static forbidden(message = '没有操作权限') {
    return new ApiError(403, message);
  }

  static notFound(message = '资源不存在') {
    return new ApiError(404, message);
  }

  static conflict(message = '资源冲突', details) {
    return new ApiError(409, message, details);
  }
}
