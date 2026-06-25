---
title: 옵시디언 볼트 웹 허브 — 풀 MVP 상세 설계
type: synthesis
tags:
  - obsidian
  - web
  - fastapi
  - llm-wiki
  - macmini
status: review
created: 2026-06-24
updated: 2026-06-25
related:
  - projects/옵시디언-웹-허브-개발-검토
  - concepts/LLM-Wiki
  - concepts/Hermes
  - topics/세컨드-브레인
confidence: high
---

# 옵시디언 볼트 웹 허브 — 풀 MVP 상세 설계

> 맥미니에서 운영하는 옵시디언 볼트 기반 개인 지식 웹 허브.  
> 핵심 흐름: 웹 질문 → vault query → 결과 확인 → SNS 공유 / vault ingest

---

## 1. 기술 스택 (확정)

### 백엔드
- **FastAPI** (Python 3.9.6 ← 실제 설치 버전)
  - ⚠️ 설계 원안은 3.11+ 요구 — 3.9 호환 문법으로 작성하거나 `pyenv`로 3.11 설치 후 진행
  - 비동기 처리로 vault 검색 병렬화 가능
  - OpenAPI 자동 문서화

### 프론트엔드
- **Next.js 14** (App Router) + **shadcn/ui**
  - Node.js 26.3.0 설치됨 (18+ 요건 충족)
  - Tailwind CSS로 빠른 스타일링

### 데이터/검색
- **직접 vault 접근**: ripgrep(`rg`) 기반 전문 검색 (직접 구현)
  - ⚠️ `obsidian-wiki-query` 스킬은 미정의 — FastAPI 서비스로 처음부터 직접 구현
  - `wiki/index.md` 파싱은 메타데이터 보완 용도로만 사용 (검색 주체는 ripgrep)
- **캐시**: 메모리 LRU (MVP 단계, Redis는 Phase 4)
- **인증**: HTTP Basic Auth ← JWT는 사설망 운영 규모 대비 과잉, Basic Auth로 확정

### 배포
- **Docker Compose** (Nginx + FastAPI + Next.js)
- **macOS launchd** 또는 `brew services`로 백그라운드 실행
- **Tailscale** 또는 **Cloudflare Tunnel**로 외부 접속 (필요시)

---

## 2. 프로젝트 구조

```
obsidian-web-hub/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점 (CORS 설정 포함)
│   │   ├── routes/
│   │   │   ├── query.py         # /api/query — vault 검색
│   │   │   ├── notes.py         # /api/notes/{path} — 노트 조회/편집
│   │   │   ├── share.py         # /api/share — 공유 (MVP: clipboard만)
│   │   │   └── ingest.py        # /api/ingest — vault 저장
│   │   ├── services/
│   │   │   ├── vault_reader.py  # ripgrep 기반 검색
│   │   │   ├── vault_writer.py  # 노트 쓰기/ingest
│   │   │   └── cache.py         # 검색 결과 LRU 캐시
│   │   └── models/
│   │       ├── query.py         # QueryRequest/Response
│   │       └── note.py          # NoteCreate/Update
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # 홈 (프롬프트 입력)
│   │   ├── results/
│   │   │   └── [queryId]/page.tsx # 결과 뷰
│   │   └── layout.tsx
│   ├── components/
│   │   ├── PromptInput.tsx
│   │   ├── NoteCard.tsx
│   │   ├── ShareButtons.tsx     # MVP: clipboard 버튼만
│   │   └── IngestButton.tsx
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 3. API 명세

### 3.1 Query (검색)
```
POST /api/query
Request:
{
  "query": "최근 6개월 삼성전자 분석",
  "mode": "wikisearch",   // MVP에서 "llm-summary"는 수신하되 비활성화 (Phase 4)
  "limit": 10
}

Response:
{
  "query_id": "uuid",
  "results": [
    {
      "path": "wiki/investing/holdings/stocks/005930-삼성전자",
      "title": "005930-삼성전자",
      "snippet": "삼성전자 최근 6개월 일별 종가...",
      "score": 0.95,
      "tags": ["investing", "stocks"]
    }
  ],
  "synthesis": null   // Phase 4 전까지 항상 null
}
```

### 3.2 Note 상세 조회
```
GET /api/notes/{path:path}
Response: { "content": "...", "frontmatter": {...}, "backlinks": [...] }
```

### 3.3 Ingest (저장)
```
POST /api/ingest
Request:
{
  "target_path": "wiki/inbox/2026-06-24_질문-응답",
  "content": "# 질문 응답\n\n## 질문\n...\n\n## 답변\n...",
  "source_query_id": "uuid",
  "tags": ["inbox", "from-web"]
}

