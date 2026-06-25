import os
import unicodedata

import pytest

from app.services.vault_writer import VaultWriter, nfc


@pytest.fixture
def writer(tmp_path):
    return VaultWriter(str(tmp_path))


def test_nfc_normalizes_nfd():
    nfd_str = unicodedata.normalize("NFD", "한글경로")
    assert unicodedata.is_normalized("NFC", nfc(nfd_str))


def test_validate_path_adds_md(writer):
    result = writer._validate_path("wiki/inbox/test")
    assert result.endswith(".md")


def test_validate_path_rejects_traversal(writer):
    with pytest.raises(ValueError, match="경로 탈출"):
        writer._validate_path("wiki/../etc/passwd")


def test_validate_path_rejects_traversal_in_segment(writer):
    with pytest.raises(ValueError, match="경로 탈출"):
        writer._validate_path("../secret")


def test_abs_path_stays_within_vault(writer, tmp_path):
    abs_path = writer._abs_path("wiki/test.md")
    assert abs_path.startswith(str(tmp_path))


@pytest.mark.asyncio
async def test_ingest_creates_file(writer, tmp_path):
    status = await writer.ingest(
        target_path="wiki/inbox/테스트노트",
        content="# 테스트\n내용입니다.",
        tags=["inbox", "test"],
    )
    assert status == "created"
    created = tmp_path / "wiki" / "inbox" / "테스트노트.md"
    assert created.exists()
    text = created.read_text(encoding="utf-8")
    assert "테스트" in text
    assert "inbox" in text


@pytest.mark.asyncio
async def test_ingest_appends_on_duplicate(writer, tmp_path):
    path = "wiki/inbox/중복노트"
    await writer.ingest(path, "첫 번째 내용")
    status = await writer.ingest(path, "두 번째 내용")
    assert status == "appended"
    file_path = tmp_path / "wiki" / "inbox" / "중복노트.md"
    text = file_path.read_text(encoding="utf-8")
    assert "첫 번째 내용" in text
    assert "두 번째 내용" in text


@pytest.mark.asyncio
async def test_ingest_frontmatter_has_tags(writer, tmp_path):
    await writer.ingest("wiki/inbox/태그테스트", "내용", tags=["tag1", "tag2"])
    file_path = tmp_path / "wiki" / "inbox" / "태그테스트.md"
    text = file_path.read_text(encoding="utf-8")
    assert "tag1" in text
    assert "tag2" in text
