# Git 히스토리에서 유출된 비밀 파일 경로 제거 (git filter-branch)
# 사용: repo 루트에서 powershell -ExecutionPolicy Bypass -File scripts/purge-git-history-secrets.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$paths = @(
    "Firebase 서비스 계정 키.txt",
    "수파베이스 암호.txt",
    "외부서비스연동API정보!!!!!!!!.txt",
    "커서 api키.txt",
    "재목없음.txt",
    "중소기업현황 계정.txt",
    "web/.env.local"
)

$rmCmd = ($paths | ForEach-Object { "git rm -rf --cached --ignore-unmatch `"$_`"" }) -join "; "

Write-Host "Purging paths from all commits..."
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"
git filter-branch --force --index-filter $rmCmd --prune-empty --tag-name-filter cat -- --all

Write-Host "Removing backup refs..."
git for-each-ref --format="delete %(refname)" refs/original/ | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "Done. Run: git push --force origin main"
