import logging
import uuid

from fastapi import APIRouter, Depends

from app.auth import require_auth
from app.config import settings
from app.models.query import QueryRequest, QueryResponse
from app.services.hermes_service import summarize_with_hermes
from app.services.vault_reader import VaultReader

logger = logging.getLogger(__name__)
router = APIRouter()
reader = VaultReader(settings.vault_path)


@router.post("/query", response_model=QueryResponse)
async def query_vault(req: QueryRequest, _: str = Depends(require_auth)):
    logger.info("query=%r mode=%s limit=%d", req.query, req.mode, req.limit)

    results = await reader.search(req.query, req.limit)
    logger.info("search results=%d", len(results))

    synthesis = None
    if req.mode == "llm-summary":
        synthesis = await summarize_with_hermes(req.query, results)
        logger.info("synthesis=%s", "ok" if synthesis else "None")

    return QueryResponse(
        query_id=str(uuid.uuid4()),
        results=results,
        synthesis=synthesis,
    )
