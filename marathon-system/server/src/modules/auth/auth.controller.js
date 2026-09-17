import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/http.js';
import * as authService from './auth.service.js';

export const sendSmsCode = asyncHandler(async (req, res) => {
  const data = await authService.issueSmsCode(req.body);
  return ok(res, data, '验证码已发送');
});

export const register = asyncHandler(async (req, res) => {
  const data = await authService.registerUser(req.body);
  return ok(res, data, '注册成功', 201);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginWithPassword(req.body);
  return ok(res, data, '登录成功');
});

export const loginBySms = asyncHandler(async (req, res) => {
  const data = await authService.loginWithSms(req.body);
  return ok(res, data, '登录成功');
});

export const me = asyncHandler(async (req, res) => ok(res, { user: req.user.toPublicJSON() }));

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user, req.body);
  return ok(res, null, '密码修改成功');
});
