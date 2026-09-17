# 马拉松赛事报名管理系统 (Marathon Registration System)

一个前后端分离的马拉松赛事报名管理系统，覆盖 **用户管理、赛事项目管理、报名管理、报名审核、选手信息管理、统计看板、系统权限** 七大模块，可部署为公开访问的网站。

**在线访问：<https://marathon-registration.pages.dev>**

> 前端已部署于 Cloudflare Pages。后端 API 与数据库的部署步骤见第五章；完成后需在 Cloudflare Pages 中把环境变量 `VITE_API_BASE_URL` 指向后端地址并重新部署。

- 前端：React 18 + Redux Toolkit + React Router + Vite
- 后端：Node.js + Express + MongoDB (Mongoose)
- 部署：MongoDB Atlas（数据库，免费版）+ Render（后端，免费版）+ Cloudflare Pages（前端，免费）
- 备选：Docker Compose 一键自托管（mongo + api + web + nginx）

---

## 一、需求模块与实现对照

| 模块 | 用例 | 实现位置 |
| --- | --- | --- |
| 1. 用户管理 | 手机号+短信验证码注册、账号密码/短信验证码登录、个人资料（姓名/联系方式/身份证） | `server/src/modules/auth`、`server/src/modules/users`、`web/src/pages/LoginPage.jsx`、`RegisterPage.jsx`、`ProfilePage.jsx` |
| 2. 赛事项目管理 | 创建/编辑赛事（名称、地点、时间）、设定组别（全程/半程/欢乐跑，独立定价与名额）、草稿→发布→关闭状态流转 | `server/src/modules/events`、`web/src/pages/admin/EventManagePage.jsx`、`EventFormPage.jsx` |
| 3. 报名管理 | 选手报名（身份证校验和校验、手机号/邮箱校验、年龄与组别匹配）、按组别独立人数上限（并发安全，不超额）、支付接口（微信/支付宝抽象层，演示用模拟支付） | `server/src/modules/registrations`、`server/src/services/quotaService.js`、`paymentService.js`、`web/src/pages/EventDetailPage.jsx` |
| 4. 报名审核 | 单条审核（通过/驳回+意见+体检证明字段）、**批量审核** | `server/src/modules/registrations/registrations.service.js`、`web/src/pages/admin/RegistrationManagePage.jsx` |
| 5. 选手信息管理 | 按姓名/身份证号查询筛选、导出报名数据（CSV，Excel 可直接打开） | `registrations.service.js::listRegistrations / exportRegistrationsCsv` |
| 6. 统计看板 | 各项目报名人数实时分析、报名资金总收入统计、近 14 天趋势、名额使用率 | `server/src/modules/stats`、`web/src/pages/admin/DashboardPage.jsx` |
| 7. 系统权限 | RBAC：超级管理员 / 运营人员 / 赛事编辑员 / 选手；权限矩阵前后端同源；赛事编辑员仅能管理被分配的赛事 | `server/src/config/permissions.js`、`server/src/middleware/permission.js`、`web/src/components/ProtectedRoute.jsx` |
| 扩展 A. 通知系统 | 报名提交、审核结果通知（短信/邮件抽象层，`mock` 模式输出日志） | `server/src/services/smsService.js`、`mailService.js`、`notificationService.js` |
| 扩展 B. 退费流程 | 选手自助取消报名 → 释放名额 → 原路退款（模拟） | `registrations.service.js::cancelRegistration` |
| 扩展 C. 证书/二维码签到 | 已分配参赛号码（bibNumber），证书与二维码签到为第二阶段 | 见下方「后续规划」 |

### 权限矩阵

| 权限点 | 超级管理员 | 运营人员 | 赛事编辑员 | 选手 |
| --- | :--: | :--: | :--: | :--: |
| `user:read` 查看用户 | ✅ | ✅ | | |
| `user:write` 启用/禁用账号 | ✅ | | | |
| `role:assign` 分配角色 | ✅ | | | |
| `event:read` / `event:write` 赛事管理 | ✅ | ✅ | ✅（仅分配的赛事） | |
| `registration:read` 查看报名 | ✅ | ✅ | ✅（仅分配的赛事） | 仅本人 |
| `registration:review` 审核报名 | ✅ | ✅ | | |
| `registration:export` 导出数据 | ✅ | ✅ | | |
| `stats:read` 数据统计 | ✅ | ✅ | ✅ | |
| `settings:manage` 系统设置 | ✅ | | | |