Response: { "status": "created", "path": "..." }
```

### 3.4 Share (공유)
```
POST /api/share
Request:
{
  "platform": "clipboard",   // MVP: clipboard만 지원. telegram/discord는 Phase 4
  "content": "옵시디언 노트 요약",
  "note_path": "wiki/..."
}

Response: { "status": "copied", "url": null }
```
> Telegram 봇 토큰, Discord webhook URL 미확보 — MVP에서 제외, Phase 4로 이동

---

## 4. 핵심 구현 포인트

### 4.1 Vault Reader (ripgrep 기반)
```python
# backend/app/services/vault_reader.py
import unicodedata, subprocess, json

class VaultReader:
    def __init__(self, vault_path: str):
        self.vault_path = vault_path

    def _normalize(self, path: str) -> str:
        # macOS NFD ↔ Python NFC 혼용 방지 — 읽기/쓰기 모두 NFC로 통일
        return unicodedata.normalize("NFC", path)

    async def search(self, query: str, limit: int) -> list:
        # 1. ripgrep으로 vault 전체 전문 검색 (index.md 파싱 없이 바로)
        # 2. 매칭 파일에서 frontmatter(tags, title) 추출
        # 3. score는 매칭 행 수 기반 단순 정렬
        # 4. index.md는 title 보완용으로만 참조 (검색 주체 아님)
        pass
```
> ⚠️ 검색 전략 변경: 원안의 "index.md 파싱 → ripgrep" 순서를 뒤집음.  
> ripgrep 직접 검색이 더 빠르고 단순 — index.md 파싱은 마지막에 보완.

### 4.2 Vault Writer (안전한 쓰기)
```python
# backend/app/services/vault_writer.py
import unicodedata

class VaultWriter:
    def __init__(self, vault_path: str):
        self.vault_path = vault_path

    def _normalize(self, path: str) -> str:
        return unicodedata.normalize("NFC", path)

    async def ingest(self, target_path: str, content: str) -> str:
        # 1. 경로 정규화 (NFC) — Reader와 동일 처리
        # 2. frontmatter 자동 삽입
        # 3. 파일 존재 여부 확인 → append or create
        # 4. atomic write (temp 파일 → rename)
        # 5. wiki/index.md 업데이트 (필요시)
        pass
```

### 4.3 CORS 설정 (누락 보완)
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 운영 시 실제 도메인으로 교체
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.4 Share Service (MVP 범위)
- **Clipboard**: 프론트에서 `navigator.clipboard.writeText()` — 백엔드 불필요
- **Telegram/Discord**: Phase 4로 이동 (봇 토큰/webhook URL 미확보)

---

## 5. 보안/운영 고려

### 필수
- [x] HTTP Basic Auth (확정 — JWT 불채택)
- [ ] HTTPS (Tailscale/Cloudflare Tunnel or Let's Encrypt)
- [x] CORS: `localhost:3000` → 운영 도메인으로 제한
- [x] vault 경로 외부 노출 금지 (절대 `/Users/agent/obsidian` 반환하지 않음)
- [x] 입력 검증 (`target_path`에 `../` 경로 탈출 방지 → HTTP 422)
- [ ] Rate limiting (질의 폭주 방지)

### 권장
- [ ] Audit log: `wiki/log.md`에 웹 허브 액션 기록
- [ ] Backup: ingest 전 자동 backup (git commit or .bak)

---

## 6. 개발 로드맵

### Phase 1: 백엔드 API ✅ 완료 (2026-06-25)
- [x] Python 3.9.6 환경 세팅 (업그레이드 없이 그대로 사용)
- [x] FastAPI 프로젝트 초기화 + CORS 미들웨어 + Basic Auth
- [x] VaultReader — ripgrep 전문 검색 구현 + NFC 정규화
- [x] `/api/query` 엔드포인트 동작 확인 (Hello World 검증 #1)
- [x] VaultWriter — atomic write + NFC 정규화
- [x] `/api/ingest` 엔드포인트 동작 확인 (Hello World 검증 #2)
- [x] `/api/notes/{path}` 노트 상세 조회
- [x] 단위 테스트 13/13 통과 (pytest)
- [x] 통합·보안·성능 검증 통과 (curl)

### Phase 2: 프론트엔드 ✅ 완료 (2026-06-25)
- [x] Next.js 14 프로젝트 초기화 + shadcn/ui + Tailwind
- [x] PromptInput 컴포넌트
- [x] 결과 뷰 (카드 리스트, 점수/태그 표시)
- [x] 노트 상세 보기 슬라이드 패널 (마크다운 렌더링)
- [x] Ingest 버튼 (저장 완료 피드백 포함)
- [x] Clipboard 공유 버튼 (Hello World 검증 #3)
- [x] E2E Playwright 검증 전 항목 통과

### Phase 3: 통합/배포 (3일)
- [ ] Docker Compose 구성
- [ ] launchd 또는 brew services 등록
- [ ] Tailscale/Cloudflare Tunnel 설정
- [ ] 데이터 흐름 end-to-end 테스트

### Phase 4: 고도화 (선택)
- [ ] LLM 요약 모드 (`mode: "llm-summary"` — OpenAI/Anthropic API 연동)
- [ ] Telegram/Discord 공유 (봇 토큰/webhook URL 확보 후)
- [ ] 검색 히스토리/북마크
- [ ] Redis 캐시 전환
- [ ] 다크모드, 반응형 개선
- [ ] 모바일 앱 (Capacitor or PWA)

---

## 7. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Python 3.9 vs 3.11 호환 | pyenv로 3.11 설치 권장. 불가 시 3.9 호환 문법(type hint 등) 준수 |
| 옵시디언 동시 편집 충돌 | 단일 writer 모델 (웹 허브만 쓰기, 옵시디언 앱은 읽기 전용 권장) |
| 한글 파일명 NFC/NFD 불일치 | Reader/Writer 모두 `unicodedata.normalize("NFC", ...)` 일괄 적용 |
| vault 검색 느림 | ripgrep 캐시 + 결과 페이지네이션 |
| 보안 노출 | Tailscale + Basic Auth, vault 절대경로 응답 금지 |
| Mac mini 장애 | 외부 백업 (Synology) → 수동 복구 절차 문서화 |

---

## 8. MVP "Hello World" 증거

1. `curl -u admin:pass -X POST http://localhost:8000/api/query -H 'Content-Type: application/json' -d '{"query":"삼성전자","mode":"wikisearch","limit":5}'`  
   → vault 검색 결과 JSON 반환

