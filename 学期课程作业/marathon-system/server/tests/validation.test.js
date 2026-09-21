import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidChineseIdCard, parseIdCard, maskIdCard, maskPhone } from '../src/utils/idCard.js';
import { generateNumericCode, generateOrderNo, generateBibNumber } from '../src/utils/codes.js';
import { permissionsOf, roleHasPermission, PERMISSIONS } from '../src/config/permissions.js';
import { ROLES } from '../src/config/roles.js';
import { registerSchema, loginSchema } from '../src/modules/auth/auth.schema.js';
import { createEventSchema, createGroupSchema } from '../src/modules/events/events.schema.js';
import { createRegistrationSchema } from '../src/modules/registrations/registrations.schema.js';
import { Registration } from '../src/models/Registration.js';
import { parsePagination } from '../src/utils/http.js';
import { makeDemoIdCard } from '../scripts/lib/demoIdCard.js';

const maleIdCard = makeDemoIdCard({ areaCode: '110101', birthDate: '1990-01-01', gender: 'male' });
const femaleIdCard = makeDemoIdCard({ areaCode: '110101', birthDate: '2000-05-20', gender: 'female' });

test('身份证校验：合法号码通过', () => {
  assert.equal(isValidChineseIdCard(maleIdCard), true);
  assert.equal(isValidChineseIdCard(femaleIdCard), true);
  assert.match(maleIdCard, /^\d{17}[\dX]$/);
});

test('身份证校验：校验码错误被拒绝', () => {
  const wrongCheck = `${maleIdCard.slice(0, 17)}${maleIdCard[17] === '1' ? '2' : '1'}`;
  assert.equal(isValidChineseIdCard(wrongCheck), false);
});

test('身份证校验：不存在的日期被拒绝', () => {
  assert.equal(isValidChineseIdCard('110101199002300014'), false);
});

test('身份证校验：位数与字符非法被拒绝', () => {
  assert.equal(isValidChineseIdCard('11010119900101001'), false);
  assert.equal(isValidChineseIdCard('11010119900101001A'), false);
  assert.equal(isValidChineseIdCard(''), false);
  assert.equal(isValidChineseIdCard(null), false);
});

test('身份证解析：性别、生日与年龄', () => {
  const male = parseIdCard(maleIdCard);
  assert.equal(male.gender, 'male');
  assert.equal(male.birthDate.toISOString().slice(0, 10), '1990-01-01');
  assert.ok(male.age >= 36 && male.age <= 37, `age=${male.age}`);

  const female = parseIdCard(femaleIdCard);
  assert.equal(female.gender, 'female');
  assert.equal(female.birthDate.toISOString().slice(0, 10), '2000-05-20');
});

test('身份证解析：非法号码返回 null', () => {
  assert.equal(parseIdCard('123456789012345678'), null);
});

test('脱敏：身份证与手机号', () => {
  assert.equal(maskIdCard(maleIdCard), `${maleIdCard.slice(0, 4)}**********${maleIdCard.slice(-4)}`);
  assert.equal(maskPhone('13800000000'), '138****0000');
  assert.equal(maskPhone('123'), '****');
});

test('编码生成：验证码位数、订单号前缀、参赛号码补零', () => {
  const code = generateNumericCode(6);
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
  assert.match(generateOrderNo(), /^MRS\d{18}$/);
  assert.equal(generateBibNumber('M', 7), 'M00007');
});

test('RBAC：超级管理员拥有全部权限', () => {
  assert.deepEqual(
    permissionsOf(ROLES.SUPER_ADMIN).sort(),
    Object.values(PERMISSIONS).sort(),
  );
});

test('RBAC：赛事编辑员不能审核与导出，选手无后台权限', () => {
  assert.equal(roleHasPermission(ROLES.EVENT_EDITOR, PERMISSIONS.EVENT_WRITE), true);
  assert.equal(roleHasPermission(ROLES.EVENT_EDITOR, PERMISSIONS.REGISTRATION_REVIEW), false);
  assert.equal(roleHasPermission(ROLES.EVENT_EDITOR, PERMISSIONS.REGISTRATION_EXPORT), false);
  assert.deepEqual(permissionsOf(ROLES.PARTICIPANT), []);
});

test('注册校验：弱密码被拒绝，合法请求通过', () => {
  assert.equal(
    registerSchema.safeParse({
      name: '张三',
      phone: '13800000000',
      password: 'abcdefgh',
      smsCode: '123456',
    }).success,
    false,
  );

  assert.equal(
    registerSchema.safeParse({
      name: '张三',
      phone: '13800000000',
      password: 'Abcd1234',
      smsCode: '123456',
    }).success,
    true,
  );
});

test('登录校验：账号与密码必填', () => {
  assert.equal(loginSchema.safeParse({ account: '', password: '' }).success, false);
  assert.equal(loginSchema.safeParse({ account: '13800000000', password: 'x' }).success, true);
});

