import { ApiError } from '../utils/apiError.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';

export { ROLES, STAFF_ROLES };

export function isStaff(user) {
  return Boolean(user) && STAFF_ROLES.includes(user.role);
}

export function isAdminLevel(user) {
  return Boolean(user) && [ROLES.SUPER_ADMIN, ROLES.OPERATOR].includes(user.role);
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('登录状态已失效，请重新登录');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('账号不存在');
    if (user.status !== 'active') throw ApiError.forbidden('账号已被禁用');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  return authenticate(req, res, next);
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.length === 0 || roles.includes(req.user.role)) return next();
  return next(ApiError.forbidden());
};

export function assertCanManageEvent(user, event) {
  if (!user) throw ApiError.unauthorized();
  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.OPERATOR) return;

  if (user.role === ROLES.EVENT_EDITOR) {
    const assigned = (user.managedEvents || []).some(
      (eventId) => String(eventId) === String(event?._id),
    );
    if (assigned) return;
    throw ApiError.forbidden('你只能管理被分配的赛事');
  }

  throw ApiError.forbidden();
}
