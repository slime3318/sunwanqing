import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/permission.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as controller from './users.controller.js';
import {
  assignRoleSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateStatusSchema,
} from './users.schema.js';

const router = Router();

router.use(authenticate);

router.get('/me', controller.getMe);
router.patch('/me', validate(updateProfileSchema), controller.updateMe);

router.get('/meta', requirePermission(PERMISSIONS.USER_READ), controller.meta);
router.get('/', requirePermission(PERMISSIONS.USER_READ), validate(listUsersQuerySchema, 'query'), controller.list);
router.patch(
  '/:id/role',
  requirePermission(PERMISSIONS.ROLE_ASSIGN),
  validate(assignRoleSchema),
  controller.assignRole,
);
router.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.USER_WRITE),
  validate(updateStatusSchema),
  controller.updateStatus,
);

export default router;
