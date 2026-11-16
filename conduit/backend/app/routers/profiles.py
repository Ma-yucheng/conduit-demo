from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, insert, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import User, followers
from ..payloads import following_set, profile_dict
from ..security import get_current_user, get_optional_user

router = APIRouter(tags=["profiles"])


async def _get_user_or_404(db: AsyncSession, username: str) -> User:
    user = await db.scalar(select(User).where(User.username == username))
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.get("/profiles/{username}")
async def get_profile(
    username: str,
    me: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    target = await _get_user_or_404(db, username)
    followed = bool(await following_set(db, me.id if me else None, {target.id}))
    return profile_dict(target, followed)


@router.post("/profiles/{username}/follow")
async def follow(
    username: str,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    target = await _get_user_or_404(db, username)
    if target.id == me.id:
        raise HTTPException(status_code=422, detail="不能关注自己")
    await db.execute(
        pg_insert(followers)
        .values(follower_id=me.id, following_id=target.id)
        .on_conflict_do_nothing()
    )
    await db.commit()
    return profile_dict(target, True)


@router.delete("/profiles/{username}/follow")
async def unfollow(
    username: str,
    me: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    target = await _get_user_or_404(db, username)
    await db.execute(
        delete(followers).where(
            followers.c.follower_id == me.id,
            followers.c.following_id == target.id,
        )
    )
    await db.commit()
    return profile_dict(target, False)
