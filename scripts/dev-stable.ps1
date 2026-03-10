$projectRoot = Split-Path -Parent $PSScriptRoot
$outLog = Join-Path $projectRoot 'dev-server.out.log'
$errLog = Join-Path $projectRoot 'dev-server.err.log'

$existing = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Stop-Process -Id $existing[0].OwningProcess -Force -ErrorAction SilentlyContinue
}

if (Test-Path $outLog) { Remove-Item $outLog -Force -ErrorAction SilentlyContinue }
if (Test-Path $errLog) { Remove-Item $errLog -Force -ErrorAction SilentlyContinue }

Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','-p','3000' -WorkingDirectory $projectRoot -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden
Start-Sleep -Seconds 4

$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  Write-Output "READY http://localhost:3000 PID=$($conn[0].OwningProcess)"
  exit 0
}

Write-Output 'FAILED_TO_START'
if (Test-Path $errLog) { Get-Content $errLog -Tail 30 }
exit 1
