export const REGISTRATION_STATUS_LABELS = {
  pending_payment: '待支付',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已取消',
  refunded: '已退款',
};

export const REGISTRATION_STATUS_TONES = {
  pending_payment: 'warn',
  pending_review: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'muted',
  refunded: 'muted',
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: '未支付',
  paid: '已支付',
  refunded: '已退款',
  failed: '支付失败',
};

export const EVENT_STATUS_LABELS = {
  draft: '草稿',
  published: '报名中',
  closed: '已结束',
};

export const EVENT_STATUS_TONES = {
  draft: 'muted',
  published: 'success',
  closed: 'danger',
};

export const ROLE_LABELS = {
  super_admin: '超级管理员',
  operator: '运营人员',
  event_editor: '赛事编辑员',
  participant: '选手',
};

export const PAYMENT_METHOD_LABELS = {
  wechat: '微信支付',
  alipay: '支付宝',
  mock: '模拟支付',
};

export function formatCurrency(value) {
  const number = Number(value || 0);
  return `¥${number.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value, withTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit', hour12: false });
  return date.toLocaleString('zh-CN', options).replace(/\//g, '-');
}

export function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function maskIdCard(value) {
  const id = String(value || '');
  if (id.length < 8) return '****';
  return `${id.slice(0, 4)}**********${id.slice(-4)}`;
}

export function maskPhone(value) {
  const phone = String(value || '');
  if (phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function describeRegistrationWindow(event) {
  if (!event) return '';
  const now = Date.now();
  const start = new Date(event.registrationStart).getTime();
  const end = new Date(event.registrationEnd).getTime();
  if (now < start) return '报名未开始';
  if (now > end) return '报名已截止';
  return '报名进行中';
}
