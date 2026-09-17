# 项目仓库

本仓库包含两个项目：

## 1. 马拉松赛事报名管理系统（主项目）

一个前后端分离的马拉松赛事报名管理系统，覆盖用户管理、赛事管理、报名与审核、选手信息管理、统计看板、RBAC 权限等模块，可部署为公开访问的网站。

技术栈：React + Redux Toolkit + Vite / Node.js + Express + MongoDB / Docker。

- 源码与完整文档：[`marathon-system/`](marathon-system/README.md)
- 前端页面：首页、赛事列表与详情、在线报名、我的报名、个人中心、管理后台（数据概览 / 赛事管理 / 报名管理 / 用户与权限）
- 后端接口：`/api/auth`、`/api/users`、`/api/events`、`/api/registrations`、`/api/stats`
- 本地运行：`cd marathon-system/server && npm install && npm run seed && npm run dev`，另开终端 `cd marathon-system/web && npm install && npm run dev`
- 部署方式：MongoDB Atlas + Render + Cloudflare Pages，或 `docker compose up -d --build`
- 冒烟测试：`cd marathon-system/server && npm run smoke`（验证注册→建赛事→报名→支付→审核→统计全闭环）

## 2. 用户登录页面展示（作业）

一个基于 Vue 3 + Vite 的用户登录页面作业，包含用户名密码输入、算术验证码、前端表单校验与登录成功提示。

## 在线预览

直接用浏览器打开即可查看，无需安装任何环境：

**https://login-homework.pages.dev/**

> 部署于 Cloudflare Pages。

## 页面预览

![登录页面](docs/login-page.png)

| 表单校验提示 | 手机端适配 |
| --- | --- |
| ![验证码错误提示](docs/login-error.png) | ![手机端效果](docs/login-mobile.png) |

## 功能说明

- 用户名、密码、验证码非空校验
- 验证码为 10 以内的加减法，点击验证码可刷新
- 前端模拟账号：`super_admin` / `123456Ab.`
- 登录成功弹出提示
- 响应式布局，手机浏览器可正常访问

## 技术栈

- Vue 3（组合式 API，`<script setup>`）
- Vite
- 原生 Canvas 绘制验证码

## 项目结构

```text
sunwanqing/
  README.md
  docs/
    login-page.png
    login-error.png
    login-mobile.png
  vue-login-homework/
    src/
      Login.vue       # 登录页面组件
      App.vue         # 根组件
      main.js         # 应用入口
      style.css       # 全局样式
    public/
      favicon.svg
    index.html
    vite.config.js
    package.json
```

## 本地运行

```bash
cd vue-login-homework
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
```

构建产物输出到 `vue-login-homework/dist`。
