import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import eventRoutes from '../modules/events/events.routes.js';
import registrationRoutes from '../modules/registrations/registrations.routes.js';
import statsRoutes from '../modules/stats/stats.routes.js';
import { ROLE_LABELS, ROLE_PERMISSIONS, permissionsOf } from '../config/permissions.js';

const router = Router();

router.get('/health', (req, res) =>
  res.json({ success: true, message: 'ok', data: { uptime: process.uptime() } }),
);

router.get('/auth/permissions', (req, res) =>
  res.json({
    success: true,
    message: 'ok',
    data: { roles: ROLE_LABELS, rolePermissions: ROLE_PERMISSIONS, permissionsOf },
  }),
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/stats', statsRoutes);

export default router;
