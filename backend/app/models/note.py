from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator


class NoteResponse(BaseModel):
    path: str
    content: str
    frontmatter: Dict[str, Any]
    backlinks: List[str]


class IngestRequest(BaseModel):
    target_path: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    source_query_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @validator("target_path")
    def no_path_traversal(cls, v):
        if ".." in v.split("/"):
            raise ValueError("경로 탈출 문자 '../' 사용 불가")
        return v


class IngestResponse(BaseModel):
    status: str
    path: str


class ShareRequest(BaseModel):
    platform: str = Field(default="clipboard")
    content: str
    note_path: Optional[str] = None


class ShareResponse(BaseModel):
    status: str
    url: Optional[str] = None


class RawIngestRequest(BaseModel):
    content: str
    title: Optional[str] = None
