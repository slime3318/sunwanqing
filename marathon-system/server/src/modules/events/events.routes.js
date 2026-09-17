import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';
import { validate } from '../../middleware/validate.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as controller from './events.controller.js';
import {
  createEventSchema,
  createGroupSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateGroupSchema,
  updateStatusSchema,
} from './events.schema.js';

const router = Router();

router.get('/', optionalAuthenticate, validate(listEventsQuerySchema, 'query'), controller.list);
router.get('/:id', optionalAuthenticate, controller.detail);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  validate(createEventSchema),
  controller.create,
);
router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  validate(updateEventSchema),
  controller.update,
);
router.patch(
  '/:id/status',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  validate(updateStatusSchema),
  controller.updateStatus,
);
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.EVENT_WRITE), controller.remove);

router.post(
  '/:id/groups',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  validate(createGroupSchema),
  controller.addGroup,
);
router.patch(
  '/:id/groups/:groupId',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  validate(updateGroupSchema),
  controller.updateGroup,
);
router.delete(
  '/:id/groups/:groupId',
  authenticate,
  requirePermission(PERMISSIONS.EVENT_WRITE),
  controller.removeGroup,
);

export default router;
