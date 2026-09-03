#Requires -Version 5.1
<#
.SYNOPSIS
  VLUE Android Play 제출용 릴리즈 keystore 생성 (로컬 USB만, Git 커밋 금지)
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File D:\dev\vlue_super\apps\android\create-release-keystore.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AndroidRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $AndroidRoot

$keystore = Join-Path $AndroidRoot "vlue-release.keystore"
$props = Join-Path $AndroidRoot "keystore.properties"
$secretNote = Join-Path (Split-Path $AndroidRoot -Parent | Split-Path -Parent) "vlue-release-keystore-SECRET.txt"
# Parent of apps = vlue_super; parent of that = D:\dev
$DevRoot = Split-Path (Split-Path $AndroidRoot -Parent) -Parent
$secretNote = Join-Path $DevRoot "vlue-release-keystore-SECRET.txt"

if (Test-Path $keystore) {
  Write-Host "Already exists: $keystore" -ForegroundColor Yellow
  Write-Host "Aborting — delete it first if you want to regenerate."
  exit 1
}

$kt = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $kt) {
  $jbr = @(
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Zulu\zulu-17\bin\keytool.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $jbr) { throw "keytool not found. Install JDK 17 or Android Studio." }
  $keytool = $jbr
} else {
  $keytool = $kt.Source
}

Write-Host "`nVLUE release keystore generator" -ForegroundColor Cyan
Write-Host "Output: $keystore"
Write-Host "Props:  $props"
Write-Host ""

$secure = Read-Host "Enter store/key password (min 6 chars)" -AsSecureString
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}
if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -lt 6) {
  throw "Password too short."
}

$cn = Read-Host "Your name / org (CN) [VCID KOREA]"
if (-not $cn) { $cn = "VCID KOREA" }

Write-Host "`nGenerating keystore..." -ForegroundColor Cyan
& $keytool -genkeypair -v `
  -keystore $keystore `
  -alias vlue `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass $plain `
  -keypass $plain `
  -dname "CN=$cn, OU=VLUE, O=VCID KOREA, L=Seoul, ST=Seoul, C=KR"

@"
# DO NOT COMMIT — local USB only
storeFile=vlue-release.keystore
storePassword=$plain
keyAlias=vlue
keyPassword=$plain
"@ | Set-Content -Path $props -Encoding UTF8

@"
VLUE Android release keystore — KEEP OFF GITHUB / CLOUD
Created: $(Get-Date -Format o)
File: $keystore
Alias: vlue
Password: $plain

Backup this file + vlue-release.keystore to a second USB / password manager.
Losing this key = cannot update the Play app with the same signing key.
"@ | Set-Content -Path $secretNote -Encoding UTF8

Write-Host "`nOK." -ForegroundColor Green
Write-Host "  keystore.properties written (gitignored)"
Write-Host "  Secret memo: $secretNote"
Write-Host "`nNext: cd D:\dev\vlue_super && npm run android:bundle:release"
