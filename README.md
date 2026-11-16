# 全栈项目 Demo

本目录存放可运行的全栈练手项目，每个子目录是一个独立应用。

## 项目列表

| 目录 | 说明 | 技术栈 | 端口 |
|---|---|---|---|
| [conduit/](conduit/) | RealWorld 规范的博客社区（Conduit） | FastAPI + PostgreSQL + Next.js | 8000 / 3000 |

## 快速启动

```bash
./run.sh start      # 启动前后端
./run.sh status     # 看状态
./run.sh logs       # 看日志
./run.sh stop       # 停止
```

启动后：

- 前端 http://localhost:3000
- 接口文档 http://127.0.0.1:8000/docs

**演示账号**：`alice@example.com` / `password123`（bob 同密码）

## 前置依赖

数据库靠本机 `devstack` 提供：

```bash
devstack up        # PostgreSQL 16 + Redis 7
devstack status
```

没起来的话后端会连不上库。详细环境说明见 `~/config/dev/README.md` 与《全栈环境交付报告》。

## 目录约定

```
全栈-项目-demo/
├── run.sh              一键启停脚本
├── .gitignore
└── conduit/            项目本体
    ├── README.md       项目文档
    ├── backend/        FastAPI 后端
    ├── frontend/       Next.js 前端
    └── docs/shots/     自动化截图
```

每个项目内是标准的 `backend/ + frontend/` 双目录结构，可以单独拆走。

## 新增项目时

1. 在本目录下建同构目录（`backend/` `frontend/` `README.md`）
2. 分配一对不冲突的端口
3. 在 `run.sh` 里加对应的启停函数，或另写一个 `run-<项目>.sh`
4. 更新上面的项目列表
