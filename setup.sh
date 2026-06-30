#!/bin/bash
set -e

echo "============================================="
echo " 옵시디언 볼트 웹 허브 자동 설정 스크립트"
echo "============================================="

# 1. config/settings.json 확인 및 생성
if [ ! -f "config/settings.json" ]; then
    echo "⚠️  config/settings.json 파일이 존재하지 않습니다."
    echo "👉 settings.example.json을 복사하여 생성합니다..."
    cp config/settings.example.json config/settings.json
    echo "✅ config/settings.json 생성 완료. 이 파일의 설정을 나중에 알맞게 수정하세요."
fi

# 2. Python 환경 체크
if ! command -v python3 &> /dev/null; then
    echo "❌ 에러: python3가 설치되어 있지 않습니다."
    exit 1
fi

# 3. ripgrep 설치 여부 체크
if ! command -v rg &> /dev/null; then
    echo "⚠️  경고: ripgrep(rg) 명령어를 실행할 수 없습니다."
    echo "   이 앱은 옵시디언 볼트 검색을 위해 ripgrep을 사용합니다."
    echo "   macOS의 경우: brew install ripgrep"
    echo "   Ubuntu의 경우: sudo apt install ripgrep"
    echo ""
fi

# 4. config/settings.json 값 파싱 및 .env 동기화
echo "⚙️  설정 파일(config/settings.json)로부터 환경 변수를 파싱하고 있습니다..."

PARSE_VAL() {
    python3 -c "import json, sys; print(json.load(open('config/settings.json')).get('$1', '$2'))"
}

VAULT_PATH=$(PARSE_VAL "vault_path" "/Users/agent/obsidian/hyundo32")
SITE_TITLE=$(PARSE_VAL "site_title" "옵시디언 볼트 웹 허브")
ALLOWED_ORIGINS=$(PARSE_VAL "allowed_origins" "http://localhost:3000")
BASIC_AUTH_USER=$(PARSE_VAL "basic_auth_user" "admin")
BASIC_AUTH_PASS=$(PARSE_VAL "basic_auth_pass" "changeme")
HERMES_API_URL=$(PARSE_VAL "hermes_api_url" "http://localhost:8642")
HERMES_API_KEY=$(PARSE_VAL "hermes_api_key" "")

# 5. 백엔드 .env 생성 및 설정 동기화
echo "👉 backend/.env 생성 및 업데이트 중..."
cat << EOF > backend/.env
VAULT_PATH=${VAULT_PATH}
BASIC_AUTH_USER=${BASIC_AUTH_USER}
BASIC_AUTH_PASS=${BASIC_AUTH_PASS}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
HERMES_API_URL=${HERMES_API_URL}
HERMES_API_KEY=${HERMES_API_KEY}
EOF

# 6. 프론트엔드 .env.local 생성 및 설정 동기화
echo "👉 frontend/.env.local 생성 및 업데이트 중..."
cat << EOF > frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_USER=${BASIC_AUTH_USER}
NEXT_PUBLIC_API_PASS=${BASIC_AUTH_PASS}
EOF

# 7. 백엔드 가상환경 설정 및 패키지 설치
echo "👉 백엔드 가상환경(.venv) 설정 및 의존성 설치 중..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# 8. 프론트엔드 패키지 설치
echo "👉 프론트엔드 npm 패키지 설치 중..."
cd frontend
if ! command -v npm &> /dev/null; then
    echo "❌ 에러: npm(Node.js)이 설치되어 있지 않습니다."
    exit 1
fi
npm install
cd ..

echo "============================================="
echo "🎉 모든 설정이 성공적으로 완료되었습니다!"
echo "============================================="
echo "실행 방법:"
echo "1. 백엔드 기동 (Port: 8000)"
echo "   cd backend && source .venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "2. 프론트엔드 기동 (Port: 3000)"
echo "   cd frontend && npm run dev"
echo "============================================="
