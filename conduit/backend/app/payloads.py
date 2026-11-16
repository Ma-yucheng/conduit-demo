"""把 ORM 对象转成 Conduit 规范要求的 JSON 结构，并处理 follow / favorite 状态。"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Article, Comment, User, favorites, followers


def user_dict(user: User, token: str | None = None) -> dict:
    data = {
        "email": user.email,
        "username": user.username,
        "bio": user.bio,
        "image": user.image,
    }
    if token is not None:
        data["token"] = token
    return {"user": data}


def profile_dict(user: User, following: bool) -> dict:
    return {
        "profile": {
            "username": user.username,
            "bio": user.bio,
            "image": user.image,
            "following": following,
        }
    }


async def following_set(db: AsyncSession, me_id: str | None, author_ids: set[str]) -> set[str]:
    """我关注了作者集合中的哪些人。"""
    if not me_id or not author_ids:
        return set()
    rows = await db.execute(
        select(followers.c.following_id).where(
            followers.c.follower_id == me_id,
            followers.c.following_id.in_(author_ids),
        )
    )
    return {r[0] for r in rows.all()}


async def favorite_stats(
    db: AsyncSession, me_id: str | None, article_ids: list[str]
) -> dict[str, tuple[int, bool]]:
    """返回 {article_id: (收藏数, 我是否收藏)}。"""
    if not article_ids:
        return {}
    rows = await db.execute(
        select(favorites.c.article_id, func.count())
        .where(favorites.c.article_id.in_(article_ids))
        .group_by(favorites.c.article_id)
    )
    counts = {aid: n for aid, n in rows.all()}

    mine: set[str] = set()
    if me_id:
        rows = await db.execute(
            select(favorites.c.article_id).where(
                favorites.c.user_id == me_id,
                favorites.c.article_id.in_(article_ids),
            )
        )
        mine = {r[0] for r in rows.all()}

    return {aid: (counts.get(aid, 0), aid in mine) for aid in article_ids}


def article_dict(
    article: Article, *, fav_count: int, favorited: bool, following: bool
) -> dict:
    return {
        "article": {
            "slug": article.slug,
            "title": article.title,
            "description": article.description,
            "body": article.body,
            "tagList": [t.name for t in article.tags],
            "createdAt": article.created_at.isoformat(),
            "updatedAt": article.updated_at.isoformat(),
            "favorited": favorited,
            "favoritesCount": fav_count,
            "author": {
                "username": article.author.username,
                "bio": article.author.bio,
                "image": article.author.image,
                "following": following,
            },
        }
    }


def comment_dict(comment: Comment, following: bool) -> dict:
    return {
        "comment": {
            "id": comment.id,
            "body": comment.body,
            "createdAt": comment.created_at.isoformat(),
            "author": {
                "username": comment.author.username,
                "bio": comment.author.bio,
                "image": comment.author.image,
                "following": following,
            },
        }
    }
