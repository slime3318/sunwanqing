import { ApiError } from '../../utils/apiError.js';
import { generateBibNumber, generateOrderNo } from '../../utils/codes.js';
import { parseIdCard, maskIdCard } from '../../utils/idCard.js';
import { escapeRegex, buildCaseInsensitiveRegex } from '../../utils/regex.js';
import { Event } from '../../models/Event.js';
import { Counter } from '../../models/Counter.js';
import { Registration, REGISTRATION_STATUS, ACTIVE_STATUSES } from '../../models/Registration.js';
import { reserveQuota, releaseQuota } from '../../services/quotaService.js';
import { paymentService } from '../../services/paymentService.js';
import { notificationService } from '../../services/notificationService.js';
import { ROLES, isStaff } from '../../middleware/auth.js';

const { PENDING_PAYMENT, PENDING_REVIEW, APPROVED, REJECTED, CANCELLED, REFUNDED } = REGISTRATION_STATUS;

function assertRegistrationWindow(event) {
  const now = Date.now();
  if (event.status !== 'published') throw ApiError.badRequest('该赛事尚未开放报名');
  if (now < new Date(event.registrationStart).getTime()) throw ApiError.badRequest('报名尚未开始');
  if (now > new Date(event.registrationEnd).getTime()) throw ApiError.badRequest('报名已截止');
}

function buildParticipant(input, group) {
  const parsed = parseIdCard(input.idCard);
  if (!parsed) throw ApiError.badRequest('身份证号不合法');

  if (parsed.age < group.minAge || parsed.age > group.maxAge) {
    throw ApiError.badRequest(
      `该组别要求年龄在 ${group.minAge}-${group.maxAge} 周岁，当前年龄 ${parsed.age} 周岁`,
    );
  }

  return {
    name: input.name.trim(),
    idCard: parsed.idCard,
    gender: parsed.gender,
    birthDate: parsed.birthDate,
    age: parsed.age,
    phone: input.phone,
    email: input.email || undefined,
    city: input.city,
    club: input.club,
    tshirtSize: input.tshirtSize || 'M',
    bloodType: input.bloodType || 'unknown',
    emergencyContact: input.emergencyContact,
  };
}

export async function createRegistration(user, payload) {
  const event = await Event.findById(payload.eventId);
  if (!event) throw ApiError.notFound('赛事不存在');
  assertRegistrationWindow(event);

  const group = event.groups.id(payload.groupId);
  if (!group) throw ApiError.notFound('赛事组别不存在');
  if (!group.enabled) throw ApiError.badRequest('该组别已关闭报名');

  const participant = buildParticipant(payload.participant, group);
  const duplicateGuard = Registration.buildDuplicateGuard(event._id, participant.idCard);

  const duplicated = await Registration.findOne({
    duplicateGuard,
    status: { $in: ACTIVE_STATUSES },
  });
  if (duplicated) throw ApiError.conflict('该身份证号已报名本赛事，请勿重复报名');

  const reserved = await reserveQuota(event._id, group._id);
  if (!reserved) throw ApiError.conflict('该组别名额已满，请选择其他组别');

  let registration;
  try {
    const orderNo = generateOrderNo();
    const isFree = Number(group.price) === 0;

    registration = await Registration.create({
      orderNo,
      event: event._id,
      group: group._id,
      groupSnapshot: {
        code: group.code,
        name: group.name,
        distanceKm: group.distanceKm,
        price: group.price,
      },
      user: user._id,
      duplicateGuard,
      participant,
      remark: payload.remark,
      status: isFree ? PENDING_REVIEW : PENDING_PAYMENT,
      payment: {
        orderNo,
        method: isFree ? 'mock' : payload.paymentMethod,
        status: isFree ? 'paid' : 'unpaid',
        amount: group.price,
        paidAt: isFree ? new Date() : undefined,
        transactionId: isFree ? `free_${orderNo}` : undefined,
      },
    });
  } catch (error) {
    await releaseQuota(event._id, group._id);
    if (error.code === 11000) throw ApiError.conflict('该身份证号已报名本赛事，请勿重复报名');
    throw error;
  }

  await notificationService.registrationSubmitted(registration, event);
  return registration;
}

