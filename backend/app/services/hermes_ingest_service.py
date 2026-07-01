import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def delegate_ingest_to_hermes(vault_rel_path: str) -> Optional[str]:
    """obsidian-knowledge-base-workflow 스킬로 raw 파일 인제스트 위임."""
    prompt = f"obsidian-knowledge-base-workflow: {vault_rel_path} 파일을 인제스트해줘"

    headers = {
        "Content-Type": "application/json",
    }
    if settings.hermes_api_key:
        headers["Authorization"] = f"Bearer {settings.hermes_api_key}"
    body = {
        "model": "default",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1500,
        "stream": True,
    }

    try:
        timeout = httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{settings.hermes_api_url}/v1/chat/completions",
                headers=headers,
                json=body,
            ) as resp:
                resp.raise_for_status()
                parts: list[str] = []
                failed = False
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        obj = __import__("json").loads(chunk)
                        delta = obj.get("choices", [{}])[0].get("delta", {})
                        if delta.get("content"):
                            parts.append(delta["content"])
                        if obj.get("hermes", {}).get("failed"):
                            failed = True
                    except Exception:
                        continue

                logger.info("hermes ingest done: failed=%s parts=%d", failed, len(parts))
                if failed:
                    return None
                return "".join(parts).strip() or None
    except Exception as e:
        logger.error("hermes ingest exception: %r", e)
        return None
