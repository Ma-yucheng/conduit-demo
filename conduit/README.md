# Conduit — RealWorld 全栈示例

FastAPI + PostgreSQL + Next.js 实现的 [RealWorld](https://realworld-docs.netlify.app/)（Conduit）示例应用。
按官方 API 规范实现，前后端分离，可作为全栈练手项目。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Python 3.13 · FastAPI · SQLAlchemy 2.0（async）· asyncpg |
| 数据库 | PostgreSQL 16（Docker） |
| 鉴权 | JWT（PyJWT）+ PBKDF2-SHA256 密码散列（标准库实现，无 passlib 兼容坑） |
| 前端 | Next.js 16（App Router）· React 19 · TypeScript · 手写 CSS |

## 目录

```
conduit/
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI 入口、CORS、生命周期建表
│   │   ├── config.py        .env 配置（pydantic-settings）
│   │   ├── db.py            异步引擎与 Session
│   │   ├── models.py        User / Article / Tag / Comment / 关联表
│   │   ├── schemas.py       请求体校验
│   │   ├── security.py      密码散列、JWT、当前用户依赖
│   │   ├── payloads.py      输出结构 + follow/favorite 状态聚合
│   │   └── routers/         users · profiles · articles · comments · tags
│   ├── seed.py              演示数据
│   └── .env.example
└── frontend/
    ├── app/                 首页 / 文章 / 编辑器 / 登录注册 / 设置 / 个人页
    ├── components/          Nav · ArticlePreview
    └── lib/                 api 封装 · auth hook · 类型 · 格式化
```

## 启动

前置：`devstack up`（Postgres 已在跑），或在 `backend/.env` 里换成你自己的库。

### 后端（8000）

```bash
cd backend
cp .env.example .env          # 首次
.venv/bin/python seed.py      # 灌演示数据（可重复执行）
.venv/bin/uvicorn app.main:app --reload --port 8000
```

接口文档：http://127.0.0.1:8000/docs

### 前端（3000）

```bash
cd frontend
pnpm install                  # 首次
pnpm dev                      # 或 pnpm build && pnpm start
```

打开 http://localhost:3000

### 演示账号

| 邮箱 | 密码 |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |

种子数据带 3 篇文章；注册新账号可以体验完整流程。

## 已实现的接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/users` | 注册，返回 JWT |
| POST | `/api/users/login` | 登录 |
| GET/PUT | `/api/user` | 当前用户 / 修改资料密码 |
| GET | `/api/profiles/:username` | 用户资料 |
| POST/DELETE | `/api/profiles/:username/follow` | 关注 / 取关 |
| GET | `/api/articles` | 列表，支持 `tag` `author` `favorited` `limit` `offset` |
| GET | `/api/articles/feed` | 关注的人的动态（需登录） |
| POST | `/api/articles` | 发文章 |
| GET/PUT/DELETE | `/api/articles/:slug` | 详情 / 编辑 / 删除 |
| POST/DELETE | `/api/articles/:slug/favorite` | 点赞 / 取消 |
| GET/POST | `/api/articles/:slug/comments` | 评论列表 / 发表 |
| DELETE | `/api/articles/:slug/comments/:id` | 删除评论 |
| GET | `/api/tags` | 全部标签 |
| GET | `/api/health` | 健康检查 |

## 可以拿来练什么

1. **加分页**：目前列表支持 `limit/offset`，前端有页码按钮，但没做服务端游标分页。
2. **换 ORM 写法**：`payloads.py` 里用聚合查询补 `favoritesCount`，可以改成数据库层面的一次性 JOIN。
3. **加 Redis**：文章阅读数、热门标签、限流都可以落到 Redis（环境里已经跑着）。
4. **加迁移**：现在启动时 `create_all` 建表，生产应换成 Alembic。
5. **测试**：用 `pytest + httpx.AsyncClient` 覆盖注册→发文章→评论主链路。
6. **部署**：Dockerfile + docker compose 一把梭，或 Vercel（前端）+ Railway（后端）。

## 已知取舍

- 密码用标准库 PBKDF2，演示够用；生产建议 argon2/bcrypt。
- 中文标题的 slug 会退化成随机串（非 ASCII 无法转写），不影响功能。
- 开发期 `create_all` 建表，改模型需 `devstack reset` 重建库。
