Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " 옵시디언 볼트 웹 허브 자동 설정 스크립트 (Windows)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. config/settings.json 확인 및 생성
if (-not (Test-Path "config\settings.json")) {
    Write-Host "⚠️  config\settings.json 파일이 존재하지 않습니다." -ForegroundColor Yellow
    Write-Host "👉 settings.example.json을 복사하여 생성합니다..." -ForegroundColor Green
    Copy-Item "config\settings.example.json" "config\settings.json"
    Write-Host "✅ config\settings.json 생성 완료. 이 파일의 설정을 나중에 알맞게 수정하세요." -ForegroundColor Green
}

# 2. Python 환경 체크
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 에러: python이 설치되어 있지 않거나 환경변수 Path에 등록되어 있지 않습니다." -ForegroundColor Red
    exit 1
}

# 3. ripgrep 설치 여부 체크
if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  경고: ripgrep(rg.exe) 명령어를 실행할 수 없습니다." -ForegroundColor Yellow
    Write-Host "   이 앱은 옵시디언 볼트 검색을 위해 ripgrep을 사용합니다." -ForegroundColor Yellow
    Write-Host "   Windows의 경우: choco install ripgrep 또는 scoop install ripgrep" -ForegroundColor Yellow
    Write-Host "   혹은 GitHub에서 ripgrep을 다운로드 받아 Path에 추가해주세요." -ForegroundColor Yellow
    Write-Host ""
}

# 4. config/settings.json 값 파싱 및 .env 동기화
Write-Host "⚙️  설정 파일(config\settings.json)로부터 환경 변수를 파싱하고 있습니다..." -ForegroundColor Green

$config = Get-Content -Raw "config\settings.json" | ConvertFrom-Json
$vaultPath = $config.vault_path
$siteTitle = $config.site_title
$allowedOrigins = $config.allowed_origins
$basicAuthUser = $config.basic_auth_user
$basicAuthPass = $config.basic_auth_pass
$hermesApiUrl = $config.hermes_api_url
$hermesApiKey = $config.hermes_api_key

# 5. 백엔드 .env 생성 및 설정 동기화
Write-Host "👉 backend\.env 생성 및 업데이트 중..." -ForegroundColor Green
$backendEnvContent = @"
VAULT_PATH=$vaultPath
BASIC_AUTH_USER=$basicAuthUser
BASIC_AUTH_PASS=$basicAuthPass
ALLOWED_ORIGINS=$allowedOrigins
HERMES_API_URL=$hermesApiUrl
HERMES_API_KEY=$hermesApiKey
"@
Set-Content -Path "backend\.env" -Value $backendEnvContent -Encoding utf8

# 6. 프론트엔드 .env.local 생성 및 설정 동기화
Write-Host "👉 frontend\.env.local 생성 및 업데이트 중..." -ForegroundColor Green
$frontendEnvContent = @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_USER=$basicAuthUser
NEXT_PUBLIC_API_PASS=$basicAuthPass
"@
Set-Content -Path "frontend\.env.local" -Value $frontendEnvContent -Encoding utf8

# 7. 백엔드 가상환경 설정 및 패키지 설치
Write-Host "👉 백엔드 가상환경(.venv) 설정 및 의존성 설치 중..." -ForegroundColor Green
cd backend
python -m venv .venv
& ".\.venv\Scripts\pip.exe" install -r requirements.txt
cd ..

# 8. 프론트엔드 패키지 설치
Write-Host "👉 프론트엔드 npm 패키지 설치 중..." -ForegroundColor Green
cd frontend
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 에러: npm(Node.js)이 설치되어 있지 않습니다." -ForegroundColor Red
    exit 1
}
npm install
cd ..

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🎉 모든 설정이 성공적으로 완료되었습니다!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "실행 방법 (Windows PowerShell 기준):" -ForegroundColor White
Write-Host "1. 백엔드 기동 (Port: 8000)" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "2. 프론트엔드 기동 (Port: 3000)" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