test('组别校验：价格、名额、距离范围', () => {
  const base = { code: 'FULL', name: '全程马拉松', distanceKm: 42.195, price: 200, quota: 500 };
  assert.equal(createGroupSchema.safeParse(base).success, true);
  assert.equal(createGroupSchema.safeParse({ ...base, quota: 0 }).success, false);
  assert.equal(createGroupSchema.safeParse({ ...base, price: -1 }).success, false);
  assert.equal(createGroupSchema.safeParse({ ...base, distanceKm: 0.1 }).success, false);
  assert.equal(createGroupSchema.safeParse({ ...base, code: '全 程' }).success, false);
});

test('赛事校验：报名截止早于开始被拒绝', () => {
  const parse = (overrides) =>
    createEventSchema.safeParse({
      title: '2026 城市国际马拉松',
      city: '杭州',
      venue: '奥体中心',
      startDate: '2026-10-01T00:00:00.000Z',
      registrationStart: '2026-08-01T00:00:00.000Z',
      registrationEnd: '2026-09-01T00:00:00.000Z',
      groups: [{ code: 'FULL', name: '全程马拉松', distanceKm: 42.195, price: 200, quota: 500 }],
      ...overrides,
    });

  assert.equal(parse({}).success, true);
  assert.equal(
    parse({ registrationEnd: '2026-07-01T00:00:00.000Z' }).error.issues[0].message,
    '报名截止时间必须晚于报名开始时间',
  );
});

test('赛事校验：组别代码重复与年龄区间倒置被拒绝', () => {
  const result = createEventSchema.safeParse({
    title: '2026 城市国际马拉松',
    city: '杭州',
    venue: '奥体中心',
    startDate: '2026-10-01T00:00:00.000Z',
    registrationStart: '2026-08-01T00:00:00.000Z',
    registrationEnd: '2026-09-01T00:00:00.000Z',
    groups: [
      { code: 'FULL', name: '全程马拉松', distanceKm: 42.195, price: 200, quota: 500, minAge: 30, maxAge: 20 },
      { code: 'full', name: '全程马拉松二组', distanceKm: 42.195, price: 200, quota: 100 },
    ],
  });

  assert.equal(result.success, false);
  const messages = result.error.issues.map((issue) => issue.message);
  assert.ok(messages.includes('组别代码不能重复'));
  assert.ok(messages.includes('最大年龄不能小于最小年龄'));
});

test('赛事校验：至少需要一个组别', () => {
  const result = createEventSchema.safeParse({
    title: '2026 城市国际马拉松',
    city: '杭州',
    venue: '奥体中心',
    startDate: '2026-10-01T00:00:00.000Z',
    registrationStart: '2026-08-01T00:00:00.000Z',
    registrationEnd: '2026-09-01T00:00:00.000Z',
    groups: [],
  });
  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.message === '至少需要配置一个赛事组别'));
});

test('报名校验：身份证与紧急联系人必填', () => {
  const payload = {
    eventId: '65f000000000000000000001',
    groupId: '65f000000000000000000002',
    participant: {
      name: '张三',
      idCard: maleIdCard,
      phone: '13800000000',
      emergencyContact: { name: '李四', phone: '13900000000', relation: '家属' },
    },
  };

  assert.equal(createRegistrationSchema.safeParse(payload).success, true);

  const badId = createRegistrationSchema.safeParse({
    ...payload,
    participant: { ...payload.participant, idCard: '110101199001010011' },
  });
  assert.equal(badId.success, false);
  assert.ok(badId.error.issues.some((issue) => issue.message.includes('身份证号不合法')));

  const missingContact = createRegistrationSchema.safeParse({
    ...payload,
    participant: { ...payload.participant, emergencyContact: undefined },
  });
  assert.equal(missingContact.success, false);

  const badEventId = createRegistrationSchema.safeParse({ ...payload, eventId: 'not-an-id' });
  assert.equal(badEventId.success, false);
});

test('重复报名守卫键：赛事 + 身份证，大小写与空格归一', () => {
  const key = Registration.buildDuplicateGuard('65f000000000000000000001', ' 110101199001010011x ');
  assert.equal(key, '65f000000000000000000001:110101199001010011X');
  assert.notEqual(
    Registration.buildDuplicateGuard('65f000000000000000000001', '110101199001010011X'),
    Registration.buildDuplicateGuard('65f000000000000000000002', '110101199001010011X'),
  );
});

test('分页参数：默认值、上限与边界', () => {
  assert.deepEqual(parsePagination({}), { page: 1, pageSize: 20, skip: 0 });
  assert.deepEqual(parsePagination({ page: '3', pageSize: '10' }), { page: 3, pageSize: 10, skip: 20 });
  assert.equal(parsePagination({ pageSize: '9999' }).pageSize, 100);
  assert.equal(parsePagination({ page: '-5' }).page, 1);
});
