import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permission.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as statsService from './stats.service.js';

const router = Router();

const querySchema = z.object({
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID 格式不正确').optional(),
});

router.use(authenticate, requirePermission(PERMISSIONS.STATS_READ));

router.get(
  '/overview',
  validate(querySchema, 'query'),
  asyncHandler(async (req, res) => ok(res, await statsService.overview(req.user, req.query))),
);

router.get(
  '/events/:eventId',
  asyncHandler(async (req, res) => ok(res, await statsService.eventBreakdown(req.user, req.params.eventId))),
);

export default router;
