from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth
from app.config import settings
from app.models.note import NoteResponse
from app.services.vault_reader import VaultReader

router = APIRouter()
reader = VaultReader(settings.vault_path)


@router.get("/notes/{note_path:path}", response_model=NoteResponse)
async def get_note(note_path: str, _: str = Depends(require_auth)):
    result = await reader.read_note(note_path)
    if result is None:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    return NoteResponse(**result)
