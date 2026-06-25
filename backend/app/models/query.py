from typing import List, Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    mode: str = Field(default="wikisearch")
    limit: int = Field(default=10, ge=1, le=50)


class NoteResult(BaseModel):
    path: str
    title: str
    snippet: str
    score: float
    tags: List[str]


class QueryResponse(BaseModel):
    query_id: str
    results: List[NoteResult]
    synthesis: Optional[str] = None
