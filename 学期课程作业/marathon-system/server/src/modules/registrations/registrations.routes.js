import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';
import { validate } from '../../middleware/validate.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as controller from './registrations.controller.js';
import {
  batchReviewSchema,
  cancelSchema,
  createRegistrationSchema,
  listRegistrationsQuerySchema,
  paySchema,
  reviewSchema,
} from './registrations.schema.js';

const router = Router();

router.use(authenticate);

router.get('/meta/statuses', controller.statusMeta);

router.post('/', validate(createRegistrationSchema), controller.create);
router.get('/mine', validate(listRegistrationsQuerySchema, 'query'), controller.mine);

router.get(
  '/export',
  requirePermission(PERMISSIONS.REGISTRATION_EXPORT),
  validate(listRegistrationsQuerySchema, 'query'),
  controller.exportCsv,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.REGISTRATION_READ),
  validate(listRegistrationsQuerySchema, 'query'),
  controller.list,
);

router.post(
  '/batch-review',
  requirePermission(PERMISSIONS.REGISTRATION_REVIEW),
  validate(batchReviewSchema),
  controller.batchReview,
);

router.get('/:id', controller.detail);
router.post('/:id/pay', validate(paySchema), controller.pay);
router.post('/:id/cancel', validate(cancelSchema), controller.cancel);
router.patch(
  '/:id/review',
  requirePermission(PERMISSIONS.REGISTRATION_REVIEW),
  validate(reviewSchema),
  controller.review,
);

export default router;
