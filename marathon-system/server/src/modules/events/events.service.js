import { ApiError } from '../../utils/apiError.js';
import { Event } from '../../models/Event.js';
import { Registration, ACTIVE_STATUSES } from '../../models/Registration.js';
import { ROLES, assertCanManageEvent, isStaff } from '../../middleware/auth.js';
import { escapeRegex, buildCaseInsensitiveRegex } from '../../utils/regex.js';

function normalizeGroups(groups = []) {
  return groups.map((group) => ({
    ...group,
    code: group.code.toUpperCase(),
  }));
}

export function buildVisibilityFilter(user, query) {
  const filter = {};
  const wantsAdminScope = query.scope === 'admin';

  if (!wantsAdminScope) {
    if (query.status) filter.status = query.status;
    else filter.status = 'published';
    return filter;
  }

  if (!user || !isStaff(user)) throw ApiError.forbidden('无权查看后台赛事列表');

  if (user.role === ROLES.EVENT_EDITOR) {
    filter._id = { $in: user.managedEvents };
  }
  if (query.status) filter.status = query.status;

  return filter;
}

export async function listEvents({ user, query, page, pageSize, skip }) {
  const filter = buildVisibilityFilter(user, query);

  if (query.city) filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  if (query.keyword) {
    const regex = buildCaseInsensitiveRegex(query.keyword);
    filter.$or = [{ title: regex }, { venue: regex }, { description: regex }];
  }

  const [items, total] = await Promise.all([
    Event.find(filter).sort({ startDate: 1 }).skip(skip).limit(pageSize),
    Event.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getEventById(id, user) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');

  if (event.status !== 'published') {
    if (!user || !isStaff(user)) throw ApiError.notFound('赛事不存在');
    if (user.role === ROLES.EVENT_EDITOR) assertCanManageEvent(user, event);
  }

  return event;
}

export async function createEvent(user, payload) {
  const event = await Event.create({
    ...payload,
    groups: normalizeGroups(payload.groups),
    status: payload.status || 'draft',
    createdBy: user._id,
    organizers: [user._id],
  });

  if (user.role === ROLES.EVENT_EDITOR) {
    user.managedEvents.push(event._id);
    await user.save();
  }

  return event;
}

export async function updateEvent(user, id, payload) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  const nextRegistrationStart = payload.registrationStart || event.registrationStart;
  const nextRegistrationEnd = payload.registrationEnd || event.registrationEnd;
  if (nextRegistrationEnd <= nextRegistrationStart) {
    throw ApiError.badRequest('报名截止时间必须晚于报名开始时间');
  }

  Object.assign(event, payload);
  await event.save();
  return event;
}

export async function updateEventStatus(user, id, status) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  if (status === 'published') {
    if (!event.groups.length) throw ApiError.badRequest('请先配置赛事组别再发布');
    const invalid = event.groups.find((group) => group.quota < 1);
    if (invalid) throw ApiError.badRequest(`组别「${invalid.name}」名额未配置`);
  }

  event.status = status;
  await event.save();
  return event;
}

export async function deleteEvent(user, id) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  if (user.role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('仅超级管理员可以删除赛事');
  }

  const activeCount = await Registration.countDocuments({
    event: id,
    status: { $in: ACTIVE_STATUSES },
  });
  if (activeCount > 0) {
    throw ApiError.conflict(`该赛事仍有 ${activeCount} 条有效报名，请先关闭赛事`);
  }

  await event.deleteOne();
  return event;
}

export async function addGroup(user, id, payload) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  const code = payload.code.toUpperCase();
  if (event.groups.some((group) => group.code === code)) {
    throw ApiError.conflict(`组别代码 ${code} 已存在`);
  }

  event.groups.push({ ...payload, code });
  await event.save();
  return event;
}

export async function updateGroup(user, id, groupId, payload) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  const group = event.groups.id(groupId);
  if (!group) throw ApiError.notFound('组别不存在');

  if (payload.code) {
    const code = payload.code.toUpperCase();
    const duplicated = event.groups.some(
      (item) => item.code === code && String(item._id) !== String(groupId),
    );
    if (duplicated) throw ApiError.conflict(`组别代码 ${code} 已存在`);
    payload.code = code;
  }

  if (payload.quota != null && payload.quota < group.approvedCount) {
    throw ApiError.badRequest(`名额不能小于已报名人数 ${group.approvedCount}`);
  }

  Object.assign(group, payload);
  await event.save();
  return event;
}

export async function removeGroup(user, id, groupId) {
  const event = await Event.findById(id);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertCanManageEvent(user, event);

  const group = event.groups.id(groupId);
  if (!group) throw ApiError.notFound('组别不存在');

  if (group.approvedCount > 0) {
    throw ApiError.conflict('该组别已有报名，不能删除，可将其关闭');
  }

  group.deleteOne();
  await event.save();
  return event;
}
