import { z } from 'zod';

const phone = z.string().regex(/^1[3-9]\d{9}$/, '请输入 11 位有效手机号');
const email = z.string().email('邮箱格式不正确').optional().or(z.literal(''));
const password = z
  .string()
  .min(8, '密码至少 8 位')
  .max(64, '密码最长 64 位')
  .regex(/[A-Za-z]/, '密码需包含字母')
  .regex(/\d/, '密码需包含数字');

export const sendSmsSchema = z.object({
  phone,
  scene: z.enum(['register', 'login', 'reset']).default('login'),
});

export const registerSchema = z.object({
  name: z.string().min(2, '姓名至少 2 个字').max(40, '姓名过长'),
  phone,
  email,
  password,
  smsCode: z.string().regex(/^\d{6}$/, '验证码为 6 位数字'),
});

export const loginSchema = z.object({
  account: z.string().min(3, '请输入手机号或邮箱'),
  password: z.string().min(1, '请输入密码'),
});

export const smsLoginSchema = z.object({
  phone,
  smsCode: z.string().regex(/^\d{6}$/, '验证码为 6 位数字'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: password,
});