2. `curl -u admin:pass -X POST http://localhost:8000/api/ingest -H 'Content-Type: application/json' -d '{"target_path":"wiki/inbox/test","content":"# 테스트","tags":["inbox"]}'`  
   → vault에 실제 파일 생성

3. 웹에서 `localhost:3000` 접속 → 프롬프트 입력 → 결과 표시 → Ingest 클릭 → 파일 생성 → Clipboard 복사

---

## 9. 검증 계획

### 9.1 단위 검증 (Unit)

각 서비스 클래스의 핵심 로직을 vault 없이 독립적으로 검증한다.

| 대상 | 검증 항목 | 기대 결과 |
|------|-----------|-----------|
| `VaultReader._normalize()` | NFD 문자열 입력 | NFC 출력 (macOS 파일명 일치) |
| `VaultReader.search()` | ripgrep 출력 파싱 | `NoteResult` 리스트 반환 |
| `VaultWriter._normalize()` | NFD 경로 입력 | NFC 경로 출력 |
| `VaultWriter.ingest()` | 정상 경로 + 내용 | 파일 생성, `status: created` |
| `VaultWriter.ingest()` | 동일 경로 재호출 | 기존 파일에 append |
| `VaultWriter.ingest()` | `target_path`에 `../` 포함 | `ValueError` → HTTP 422 (Pydantic 표준) |
| 입력 모델 | `mode: "llm-summary"` 수신 | 수신 허용, `synthesis: null` 반환 |

```bash
# 실행
cd backend && pytest tests/unit/ -v
```

### 9.2 통합 검증 (API — 실제 vault 연동)

서버를 기동한 상태에서 실제 vault 파일을 대상으로 검증한다.

```bash
BASE="http://localhost:8000"
AUTH="-u admin:pass"

# 검색 — 결과 있는 키워드
curl -s $AUTH -X POST $BASE/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"삼성전자","mode":"wikisearch","limit":5}' | jq '.results | length'
# 기대: 1 이상

# 검색 — 결과 없는 키워드
curl -s $AUTH -X POST $BASE/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"존재하지않는키워드xyz","mode":"wikisearch","limit":5}' | jq '.results'
# 기대: []

# ingest — 파일 생성
curl -s $AUTH -X POST $BASE/api/ingest \
  -H 'Content-Type: application/json' \
  -d '{"target_path":"wiki/inbox/검증-테스트","content":"# 검증\n테스트 노트","tags":["inbox","test"]}' | jq '.status'
# 기대: "created"
# 사후 확인: cat /Users/agent/obsidian/hyundo32/wiki/inbox/검증-테스트.md

# 노트 조회 — 존재하는 경로
curl -s $AUTH $BASE/api/notes/wiki/inbox/검증-테스트 | jq 'has("content")'
# 기대: true

# 노트 조회 — 없는 경로
curl -s $AUTH $BASE/api/notes/wiki/inbox/없는파일 -o /dev/null -w '%{http_code}'
# 기대: 404
```

