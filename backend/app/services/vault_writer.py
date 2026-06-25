import os
import tempfile
import unicodedata
from datetime import date
from typing import List, Optional

import frontmatter
import yaml


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


class VaultWriter:
    def __init__(self, vault_path: str):
        self.vault_path = nfc(vault_path)

    def _validate_path(self, rel_path: str) -> str:
        rel_path = nfc(rel_path)
        parts = rel_path.replace("\\", "/").split("/")
        if ".." in parts:
            raise ValueError("경로 탈출 문자 '../' 사용 불가")
        if not rel_path.endswith(".md"):
            rel_path = rel_path + ".md"
        return rel_path

    def _abs_path(self, rel_path: str) -> str:
        abs_path = os.path.normpath(os.path.join(self.vault_path, rel_path))
        if not abs_path.startswith(self.vault_path):
            raise ValueError("vault 범위를 벗어난 경로")
        return abs_path

    def _build_frontmatter(
        self,
        title: str,
        tags: List[str],
        source_query_id: Optional[str],
    ) -> str:
        fm: dict = {
            "title": title,
            "created": str(date.today()),
            "tags": tags or [],
        }
        if source_query_id:
            fm["source_query_id"] = source_query_id
        return "---\n" + yaml.dump(fm, allow_unicode=True, default_flow_style=False) + "---\n\n"

    async def ingest(
        self,
        target_path: str,
        content: str,
        tags: Optional[List[str]] = None,
        source_query_id: Optional[str] = None,
    ) -> str:
        rel_path = self._validate_path(target_path)
        abs_path = self._abs_path(rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        title = nfc(os.path.splitext(os.path.basename(rel_path))[0])

        if os.path.isfile(abs_path):
            # append 모드
            with open(abs_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n---\n\n{content}")
            return "appended"

        # 신규 생성 — frontmatter 자동 삽입
        fm_block = self._build_frontmatter(title, tags or [], source_query_id)
        full_content = fm_block + content

        # atomic write: temp → rename
        dir_name = os.path.dirname(abs_path)
        fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(full_content)
            os.rename(tmp_path, abs_path)
        except Exception:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise

        return "created"
