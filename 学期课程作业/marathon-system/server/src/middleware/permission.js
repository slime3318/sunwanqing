import { ApiError } from '../utils/apiError.js';
import { permissionsOf, roleHasPermission } from '../config/permissions.js';

export const requirePermission = (...permissions) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());

  const granted = permissionsOf(req.user.role);
  const passed = permissions.every((permission) => granted.includes(permission));
  if (!passed) {
    return next(ApiError.forbidden(`缺少权限：${permissions.join(', ')}`));
  }
  return next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

export { roleHasPermission };
