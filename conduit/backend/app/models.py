import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Column,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

followers = Table(
    "followers",
    Base.metadata,
    Column("follower_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("following_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

favorites = Table(
    "favorites",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("article_id", ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    bio: Mapped[str | None] = mapped_column(String(500), default=None)
    image: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    articles: Mapped[list["Article"]] = relationship(back_populates="author")
    following: Mapped[list["User"]] = relationship(
        secondary=followers,
        primaryjoin=id == followers.c.follower_id,
        secondaryjoin=id == followers.c.following_id,
        backref="followed_by",
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)

    articles: Mapped[list["Article"]] = relationship(secondary=article_tags, back_populates="tags")


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    author: Mapped[User] = relationship(back_populates="articles")
    tags: Mapped[list[Tag]] = relationship(secondary=article_tags, back_populates="articles", lazy="selectin")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="article", cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    body: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    article_id: Mapped[str] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    article: Mapped[Article] = relationship(back_populates="comments")
    author: Mapped[User] = relationship()
