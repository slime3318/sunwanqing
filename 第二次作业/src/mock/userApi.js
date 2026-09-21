// Mock 数据源：模拟后端数据库中的用户表
const seedUsers = [
  { id: 1, username: 'zhangsan', phone: '13800138000', email: 'zhangsan@test.com', status: 1, createTime: '2026-05-10' },
  { id: 2, username: 'lisi', phone: '13800138001', email: 'lisi@test.com', status: 1, createTime: '2026-05-11' },
  { id: 3, username: 'wangwu', phone: '13800138002', email: 'wangwu@test.com', status: 0, createTime: '2026-05-12' },
  { id: 4, username: 'zhaoliu', phone: '13800138003', email: 'zhaoliu@test.com', status: 1, createTime: '2026-05-13' },
  { id: 5, username: 'sunqi', phone: '13800138004', email: 'sunqi@test.com', status: 1, createTime: '2026-05-14' },
  { id: 6, username: 'zhouba', phone: '13800138005', email: 'zhouba@test.com', status: 0, createTime: '2026-05-15' },
  { id: 7, username: 'wujiu', phone: '13800138006', email: 'wujiu@test.com', status: 1, createTime: '2026-05-16' },
  { id: 8, username: 'zhengshi', phone: '13800138007', email: 'zhengshi@test.com', status: 1, createTime: '2026-05-17' },
  { id: 9, username: 'chenyi', phone: '13800138008', email: 'chenyi@test.com', status: 1, createTime: '2026-05-18' },
  { id: 10, username: 'liuer', phone: '13800138009', email: 'liuer@test.com', status: 0, createTime: '2026-05-19' },
  { id: 11, username: 'huangsan', phone: '13800138010', email: 'huangsan@test.com', status: 1, createTime: '2026-05-20' },
  { id: 12, username: 'xiaoming', phone: '13800138011', email: 'xiaoming@test.com', status: 1, createTime: '2026-05-21' },
]

let users = seedUsers.map((user) => ({ ...user }))

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 模拟 GET /api/user/list
 * @param {{ username?: string, page?: number, pageSize?: number }} params
 */
export async function mockGetUserList({ username = '', page = 1, pageSize = 5 } = {}) {
  await delay(300)

  const keyword = String(username).trim().toLowerCase()
  const filtered = keyword
    ? users.filter((user) => user.username.toLowerCase().includes(keyword))
    : users

  const total = filtered.length
  const currentPage = Math.max(1, Number(page) || 1)
  const size = Math.max(1, Number(pageSize) || 5)
  const start = (currentPage - 1) * size
  const list = filtered.slice(start, start + size).map((user) => ({ ...user }))

  return {
    code: 200,
    message: 'success',
    data: { total, list },
  }
}

/**
 * 模拟 DELETE /api/user/delete?id=1
 * @param {number|string} id
 */
export async function mockDeleteUser(id) {
  await delay(200)

  const index = users.findIndex((user) => user.id === Number(id))
  if (index === -1) {
    return { code: 404, message: '用户不存在', data: null }
  }

  users.splice(index, 1)
  return { code: 200, message: '删除成功', data: null }
}
