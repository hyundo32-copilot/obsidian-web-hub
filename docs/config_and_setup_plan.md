# 📋 설정 통합화 및 자동화 스크립트 구축 계획서

본 계획서는 설정을 하나의 설정 파일(`config/settings.json`)로 통합 관리하고, 프로그램 실행 전 환경 세팅을 단 한 줄로 완료할 수 있는 자동화 스크립트(`setup.sh`)를 구현하는 방안을 설명합니다.

---

## 1. ⚙️ 공통 설정 파일 설계 (`config/settings.json`)

기존에 `.env` 및 코드 내에 흩어져 있던 주요 환경 변수와 UI 설정값들을 프로젝트 루트의 `config` 디렉토리 하위에 하나의 파일로 관리합니다.

* **경로**: `config/settings.json`
* **JSON 구조 예시**:
  ```json
  {
    "vault_path": "/Users/agent/obsidian/hyundo32",
    "site_title": "옵시디언 볼트 웹 허브",
    "allowed_origins": "http://localhost:3000",
    "basic_auth_user": "admin",
    "basic_auth_pass": "changeme",
    "hermes_api_url": "http://localhost:8642",
    "hermes_api_key": ""
  }
  ```

---

## 2. 💻 프로그램 수정 계획

### A. 백엔드 (FastAPI) 설정 수정
* **대상 파일**: [backend/app/config.py](file:///Users/agent/project/shared/obsidian-web-hub/backend/app/config.py)
* **변경 내용**: 
  * 기본 Pydantic `Settings` 로직을 유지하면서, 백엔드 시작 시 `../../config/settings.json` 파일이 존재할 경우 JSON 파일을 로드하여 `Settings` 객체의 값을 동적으로 덮어쓰도록(override) 수정합니다.

### B. 프론트엔드 (Next.js) 설정 수정
* **대상 파일**: 
  1. [frontend/src/app/layout.tsx](file:///Users/agent/project/shared/obsidian-web-hub/frontend/src/app/layout.tsx) (서버 컴포넌트)
  2. [frontend/src/app/page.tsx](file:///Users/agent/project/shared/obsidian-web-hub/frontend/src/app/page.tsx) (클라이언트 컴포넌트)
  3. **신규 생성**: `frontend/src/app/api/config/route.ts` (Next.js API 엔드포인트)
* **변경 내용**:
  * **API 엔드포인트 생성**: 프론트엔드 클라이언트가 접근할 수 있도록 `config/settings.json`에서 `site_title` 값을 읽어 반환하는 API(`/api/config`)를 생성합니다.
  * **`layout.tsx` (브라우저 탭 제목)**: Next.js 서버 사이드 렌더링(SSR) 시점에 직접 `config/settings.json`을 읽어 HTML metadata의 `title` 값을 설정합니다.
  * **`page.tsx` (웹 화면 내 로고/헤더 타이틀)**: 클라이언트 컴포넌트가 마운트될 때 새로 추가된 `/api/config` API를 비동기 호출하여 제목 상태(`siteTitle`)를 갱신하고 화면에 표시합니다.

---

## 3. 🛠️ 자동 설정 스크립트 설계 (`setup.sh`)

다른 사용자나 AI 에이전트가 단 한 줄의 명령어로 모든 의존성 설치 및 환경 파일 준비를 끝마칠 수 있게 프로젝트 루트 디렉토리에 셸 스크립트를 제공합니다.

* **경로**: `setup.sh` (실행 권한 부여: `chmod +x setup.sh`)
* **스크립트 주요 프로세스**:
  1. **시스템 환경 확인**: 필수 유틸리티인 `ripgrep` (`rg`) 명령어 설치 여부를 확인하고 없으면 설치 방법 안내.
  2. **통합 설정 파일 생성**: `config/settings.json` 파일이 존재하는지 검사하고, 없을 경우 디폴트 템플릿 복사 생성.
  3. **백엔드 설정 자동화**:
     * `backend/.venv` 가상환경 생성 및 활성화
     * `pip install -r backend/requirements.txt` 실행
     * 백엔드 구동용 `.env` 생성
  4. **프론트엔드 설정 자동화**:
     * `frontend/node_modules` 존재하지 않을 시 `npm install` 실행
     * 프론트엔드 구동용 `.env.local` 생성
  5. **완료 및 가이드 출력**: 성공 메시지와 함께 서비스 구동 명령어 안내.

---

## 📅 피드백 요청

설계안을 확인해 보시고 **Proceed** 버튼을 눌러 승인해 주시면, 제안한 순서대로 파일 작성 및 코드 수정을 차례대로 진행하겠습니다. 수정하고 싶으신 부분이 있다면 편하게 말씀해 주세요.
