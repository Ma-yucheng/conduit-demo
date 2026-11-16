from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import Tag

router = APIRouter(tags=["tags"])


@router.get("/tags")
async def list_tags(db: AsyncSession = Depends(get_db)) -> dict:
    rows = await db.execute(select(Tag.name).order_by(Tag.name))
    return {"tags": [r[0] for r in rows.all()]}
