import unicodedata

import pytest

from app.services.vault_reader import VaultReader, nfc


def test_nfc_normalizes_nfd():
    nfd_str = unicodedata.normalize("NFD", "한글파일명")
    result = nfc(nfd_str)
    assert unicodedata.is_normalized("NFC", result)


def test_rel_path_strips_md(tmp_path):
    reader = VaultReader(str(tmp_path))
    abs_path = str(tmp_path / "wiki" / "test.md")
    rel = reader._rel_path(abs_path)
    assert rel == "wiki/test"
    assert not rel.endswith(".md")


def test_make_snippet_finds_matching_line():
    reader = VaultReader("/tmp")
    lines = ["첫 번째 줄", "삼성전자 주가 분석", "마지막 줄"]
    snippet = reader._make_snippet(lines, "삼성전자")
    assert "삼성전자" in snippet


def test_make_snippet_fallback_first_line():
    reader = VaultReader("/tmp")
    lines = ["첫 번째 줄", "두 번째 줄"]
    snippet = reader._make_snippet(lines, "없는키워드")
    assert len(snippet) > 0


def test_make_snippet_truncates_long_line():
    reader = VaultReader("/tmp")
    long_line = "a" * 300
    snippet = reader._make_snippet([long_line], "a")
    assert len(snippet) <= 203  # 200 + "…"