> 赛事编辑员**不能**执行报名审核，也不能查看未分配赛事的报名数据（服务端 `assertCanManageEvent` / `buildRegistrationFilter` 双重校验）。

---

## 二、核心业务规则

1. **赛事状态**：`draft`（草稿，仅后台可见）→ `published`（公开报名中）→ `closed`（报名结束）。
2. **报名窗口**：仅当赛事为 `published` 且当前时间处于 `registrationStart ~ registrationEnd` 之间才允许提交。
3. **名额并发安全**：使用 MongoDB 单文档原子更新（aggregation pipeline + `$lt` 条件）占用名额，`approvedCount` 不会超过 `quota`，避免并发超额报名。
4. **实名唯一**：同一赛事下同一身份证号只能存在一条有效报名（`duplicateGuard` 稀疏唯一索引）；取消/驳回后自动释放，可重新报名。
5. **身份证校验**：前后端均实现 18 位身份证的日期合法性与加权校验码校验，并自动解析性别、出生日期、年龄；年龄不符合组别要求直接拦截。
6. **状态机**：`pending_payment` →（支付）→ `pending_review` →（审核通过）→ `approved`（分配参赛号码）／（驳回）→ `rejected`（释放名额 + 退款）。
7. **解除占用**：取消报名 / 审核驳回 → 释放名额 + 退费（幂等，已退款不会重复退）。

---

## 三、目录结构

```text
marathon-system/
  README.md
  docker-compose.yml          # 一键自托管：mongo + api + web
  render.yaml                 # Render 后端部署蓝图
  server/
    Dockerfile
    .env.example
    src/
      index.js                # 启动入口（连接数据库 + 监听端口）
      app.js                  # Express 应用装配（helmet/cors/json/morgan）
      config/                 # env、db、roles、permissions（RBAC 权限矩阵）
      models/                 # User / Event / Registration / VerificationCode / Counter
      middleware/             # authenticate、optionalAuthenticate、requirePermission、validate(zod)、error
      modules/
        auth/                 # 注册、登录（密码/短信）、改密
        users/                # 个人资料、用户列表、角色分配、禁用启用
        events/               # 赛事与组别 CRUD、发布状态
        registrations/        # 报名、支付、取消、审核、批量审核、导出
        stats/                # 概览统计、分组统计
      services/               # 名额、短信、邮件、支付、通知
      utils/                  # jwt、idCard 校验、编码生成、分页、响应封装
    scripts/
      lib/demoIdCard.js       # 演示用身份证号生成器（符合校验码规则）
      seed.js                 # 写入演示账号与演示赛事
      smoke.js                # 端到端冒烟测试（核心闭环）
    tests/
      validation.test.js      # 单元测试：身份证校验、RBAC、zod 表单校验、分页等
      regression.test.js      # 回归测试：populate 字段裁剪下的虚拟字段、关键字查询转义
  web/
    Dockerfile
    nginx.conf                # SPA 回退 + /api 反向代理（自托管场景）
    .env.example
    src/
      api/                    # axios 实例（自动带 token、401 拦截、响应信封校验）+ 接口定义
      store/                  # Redux Toolkit store 与 5 个 slice
      components/             # Layout、路由守卫、全局错误边界、表单控件、分页、提示
      pages/                  # 首页/登录/注册/赛事/报名/个人中心
      pages/admin/            # 数据概览/赛事管理/报名管理/用户与权限
      utils/                  # 格式化、前端校验（与后端规则一致）
      styles/index.css        # 全局样式（响应式，含移动端适配）
    tests/
      reducers.test.js        # 回归测试：接口异常返回时列表状态兜底，防止整页白屏
```

---

## 四、本地运行

前置：Node.js ≥ 18（推荐 20），以及一个可用的 MongoDB（本地 `mongod` 或 MongoDB Atlas 连接串）。

### 1. 后端

