import test from 'node:test';
import assert from 'node:assert/strict';

import { listOf, paginationOf } from '../src/store/helpers.js';
import eventsReducer, { fetchEvents, fetchAdminEvents } from '../src/store/slices/eventsSlice.js';
import registrationsReducer, {
  fetchMyRegistrations,
  fetchRegistrations,
} from '../src/store/slices/registrationsSlice.js';
import usersReducer, { fetchUsers } from '../src/store/slices/usersSlice.js';
import authReducer, { bootstrapSession } from '../src/store/slices/authSlice.js';

/**
 * 回归测试：这些 reducer 曾在后端不可用时收到 HTML（静态托管把未命中的
 * /api 路径回退成 index.html 并返回 200），把 undefined 写进 state，
 * 导致列表页渲染时抛异常、整页白屏。
 * 约束：无论 payload 是什么形状，列表状态必须是数组。
 */

const HTML_BODY = '<!doctype html><html><body>index page</body></html>';
const FALLBACK = { page: 2, pageSize: 5, total: 9, totalPages: 2 };

test('listOf 兜底：任何非数组输入都归一为空数组', () => {
  assert.deepEqual(listOf(undefined), []);
  assert.deepEqual(listOf(null), []);
  assert.deepEqual(listOf(HTML_BODY), []);
  assert.deepEqual(listOf({}), []);
  assert.deepEqual(listOf({ items: 'oops' }), []);
  assert.deepEqual(listOf({ items: null }), []);
  assert.deepEqual(listOf([1, 2]), []);
  assert.deepEqual(listOf({ items: [1, 2] }), [1, 2]);
});

test('paginationOf 兜底：异常分页对象回退到原值', () => {
  assert.deepEqual(paginationOf(undefined, FALLBACK), FALLBACK);
  assert.deepEqual(paginationOf({ pagination: HTML_BODY }, FALLBACK), FALLBACK);
  assert.deepEqual(paginationOf({ pagination: null }, FALLBACK), FALLBACK);
  // 分页对象存在但字段缺失时，保留原 page/pageSize，其余补零，不产生 undefined
  assert.deepEqual(paginationOf({ pagination: {} }, FALLBACK), {
    page: FALLBACK.page,
    pageSize: FALLBACK.pageSize,
    total: 0,
    totalPages: 1,
  });
  assert.deepEqual(paginationOf({ pagination: { page: 3, pageSize: 5, total: 12, totalPages: 3 } }, FALLBACK), {
    page: 3,
    pageSize: 5,
    total: 12,
    totalPages: 3,
  });
});

test('events reducer：payload 为 HTML/空值时 list 仍是数组', () => {
  for (const payload of [undefined, null, HTML_BODY, {}, { items: 'oops' }]) {
    const state = eventsReducer(undefined, { type: fetchEvents.fulfilled.type, payload });
    assert.equal(Array.isArray(state.list), true, `payload=${JSON.stringify(payload)}`);
    assert.deepEqual(state.list, []);
    assert.equal(state.status, 'succeeded');
  }
});

test('events reducer：adminList 同样不会变成 undefined', () => {
  const state = eventsReducer(undefined, { type: fetchAdminEvents.fulfilled.type, payload: HTML_BODY });
  assert.deepEqual(state.adminList, []);
});

test('registrations reducer：mine 与 list 不会被污染', () => {
  const mine = registrationsReducer(undefined, {
    type: fetchMyRegistrations.fulfilled.type,
    payload: HTML_BODY,
  });
  assert.deepEqual(mine.mine, []);

  const list = registrationsReducer(undefined, {
    type: fetchRegistrations.fulfilled.type,
    payload: null,
  });
  assert.deepEqual(list.list, []);
});

test('users reducer：list 与 roles 兜底', () => {
  const state = usersReducer(undefined, { type: fetchUsers.fulfilled.type, payload: HTML_BODY });
  assert.deepEqual(state.list, []);
});

test('auth reducer：会话结果为 null 时不崩溃', () => {
  const state = authReducer(undefined, { type: bootstrapSession.fulfilled.type, payload: null });
  assert.equal(state.user, null);
  assert.deepEqual(state.permissions, []);
  assert.equal(state.initializing, false);
});

test('分页元数据缺失时保留原有分页值，不被覆盖为 undefined', () => {
  const state = eventsReducer(undefined, { type: fetchEvents.fulfilled.type, payload: { items: [] } });
  assert.equal(typeof state.pagination.page, 'number');
  assert.equal(typeof state.pagination.totalPages, 'number');
});
