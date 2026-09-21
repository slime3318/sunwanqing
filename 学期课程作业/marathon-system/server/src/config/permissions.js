import { ROLES } from './roles.js';

/**
 * RBAC 权限矩阵：角色 -> 权限点。
 * 前端通过 GET /api/auth/permissions 拉取同一份定义来渲染菜单与按钮。
 */
export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  ROLE_ASSIGN: 'role:assign',
  EVENT_READ: 'event:read',
  EVENT_WRITE: 'event:write',
  REGISTRATION_READ: 'registration:read',
  REGISTRATION_WRITE: 'registration:write',
  REGISTRATION_REVIEW: 'registration:review',
  REGISTRATION_EXPORT: 'registration:export',
  STATS_READ: 'stats:read',
  SETTINGS_MANAGE: 'settings:manage',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: '超级管理员',
  [ROLES.OPERATOR]: '运营人员',
  [ROLES.EVENT_EDITOR]: '赛事编辑员',
  [ROLES.PARTICIPANT]: '选手',
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.OPERATOR]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_WRITE,
    PERMISSIONS.REGISTRATION_READ,
    PERMISSIONS.REGISTRATION_WRITE,
    PERMISSIONS.REGISTRATION_REVIEW,
    PERMISSIONS.REGISTRATION_EXPORT,
    PERMISSIONS.STATS_READ,
  ],
  [ROLES.EVENT_EDITOR]: [
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_WRITE,
    PERMISSIONS.REGISTRATION_READ,
    PERMISSIONS.STATS_READ,
  ],
  [ROLES.PARTICIPANT]: [],
};

export function permissionsOf(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function roleHasPermission(role, permission) {
  return permissionsOf(role).includes(permission);
}
