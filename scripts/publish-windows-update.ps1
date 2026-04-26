$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $projectRoot "dist-electron"
$remoteHost = if ($env:IMAGINETHIS_UPDATE_HOST) { $env:IMAGINETHIS_UPDATE_HOST } else { "Bojie" }
$remoteDir = if ($env:IMAGINETHIS_UPDATE_REMOTE_DIR) { $env:IMAGINETHIS_UPDATE_REMOTE_DIR } else { "/data/imagine-this-updates/windows" }
$baseUrl = if ($env:IMAGINETHIS_UPDATE_BASE_URL) { $env:IMAGINETHIS_UPDATE_BASE_URL } else { "https://bojie.store" }

$requiredFiles = @(
  "latest.yml"
)

foreach ($file in $requiredFiles) {
  $fullPath = Join-Path $distDir $file
  if (-not (Test-Path -LiteralPath $fullPath)) {
    throw "Missing required update artifact: $fullPath"
  }
}

$artifactFiles = Get-ChildItem -LiteralPath $distDir -File | Where-Object {
  $_.Name -eq "latest.yml" -or
  $_.Name -like "ImagineThis-*-Setup.exe" -or
  $_.Name -like "ImagineThis-*-Setup.exe.blockmap" -or
  $_.Name -like "ImagineThis-*-Portable.exe"
}

if ($artifactFiles.Count -eq 0) {
  throw "No Windows update artifacts were found in $distDir"
}

Write-Host "Preparing remote update directory..."
ssh $remoteHost "mkdir -p $remoteDir"

Write-Host "Uploading update artifacts..."
foreach ($artifact in $artifactFiles) {
  Write-Host "  -> $($artifact.Name)"
  scp $artifact.FullName "${remoteHost}:${remoteDir}/"
}

Write-Host "Remote files:"
ssh $remoteHost "ls -lh $remoteDir"

Write-Host ""
Write-Host "Update feed is available at:"
Write-Host "$baseUrl/api/desktop-updates/windows/latest.yml"
