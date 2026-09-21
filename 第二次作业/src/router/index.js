import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const routes = [
  {
    path: '/',
    redirect: '/admin/user',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/admin/user',
    children: [
      {
        path: 'user',
        name: 'admin-user',
        component: () => import('@/views/admin/UserListView.vue'),
        meta: { title: '用户管理' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/admin/user',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = getToken()

  // 未登录访问后台路由，自动跳转登录页
  if (to.path.startsWith('/admin') && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 已登录时访问登录页，直接进入后台
  if (to.path === '/login' && token) {
    return { path: '/admin/user' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 后台管理系统` : '后台管理系统'
})

export default router
