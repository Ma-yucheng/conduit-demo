from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_db
from ..models import Article, Comment
from ..payloads import comment_dict, following_set
from ..schemas import CommentIn
from ..security import get_current_user, get_optional_user

router = APIRouter(tags=["comments"])


async def _article_by_slug(db: AsyncSession, slug: str) -> Article:
    article = await db.scalar(select(Article).where(Article.slug == slug))
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    return article


@router.get("/articles/{slug}/comments")
async def list_comments(
    slug: str,
    me=Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _article_by_slug(db, slug)
    rows = await db.execute(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.article_id == article.id)
        .order_by(Comment.created_at.desc())
    )
    comments = list(rows.scalars().all())
    followed = await following_set(
        db, me.id if me else None, {c.author_id for c in comments}
    )
    return {
        "comments": [comment_dict(c, c.author_id in followed)["comment"] for c in comments]
    }


@router.post("/articles/{slug}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    slug: str,
    data: CommentIn,
    me=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    article = await _article_by_slug(db, slug)
    comment = Comment(body=data.body, article_id=article.id, author_id=me.id)
    db.add(comment)
    await db.commit()

    comment = await db.scalar(
        select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment.id)
    )
    return comment_dict(comment, False)


@router.delete("/articles/{slug}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    slug: str,
    comment_id: str,
    me=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    article = await _article_by_slug(db, slug)
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.article_id != article.id:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.author_id != me.id and article.author_id != me.id:
        raise HTTPException(status_code=403, detail="无权删除该评论")
    await db.delete(comment)
    await db.commit()
