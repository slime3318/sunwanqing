import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import * as controller from './auth.controller.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  sendSmsSchema,
  smsLoginSchema,
} from './auth.schema.js';

const router = Router();

const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: true,
  message: { success: false, message: '验证码发送过于频繁，请稍后再试' },
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  message: { success: false, message: '登录尝试过于频繁，请稍后再试' },
});

router.post('/sms/send', smsLimiter, validate(sendSmsSchema), controller.sendSmsCode);
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/login/sms', loginLimiter, validate(smsLoginSchema), controller.loginBySms);
router.get('/me', authenticate, controller.me);
router.post('/password', authenticate, validate(changePasswordSchema), controller.changePassword);

export default router;