```bash
cd marathon-system/server
npm install
# 复制 .env.example 为 .env，按需修改 MONGODB_URI / JWT_SECRET
npm run seed    # 写入演示账号与演示赛事（可重复执行）
npm run dev     # http://localhost:4000/api
```

### 2. 前端

```bash
cd marathon-system/web
npm install
npm run dev      # http://localhost:5173（已配置 /api 代理到 4000 端口）
```

### 3. 演示账号

| 角色 | 手机号 | 密码 |
| --- | --- | --- |
| 超级管理员 | 13800000000 | Admin123456 |
| 运营人员 | 13800000001 | Operator123456 |
| 赛事编辑员 | 13800000002 | Editor123456 |
| 选手 | 13900000001 | Runner123456 |

> 演示环境 `SMS_PROVIDER=mock`，获取验证码时接口会把验证码回显在页面提示中，无需真实短信。

### 4. 自动化测试

```bash
cd marathon-system/server

npm test                # 单元测试（25 项，无需数据库）：身份证校验、RBAC 权限矩阵、zod 表单校验、分页边界、虚拟字段与关键字转义回归
npm run smoke           # 端到端冒烟测试（23 项），需要可用的 MONGODB_URI，跑完自动清理测试数据
SMOKE_KEEP=1 npm run smoke   # 保留冒烟测试数据便于人工查看

cd ../web
npm test                # 前端回归测试（8 项，无需浏览器）：接口返回 HTML/空值时列表状态兜底，防止白屏
```

冒烟测试覆盖的 23 个断言：管理员登录 → 发送/校验短信验证码 → 选手注册 → 创建赛事与组别 → 发布赛事 → 非法身份证拦截 → 报名占位 → 支付 → 并发抢名额不超额 → 占用数写入一致 → 重复身份证拦截 → 审核通过并分配参赛号码 → 未支付不可审核 → 支付进入待审核 → 批量驳回 → 名额释放 → 选手查询自己的报名 → 按姓名筛选 → 导出 CSV → 统计收入与人数 → 分组明细 → 选手越权被拒（403）→ 未登录被拒（401）。

前端回归测试覆盖：静态托管把未命中的 `/api` 路径回退成 `index.html` 并返回 200 时，`listOf` / `paginationOf` 兜底、各列表 reducer 不写入 `undefined`、`auth` 会话结果为 `null` 时不崩溃。

覆盖：注册 → 建赛事 → 发布 → 非法身份证拦截 → 报名占位 → 支付 → 并发超额拦截 → 重复报名拦截 → 审核发号 → 批量驳回释放名额 → 查询/筛选/导出 → 统计 → RBAC 越权拦截。

### 5. Docker 自托管

```bash
cd marathon-system
JWT_SECRET=your-strong-secret docker compose up -d --build
# 前端 http://localhost:8080  后端 http://localhost:4000/api
docker compose exec api node scripts/seed.js   # 可选：写入演示数据
```

---

## 五、部署为公开访问网址

推荐组合（全部有免费额度）：**MongoDB Atlas + Render + Cloudflare Pages**。

### 步骤 1：创建云数据库（MongoDB Atlas）

1. 注册 <https://www.mongodb.com/cloud/atlas>，创建免费 **M0** 集群（512MB 永久免费）。
2. `Database Access` → 新建数据库用户（记住用户名/密码）。
3. `Network Access` → 添加 IP 白名单，Render 免费版无固定出口 IP，选择 `0.0.0.0/0`（生产环境建议改为具体网段）。
4. `Clusters → Connect → Drivers` 复制连接串：
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/marathon?retryWrites=true&w=majority`

### 步骤 2：部署后端（Render）

1. 把本仓库推送到 GitHub / Gitee。
2. Render 控制台 → `New` → `Blueprint` → 选择该仓库（会自动读取 `marathon-system/render.yaml`）；
   或手动 `New → Web Service`：
   - Root Directory：`marathon-system/server`
   - Build Command：`npm install --omit=dev --no-audit --no-fund`
   - Start Command：`node src/index.js`
   - Health Check Path：`/api/health`
3. 配置环境变量：
   | 变量 | 值 |
   | --- | --- |
   | `MONGODB_URI` | 步骤 1 的连接串（数据库名用 `marathon`） |
   | `JWT_SECRET` | 随机长字符串 |
   | `CORS_ORIGIN` | 前端最终域名，如 `https://marathon-web.pages.dev`（多个用逗号分隔） |
   | `NODE_ENV` | `production` |
   | `SMS_PROVIDER` / `MAIL_PROVIDER` / `PAYMENT_PROVIDER` | `mock`（接入真实服务后替换） |
