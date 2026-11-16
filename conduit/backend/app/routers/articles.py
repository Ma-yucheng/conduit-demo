import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_db
from ..models import Article, Tag, User, article_tags, favorites, followers
from ..payloads import article_dict, favorite_stats, following_set
from ..schemas import ArticleIn
from ..security import get_current_user, get_optional_user

router = APIRouter(tags=["articles"])

_LOAD = (selectinload(Article.author), selectinload(Article.tags))


def make_slug(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    return f"{base}-{uuid.uuid4().hex[:6]}" if base else uuid.uuid4().hex[:12]


async def _get_article(db: AsyncSession, slug: str) -> Article:
    article = await db.scalar(
        select(Article).options(*_LOAD).where(Article.slug == slug)
    )
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    return article


async def _ensure_tags(db: AsyncSession, names: list[str]) -> list[Tag]:
    cleaned = [n.strip() for n in names if n and n.strip()]
    if not cleaned:
        return []
    await db.execute(
        pg_insert(Tag)
        .values([{"name": n} for n in cleaned])
        .on_conflict_do_nothing(index_elements=["name"])
    )
    rows = await db.execute(select(Tag).where(Tag.name.in_(cleaned)))
    return list(rows.scalars().all())


def _envelope(article: Article, stats: tuple[int, bool], following: bool) -> dict:
    return article_dict(
        article, fav_count=stats[0], favorited=stats[1], following=following
    )


async def _render(
    db: AsyncSession, articles: list[Article], me: User | None
) -> list[dict]:
    me_id = me.id if me else None
    ids = [a.id for a in articles]
    stats = await favorite_stats(db, me_id, ids)
    followed = await following_set(db, me_id, {a.author_id for a in articles})
    return [
        _envelope(a, stats[a.id], a.author_id in followed)["article"] for a in articles
    ]


@router.get("/articles/feed")
async def feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    following_ids = select(followers.c.following_id).where(
        followers.c.follower_id == me.id
    )
    base = select(Article).where(Article.author_id.in_(following_ids))
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = await db.execute(
        base.options(*_LOAD)
        .order_by(Article.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    articles = list(rows.scalars().all())
    return {"articles": await _render(db, articles, me), "articlesCount": total}


@router.get("/articles")
async def list_articles(
    tag: str | None = None,
    author: str | None = None,
    favorited: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    me: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    clauses = []
    if tag:
        clauses.append(
            Article.id.in_(
                select(article_tags.c.article_id)
                .join(Tag, Tag.id == article_tags.c.tag_id)
                .where(Tag.name == tag)
            )
        )
    if author:
        clauses.append(
            Article.author_id.in_(select(User.id).where(User.username == author))
        )
    if favorited:
        clauses.append(
            Article.id.in_(
                select(favorites.c.article_id)
                .join(User, User.id == favorites.c.user_id)
                .where(User.username == favorited)
            )
        )

    count_stmt = select(func.count()).select_from(Article)
    if clauses:
        count_stmt = count_stmt.where(*clauses)
    total = await db.scalar(count_stmt) or 0

    stmt = select(Article).options(*_LOAD)
    if clauses:
        stmt = stmt.where(*clauses)
    rows = await db.execute(
        stmt.order_by(Article.created_at.desc()).limit(limit).offset(offset)
    )
    articles = list(rows.scalars().all())
    return {"articles": await _render(db, articles, me), "articlesCount": total}


@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(
    data: ArticleIn,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    tags = await _ensure_tags(db, data.tagList)
    article = Article(
        slug=make_slug(data.title),
        title=data.title,
        description=data.description,
        body=data.body,
        author_id=me.id,
        tags=tags,
    )
    db.add(article)
    await db.commit()
    article = await _get_article(db, article.slug)
    return _envelope(article, (0, False), False)


@router.get("/articles/{slug}")
async def get_article(
    slug: str,
    me: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _get_article(db, slug)
    me_id = me.id if me else None
    stats = (await favorite_stats(db, me_id, [article.id]))[article.id]
    followed = await following_set(db, me_id, {article.author_id})
    return _envelope(article, stats, article.author_id in followed)


@router.put("/articles/{slug}")
async def update_article(
    slug: str,
    data: ArticleIn,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _get_article(db, slug)
    if article.author_id != me.id:
        raise HTTPException(status_code=403, detail="只能修改自己的文章")

    article.title = data.title
    article.description = data.description
    article.body = data.body
    article.tags = await _ensure_tags(db, data.tagList)
    await db.commit()

    article = await _get_article(db, article.slug)
    stats = (await favorite_stats(db, me.id, [article.id]))[article.id]
    return _envelope(article, stats, False)


@router.delete("/articles/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    slug: str,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    article = await _get_article(db, slug)
    if article.author_id != me.id:
        raise HTTPException(status_code=403, detail="只能删除自己的文章")
    await db.delete(article)
    await db.commit()


@router.post("/articles/{slug}/favorite")
async def favorite(
    slug: str,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _get_article(db, slug)
    await db.execute(
        pg_insert(favorites)
        .values(user_id=me.id, article_id=article.id)
        .on_conflict_do_nothing()
    )
    await db.commit()
    stats = (await favorite_stats(db, me.id, [article.id]))[article.id]
    followed = await following_set(db, me.id, {article.author_id})
    return _envelope(article, stats, article.author_id in followed)


@router.delete("/articles/{slug}/favorite")
async def unfavorite(
    slug: str,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _get_article(db, slug)
    await db.execute(
        delete(favorites).where(
            favorites.c.user_id == me.id, favorites.c.article_id == article.id
        )
    )
    await db.commit()
    stats = (await favorite_stats(db, me.id, [article.id]))[article.id]
    followed = await following_set(db, me.id, {article.author_id})
    return _envelope(article, stats, article.author_id in followed)
