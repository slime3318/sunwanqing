/**
 * 端到端冒烟测试：无需前端即可验证「注册 -> 建赛事 -> 发布 -> 报名 -> 支付 -> 审核 -> 统计」核心闭环。
 *
 * 用法（需可用的 MongoDB，推荐用 Atlas 或独立测试库）：
 *   npm run smoke
 *   # 保留测试数据（默认跑完自动清理）
 *   SMOKE_KEEP=1 npm run smoke
 */
import 'dotenv/config';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Event } from '../src/models/Event.js';
import { Registration } from '../src/models/Registration.js';
import { Counter } from '../src/models/Counter.js';
import { VerificationCode } from '../src/models/VerificationCode.js';
import { ROLES } from '../src/config/roles.js';
import { makeDemoIdCard } from './lib/demoIdCard.js';

const results = [];

function check(name, passed, info = '') {
  results.push({ name, passed: Boolean(passed), info });
  const icon = passed ? 'PASS' : 'FAIL';
  console.info(`[smoke] ${icon}  ${name}${info ? ` -> ${info}` : ''}`);
}

async function main() {
  await connectDatabase();
  console.info(`[smoke] 数据库：${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);

  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  console.info(`[smoke] 测试服务已启动：${base}`);

  const stamp = Date.now();
  const adminPhone = `139${String(stamp).slice(-8)}`;
  const runnerPhone = `138${String(stamp).slice(-8)}`;
  const runnerIdCard = makeDemoIdCard({ areaCode: '110101', birthDate: '1993-06-15', gender: 'male' });
  const created = { userIds: [], eventIds: [], registrationIds: [] };

  async function call(method, path, { token, body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
    return { status: response.status, payload, data: payload?.data };
  }

  try {
    // 1. 准备管理员账号
    const admin = new User({ name: '冒烟管理员', phone: adminPhone, role: ROLES.SUPER_ADMIN });
    await admin.setPassword('Smoke123456');
    await admin.save();
    created.userIds.push(admin._id);

    const adminLogin = await call('POST', '/auth/login', {
      body: { account: adminPhone, password: 'Smoke123456' },
    });
    const adminToken = adminLogin.data?.token;
    check('管理员登录', adminLogin.status === 200 && Boolean(adminToken), `HTTP ${adminLogin.status}`);

    // 2. 选手注册（短信验证码）
    const sms = await call('POST', '/auth/sms/send', {
      body: { phone: runnerPhone, scene: 'register' },
    });
    const devCode = sms.data?.devCode;
    check('发送注册验证码', sms.status === 200 && Boolean(devCode), `devCode=${devCode}`);

    const register = await call('POST', '/auth/register', {
      body: {
        name: '冒烟选手',
        phone: runnerPhone,
        password: 'Runner123456',
        smsCode: devCode,
      },
    });
    const runnerToken = register.data?.token;
    created.userIds.push(register.data?.user?.id);
    check('选手注册并登录', register.status === 201 && Boolean(runnerToken), `HTTP ${register.status}`);

    // 3. 非法身份证必须被拦截
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const createEvent = await call('POST', '/events', {
      token: adminToken,
      body: {
        title: `冒烟测试马拉松 ${stamp}`,
        city: '测试城',
        venue: '测试体育场',
        startDate: new Date(now + 30 * day).toISOString(),
        registrationStart: new Date(now - day).toISOString(),
        registrationEnd: new Date(now + 15 * day).toISOString(),
        groups: [
          { code: 'FULL', name: '全程马拉松', distanceKm: 42.195, price: 200, quota: 2, minAge: 18, maxAge: 70 },
          { code: 'FUN', name: '欢乐跑', distanceKm: 5, price: 0, quota: 50, minAge: 10, maxAge: 80 },
        ],
      },
    });
    const event = createEvent.data?.event;
    created.eventIds.push(event?._id);
    check('创建赛事与组别', createEvent.status === 201 && event?.groups?.length === 2, `HTTP ${createEvent.status}`);

    const publish = await call('PATCH', `/events/${event?._id}/status`, {
      token: adminToken,
      body: { status: 'published' },
    });
    check('发布赛事', publish.status === 200, `status=${publish.data?.event?.status}`);

    const fullGroup = event?.groups?.find((group) => group.code === 'FULL');
    const funGroup = event?.groups?.find((group) => group.code === 'FUN');

    const baseParticipant = {
      name: '冒烟选手',
      idCard: '110101199001011234',
      phone: runnerPhone,
      emergencyContact: { name: '紧急人', phone: '13900000009', relation: '家属' },
    };

    const invalid = await call('POST', '/registrations', {
      token: runnerToken,
      body: { eventId: event?._id, groupId: fullGroup?._id, participant: baseParticipant },
    });
    check(
      '非法身份证被拒绝',
      invalid.status === 400,
      invalid.payload?.details?.[0]?.message || `HTTP ${invalid.status}`,
    );

    // 4. 正常报名 + 支付
    const registration = await call('POST', '/registrations', {
      token: runnerToken,
      body: {
        eventId: event?._id,
        groupId: fullGroup?._id,
        paymentMethod: 'wechat',
        participant: { ...baseParticipant, idCard: runnerIdCard },
      },
    });
    const reg = registration.data?.registration;
    created.registrationIds.push(reg?._id);
    check('提交报名并占用名额', registration.status === 201 && reg?.status === 'pending_payment', `状态=${reg?.status}`);

    const pay = await call('POST', `/registrations/${reg?._id}/pay`, {
      token: runnerToken,
      body: { method: 'wechat' },
    });
    check('模拟支付成功', pay.status === 200 && pay.data?.registration?.status === 'pending_review', `状态=${pay.data?.registration?.status}`);

    // 5. 超额报名必须被拦截（FULL 组名额为 2，已被占用 1，此处再报名 2 条应只成功 1 条）
    const secondIdCard = makeDemoIdCard({ areaCode: '110101', birthDate: '1994-03-08', sequence: '002', gender: 'male' });
    const thirdIdCard = makeDemoIdCard({ areaCode: '110101', birthDate: '1995-09-21', sequence: '003', gender: 'female' });
    const [extraA, extraB] = await Promise.all([
      call('POST', '/registrations', {
        token: runnerToken,
        body: {
          eventId: event?._id,
          groupId: fullGroup?._id,
          participant: { ...baseParticipant, name: '并发选手A', idCard: secondIdCard },
        },
      }),
      call('POST', '/registrations', {
        token: runnerToken,
        body: {
          eventId: event?._id,
          groupId: fullGroup?._id,
          participant: { ...baseParticipant, name: '并发选手B', idCard: thirdIdCard },
        },
      }),
    ]);
    const successCount = [extraA, extraB].filter((item) => item.status === 201).length;
    const conflictCount = [extraA, extraB].filter((item) => item.status === 409).length;
    [extraA, extraB].forEach((item) => created.registrationIds.push(item.data?.registration?._id));
    check(
      '并发报名不超额（名额上限生效）',
      successCount === 1 && conflictCount === 1,
      `成功 ${successCount} 条 / 名额已满 ${conflictCount} 条`,
    );

    const refresh = await call('GET', `/events/${event?._id}`);
    const fullAfter = refresh.data?.event?.groups?.find((group) => group.code === 'FULL');
    check(
      '组别已占用人数写入一致',
      fullAfter?.approvedCount === 2,
      `approvedCount=${fullAfter?.approvedCount}`,
    );

    // 6. 重复报名拦截
    const duplicate = await call('POST', '/registrations', {
      token: runnerToken,
      body: {
        eventId: event?._id,
        groupId: funGroup?._id,
        participant: { ...baseParticipant, idCard: runnerIdCard },
      },
    });
    check('同一赛事重复身份证被拦截', duplicate.status === 409, duplicate.payload?.message);

    // 7. 审核
    const review = await call('PATCH', `/registrations/${reg?._id}/review`, {
      token: adminToken,
      body: { status: 'approved', comment: '资料齐全' },
    });
    check(
      '审核通过并分配参赛号码',
      review.status === 200 && review.data?.registration?.status === 'approved' && Boolean(review.data?.registration?.bibNumber),
      `号码=${review.data?.registration?.bibNumber}`,
    );

    const pendingIds = [extraA, extraB]
      .filter((item) => item.status === 201)
      .map((item) => item.data?.registration?._id);

    // 未支付的报名不应被审核（状态机保护）
    const reviewUnpaid = await call('PATCH', `/registrations/${pendingIds[0]}/review`, {
      token: adminToken,
      body: { status: 'approved' },
    });
    check(
      '未支付报名不能被审核',
      reviewUnpaid.status === 400,
      reviewUnpaid.payload?.message || `HTTP ${reviewUnpaid.status}`,
    );

    // 支付后才进入待审核队列
    const payExtra = await call('POST', `/registrations/${pendingIds[0]}/pay`, {
      token: runnerToken,
      body: { method: 'alipay' },
    });
    check(
      '并发成功的报名完成支付',
      payExtra.status === 200 && payExtra.data?.registration?.status === 'pending_review',
      `状态=${payExtra.data?.registration?.status}`,
    );

    const batch = await call('POST', '/registrations/batch-review', {
      token: adminToken,
      body: { ids: pendingIds, status: 'rejected', comment: '冒烟测试批量驳回' },
    });
    check(
      '批量审核（驳回并释放名额）',
      batch.status === 200 && batch.data?.succeeded?.length === pendingIds.length,
      `成功 ${batch.data?.succeeded?.length} 条`,
    );

    const released = await call('GET', `/events/${event?._id}`);
    const fullReleased = released.data?.event?.groups?.find((group) => group.code === 'FULL');
    check('驳回后名额被释放', fullReleased?.approvedCount === 1, `approvedCount=${fullReleased?.approvedCount}`);

    // 8. 选手查询与导出
    const mine = await call('GET', '/registrations/mine', { token: runnerToken });
    check('选手查询自己的报名', mine.status === 200 && mine.data?.items?.length >= 1, `${mine.data?.items?.length} 条`);

    const search = await call('GET', `/registrations?scope=all&keyword=${encodeURIComponent('冒烟选手')}`, {
      token: adminToken,
    });
    check('按姓名筛选报名数据', search.status === 200 && search.data?.items?.length >= 1, `${search.data?.items?.length} 条`);

    const exportResponse = await fetch(`${base}/registrations/export?eventId=${event?._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csv = await exportResponse.text();
    check(
      '导出报名数据 CSV',
      exportResponse.status === 200 && csv.includes('报名单号'),
      `${csv.split('\r\n').length - 1} 行数据`,
    );

    // 9. 统计
    const stats = await call('GET', `/stats/overview?eventId=${event?._id}`, { token: adminToken });
    const overview = stats.data;
    check(
      '统计报名人数与收入',
      stats.status === 200 && overview?.revenue?.total === 200,
      `收入=${overview?.revenue?.total} / 报名总数=${overview?.registrations?.total}`,
    );

    const breakdown = await call('GET', `/stats/events/${event?._id}`, { token: adminToken });
    check(
      '分组统计明细',
      breakdown.status === 200 && breakdown.data?.byGroup?.length === 2,
      `${breakdown.data?.byGroup?.length} 个组别`,
    );

    // 10. 权限校验
    const runnerAttempt = await call('GET', '/registrations?scope=all', { token: runnerToken });
    check('选手无法访问后台报名列表（RBAC）', runnerAttempt.status === 403, `HTTP ${runnerAttempt.status}`);

    const noToken = await call('GET', '/stats/overview');
    check('未登录访问统计被拒绝', noToken.status === 401, `HTTP ${noToken.status}`);
  } finally {
    if (process.env.SMOKE_KEEP === '1') {
      console.info('[smoke] SMOKE_KEEP=1，保留测试数据');
    } else {
      await Registration.deleteMany({ _id: { $in: created.registrationIds.filter(Boolean) } });
      await Event.deleteMany({ _id: { $in: created.eventIds.filter(Boolean) } });
      await VerificationCode.deleteMany({ target: { $in: [adminPhone, runnerPhone] } });
      await Counter.deleteMany({ key: { $regex: `^event:(${created.eventIds.filter(Boolean).join('|')})` } });
      await User.deleteMany({ _id: { $in: created.userIds.filter(Boolean) } });
      console.info('[smoke] 测试数据已清理');
    }

    server.close();
    await disconnectDatabase();
  }

  const failed = results.filter((item) => !item.passed);
  console.info(`\n[smoke] 共 ${results.length} 项，通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.error('[smoke] 失败项：', failed.map((item) => item.name).join('、'));
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error('[smoke] 执行异常', error);
  await disconnectDatabase().catch(() => {});
  process.exitCode = 1;
});
