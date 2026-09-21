import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { mockGetUserList, mockDeleteUser } from './src/mock/userApi.js'

function sendJson(res, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

// 开发 / 预览服务器上的 Mock 接口中间件
function mockUserApiPlugin() {
  const middleware = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')

    if (url.pathname === '/api/user/list' && req.method === 'GET') {
      const result = await mockGetUserList({
        username: url.searchParams.get('username') || '',
        page: Number(url.searchParams.get('page')) || 1,
        pageSize: Number(url.searchParams.get('pageSize')) || 5,
      })
      sendJson(res, result)
      return
    }

    if (url.pathname === '/api/user/delete' && req.method === 'DELETE') {
      const result = await mockDeleteUser(url.searchParams.get('id'))
      sendJson(res, result)
      return
    }

    next()
  }

  return {
    name: 'mock-user-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockUserApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
