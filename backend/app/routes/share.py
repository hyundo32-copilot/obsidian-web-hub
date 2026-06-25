from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_auth
from app.models.note import ShareRequest, ShareResponse

router = APIRouter()


@router.post("/share", response_model=ShareResponse)
async def share_note(req: ShareRequest, _: str = Depends(require_auth)):
    if req.platform != "clipboard":
        raise HTTPException(
            status_code=501,
            detail=f"{req.platform} 공유는 Phase 4에서 지원됩니다.",
        )
    # clipboard 복사는 프론트엔드에서 처리 — 백엔드는 상태만 반환
    return ShareResponse(status="copied", url=None)