export async function payRegistration(user, id, { method }) {
  const registration = await Registration.findById(id);
  if (!registration) throw ApiError.notFound('报名记录不存在');
  if (String(registration.user) !== String(user._id)) throw ApiError.forbidden('只能支付自己的报名');

  if (registration.status !== PENDING_PAYMENT) {
    throw ApiError.badRequest('当前报名状态无需支付');
  }

  const payment = await paymentService.createPayment({
    orderNo: registration.orderNo,
    amount: registration.payment.amount,
    method,
    subject: `${registration.groupSnapshot.name}报名费`,
  });

  registration.payment.method = method;
  registration.payment.status = 'paid';
  registration.payment.paidAt = new Date();
  registration.payment.transactionId = payment.prepayId;
  registration.status = PENDING_REVIEW;
  await registration.save();

  return registration;
}

export async function cancelRegistration(user, id, { reason }) {
  const registration = await Registration.findById(id);
  if (!registration) throw ApiError.notFound('报名记录不存在');
  if (String(registration.user) !== String(user._id)) throw ApiError.forbidden('只能取消自己的报名');

  if (![PENDING_PAYMENT, PENDING_REVIEW].includes(registration.status)) {
    throw ApiError.badRequest('当前状态不支持取消报名');
  }

  const paid = registration.payment.status === 'paid';
  if (paid) {
    await paymentService.refund({ orderNo: registration.orderNo, amount: registration.payment.amount });
    registration.payment.status = 'refunded';
    registration.payment.refundedAt = new Date();
  }

  registration.status = paid ? REFUNDED : CANCELLED;
  registration.cancelledAt = new Date();
  registration.cancelReason = reason;
  registration.duplicateGuard = undefined;
  await registration.save();

  await releaseQuota(registration.event, registration.group);
  return registration;
}

export async function reviewRegistration(operator, id, { status, comment, medicalCertificateUrl }) {
  const registration = await Registration.findById(id).populate('event');
  if (!registration) throw ApiError.notFound('报名记录不存在');

  await assertCanOperateRegistration(operator, registration);

  if (registration.status !== PENDING_REVIEW) {
    throw ApiError.badRequest('仅待审核状态的报名可以审核');
  }

  if (status === APPROVED) {
    if (!registration.bibNumber) {
      const sequence = await Counter.next(`event:${registration.event._id}`);
      registration.bibNumber = generateBibNumber('M', sequence);
    }
    registration.status = APPROVED;
  } else {
    registration.status = REJECTED;
    registration.duplicateGuard = undefined;
    await releaseQuota(registration.event._id, registration.group);
    if (registration.payment.status === 'paid') {
      await paymentService.refund({
        orderNo: registration.orderNo,
        amount: registration.payment.amount,
      });
      registration.payment.status = 'refunded';
      registration.payment.refundedAt = new Date();
    }
  }

  registration.review = {
    reviewedBy: operator._id,
    reviewedAt: new Date(),
    comment,
    medicalCertificateUrl: medicalCertificateUrl || registration.review?.medicalCertificateUrl,
  };
  await registration.save();

  await notificationService.reviewFinished(registration, registration.event, status === APPROVED);
  return registration;
}

export async function batchReview(operator, { ids, status, comment }) {
  const results = { succeeded: [], failed: [] };

  for (const id of ids) {
    try {
      const registration = await reviewRegistration(operator, id, { status, comment });
      results.succeeded.push(registration._id);
    } catch (error) {
      results.failed.push({ id, message: error.message });
    }
  }

  return results;
}

