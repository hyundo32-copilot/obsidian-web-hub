from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth
from app.config import settings
from app.models.note import IngestRequest, IngestResponse
from app.services.hermes_ingest_service import delegate_ingest_to_hermes
from app.services.vault_writer import VaultWriter

router = APIRouter()
writer = VaultWriter(settings.vault_path)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_note(req: IngestRequest, _: str = Depends(require_auth)):
    try:
        status = await writer.ingest(
            target_path=req.target_path,
            content=req.content,
            tags=req.tags,
            source_query_id=req.source_query_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장 실패: {e}")

    safe_path = req.target_path.lstrip("/")

    hermes_result = None
    if req.delegate:
        hermes_result = await delegate_ingest_to_hermes(safe_path)

    return IngestResponse(status=status, path=safe_path, hermes_result=hermes_result)
