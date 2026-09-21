<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-mark">A</span>
      <span class="logo-text">后台管理系统</span>
    </div>

    <nav class="sidebar-menu">
      <router-link class="menu-item" to="/admin/user">
        <span class="menu-icon">👤</span>
        <span>用户管理</span>
      </router-link>
    </nav>

    <button class="logout-btn" type="button" @click="handleLogout">
      <span class="menu-icon">⏻</span>
      <span>退出登录</span>
    </button>
  </aside>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { clearToken } from '@/utils/auth'

const router = useRouter()

function handleLogout() {
  clearToken()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  min-height: 100vh;
  background: #1f2937;
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  margin-bottom: 14px;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
}

.sidebar-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.menu-item,
.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.menu-item:hover,
.logout-btn:hover {
  background: rgba(148, 163, 184, 0.16);
  color: #ffffff;
}

.menu-item.router-link-active {
  background: #409eff;
  color: #ffffff;
}

.menu-icon {
  font-size: 15px;
  line-height: 1;
}

.logout-btn {
  margin-top: auto;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 0;
  padding-top: 16px;
}
</style>
