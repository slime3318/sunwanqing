import { request } from './request'

/**
 * 获取用户列表  GET /api/user/list
 * @param {{ username?: string, page?: number, pageSize?: number }} params
 */
export function getUserList(params) {
  return request({ url: '/api/user/list', method: 'GET', params })
}

/**
 * 删除用户  DELETE /api/user/delete
 * @param {number|string} id
 */
export function deleteUser(id) {
  return request({ url: '/api/user/delete', method: 'DELETE', params: { id } })
}
