"""请求体校验。响应统一用 Conduit 规范的 envelope 字典。"""

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UpdateUserIn(BaseModel):
    bio: str | None = None
    image: str | None = None
    password: str | None = Field(default=None, min_length=6, max_length=128)


class ArticleIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=500)
    body: str = Field(min_length=1)
    tagList: list[str] = Field(default_factory=list)


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
