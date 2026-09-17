import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated, parsePagination } from '../../utils/http.js';
import { ROLE_LABELS, ROLE_PERMISSIONS, permissionsOf } from '../../config/permissions.js';
import * as usersService from './users.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const profile = await usersService.getProfile(req.user);
  return ok(res, { user: profile, permissions: permissionsOf(req.user.role) });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user, req.body);
  return ok(res, { user: user.toJSON(), permissions: permissionsOf(user.role) }, '资料已更新');
});

export const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { items, total } = await usersService.listUsers({ ...req.query, ...pagination });
  return paginated(res, items, { ...pagination, total });
});

export const assignRole = asyncHandler(async (req, res) => {
  const user = await usersService.assignRole(req.user, req.params.id, req.body);
  return ok(res, { user }, '角色已更新');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const user = await usersService.updateStatus(req.user, req.params.id, req.body);
  return ok(res, { user }, '账号状态已更新');
});

export const meta = asyncHandler(async (req, res) =>
  ok(res, {
    roles: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
    rolePermissions: ROLE_PERMISSIONS,
  }),
);
