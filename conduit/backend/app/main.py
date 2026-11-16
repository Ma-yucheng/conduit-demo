from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_models
from .routers import articles, comments, profiles, tags, users

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_models()
    yield


app = FastAPI(title="Conduit API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (users, profiles, articles, comments, tags):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