### 9.3 보안 검증

```bash
# 인증 없는 요청 → 401
curl -s -o /dev/null -w '%{http_code}' \
  -X POST $BASE/api/query -H 'Content-Type: application/json' -d '{"query":"test"}'
# 기대: 401

# 경로 탈출 시도 → 422 (Pydantic 입력 검증 오류 — FastAPI 표준)
curl -s $AUTH -X POST $BASE/api/ingest \
  -H 'Content-Type: application/json' \
  -d '{"target_path":"../../etc/passwd","content":"hack"}' | jq '.detail'
# 기대: 422 (Unprocessable Entity)

# 응답에 절대경로 미포함 확인
curl -s $AUTH -X POST $BASE/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"삼성전자","mode":"wikisearch","limit":3}' | grep -c "/Users/agent"
# 기대: 0

# 미허용 origin CORS 차단
curl -s -I -H "Origin: http://evil.com" $BASE/api/query | grep -i "access-control"
# 기대: Access-Control-Allow-Origin 헤더 없음
```

### 9.4 성능 기준 (SLO)

vault 522개 노트 기준 목표값이며, 초과 시 ripgrep 옵션 튜닝 또는 캐시 도입 검토.

| 엔드포인트 | 목표 응답시간 | 측정 방법 |
|-----------|-------------|---------|
| `POST /api/query` (캐시 미적용) | **2초 이내** | `curl -w '%{time_total}'` |
| `POST /api/ingest` | **500ms 이내** | `curl -w '%{time_total}'` |
| `GET /api/notes/{path}` | **300ms 이내** | `curl -w '%{time_total}'` |

```bash
# 응답 시간 측정 예시
curl -s $AUTH -X POST $BASE/api/query \
  -H 'Content-Type: application/json' \
  -d '{"query":"삼성전자","mode":"wikisearch","limit":10}' \
  -o /dev/null -w 'time: %{time_total}s\n'
```

### 9.5 E2E 체크리스트 (브라우저)

Phase 2 프론트엔드 완성 후 `localhost:3000`에서 수동 검증.

- [ ] 프롬프트 입력 → 검색 결과 카드 렌더링
- [ ] 결과 카드 클릭 → 노트 상세 보기 (마크다운 정상 렌더링)
- [ ] 한글 제목 노트 상세 보기 (NFC/NFD 혼용 시 404 없어야 함)
- [ ] Ingest 버튼 클릭 → vault 파일 생성 확인 (Finder 또는 터미널)
- [ ] Clipboard 버튼 클릭 → 클립보드에 내용 복사 확인
- [ ] 인증 없는 접근 → 로그인 프롬프트 표시

---

## 10. 실행 방법 (개발 시작)

### 사전 조건
- Python 3.9.6 (실제 설치됨) — 3.11 권장 시 `pyenv install 3.11.9 && pyenv local 3.11.9`
- Node.js 26.3.0 (설치됨, 18+ 요건 충족)
- ripgrep 15.1.0 (설치됨 — `/opt/homebrew/bin/rg`)
- Vault 경로: `/Users/agent/obsidian/hyundo32`

### backend
```bash
cd obsidian-web-hub/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### frontend
```bash
cd obsidian-web-hub/frontend
npm install
npm run dev  # http://localhost:3000
```

### Docker (운영)
```bash
docker-compose up -d
```

---

## 11. 다음 액션

### Phase 1, 2 완료 — Phase 3 배포 시작
- [ ] Docker Compose 구성 (Nginx + FastAPI + Next.js)
- [ ] launchd 또는 brew services 등록
- [ ] Tailscale/Cloudflare Tunnel 설정 (HTTPS)
- [ ] 운영 환경 `.env` 비밀번호 변경 (`BASIC_AUTH_PASS`)
- [ ] 운영 `ALLOWED_ORIGINS` 실제 도메인으로 교체
- [ ] 데이터 흐름 end-to-end 재검증 (Docker 환경)

---

*이 설계는 추후 wiki/index.md, projects/ 옵시디언-웹-허브 서브트리에 통합 예정*  
*2026-06-25 구현 검토 반영: Python 버전, 인증 방식, VaultReader 전략, Share 범위, CORS 추가*
