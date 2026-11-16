# 项目本体

上一层的 [README](../README.md) 讲怎么跑。这份讲代码怎么读、怎么改。

## 后端

```
backend/app/
├── main.py        入口。挂 CORS、启动时建表、把路由挂到 /api
├── config.py      .env 读成 settings，一个地方管所有配置
├── db.py          异步引擎、Session、get_db 依赖
├── models.py      5 张表：users / articles / tags / comments / 关联表
├── security.py    密码散列、JWT 签发校验、取当前用户
├── payloads.py    把 ORM 对象拼成 JSON，顺带算点赞数、关注状态
└── routers/       users · profiles · articles · comments · tags
```

**为什么单独有个 `payloads.py`。** 同一个文章，列表页要「点赞数」，详情页要「我有没有点赞」，返回结构还不完全一样。拼装逻辑抽出来，路由里就只剩查数据。

### 五张表

| 表 | 干什么 | 备注 |
|---|---|---|
| `users` | 账号 | 密码存 `pbkdf2_sha256$轮数$盐$哈希` |
| `articles` | 文章 | `slug` 唯一，是 URL 里那段 |
| `tags` | 标签 | 和文章多对多 |
| `comments` | 评论 | 挂在文章下 |
| `followers` / `favorites` | 纯关联表 | 没有主键 id，两列复合主键 |

### 加一个接口要动哪

比如加「按阅读量排序」：

1. `models.py` 给 `Article` 加 `views` 字段（或建新表）
2. `schemas.py` 加请求体（如果前端要传东西）
3. `routers/articles.py` 加路由，记得写 `response_model` 之外的返回结构时对照 `payloads.py`
4. 前端 `lib/api.ts` 不用动，`app/` 里调一下就成

改完 `models.py` 要重建库，因为建表是 `create_all`：

```bash
devstack reset        # 清空数据卷
python seed.py        # 重新灌演示数据
```

## 前端

```
frontend/
├── app/
│   ├── page.tsx              首页：列表 + 标签筛选 + 分页
│   ├── article/[slug]/       文章详情、点赞、评论
│   ├── editor/               发文章 / 改文章（?slug= 区分）
│   ├── login/ register/      表单页
│   ├── settings/             改资料
│   └── profile/[username]/   个人主页
├── components/               Nav、文章卡片
└── lib/
    ├── api.ts                fetch 封装，自动带 token，统一报错
    ├── auth.ts               useAuth：读 token、拉当前用户
    └── types.ts              Article / User / Comment 的类型
```

登录态存在 localStorage，`api.ts` 每次请求自动加 `Authorization`。没做成 cookie 是因为前后端分域，先简单点。

## 自动化检查

`frontend/scripts/ui-check.mjs` 用 Playwright 真开浏览器，走一遍登录 → 点赞 → 评论 → 发文章 → 个人主页，顺便截图。

```bash
cd frontend
pnpm ui:check        # 需要前后端都在跑
```

截图会落到 `docs/shots/`。截图和检查一起跑，是保证「改完没把界面改崩」最省事的办法。

## 配置

| 文件 | 内容 |
|---|---|
| `backend/.env` | 数据库地址、JWT 密钥、CORS 白名单 |
| `frontend/.env.local` | 后端地址 `NEXT_PUBLIC_API_URL` |

两个都有对应的 `.example`，照抄改名就能用。生产环境记得换 `JWT_SECRET`。
