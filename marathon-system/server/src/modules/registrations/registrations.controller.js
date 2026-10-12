import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated, parsePagination } from '../../utils/http.js';
import * as service from './registrations.service.js';

export const create = asyncHandler(async (req, res) => {
  const registration = await service.createRegistration(req.user, req.body);
  return ok(res, { registration }, '报名已提交', 201);
});

export const mine = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { items, total } = await service.listRegistrations({
    user: req.user,
    query: { ...req.query, scope: 'mine' },
    ...pagination,
  });
  return paginated(res, items, { ...pagination, total });
});

export const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { items, total } = await service.listRegistrations({
    user: req.user,
    query: req.query,
    ...pagination,
  });
  return paginated(res, items, { ...pagination, total });
});

export const detail = asyncHandler(async (req, res) => {
  const registration = await service.getRegistration(req.user, req.params.id);
  return ok(res, { registration });
});

export const pay = asyncHandler(async (req, res) => {
  const registration = await service.payRegistration(req.user, req.params.id, req.body);
  return ok(res, { registration }, '支付成功');
});

export const cancel = asyncHandler(async (req, res) => {
  const registration = await service.cancelRegistration(req.user, req.params.id, req.body);
  return ok(res, { registration }, '报名已取消，退款将原路退回');
});

export const review = asyncHandler(async (req, res) => {
  const registration = await service.reviewRegistration(req.user, req.params.id, req.body);
  return ok(res, { registration }, '审核完成');
});

export const batchReview = asyncHandler(async (req, res) => {
  const result = await service.batchReview(req.user, req.body);
  const message = `批量处理完成：成功 ${result.succeeded.length} 条，失败 ${result.failed.length} 条`;
  return ok(res, result, message);
});

export const exportCsv = asyncHandler(async (req, res) => {
  const { csv, count } = await service.exportRegistrationsCsv(req.user, req.query);
  const filename = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Exported-Count', String(count));
  return res.send(`\uFEFF${csv}`);
});

export const statusMeta = asyncHandler(async (req, res) =>
  ok(res, { statuses: service.STATUS_LABELS, paymentStatuses: service.PAYMENT_LABELS }),
);
