import { mockGetUserList, mockDeleteUser } from '@/mock/userApi'

// Mock 接口注册表：method + url 精确匹配
const mockHandlers = {
  'GET /api/user/list': (params) => mockGetUserList(params),
  'DELETE /api/user/delete': (params) => mockDeleteUser(params.id),
}

function buildUrl(url, params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `${url}?${query}` : url
}

/**
 * 真实 HTTP 请求，走 vite.config.js 中注册的 Mock 中间件
 */
async function sendRequest(url, method, params) {
  const response = await fetch(buildUrl(url, params), { method })
  const contentType = response.headers.get('content-type') || ''

  // 静态托管会把 /api/* 回退成 index.html，此时视为接口不可用
  if (!contentType.includes('application/json')) {
    throw new Error(`接口 ${method} ${url} 未返回 JSON`)
  }

  return response.json()
}

/**
 * 统一的请求方法
 * 优先请求真实接口；在没有后端的环境（纯静态部署）自动回退到前端 Mock
 * @param {{ url: string, method?: string, params?: object }} config
 * @returns {Promise<{ code: number, message: string, data: any }>}
 */
export async function request({ url, method = 'GET', params = {} }) {
  const handler = mockHandlers[`${method} ${url}`]

  if (!handler) {
    throw new Error(`未匹配到 Mock 接口：${method} ${url}`)
  }

  try {
    return await sendRequest(url, method, params)
  } catch (error) {
    console.warn(`[mock] ${method} ${url} 请求失败，使用前端 Mock 数据：${error.message}`)
    return handler(params)
  }
}
