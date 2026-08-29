# VLUE — 로컬 Firebase 서비스 계정 → Railway @vlue/api FCM 변수 동기화
# 사용 (USB 루트):  cd D:\dev && npx @railway/cli login && .\sync-fcm-railway.ps1
# 또는 (모노레포):   npx @railway/cli login && powershell -File scripts/sync-fcm-railway.ps1
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$RepoRoot = if (Test-Path (Join-Path $ScriptDir "..\apps\api")) {
  (Resolve-Path (Join-Path $ScriptDir "..")).Path
} else {
  (Resolve-Path (Join-Path $ScriptDir "vlue_super")).Path
}
$EnvFile = Join-Path $RepoRoot "apps\api\.env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "apps/api/.env 없음: $EnvFile"
}

$credPath = $null
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
  $t = $line.Trim()
  if ($t -match '^GOOGLE_APPLICATION_CREDENTIALS=(.+)$') {
    $credPath = $Matches[1].Trim().Trim('"')
    break
  }
}

if (-not $credPath) {
  Write-Error "GOOGLE_APPLICATION_CREDENTIALS 가 apps/api/.env 에 없습니다."
}
if (-not (Test-Path $credPath)) {
  Write-Error "서비스 계정 파일 없음: $credPath"
}

$json = Get-Content $credPath -Raw -Encoding UTF8 | ConvertFrom-Json
$projectId = [string]$json.project_id
$clientEmail = [string]$json.client_email
$privateKey = [string]$json.private_key

if (-not $projectId -or -not $clientEmail -or -not $privateKey) {
  Write-Error "JSON에 project_id / client_email / private_key 가 필요합니다."
}

Write-Host "Railway @vlue/api FCM 변수 설정 (project: $projectId)" -ForegroundColor Cyan
Write-Host "서비스 링크: cd $RepoRoot; npx @railway/cli link" -ForegroundColor Yellow

Push-Location $RepoRoot
try {
  npx --yes @railway/cli variables set "FCM_PROJECT_ID=$projectId" --service "@vlue/api"
  npx --yes @railway/cli variables set "FCM_CLIENT_EMAIL=$clientEmail" --service "@vlue/api"
  $escapedKey = $privateKey -replace "`r?`n", '\n'
  npx --yes @railway/cli variables set "FCM_PRIVATE_KEY=$escapedKey" --service "@vlue/api"
  Write-Host "완료. @vlue/api 재배포 후 관리자 > 상태 점검 > 푸시(FCM) 정상 확인." -ForegroundColor Green
}
finally {
  Pop-Location
}
