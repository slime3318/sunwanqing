import { ApiError } from '../../utils/apiError.js';
import { parseIdCard } from '../../utils/idCard.js';
import { User } from '../../models/User.js';
import { ROLES } from '../../middleware/auth.js';

export async function getProfile(user) {
  return User.findById(user._id).select('+idCard').lean({ virtuals: true });
}

export async function updateProfile(user, payload) {
  const update = { ...payload };

  if (payload.email) {
    const taken = await User.exists({ email: payload.email, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('该邮箱已被使用');
  }

  if (payload.idCard) {
    const parsed = parseIdCard(payload.idCard);
    if (!parsed) throw ApiError.badRequest('身份证号不合法');
    const taken = await User.exists({ idCard: parsed.idCard, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('该身份证号已被其他账号使用');
    update.idCard = parsed.idCard;
    update.birthDate = parsed.birthDate;
    update.gender = parsed.gender;
  }

  return User.findByIdAndUpdate(user._id, update, { new: true, runValidators: true });
}

export async function listUsers({ page, pageSize, skip, role, status, keyword }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    User.countDocuments(filter),
  ]);

  return { items: items.map((item) => item.toPublicJSON()), total };
}

export async function assignRole(operator, targetId, { role, managedEvents }) {
  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound('用户不存在');

  if (String(target._id) === String(operator._id) && role !== ROLES.SUPER_ADMIN) {
    throw ApiError.badRequest('不能修改自己的超级管理员角色');
  }

  if (role !== ROLES.SUPER_ADMIN) {
    const adminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN, status: 'active' });
    if (adminCount <= 1 && target.role === ROLES.SUPER_ADMIN) {
      throw ApiError.badRequest('系统至少需要保留一名超级管理员');
    }
  }

  target.role = role;
  if (Array.isArray(managedEvents)) {
    target.managedEvents = role === ROLES.EVENT_EDITOR ? managedEvents : [];
  } else if (role !== ROLES.EVENT_EDITOR) {
    target.managedEvents = [];
  }

  await target.save();
  return target.toPublicJSON();
}

export async function updateStatus(operator, targetId, { status }) {
  if (String(operator._id) === String(targetId)) {
    throw ApiError.badRequest('不能禁用当前登录账号');
  }
  const target = await User.findByIdAndUpdate(targetId, { status }, { new: true });
  if (!target) throw ApiError.notFound('用户不存在');
  return target.toPublicJSON();
}
