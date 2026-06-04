# VLUE 슈퍼앱 — GitHub 최초 연결 (PowerShell)
# 사용: .\scripts\github-connect.ps1 -RemoteUrl "https://github.com/ORG/REPO.git"

param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "git 이 PATH에 없습니다. Git for Windows 설치 후 다시 실행하세요."
}

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add -A
git status --short | Select-Object -First 30

$msg = "chore: VLUE superapp monorepo (web, apps, packages/shared, packages/db)"
git commit -m $msg 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "commit 스킵(변경 없음 또는 이미 커밋됨)"
}

$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $RemoteUrl
} else {
  git remote add origin $RemoteUrl
}

Write-Host ""
Write-Host "다음: git push -u origin main"
Write-Host "GitHub Actions: .github/workflows/ci.yml · deploy.yml"
