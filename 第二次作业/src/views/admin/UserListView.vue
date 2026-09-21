<template>
  <div class="user-page">
    <section class="card toolbar">
      <label class="toolbar-label">用户名</label>
      <input
        v-model="searchInput"
        class="toolbar-input"
        type="text"
        placeholder="请输入用户名"
        @keyup.enter="handleSearch"
      />
      <button class="btn btn-primary" type="button" @click="handleSearch">查询</button>
      <button class="btn btn-plain" type="button" @click="handleReset">重置</button>
    </section>

    <section class="card table-card">
      <table class="user-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>ID</th>
            <th>用户名</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>账号状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="table-tip" colspan="8">加载中...</td>
          </tr>
          <tr v-else-if="!list.length">
            <td class="table-tip" colspan="8">暂无数据</td>
          </tr>
          <template v-else>
            <tr v-for="(user, index) in list" :key="user.id">
              <td>{{ (page - 1) * pageSize + index + 1 }}</td>
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>{{ user.phone }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span :class="['status-tag', user.status === 1 ? 'is-on' : 'is-off']">
                  {{ user.status === 1 ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ user.createTime }}</td>
              <td>
                <button class="btn-link" type="button" @click="handleDelete(user)">删除</button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="pagination">
        <span class="page-info">共 {{ total }} 条，第 {{ page }} / {{ totalPages }} 页</span>
        <div class="page-actions">
          <button class="btn btn-plain" type="button" :disabled="page <= 1" @click="changePage(page - 1)">
            上一页
          </button>
          <button
            class="btn btn-plain"
            type="button"
            :disabled="page >= totalPages"
            @click="changePage(page + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </section>

    <ConfirmDialog
      :visible="dialogVisible"
      title="删除确认"
      :content="dialogContent"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { deleteUser, getUserList } from '@/api/user'

const pageSize = 5

const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)

const searchInput = ref('')
const keyword = ref('')

const dialogVisible = ref(false)
const pendingUser = ref(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const dialogContent = computed(() =>
  pendingUser.value ? `确定要删除用户「${pendingUser.value.username}」吗？` : '',
)

async function fetchList() {
  loading.value = true
  try {
    let res = await getUserList({ username: keyword.value, page: page.value, pageSize })

    // 删除数据后当前页可能超出总页数，自动回退到最后一页
    const maxPage = Math.max(1, Math.ceil(res.data.total / pageSize))
    if (page.value > maxPage) {
      page.value = maxPage
      res = await getUserList({ username: keyword.value, page: page.value, pageSize })
    }

    if (res.code === 200) {
      list.value = res.data.list
      total.value = res.data.total
    } else {
      list.value = []
      total.value = 0
    }
  } catch (error) {
    list.value = []
    total.value = 0
    console.error('[user list] 获取用户列表失败：', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  keyword.value = searchInput.value.trim()
  page.value = 1
  fetchList()
}

function handleReset() {
  searchInput.value = ''
  keyword.value = ''
  page.value = 1
  fetchList()
}

function changePage(target) {
  if (target < 1 || target > totalPages.value || target === page.value) return
  page.value = target
  fetchList()
}

function handleDelete(user) {
  pendingUser.value = user
  dialogVisible.value = true
}

function cancelDelete() {
  dialogVisible.value = false
  pendingUser.value = null
}

async function confirmDelete() {
  const user = pendingUser.value
  dialogVisible.value = false
  if (!user) return

  try {
    const res = await deleteUser(user.id)
    if (res.code === 200) {
      await fetchList()
    }
  } catch (error) {
    console.error('[user list] 删除用户失败：', error)
  } finally {
    pendingUser.value = null
  }
}

onMounted(fetchList)
</script>

<style scoped>
.user-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 18px;
}

.toolbar-label {
  font-size: 14px;
  color: #4b5563;
}

.toolbar-input {
  width: 220px;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.toolbar-input:focus {
  border-color: #409eff;
}

.btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  background: #409eff;
  color: #ffffff;
}

.btn-primary:hover {
  background: #64b5ff;
}

.btn-plain {
  background: #ffffff;
  border-color: #d1d5db;
  color: #4b5563;
}

.btn-plain:hover:not(:disabled) {
  background: #f9fafb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-card {
  padding: 6px 18px 16px;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.user-table th,
.user-table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #eef0f3;
  white-space: nowrap;
}

.user-table th {
  color: #374151;
  font-weight: 600;
  background: #f9fafb;
}

.user-table tbody tr:hover {
  background: #f9fbff;
}

.table-tip {
  text-align: center;
  color: #9ca3af;
  padding: 32px 0;
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.is-on {
  background: #e7f6ec;
  color: #1f9d55;
}

.is-off {
  background: #fdecec;
  color: #e05252;
}

.btn-link {
  border: none;
  background: transparent;
  color: #f56c6c;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.page-info {
  font-size: 13px;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 640px) {
  .table-card {
    overflow-x: auto;
  }

  .toolbar-input {
    width: 100%;
  }
}
</style>
