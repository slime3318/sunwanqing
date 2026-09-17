import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';
import { generateNumericCode } from '../../utils/codes.js';
import { signToken } from '../../utils/jwt.js';
import { User } from '../../models/User.js';
import { VerificationCode } from '../../models/VerificationCode.js';
import { smsService } from '../../services/smsService.js';
import { permissionsOf } from '../../config/permissions.js';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');
}

export async function issueSmsCode({ phone, scene }) {
  if (scene === 'register') {
    const exists = await User.exists({ phone });
    if (exists) throw ApiError.conflict('?????????????');
  }

  if (scene === 'login') {
    const exists = await User.exists({ phone });
    if (!exists) throw ApiError.notFound('????????');
  }

  const code = generateNumericCode(6);
  await VerificationCode.create({
    target: phone,
    channel: 'sms',
    scene,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  const result = await smsService.sendVerificationCode({ phone, code, scene });

  return {
    phone,
    expiresInSeconds: CODE_TTL_MS / 1000,
    // mock ?????????????????????
    ...(env.smsProvider === 'mock' ? { devCode: code } : {}),
    provider: result.provider,
  };
}

export async function consumeSmsCode({ phone, scene, code }) {
  const record = await VerificationCode.findOne({
    target: phone,
    scene,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!record) throw ApiError.badRequest('???????');
  if (record.expiresAt.getTime() < Date.now()) throw ApiError.badRequest('????????????');
  if (record.attempts >= MAX_ATTEMPTS) throw ApiError.badRequest('???????????????');

  if (record.codeHash !== hashCode(code)) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest('??????');
  }

  record.consumedAt = new Date();
  await record.save();
}

export async function registerUser({ name, phone, email, password, smsCode }) {
  await consumeSmsCode({ phone, scene: 'register', code: smsCode });

  if (email) {
    const emailTaken = await User.exists({ email });
    if (emailTaken) throw ApiError.conflict('???????');
  }

  const user = new User({
    name,
    phone,
    email: email || undefined,
    phoneVerifiedAt: new Date(),
    lastLoginAt: new Date(),
  });
  await user.setPassword(password);
  await user.save();

  return {
    user: user.toPublicJSON(),
    permissions: permissionsOf(user.role),
    token: signToken({ sub: user._id, role: user.role }),
  };
}

export async function loginWithPassword({ account, password }) {
  const isPhone = /^1[3-9]\d{9}$/.test(account);
  const user = await User.findOne(isPhone ? { phone: account } : { email: account.toLowerCase() })
    .select('+passwordHash')
    .exec();

  if (!user) throw ApiError.unauthorized('???????');

  const matched = await user.comparePassword(password);
  if (!matched) throw ApiError.unauthorized('???????');
  if (user.status !== 'active') throw ApiError.forbidden('?????????????');

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: user.toPublicJSON(),
    permissions: permissionsOf(user.role),
    token: signToken({ sub: user._id, role: user.role }),
  };
}

export async function loginWithSms({ phone, smsCode }) {
  await consumeSmsCode({ phone, scene: 'login', code: smsCode });

  const user = await User.findOne({ phone });
  if (!user) throw ApiError.notFound('????????');
  if (user.status !== 'active') throw ApiError.forbidden('?????????????');

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: user.toPublicJSON(),
    permissions: permissionsOf(user.role),
    token: signToken({ sub: user._id, role: user.role }),
  };
}

export async function changePassword(user, { oldPassword, newPassword }) {
  const fresh = await User.findById(user._id).select('+passwordHash');
  const matched = await fresh.comparePassword(oldPassword);
  if (!matched) throw ApiError.badRequest('??????');

  await fresh.setPassword(newPassword);
  await fresh.save();
}
