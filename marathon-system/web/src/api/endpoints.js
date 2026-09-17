import { api, unwrap, request } from './client.js';

export const authApi = {
  sendSmsCode: (payload) => request({ url: '/auth/sms/send', method: 'post', data: payload }),
  register: (payload) => request({ url: '/auth/register', method: 'post', data: payload }),
  login: (payload) => request({ url: '/auth/login', method: 'post', data: payload }),
  loginBySms: (payload) => request({ url: '/auth/login/sms', method: 'post', data: payload }),
  me: () => request({ url: '/auth/me', method: 'get' }),
  changePassword: (payload) => request({ url: '/auth/password', method: 'post', data: payload }),
};

export const usersApi = {
  list: (params) => request({ url: '/users', method: 'get', params }),
  meta: () => request({ url: '/users/meta', method: 'get' }),
  updateProfile: (payload) => request({ url: '/users/me', method: 'patch', data: payload }),
  assignRole: (id, payload) => request({ url: `/users/${id}/role`, method: 'patch', data: payload }),
  updateStatus: (id, payload) => request({ url: `/users/${id}/status`, method: 'patch', data: payload }),
};

export const eventsApi = {
  list: (params) => request({ url: '/events', method: 'get', params }),
  detail: (id) => request({ url: `/events/${id}`, method: 'get' }),
  create: (payload) => request({ url: '/events', method: 'post', data: payload }),
  update: (id, payload) => request({ url: `/events/${id}`, method: 'patch', data: payload }),
  updateStatus: (id, status) =>
    request({ url: `/events/${id}/status`, method: 'patch', data: { status } }),
  remove: (id) => request({ url: `/events/${id}`, method: 'delete' }),
  addGroup: (id, payload) => request({ url: `/events/${id}/groups`, method: 'post', data: payload }),
  updateGroup: (id, groupId, payload) =>
    request({ url: `/events/${id}/groups/${groupId}`, method: 'patch', data: payload }),
  removeGroup: (id, groupId) =>
    request({ url: `/events/${id}/groups/${groupId}`, method: 'delete' }),
};

export const registrationsApi = {
  create: (payload) => request({ url: '/registrations', method: 'post', data: payload }),
  mine: (params) => request({ url: '/registrations/mine', method: 'get', params }),
  list: (params) => request({ url: '/registrations', method: 'get', params }),
  detail: (id) => request({ url: `/registrations/${id}`, method: 'get' }),
  pay: (id, payload) => request({ url: `/registrations/${id}/pay`, method: 'post', data: payload }),
  cancel: (id, payload) =>
    request({ url: `/registrations/${id}/cancel`, method: 'post', data: payload }),
  review: (id, payload) =>
    request({ url: `/registrations/${id}/review`, method: 'patch', data: payload }),
  batchReview: (payload) => request({ url: '/registrations/batch-review', method: 'post', data: payload }),
  statuses: () => request({ url: '/registrations/meta/statuses', method: 'get' }),
  async exportCsv(params) {
    const response = await api.get('/registrations/export', { params, responseType: 'blob' });
    return response;
  },
};

export const statsApi = {
  overview: (params) => request({ url: '/stats/overview', method: 'get', params }),
  eventBreakdown: (eventId) => request({ url: `/stats/events/${eventId}`, method: 'get' }),
};

export { unwrap };
