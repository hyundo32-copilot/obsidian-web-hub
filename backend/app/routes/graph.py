import os
import re
import time
import unicodedata
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_auth
from app.config import settings

router = APIRouter()

# [[target]] 또는 [[target|alias]], 임베드 ![[target]] 포함. target에는 #heading, ^block 가능.
WIKILINK_RE = re.compile(r"\[\[([^\|\]]+?)(?:\|[^\]]+?)?\]\]")
# 표준 마크다운 링크 [text](path.md) — http(s) 외부 링크 제외
MDLINK_RE = re.compile(r"\[[^\]]*\]\(\s*(?!https?:)([^)\s#]+\.md)(?:#[^)]*)?\)")
_cache: Dict = {"data": None, "at": 0.0}
CACHE_TTL = 60.0


def _nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def _build_graph() -> dict:
    vault = settings.vault_path
    file_list: List[Tuple[str, str]] = []
    # Obsidian 링크 해석을 위한 인덱스 3종
    by_relpath: Dict[str, str] = {}          # 확장자 뺀 전체 경로 → rel_path (정확 매칭)
    by_relpath_ci: Dict[str, str] = {}       # 위의 소문자판 (대소문자 무시 폴백)
    by_basename: Dict[str, List[str]] = {}   # 파일명(확장자 X) → [rel_path...] (중복 가능)

    for root, dirs, files in os.walk(vault):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in files:
            if not f.endswith(".md"):
                continue
            abs_path = os.path.join(root, f)
            rel_path = _nfc(os.path.relpath(abs_path, vault).replace("\\", "/"))
            file_list.append((rel_path, abs_path))
            noext = rel_path[:-3]  # ".md" 제거
            base = _nfc(os.path.splitext(f)[0])
            by_relpath[noext] = rel_path
            by_relpath_ci[noext.lower()] = rel_path
            by_basename.setdefault(base, []).append(rel_path)

    def _shortest(paths: List[str]) -> str:
        # Obsidian "shortest path when possible": 폴더 깊이가 가장 얕은 후보 선택
        return min(paths, key=lambda p: (p.count("/"), len(p)))

    def _resolve_wikilink(target: str, src_path: str) -> Optional[str]:
        # #heading, ^block, 별칭 제거 + 정규화
        target = _nfc(target.strip())
        target = target.split("#", 1)[0].split("^", 1)[0].strip()
        if not target:
            return None
        if target.lower().endswith(".md"):
            target = target[:-3]
        target = target.lstrip("/")
        if target.startswith("./"):
            target = target[2:]
        # 1) 경로 정확 매칭 ([[folder/note]])
        if target in by_relpath:
            return by_relpath[target]
        # 2) 대소문자 무시 경로 매칭
        if target.lower() in by_relpath_ci:
            return by_relpath_ci[target.lower()]
        # 3) basename 매칭 ([[note]] 또는 경로 끝 segment)
        base = target.rsplit("/", 1)[-1]
        cands = by_basename.get(base)
        if cands:
            return _shortest(cands)
        # 4) basename 대소문자 무시
        lb = base.lower()
        for b, paths in by_basename.items():
            if b.lower() == lb:
                return _shortest(paths)
        return None

    def _resolve_mdlink(target: str, src_path: str) -> Optional[str]:
        # 마크다운 링크는 소스 파일 위치 기준 상대 경로
        from urllib.parse import unquote

        target = _nfc(unquote(target.strip()))
        src_dir = os.path.dirname(src_path)
        joined = os.path.normpath(os.path.join(src_dir, target)).replace("\\", "/")
        joined = joined.lstrip("/")
        if joined.lower().endswith(".md"):
            joined = joined[:-3]
        if joined in by_relpath:
            return by_relpath[joined]
        return _resolve_wikilink(target, src_path)

    nodes = []
    edges = []
    seen_edges = set()

    for rel_path, abs_path in file_list:
        title = _nfc(os.path.splitext(os.path.basename(rel_path))[0])
        folder = rel_path.split("/")[0] if "/" in rel_path else ""
        nodes.append({"id": rel_path, "title": title, "folder": folder})

        try:
            with open(abs_path, encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            continue

        def _add_edge(target_path: Optional[str]) -> None:
            if not target_path or target_path == rel_path:
                return
            key = (rel_path, target_path)
            if key not in seen_edges:
                seen_edges.add(key)
                edges.append({"source": rel_path, "target": target_path})

        for m in WIKILINK_RE.finditer(content):
            _add_edge(_resolve_wikilink(m.group(1), rel_path))
        for m in MDLINK_RE.finditer(content):
            _add_edge(_resolve_mdlink(m.group(1), rel_path))

    return {"nodes": nodes, "edges": edges}


class GraphResponse(BaseModel):
    nodes: list
    edges: list


@router.get("/graph", response_model=GraphResponse)
async def get_graph(_: str = Depends(require_auth)):
    now = time.monotonic()
    if _cache["data"] is None or now - _cache["at"] > CACHE_TTL:
        _cache["data"] = _build_graph()
        _cache["at"] = now
    return _cache["data"]