export async function listRegistrations({ user, query, page, pageSize, skip }) {
  const filter = buildRegistrationFilter(user, query);

  if (query.keyword) {
    // 姓名不区分大小写匹配；身份证统一按大写匹配（存储时已 uppercase）
    filter.$or = [
      { 'participant.name': buildCaseInsensitiveRegex(query.keyword) },
      { 'participant.idCard': new RegExp(escapeRegex(query.keyword).toUpperCase()) },
    ];
  }

  const [items, total] = await Promise.all([
    Registration.find(filter)
      .populate('event', 'title city startDate status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    Registration.countDocuments(filter),
  ]);

  return { items, total };
}

export function buildRegistrationFilter(user, query = {}) {
  const filter = {};

  if (query.scope !== 'all' || !isStaff(user)) {
    if (!user) throw ApiError.unauthorized();
    filter.user = user._id;
    return filter;
  }

  // 赛事编辑员只能看到被分配赛事的报名；eventId 过滤需与管辖范围取交集，不能覆盖
  if (user.role === ROLES.EVENT_EDITOR) {
    const allowed = (user.managedEvents || []).map(String);
    const scoped = query.eventId && allowed.includes(String(query.eventId)) ? [query.eventId] : allowed;
    filter.event = { $in: scoped };
  } else if (query.eventId) {
    filter.event = query.eventId;
  }

  if (query.groupId) filter.group = query.groupId;
  if (query.status) filter.status = query.status;

  return filter;
}

async function assertCanOperateRegistration(user, registration) {
  if ([ROLES.SUPER_ADMIN, ROLES.OPERATOR].includes(user.role)) return;

  if (user.role === ROLES.EVENT_EDITOR) {
    throw ApiError.forbidden('赛事编辑员只能查看报名数据，不能执行审核');
  }

  throw ApiError.forbidden();
}

export async function getRegistration(user, id) {
  const registration = await Registration.findById(id).populate('event', 'title city startDate status');
  if (!registration) throw ApiError.notFound('报名记录不存在');

  const isOwner = registration.user && String(registration.user) === String(user._id);
  if (!isOwner && !isStaff(user)) throw ApiError.forbidden();

  if (!isOwner && user.role === ROLES.EVENT_EDITOR) {
    const assigned = (user.managedEvents || []).some(
      (eventId) => String(eventId) === String(registration.event?._id || registration.event),
    );
    if (!assigned) throw ApiError.forbidden('你只能查看被分配赛事的报名数据');
  }

  return registration;
}

export async function exportRegistrationsCsv(user, query) {
  const filter = buildRegistrationFilter(user, { ...query, scope: 'all' });

  const items = await Registration.find(filter)
    .populate('event', 'title')
    .sort({ createdAt: -1 })
    .limit(5000);

  const header = [
    '报名单号',
    '赛事',
    '组别',
    '姓名',
    '身份证号',
    '性别',
    '年龄',
    '手机号',
    '邮箱',
    '城市',
    '俱乐部',
    'T恤尺码',
    '紧急联系人',
    '紧急联系人电话',
    '报名状态',
    '支付状态',
    '金额',
    '参赛号码',
    '报名时间',
  ];

  const rows = items.map((item) => [
    item.orderNo,
    item.event?.title || '',
    item.groupSnapshot.name,
    item.participant.name,
    maskIdCard(item.participant.idCard),
    item.participant.gender === 'male' ? '男' : '女',
    item.participant.age,
    item.participant.phone,
    item.participant.email || '',
    item.participant.city || '',
    item.participant.club || '',
    item.participant.tshirtSize,
    item.participant.emergencyContact?.name || '',
    item.participant.emergencyContact?.phone || '',
    STATUS_LABELS[item.status] || item.status,
    PAYMENT_LABELS[item.payment?.status] || item.payment?.status || '',
    item.payment?.amount ?? 0,
    item.bibNumber || '',
    item.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  return { csv, count: items.length };
}

export const STATUS_LABELS = {
  [PENDING_PAYMENT]: '待支付',
  [PENDING_REVIEW]: '待审核',
  [APPROVED]: '已通过',
  [REJECTED]: '已驳回',
  [CANCELLED]: '已取消',
  [REFUNDED]: '已退款',
};

export const PAYMENT_LABELS = {
  unpaid: '未支付',
  paid: '已支付',
  refunded: '已退款',
  failed: '支付失败',
};
