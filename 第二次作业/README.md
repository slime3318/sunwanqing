# 后台用户管理页面（第二次作业）

基于 Vue 3 + Vite + Vue Router 的后台用户管理作业，在第一次作业登录页的基础上扩展出后台布局、嵌套路由、用户列表（查询 / 分页 / 删除）等功能。

## 一、功能实现对照

### 1. 布局与路由

- 使用**嵌套路由**：`/admin` 为后台布局容器 `AdminLayout.vue`，左侧 `<Sidebar>`，右侧 `<router-view>` 内容区
- 路由表：
  - `/login` 登录页（沿用第一次作业的登录逻辑）
  - `/admin` 后台布局容器，重定向到 `/admin/user`
  - `/admin/user` 用户管理列表页面
- 路由守卫：未登录（`localStorage` 无 `token`）访问 `/admin` 开头路由时，自动跳转 `/login`，并把原地址放在 `redirect` 查询参数里，登录成功后自动回到原页面
- 侧边菜单：`用户管理`（高亮当前菜单）、`退出登录`（清空 token 并跳回登录页）
- 侧边栏已抽离为独立组件 `src/components/Sidebar.vue`

### 2. 用户列表页面

- Mock 接口 `GET /api/user/list`，返回 `{ code, message, data: { total, list } }`
- 表格字段：序号、ID、用户名、手机号、邮箱、账号状态、创建时间、操作
- 账号状态：`1` 显示绿色“启用”，`0` 显示红色“禁用”
- 查询：输入用户名，点击【查询】（或按回车），按用户名**模糊筛选**，并回到第 1 页
- 分页：每页 5 条，【上一页】/【下一页】，显示“共 N 条，第 X / Y 页”；删除后若当前页超界会自动回退到最后一页
- 删除：每行【删除】按钮 → 弹出确认框 → 确认后调用 `DELETE /api/user/delete` 删除并刷新列表
- 抽取了通用确认弹窗组件 `src/components/ConfirmDialog.vue`

### 3. 其他

- 后台左右布局，表格、按钮、状态标签等基础美化，窄屏可横向滚动
- 代码拆分：`layouts/AdminLayout.vue`、`components/Sidebar.vue`、`components/ConfirmDialog.vue`、`views/LoginView.vue`、`views/admin/UserListView.vue`、`api/*`、`mock/*`

## 二、Mock 接口说明

接口逻辑集中在 `src/mock/userApi.js`，通过两条路径对外提供：

1. **开发 / 预览环境的真实 HTTP 接口**：`vite.config.js` 中的 `mockUserApiPlugin` 注册中间件，`npm run dev` 与 `npm run preview` 时会真实响应请求，可在浏览器 Network 面板看到：
   - `GET /api/user/list?username=&page=1&pageSize=5`
   - `DELETE /api/user/delete?id=1`
2. **前端兜底 Mock**：`src/api/request.js` 优先发起真实请求；若接口不可用（例如部署到纯静态托管，`/api/*` 被回退成 `index.html`），自动回退到内置 Mock 数据，保证页面始终可用。

> Mock 初始数据为 12 条用户记录，删除操作在开发服务器进程内生效，重启 `npm run dev` 即可恢复初始数据。

### 接口返回示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 12,
    "list": [
      {
        "id": 1,
        "username": "zhangsan",
        "phone": "13800138000",
        "email": "zhangsan@test.com",
        "status": 1,
        "createTime": "2026-05-10"
      }
    ]
  }
}
```

## 三、项目结构

```text
第二次作业/
  src/
    api/
      request.js          # 统一请求方法（真实接口优先 + 前端 Mock 兜底）
      user.js             # 用户相关接口：getUserList / deleteUser
    components/
      ConfirmDialog.vue   # 通用确认弹窗
      Sidebar.vue         # 侧边栏组件
    layouts/
      AdminLayout.vue     # 后台布局容器（左菜单 + 右内容）
    mock/
      userApi.js          # Mock 数据与接口逻辑
    router/
      index.js            # 路由表 + 路由守卫
    utils/
      auth.js             # token 的读写与清除
    views/
      LoginView.vue       # 登录页
      admin/
        UserListView.vue  # 用户管理列表页
    App.vue
    main.js
    style.css
  public/
    favicon.svg
    _redirects            # 静态托管 SPA 回退配置
  index.html
  vite.config.js
  package.json
```

## 四、本地运行

```bash
cd 第二次作业
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173 ）。

- 测试账号：`super_admin` / `123456Ab.`
- 验证码：十以内加减法，点击可刷新

构建生产版本：

```bash
npm run build
npm run preview
```

## 五、测试用例自查

| 用例 | 操作 | 预期 |
| --- | --- | --- |
| 1 | 未登录直接访问 `/admin/user` | 跳转到 `/login`，登录后回到 `/admin/user` |
| 2 | 登录成功后进入后台 | 左侧显示“用户管理 / 退出登录”，右侧显示用户表格 |
| 3 | 输入用户名（如 `zhang`）点击查询 | 列表按用户名模糊过滤 |
| 4 | 点击上一页 / 下一页 | 每页 5 条，页码与总页数正确切换 |
| 5 | 点击某行【删除】并确认 | 弹出确认框，确认后该行消失、列表刷新 |
| 6 | 点击退出登录 | 清空 token，回到登录页；再访问 `/admin/user` 仍被拦截 |

## 六、技术栈

- Vue 3（组合式 API，`<script setup>`）
- Vue Router 4（嵌套路由、路由守卫）
- Vite（开发 / 构建，Mock 中间件）
- 原生 Canvas 绘制验证码
