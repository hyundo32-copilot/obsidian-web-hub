# 옵시디언 볼트 웹 허브 (Obsidian Vault Web Hub)

맥미니에서 운영하는 옵시디언 볼트(Obsidian Vault) 기반 개인 지식 웹 허브입니다.  
웹을 통해 질문을 던지고, Vault에서 ripgrep 기반으로 노트를 검색·조회하며, 요약된 내용을 SNS에 공유하거나 새로운 노트로 Vault에 직접 Ingest(저장)할 수 있는 기능을 제공합니다.

---

## 🛠️ 기술 스택

### 백엔드 (Backend)
- **FastAPI** (Python 3.9+)
- ripgrep (`rg`) 기반 전문 검색 (NFC 정규화 적용)
- HTTP Basic Auth 보안 인증

### 프론트엔드 (Frontend)
- **Next.js 14** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- Responsive Layout & Dark Mode 지원

### 배포 및 운영 (Deployment)
- **Docker Compose** (Nginx + FastAPI + Next.js)
- Tailscale / Cloudflare Tunnel 연동 권장

---

## 📁 프로젝트 구조

```text
obsidian-web-hub/
├── backend/            # FastAPI 백엔드
│   ├── app/            # API 라우터, 서비스, 모델 정의
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/           # Next.js 프론트엔드
│   ├── src/            # 컴포넌트 및 페이지 뷰
│   └── package.json
├── docs/               # 설계 문서 및 리소스
├── docker-compose.yml  # 운영용 도커 컴포즈 설정
└── README.md           # 프로젝트 안내 문서
```

---

## 🚀 시작하기

### 1. 사전 요구사항
- Python 3.9+ 및 pip
- Node.js 18+ 및 npm
- **ripgrep** (`rg`) 설치 필수
  - macOS: `brew install ripgrep`
  - Ubuntu/Debian: `sudo apt install ripgrep`

---

### 2. 로컬 개발 환경 실행

#### 2.1 백엔드 실행
1. `backend` 폴더로 이동하여 가상환경을 생성하고 의존성을 설치합니다.
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. 환경 변수 파일 `.env`를 설정합니다. (`.env.example` 복사 후 편집)
   ```bash
   cp .env.example .env
   ```
   - `OBSIDIAN_VAULT_PATH`: 옵시디언 볼트 로컬 절대 경로를 입력합니다.
   - `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`: API 접근 인증을 위한 ID/PW를 변경합니다.
3. 백엔드 서버를 구동합니다. (기본 포트: 8000)
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2.2 프론트엔드 실행
1. `frontend` 폴더로 이동하여 의존성 패키지를 설치합니다.
   ```bash
   cd frontend
   npm install
   ```
2. 환경 변수 파일 `.env.local`을 설정합니다. (`.env.example` 복사 후 편집)
   ```bash
   cp .env.example .env.local
   ```
   - 백엔드 주소 및 인증 정보를 설정합니다.
3. 개발용 프론트엔드 서버를 구동합니다. (기본 포트: 3000)
   ```bash
   npm run dev
   ```

---

## 🐳 Docker를 통한 배포 (운영)

프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 컨테이너 환경으로 빌드 및 구동합니다.
```bash
docker-compose up -d --build
```
> **보안 권장**: 운영 서버 배포 시, 외부 노출 위험을 방지하기 위해 **Tailscale** 혹은 **Cloudflare Tunnel**을 통한 HTTPS 구동 및 Basic Auth 비밀번호 변경을 반드시 진행하시기 바랍니다.
