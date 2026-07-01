import logging
from typing import List, Optional

import httpx

from app.config import settings
from app.models.query import NoteResult

logger = logging.getLogger(__name__)


async def summarize_with_hermes(query: str, results: List[NoteResult]) -> Optional[str]:
    # Use obsidian-wiki-query skill prefix so Hermes reads the vault directly
    prompt = f"obsidian-wiki-query: {query}"

    headers = {
        "Content-Type": "application/json",
    }
    if settings.hermes_api_key:
        headers["Authorization"] = f"Bearer {settings.hermes_api_key}"
    body = {
        "model": "default",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
        "stream": True,
    }

    try:
        timeout = httpx.Timeout(connect=10.0, read=180.0, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{settings.hermes_api_url}/v1/chat/completions",
                headers=headers,
                json=body,
            ) as resp:
                resp.raise_for_status()
                content_parts: list[str] = []
                finish_reason = None
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
                            content_parts.append(delta["content"])
                        fr = obj.get("choices", [{}])[0].get("finish_reason")
                        if fr:
                            finish_reason = fr
                        if obj.get("hermes", {}).get("failed"):
                            failed = True
                    except Exception:
                        continue

                logger.info("hermes stream done: finish=%s failed=%s parts=%d",
                            finish_reason, failed, len(content_parts))
                if failed:
                    return None
                return "".join(content_parts).strip() or None
    except Exception as e:
        logger.error("hermes exception: %r", e)
        return None
