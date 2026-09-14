# 用户登录页面展示

一个基于 Vue 3 + Vite 的登录页面练习项目，包含用户名密码输入、算术验证码、前端基础校验与登录成功提示。

## 项目结构

```text
vue-login-homework/
  src/
    Login.vue       # 登录页面组件
    App.vue         # 根组件
    main.js         # 应用入口
    style.css       # 全局样式
  index.html
  vite.config.js
  package.json
```

## 本地运行

```bash
npm install
npm run dev
```

## 功能说明

- 用户名、密码必填校验
- 验证码采用十以内加减法，点击验证码可刷新
- 前端模拟账号：`super_admin` / `123456Ab.`
- 登录成功弹窗提示

## 技术栈

- Vue 3
- Vite
- 原生 Canvas 绘制验证码