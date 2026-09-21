import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated, parsePagination } from '../../utils/http.js';
import { ApiError } from '../../utils/apiError.js';
import * as eventsService from './events.service.js';

function buildPayload(body) {
  const payload = { ...body };
  if (body.endDate === '' || body.endDate === null) payload.endDate = undefined;
  return payload;
}

export const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query, { defaultPageSize: 12 });
  const { items, total } = await eventsService.listEvents({
    user: req.user,
    query: req.query,
    ...pagination,
  });
  return paginated(res, items, { ...pagination, total });
});

export const detail = asyncHandler(async (req, res) => {
  const event = await eventsService.getEventById(req.params.id, req.user);
  return ok(res, { event });
});

export const create = asyncHandler(async (req, res) => {
  const event = await eventsService.createEvent(req.user, buildPayload(req.body));
  return ok(res, { event }, '赛事已创建', 201);
});

export const update = asyncHandler(async (req, res) => {
  const event = await eventsService.updateEvent(req.user, req.params.id, buildPayload(req.body));
  return ok(res, { event }, '赛事已更新');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const event = await eventsService.updateEventStatus(req.user, req.params.id, req.body.status);
  return ok(res, { event }, '赛事状态已更新');
});

export const remove = asyncHandler(async (req, res) => {
  await eventsService.deleteEvent(req.user, req.params.id);
  return ok(res, null, '赛事已删除');
});

export const addGroup = asyncHandler(async (req, res) => {
  const event = await eventsService.addGroup(req.user, req.params.id, req.body);
  return ok(res, { event }, '组别已添加', 201);
});

export const updateGroup = asyncHandler(async (req, res) => {
  if (!Object.keys(req.body).length) throw ApiError.badRequest('没有需要更新的字段');
  const event = await eventsService.updateGroup(req.user, req.params.id, req.params.groupId, req.body);
  return ok(res, { event }, '组别已更新');
});

export const removeGroup = asyncHandler(async (req, res) => {
  const event = await eventsService.removeGroup(req.user, req.params.id, req.params.groupId);
  return ok(res, { event }, '组别已删除');
});