4. 部署完成后访问 `https://<你的服务>.onrender.com/api/health` 应返回 `{"success":true}`。
5. 写入演示数据：在 Render 服务的 `Shell` 中执行 `npm run seed`（或本地用同一个 `MONGODB_URI` 执行，效果相同）。

> 免费实例闲置 15 分钟后会休眠，首次访问约需 30 秒冷启动；可用 UptimeRobot 定时 ping `/api/health` 保活。

### 步骤 3：部署前端（Cloudflare Pages）

1. Cloudflare 控制台 → `Workers & Pages` → `Create` → `Pages` → 连接 Git 仓库。
2. 构建配置：
   - Root directory：`marathon-system/web`
   - Framework preset：`Vite`
   - Build command：`npm install && npm run build`
   - Build output directory：`dist`
3. 环境变量：`VITE_API_BASE_URL = https://<你的服务>.onrender.com/api`
4. 部署完成后得到公开网址。本项目当前使用的地址是 **<https://marathon-registration.pages.dev>**。
5. **回填 CORS**：把该网址填入 Render 的 `CORS_ORIGIN`，保存后 Render 会自动重新部署。

`web/public/_redirects` 已配置 `/* /index.html 200`，保证 React Router 的深链接（如 `/events/xxx`）刷新不 404。

> **实测说明**：Cloudflare Pages 对未命中静态文件的路径会**默认回退到 `index.html` 并返回 200**（已用 `/events/xxx`、`/api/events`、`/nonexistent.js` 三个路径逐一验证）。因此本项目**不再需要 `_redirects`**——它的 `/* /index.html 200` 规则会被 Cloudflare 判定为 `Infinite loop detected` 并忽略，白白刷一条警告。自托管（nginx）场景仍依赖 `nginx.conf` 里的 `try_files`。
>
> 这个默认回退有个副作用：**后端未部署时，`/api/*` 请求也会拿到 200 + HTML**。前端因此做了响应信封校验与列表兜底（见 `web/src/api/client.js` 的 `unwrap` 与 `web/src/store/helpers.js`），会明确提示「接口返回了非预期内容」而不是白屏。

### 步骤 4：验收清单

- [ ] `GET /api/health` 正常返回
- [ ] 首页可打开，赛事列表能加载到演示赛事
- [ ] 用演示选手账号登录 → 报名 → 支付 → 「我的报名」显示待审核
- [ ] 用超级管理员登录 → 管理后台审核通过 → 选手报名状态变为已通过且有参赛号码
- [ ] 数据概览的报名人数与收入随操作变化
- [ ] 用赛事编辑员账号登录，仅能看到被分配赛事，且审核按钮不可用（后端返回 403）

---

## 六、环境变量说明

### 后端 `server/.env`

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | 服务端口 | `4000` |
| `NODE_ENV` | 运行环境 | `development` |
| `MONGODB_URI` | MongoDB 连接串 | `mongodb://127.0.0.1:27017/marathon` |
| `JWT_SECRET` | JWT 签名密钥，生产必须替换 | `change-me-in-production` |
| `JWT_EXPIRES_IN` | 登录态有效期 | `7d` |
| `CORS_ORIGIN` | 允许的前端来源，逗号分隔 | `http://localhost:5173` |
| `SMS_PROVIDER` / `MAIL_PROVIDER` | `mock` 仅打印日志；接真实服务需扩展 `src/services` 实现 | `mock` |
| `PAYMENT_PROVIDER` | `mock` 立即支付成功；接微信/支付宝需扩展 `paymentService` 与回调路由 | `mock` |
| `SEED_ADMIN_*` | 种子超级管理员账号 | 见 `.env.example` |

### 前端 `web/.env`

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 后端 API 基地址 | `/api`（配合 Vite 代理/nginx） |

