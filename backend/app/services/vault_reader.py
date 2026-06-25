import asyncio
import json
import os
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

import frontmatter

from app.models.query import NoteResult
from app.services.cache import query_cache


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


class VaultReader:
    def __init__(self, vault_path: str):
        self.vault_path = nfc(vault_path)

    def _rel_path(self, abs_path: str) -> str:
        rel = os.path.relpath(nfc(abs_path), self.vault_path)
        # strip .md extension
        if rel.endswith(".md"):
            rel = rel[:-3]
        return rel

    def _make_snippet(self, lines: List[str], query: str, max_chars: int = 200) -> str:
        query_lower = query.lower()
        for line in lines:
            if query_lower in line.lower():
                stripped = line.strip()
                return stripped[:max_chars] + ("…" if len(stripped) > max_chars else "")
        joined = " ".join(l.strip() for l in lines if l.strip())
        return joined[:max_chars] + ("…" if len(joined) > max_chars else "")

    def _parse_frontmatter(self, file_path: str) -> Tuple[str, List[str], Dict[str, Any]]:
        try:
            post = frontmatter.load(nfc(file_path))
            title = str(post.get("title", "")) or os.path.splitext(os.path.basename(file_path))[0]
            tags = post.get("tags", []) or []
            if isinstance(tags, str):
                tags = [tags]
            return nfc(title), [nfc(t) for t in tags], dict(post.metadata)
        except Exception:
            basename = os.path.splitext(os.path.basename(file_path))[0]
            return nfc(basename), [], {}

    async def search(self, query: str, limit: int = 10) -> List[NoteResult]:
        cache_key = f"{query}:{limit}"
        cached = query_cache.get(cache_key)
        if cached is not None:
            return cached

        results = await self._ripgrep_search(query, limit)
        query_cache.set(cache_key, results)
        return results

    async def _ripgrep_search(self, query: str, limit: int) -> List[NoteResult]:
        cmd = [
            "/opt/homebrew/bin/rg",
            "--json",
            "--ignore-case",
            "--type", "md",
            "--max-count", "3",
            query,
            self.vault_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()

        # ripgrep --json emits one JSON object per line
        file_matches: Dict[str, List[str]] = {}
        for line in stdout.decode("utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("type") != "match":
                continue
            data = obj.get("data", {})
            file_path = nfc(data.get("path", {}).get("text", ""))
            text = data.get("lines", {}).get("text", "").rstrip("\n")
            if file_path:
                file_matches.setdefault(file_path, []).append(text)

        results: List[NoteResult] = []
        for file_path, match_lines in list(file_matches.items())[:limit]:
            rel = self._rel_path(file_path)
            title, tags, _ = self._parse_frontmatter(file_path)
            snippet = self._make_snippet(match_lines, query)
            score = round(min(1.0, len(match_lines) / 3.0), 2)
            results.append(NoteResult(
                path=rel,
                title=title,
                snippet=snippet,
                score=score,
                tags=tags,
            ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results

    async def read_note(self, rel_path: str) -> Optional[Dict[str, Any]]:
        rel_path = nfc(rel_path)
        # accept with or without .md
        if not rel_path.endswith(".md"):
            rel_path = rel_path + ".md"
        abs_path = os.path.join(self.vault_path, rel_path)
        abs_path = nfc(abs_path)

        if not os.path.isfile(abs_path):
            return None

        try:
            post = frontmatter.load(abs_path)
        except Exception:
            return None

        content = post.content
        fm = dict(post.metadata)
        backlinks = await self._find_backlinks(rel_path)

        return {
            "path": rel_path[:-3] if rel_path.endswith(".md") else rel_path,
            "content": content,
            "frontmatter": fm,
            "backlinks": backlinks,
        }

    async def _find_backlinks(self, rel_path: str) -> List[str]:
        # Search for [[note-name]] links pointing to this file
        note_name = nfc(os.path.splitext(os.path.basename(rel_path))[0])
        pattern = f"[[{note_name}]]"
        cmd = [
            "/opt/homebrew/bin/rg",
            "--json",
            "--ignore-case",
            "--type", "md",
            "--fixed-strings",
            pattern,
            self.vault_path,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()

        backlinks = []
        for line in stdout.decode("utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("type") != "match":
                continue
            file_path = nfc(obj.get("data", {}).get("path", {}).get("text", ""))
            if file_path:
                backlinks.append(self._rel_path(file_path))

        return list(dict.fromkeys(backlinks))
