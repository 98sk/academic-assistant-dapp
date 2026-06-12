# Smoke test - Decentralized Academic Assistant
# Usage: .\scripts\smoke-test.ps1 [-BackendUrl "http://localhost:4000"] [-RpcUrl "http://127.0.0.1:8545"]

param(
  [string]$BackendUrl = "http://localhost:4000",
  [string]$RpcUrl = "http://127.0.0.1:8545",
  [switch]$SkipChain
)

$ErrorActionPreference = "Stop"
$failures = 0

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url,
    [scriptblock]$Assert
  )
  Write-Host "→ $Name : $Url"
  try {
    $resp = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    & $Assert $resp
    Write-Host "  OK" -ForegroundColor Green
  } catch {
    Write-Host "  ÉCHEC : $_" -ForegroundColor Red
    $script:failures++
  }
}

Write-Host "`n=== Smoke test DAA ===" -ForegroundColor Cyan
Write-Host "Backend: $BackendUrl`n"

if (-not $SkipChain) {
  Write-Host "→ Hardhat node (optionnel) : $RpcUrl"
  try {
    $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
    $chainResp = Invoke-RestMethod -Uri $RpcUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
    $chainId = [Convert]::ToInt64($chainResp.result, 16)
    if ($chainId -eq 31337) {
      Write-Host "  OK (chainId=31337)" -ForegroundColor Green
    } else {
      Write-Host "  AVERTISSEMENT : chainId=$chainId (attendu 31337 pour Hardhat local)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  SKIP - node non joignable (démarrer: cd contracts; npx hardhat node)" -ForegroundColor Yellow
  }
}

Test-Endpoint -Name "GET /health" -Url "$BackendUrl/health" -Assert {
  param($r)
  if (-not $r.ok) { throw "Attendu { ok: true }" }
}

Test-Endpoint -Name "GET /api/health" -Url "$BackendUrl/api/health" -Assert {
  param($r)
  if (-not $r.ok) { throw "Attendu { ok: true, service: 'api' }" }
}

Test-Endpoint -Name "GET /api/config" -Url "$BackendUrl/api/config" -Assert {
  param($r)
  if (-not $r.chainId) { throw "chainId manquant" }
  if (-not $r.contracts.announcementLog) { throw "contracts.announcementLog manquant" }
  if (-not $r.contracts.documentRegistry) { throw "contracts.documentRegistry manquant" }
  if (-not $r.contracts.acknowledgmentLog) { throw "contracts.acknowledgmentLog manquant" }
}

Write-Host "`nRéponses attendues :"
Write-Host "  /health      → { `"ok`": true, `"service`": `"backend`" }"
Write-Host "  /api/health  → { `"ok`": true, `"service`": `"api`" }"
Write-Host "  /api/config  → { chainId, contracts: { roleManager, announcementLog, documentRegistry, acknowledgmentLog } }"
Write-Host ""

if ($failures -gt 0) {
  Write-Host "Résultat : $failures test(s) en échec." -ForegroundColor Red
  exit 1
}
Write-Host "Résultat : tous les tests HTTP ont réussi." -ForegroundColor Green
exit 0
