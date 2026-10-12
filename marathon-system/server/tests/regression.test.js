import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { Event } from '../src/models/Event.js';
import { escapeRegex, buildCaseInsensitiveRegex } from '../src/utils/regex.js';

/**
 * 回归测试 1：Event 虚拟字段在 groups 缺失时不能崩溃。
 * 触发场景：registrations 列表用 populate('event', 'title city startDate status')
 * 只取部分字段，此时 event.groups 为 undefined，toJSON() 会计算虚拟字段。
 */
test('Event 虚拟字段：groups 缺失时返回 0 而不是抛错', () => {
  const partial = Event.hydrate({
    _id: new mongoose.Types.ObjectId(),
    title: '被裁剪字段的赛事',
    status: 'published',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
  });

  // 复现 populate('event', 'title city startDate status') 的场景：数组字段未被赋值
  partial.set('groups', undefined, { strict: false });
  assert.equal(partial.groups, undefined);

  assert.equal(partial.totalQuota, 0);
  assert.equal(partial.totalApproved, 0);

  const json = partial.toJSON();
  assert.equal(json.totalQuota, 0);
  assert.equal(json.totalApproved, 0);
});

test('Event 虚拟字段：groups 存在时正常求和', () => {
  const event = Event.hydrate({
    _id: new mongoose.Types.ObjectId(),
    title: '完整赛事',
    groups: [
      { code: 'FULL', name: '全程', distanceKm: 42.195, price: 200, quota: 500, approvedCount: 12 },
      { code: 'FUN', name: '欢乐跑', distanceKm: 5, price: 80, quota: 100, approvedCount: 30 },
    ],
  });

  assert.equal(event.totalQuota, 600);
  assert.equal(event.totalApproved, 42);
});

test('组别虚拟字段：剩余名额不为负', () => {
  const group = Event.hydrate({
    groups: [{ code: 'FULL', name: '全程', distanceKm: 42.195, price: 0, quota: 10, approvedCount: 10 }],
  }).groups[0];

  assert.equal(group.remainingQuota, 0);

  group.approvedCount = 12;
  assert.equal(group.remainingQuota, 0);
});

/**
 * 回归测试 2：报名列表的关键字查询。
 * 历史 bug：对 RegExp 对象调用 toUpperCase() 导致 500，且关键字未转义。
 */
test('关键字转义：正则元字符被当作普通字符处理', () => {
  assert.equal(escapeRegex('a.*b'), 'a\\.\\*b');
  assert.equal(escapeRegex('a(b)c[d]'), 'a\\(b\\)c\\[d\\]');
  assert.equal(escapeRegex('张三'), '张三');
  assert.equal(escapeRegex(undefined), '');

  const regex = buildCaseInsensitiveRegex('a(b');
  assert.equal(regex.test('a(b'), true);
  assert.equal(regex.test('axb'), false);
});

test('关键字查询：姓名不区分大小写，身份证按大写匹配', () => {
  const keyword = '11010119900101xX';

  const nameRegex = buildCaseInsensitiveRegex('zhang');
  assert.equal(nameRegex.test('ZHANGSAN'), true);
  assert.equal(nameRegex.test('zhangsan'), true);

  // 身份证字段以大写存储，查询串统一转大写后精确构造正则
  const idRegex = new RegExp(escapeRegex(keyword).toUpperCase());
  assert.equal(idRegex.test('11010119900101XX'), true);
  assert.equal(idRegex.test('11010119900101xX'), false);
});

test('关键字查询：恶意正则不会导致异常或全量匹配', () => {
  const regex = buildCaseInsensitiveRegex('.*');
  assert.equal(regex.test('任意内容'), false);
  assert.equal(regex.test('.*'), true);
});
