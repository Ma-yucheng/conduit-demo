"""灌入演示数据：两个用户 + 三篇文章。重复执行不会产生重复数据。

用法：.venv/bin/python seed.py
"""

import asyncio

from sqlalchemy import func, select

from app.db import SessionLocal, init_models
from app.models import Article, User
from app.routers.articles import _ensure_tags, make_slug
from app.security import hash_password

DEMO_USERS = [
    {
        "username": "alice",
        "email": "alice@example.com",
        "password": "password123",
        "bio": "写后端，也写一点点前端。",
    },
    {
        "username": "bob",
        "email": "bob@example.com",
        "password": "password123",
        "bio": "喜欢数据库和分布式系统。",
    },
]

DEMO_ARTICLES = [
    {
        "author": "alice",
        "title": "How to build a Conduit app",
        "description": "从零实现 RealWorld 规范的完整流程。",
        "body": "这篇文章记录了我用 FastAPI + Next.js 实现 Conduit 的过程……",
        "tags": ["realworld", "fastapi"],
    },
    {
        "author": "bob",
        "title": "Postgres 索引入门",
        "description": "B-tree、GIN、部分索引分别适合什么场景。",
        "body": "索引不是越多越好……先看查询计划再决定。",
        "tags": ["postgres", "database"],
    },
    {
        "author": "alice",
        "title": "为什么我用 uv 管理 Python",
        "description": "比 pip 快一个数量级的工作流。",
        "body": "uv 把解释器、虚拟环境、依赖锁文件统一在一个工具里……",
        "tags": ["python", "tooling"],
    },
]


async def main() -> None:
    await init_models()
    async with SessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(Article))
        if existing:
            print(f"已有 {existing} 篇文章，跳过种子数据")
            return

        users: dict[str, User] = {}
        for spec in DEMO_USERS:
            user = await db.scalar(select(User).where(User.username == spec["username"]))
            if user is None:
                user = User(
                    username=spec["username"],
                    email=spec["email"],
                    password_hash=hash_password(spec["password"]),
                    bio=spec["bio"],
                )
                db.add(user)
                await db.flush()
            users[spec["username"]] = user

        for spec in DEMO_ARTICLES:
            tags = await _ensure_tags(db, spec["tags"])
            db.add(
                Article(
                    slug=make_slug(spec["title"]),
                    title=spec["title"],
                    description=spec["description"],
                    body=spec["body"],
                    author_id=users[spec["author"]].id,
                    tags=tags,
                )
            )

        await db.commit()
        print("种子数据写入完成：alice / bob（密码都是 password123），3 篇文章")


if __name__ == "__main__":
    asyncio.run(main())