---

## 七、后续规划（第二阶段）

已完成地基与核心闭环，以下为明确的后续迭代项：

1. **接入真实短信/邮件服务**：`smsService`、`mailService` 已预留接口，替换 `send` 实现并注册渠道 SDK 即可。
2. **接入真实支付**：实现微信支付 V3 / 支付宝当面付下单与异步回调验签，落库 `transactionId`，补充超时未支付自动释放名额的定时任务。
3. **体检证明上传**：接入对象存储（S3/OSS/Cloudflare R2），审核页面上传与预览图片，写入 `review.medicalCertificateUrl`。
4. **证书与二维码签到**：审核通过后生成参赛证书 PDF 与签到二维码（`bibNumber` 已就绪），新增签到接口与现场核销页面。
5. **Excel（.xlsx）导出**：当前导出为带 BOM 的 CSV（Excel 可直接打开）；如需多 Sheet/样式，可引入 `exceljs` 输出真正的 xlsx。
6. **前端测试扩充与 CI**：当前已有 8 项基于 `node:test` 的 reducer 回归测试；后续可补 Vitest + React Testing Library 的组件测试，并用 GitHub Actions 执行 `npm test`、前端构建与 `npm run smoke`。
7. **可观测性**：接入结构化日志、错误上报与关键接口限流告警。
8. **水平扩展**：名额占用依赖单文档原子更新，已验证无超额风险；如需多副本部署可引入 Redis 分布式锁与只读副本。

---

## 八、安全说明

- 密码使用 `bcrypt` 加盐哈希存储，接口响应中永不返回 `passwordHash`。
- JWT 认证 + 服务端二次校验账号状态（被禁用账号立即失效）。
- 全站 `helmet` 安全响应头、CORS 白名单、验证码与登录接口限流（`express-rate-limit`）。
- 所有写操作先经 `zod` 校验，再经 RBAC 权限矩阵与赛事归属校验，前后端校验规则一致。
- 身份证号在导出与列表展示时脱敏（`110**********1234`）。
- 演示环境将验证码回显，**生产环境请将 `NODE_ENV` 设为 `production` 并替换 `JWT_SECRET`**。

---

## 九、常见故障排查

| 现象 | 原因与解决 |
| --- | --- |
| 页面打开后**一闪变白屏** | 静态托管把未命中的 `/api` 路径回退成 `index.html`（200 + HTML），前端把 HTML 当成了 JSON 数据。已在 `api/client.js` 加响应信封校验、在 `store/helpers.js` 加列表兜底、并加了全局 `ErrorBoundary`，现在会显示明确的红色提示。若仍白屏，说明 API 地址（`VITE_API_BASE_URL`）没配好。 |
| 公网页面所有接口报跨域 | 后端的 `CORS_ORIGIN` 与实际访问域名不一致。必须带 `https://`、不带结尾 `/`、不带 `www`，多域名用英文逗号分隔且不加空格。 |
| 前端页脚/接口提示「无法连接后端服务」 | 后端未部署或 `VITE_API_BASE_URL` 未配置。这是后端上线前的预期状态。 |
| Cloudflare 构建报 `Missing script: build` | 构建时没在 `marathon-system/web` 目录下执行。检查 Pages 的 **Root directory** 设置。 |
| Cloudflare 提示 `_redirects` 无限循环 | 该规则已被 Cloudflare 拒绝并忽略；本项目已删除 `public/_redirects`，平台的默认 SPA 回退足够。 |
| 后端启动报数据库连接超时 | MongoDB 服务未启动（本地）或 Atlas 白名单未加 `0.0.0.0/0`（云端）。 |
| Atlas 注册报「出现了一个意想不到的问题」 | 注册表单依赖 Google reCAPTCHA，国内直连拿不到校验 token。改用 `Sign up with GitHub` 授权注册。 |
| Render 首个请求很慢（约 30 秒） | 免费实例闲置 15 分钟后休眠，先访问一次 `/api/health` 唤醒。 |
| 报名提示「该身份证号已报名本赛事」 | 设计如此：同一赛事下同一身份证只能有一条有效报名，取消或驳回后可重新报名。 |

