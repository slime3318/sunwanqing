<template>
  <div class="admin-layout">
    <Sidebar />

    <div class="admin-main">
      <header class="admin-header">
        <h1 class="header-title">用户管理</h1>
        <span class="header-user">当前用户：super_admin</span>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f3f4f6;
}

.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-header {
  height: 60px;
  flex-shrink: 0;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.header-user {
  font-size: 13px;
  color: #6b7280;
}

.admin-content {
  flex: 1;
  padding: 20px 24px;
  overflow: auto;
}

@media (max-width: 640px) {
  .admin-header {
    padding: 0 14px;
  }

  .header-user {
    display: none;
  }

  .admin-content {
    padding: 14px;
  }
}
</style>
