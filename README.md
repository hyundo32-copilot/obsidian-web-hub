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
├── frontend/           # Next.js 프론트엔드
├── config/             # 통합 설정 파일 관리 폴더
│   ├── settings.json   # 활성 설정 (로컬 전용, git 무시)
│   └── settings.example.json # 설정 템플릿
├── docs/               # 설계 문서 및 리소스
├── setup.sh            # macOS / Linux 자동 설정 스크립트
├── setup.ps1           # Windows PowerShell 자동 설정 스크립트
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
  - Windows: `choco install ripgrep` 또는 `scoop install ripgrep`

---

### 2. 간편 실행 환경 구축 (자동 설정)

프로젝트 루트 디렉토리에서 OS에 맞는 자동 설정 스크립트를 실행하면 가상환경 생성, 환경 변수 자동 파싱 및 의존성 패키지 설치가 자동으로 완료됩니다.

#### 🍏 macOS / Linux
```bash
./setup.sh
```
> ** launchd 등록**: macOS의 경우 재부팅 시 자동 켜짐을 지원하기 위해 launchd 에이전트 등록(`--service` 옵션 지원) 여부를 물어봅니다.

#### 🪟 Windows (PowerShell)
파워쉘의 스크립트 실행 제한 정책을 임시로 우회한 뒤 실행해야 합니다.
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\setup.ps1
```

---

### 3. 세부 설정 편집 (`config/settings.json`)

생성된 `config/settings.json` 파일을 열어 본인 환경에 맞춰 설정값을 편집합니다. (이 파일은 `.gitignore`에 등록되어 있어 외부 저장소에 공유되지 않습니다.)

```json
{
  "vault_path": "/Users/사용자/옵시디언/볼트경로",
  "site_title": "나만의 LLM 지식 허브",
  "allowed_origins": "http://localhost:3000",
  "basic_auth_user": "admin",
  "basic_auth_pass": "비밀번호설정",
  "hermes_api_url": "http://localhost:8642",
  "hermes_api_key": ""
}
```
* **수정 후 동기화**: 설정을 변경한 뒤에는 자동 설정 스크립트(`./setup.sh` 또는 `.\setup.ps1`)를 다시 실행해 주시면 백엔드와 프론트엔드 환경 파일로 설정값이 즉시 동기화됩니다.

---

### 4. 서버 실행하기

자동 설정이 끝나면 터미널 2개를 열어 각각 백엔드와 프론트엔드 서버를 구동합니다.

#### 4.1 백엔드 실행
* **macOS / Linux**:
  ```bash
  cd backend
  source .venv/bin/activate
  uvicorn app.main:app --reload --port 8000
  ```
* **Windows (PowerShell)**:
  ```powershell
  cd backend
  .\.venv\Scripts\Activate.ps1
  uvicorn app.main:app --reload --port 8000
  ```

#### 4.2 프론트엔드 실행 (공통)
```bash
cd frontend
npm run dev
```
구동이 완료되면 브라우저에서 `http://localhost:3000`으로 접속해 사용할 수 있습니다.

---

## 🐳 Docker를 통한 배포 (운영)

프로젝트 루트 디렉토리에서 아래 명령어를 실행하여 컨테이너 환경으로 빌드 및 구동합니다.
```bash
docker-compose up -d --build
```
> **보안 권장**: 운영 서버 배포 시, 외부 노출 위험을 방지하기 위해 **Tailscale** 혹은 **Cloudflare Tunnel**을 통한 HTTPS 구동 및 Basic Auth 비밀번호 변경을 반드시 진행하시기 바랍니다.
