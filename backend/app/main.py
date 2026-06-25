import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import ingest, notes, query, share

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="옵시디언 웹 허브",
    description="옵시디언 볼트 기반 개인 지식 웹 허브 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query.router, prefix="/api", tags=["query"])
app.include_router(notes.router, prefix="/api", tags=["notes"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(share.router, prefix="/api", tags=["share"])


@app.get("/health")
async def health():
    return {"status": "ok"}
