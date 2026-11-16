from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import User
from ..payloads import user_dict
from ..schemas import LoginIn, RegisterIn, UpdateUserIn
from ..security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["users"])


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterIn, db: AsyncSession = Depends(get_db)) -> dict:
    email = data.email.lower()
    existing = await db.scalar(
        select(User).where(or_(User.email == email, User.username == data.username))
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="用户名或邮箱已被占用",
        )

    user = User(
        username=data.username,
        email=email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="用户名或邮箱已被占用",
        ) from None

    await db.refresh(user)
    return user_dict(user, create_access_token(user.id))


@router.post("/users/login")
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)) -> dict:
    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码不正确"
        )
    return user_dict(user, create_access_token(user.id))


@router.get("/user")
async def current_user(user: User = Depends(get_current_user)) -> dict:
    return user_dict(user, None)


@router.put("/user")
async def update_user(
    data: UpdateUserIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if data.bio is not None:
        user.bio = data.bio
    if data.image is not None:
        user.image = data.image
    if data.password:
        user.password_hash = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    return user_dict(user, create_access_token(user.id))
