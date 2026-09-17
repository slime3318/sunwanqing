import { ApiError } from '../../utils/apiError.js';
import { Event } from '../../models/Event.js';
import { Registration, REGISTRATION_STATUS } from '../../models/Registration.js';
import { ROLES } from '../../middleware/auth.js';

function scopeEventFilter(user, eventId) {
  if (user.role === ROLES.EVENT_EDITOR) {
    const allowed = (user.managedEvents || []).map(String);
    const scoped = eventId && allowed.includes(String(eventId)) ? [eventId] : allowed;
    return { _id: { $in: scoped } };
  }
  return eventId ? { _id: eventId } : {};
}

export async function overview(user, { eventId } = {}) {
  const eventFilter = scopeEventFilter(user, eventId);
  const events = await Event.find(eventFilter).select('title status groups startDate city');

  if (eventId && !events.length) throw ApiError.notFound('赛事不存在或无权查看');

  const eventIds = events.map((item) => item._id);
  const match = { event: { $in: eventIds } };

  const [statusAgg, revenueAgg, dailyAgg] = await Promise.all([
    Registration.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Registration.aggregate([
      { $match: { ...match, 'payment.status': 'paid' } },
      { $group: { _id: null, revenue: { $sum: '$payment.amount' }, orders: { $sum: 1 } } },
    ]),
    Registration.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 14 },
    ]),
  ]);

  const statusCounts = Object.values(REGISTRATION_STATUS).reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  statusAgg.forEach((item) => {
    statusCounts[item._id] = item.count;
  });

  const totalRegistrations = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const totalQuota = events.reduce(
    (sum, item) => sum + item.groups.reduce((inner, group) => inner + group.quota, 0),
    0,
  );
  const occupied = events.reduce(
    (sum, item) => sum + item.groups.reduce((inner, group) => inner + group.approvedCount, 0),
    0,
  );

  return {
    events: {
      total: events.length,
      published: events.filter((item) => item.status === 'published').length,
      draft: events.filter((item) => item.status === 'draft').length,
      closed: events.filter((item) => item.status === 'closed').length,
    },
    registrations: {
      total: totalRegistrations,
      byStatus: statusCounts,
      approved: statusCounts[REGISTRATION_STATUS.APPROVED],
      pendingReview: statusCounts[REGISTRATION_STATUS.PENDING_REVIEW],
      pendingPayment: statusCounts[REGISTRATION_STATUS.PENDING_PAYMENT],
    },
    quota: {
      total: totalQuota,
      occupied,
      remaining: Math.max(0, totalQuota - occupied),
      occupancyRate: totalQuota ? Number(((occupied / totalQuota) * 100).toFixed(2)) : 0,
    },
    revenue: {
      total: revenueAgg[0]?.revenue || 0,
      paidOrders: revenueAgg[0]?.orders || 0,
    },
    daily: dailyAgg.map((item) => ({ date: item._id, count: item.count })).reverse(),
  };
}

export async function eventBreakdown(user, eventId) {
  const filter = scopeEventFilter(user, eventId);
  const event = await Event.findOne(filter);
  if (!event) throw ApiError.notFound('赛事不存在或无权查看');

  const groupStats = await Registration.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: '$group',
        total: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', REGISTRATION_STATUS.APPROVED] }, 1, 0] } },
        pendingReview: {
          $sum: { $cond: [{ $eq: ['$status', REGISTRATION_STATUS.PENDING_REVIEW] }, 1, 0] },
        },
        revenue: {
          $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, '$payment.amount', 0] },
        },
      },
    },
  ]);

  const byGroup = event.groups.map((group) => {
    const stat = groupStats.find((item) => String(item._id) === String(group._id)) || {};
    return {
      groupId: group._id,
      code: group.code,
      name: group.name,
      price: group.price,
      quota: group.quota,
      occupied: group.approvedCount,
      remaining: group.remainingQuota,
      registrations: stat.total || 0,
      approved: stat.approved || 0,
      pendingReview: stat.pendingReview || 0,
      revenue: stat.revenue || 0,
    };
  });

  return {
    event: {
      id: event._id,
      title: event.title,
      city: event.city,
      status: event.status,
      startDate: event.startDate,
    },
    totals: {
      registrations: byGroup.reduce((sum, item) => sum + item.registrations, 0),
      approved: byGroup.reduce((sum, item) => sum + item.approved, 0),
      revenue: byGroup.reduce((sum, item) => sum + item.revenue, 0),
      quota: byGroup.reduce((sum, item) => sum + item.quota, 0),
      remaining: byGroup.reduce((sum, item) => sum + item.remaining, 0),
    },
    byGroup,
  };
}
