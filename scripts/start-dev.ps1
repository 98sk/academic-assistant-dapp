# start-dev.ps1 - Demarrage reproductible (Windows PowerShell)
# Usage: .\scripts\start-dev.ps1
#        .\scripts\start-dev.ps1 -SkipDeploy -SkipChain
#        .\scripts\start-dev.ps1 -NonInteractive
#        .\scripts\start-dev.ps1 -Telegram
#        $env:TELEGRAM=1; .\scripts\start-dev.ps1
# Demarre aussi telegram-bot si TELEGRAM_BOT_TOKEN est defini dans telegram-bot/.env

param(
  [switch]$SkipDeploy,
  [switch]$SkipChain,
  [switch]$NonInteractive,
  [switch]$Telegram,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)


function Ensure-BackendEnv {
  param([string]$EnvPath, [string]$TemplatePath)
  if (-not (Test-Path $TemplatePath)) { return }
  $copy = -not (Test-Path $EnvPath)
  if (-not $copy -and (Test-Path $EnvPath)) {
    $raw = Get-Content $EnvPath -Raw
    if ($raw -match 'ROLE_MANAGER_ADDRESS=0x0{40}') { $copy = $true }
  }
  if ($copy) {
    Copy-Item $TemplatePath $EnvPath -Force
    Write-Host "  backend/.env synchronise depuis .env.localhost.template" -ForegroundColor Green
  }
}
$ErrorActionPreference = "Stop"

function Write-Step([string]$Msg) {
  Write-Host "`n=== $Msg ===" -ForegroundColor Cyan
}

function Test-PortOpen([int]$Port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $Port)
    $c.Close()
    return $true
  } catch {
    return $false
  }
}

function Get-DotEnvValue {
  param([string]$Path, [string]$Name)
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path -Encoding UTF8) {
    if ($line -match '^\s*#') { continue }
    if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.*)\s*$") {
      $v = $Matches[1].Trim().Trim('"').Trim("'")
      if ($v.Length -gt 0) { return $v }
    }
  }
  return $null
}

function Test-ShouldStartTelegram {
  if ($Telegram) { return $true }
  if ($env:TELEGRAM -eq '1' -or $env:TELEGRAM -eq 'true') { return $true }
  $telegramEnv = Join-Path $RepoRoot "telegram-bot\.env"
  return [bool](Get-DotEnvValue -Path $telegramEnv -Name "TELEGRAM_BOT_TOKEN")
}

function Test-RpcChain31337([string]$RpcUrl = "http://127.0.0.1:8545") {
  try {
    $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
    $r = Invoke-RestMethod -Uri $RpcUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 3
    $id = [Convert]::ToInt64($r.result, 16)
    return ($id -eq 31337)
  } catch {
    return $false
  }
}

Write-Host @"

  Decentralized Academic Assistant - start-dev (Windows)
  Rapport: docs/RAPPORT.md | Soumission: docs/SOUMISSION.md

"@ -ForegroundColor Green

Write-Step "Vérification Node.js / npm"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERREUR: Node.js introuvable. Installez Node 20+ depuis https://nodejs.org" -ForegroundColor Red
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERREUR: npm introuvable." -ForegroundColor Red
  exit 1
}
Write-Host "  node $(node -v)" -ForegroundColor Gray
Write-Host "  npm  $(npm -v)" -ForegroundColor Gray

$contractsDir = Join-Path $RepoRoot "contracts"
$backendDir = Join-Path $RepoRoot "backend"
$frontendDir = Join-Path $RepoRoot "frontend"
$deploymentFile = Join-Path $contractsDir "deployments\localhost.json"
$backendEnv = Join-Path $backendDir ".env"
$backendTemplate = Join-Path $backendDir ".env.localhost.template"

# --- Dependencies (quick check) ---
foreach ($pkg in @("contracts", "backend", "frontend", "telegram-bot")) {
  $dir = Join-Path $RepoRoot $pkg
  if (-not (Test-Path (Join-Path $dir "node_modules"))) {
    Write-Host "  Installation manquante dans $pkg - exécutez: cd $pkg; npm install" -ForegroundColor Yellow
  }
}

Write-Step "Blockchain locale (Hardhat, port 8545)"
$chainOk = Test-RpcChain31337
if (-not $chainOk -and -not $SkipChain) {
  Write-Host @"
  Aucun nœud Hardhat détecté sur http://127.0.0.1:8545 (chainId 31337).

  Ouvrez un terminal dédié et lancez:
    cd contracts
    npx hardhat node

  Puis relancez ce script, ou utilisez -SkipChain pour ignorer la chaîne.
"@ -ForegroundColor Yellow

    $autoStart = $NonInteractive
  if (-not $autoStart) {
    $startNode = Read-Host "Demarrer npx hardhat node dans une nouvelle fenetre ? (o/N)"
    $autoStart = ($startNode -match '^[oOyY]')
  }
  if ($autoStart) {
    Start-Process powershell -ArgumentList @(
      "-NoExit", "-Command",
      "Set-Location '$contractsDir'; npx hardhat node"
    )
    Write-Host "  Attente du noeud Hardhat (15 s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    $chainOk = Test-RpcChain31337
  }
}

if ($chainOk) {
  Write-Host "  OK - Hardhat node actif (chainId 31337)" -ForegroundColor Green
} else {
  Write-Host "  AVERTISSEMENT - chaîne non disponible; déploiement et TX on-chain échoueront." -ForegroundColor Yellow
}

Write-Step "Compilation et déploiement contrats"
Set-Location $contractsDir
npx hardhat compile | Out-Host

if (-not $SkipDeploy -and $chainOk) {
  if (-not (Test-Path $deploymentFile)) {
    Write-Host "  Déploiement localhost (deploy:local)..." -ForegroundColor Gray
    npm run deploy:local | Out-Host
  } else {
    Write-Host "  deployments/localhost.json existe - déploiement ignoré (supprimez le fichier pour redéployer)." -ForegroundColor Gray
  }

    Ensure-BackendEnv -EnvPath $backendEnv -TemplatePath $backendTemplate

  Write-Host @"
  Accorder les rôles (une fois par environnement):
    cd contracts
    npm run grant-roles:local
  (prof: 0x7099..., 0x7F48... | étudiant: 0x3C44... — voir docs/SEED_DEMO.md)
"@ -ForegroundColor Gray
}

Write-Step "Configuration frontend"
$frontendEnv = Join-Path $frontendDir ".env.local"
$frontendExample = Join-Path $frontendDir ".env.example"
if (-not (Test-Path $frontendEnv) -and (Test-Path $frontendExample)) {
  Copy-Item $frontendExample $frontendEnv
  Write-Host "  Copié frontend/.env.example → frontend/.env.local" -ForegroundColor Green
}

Write-Step "Démarrage backend (port 4000) et frontend (port 5173)"
if (Test-PortOpen 4000) {
  Write-Host "  Port 4000 déjà utilisé - backend peut déjà tourner." -ForegroundColor Yellow
} else {
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$backendDir'; npm run dev"
  )
  Write-Host "  Backend lancé dans une nouvelle fenêtre." -ForegroundColor Green
}

Start-Sleep -Seconds 2

if (Test-PortOpen 5173) {
  Write-Host "  Port 5173 déjà utilisé - frontend peut déjà tourner." -ForegroundColor Yellow
} else {
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$frontendDir'; npm run dev"
  )
  Write-Host "  Frontend lancé dans une nouvelle fenêtre." -ForegroundColor Green
}

$telegramDir = Join-Path $RepoRoot "telegram-bot"
if (Test-ShouldStartTelegram) {
  Write-Step "Extension Telegram (bonus)"
  if (-not (Test-Path (Join-Path $telegramDir "node_modules"))) {
    Write-Host "  Installation manquante dans telegram-bot - exécutez: cd telegram-bot; npm install" -ForegroundColor Yellow
  }
  $botToken = Get-DotEnvValue -Path (Join-Path $telegramDir ".env") -Name "TELEGRAM_BOT_TOKEN"
  if (-not $botToken) {
    Write-Host @"
  TELEGRAM_BOT_TOKEN absent dans telegram-bot/.env
  Lancez: .\scripts\setup-telegram.ps1 puis ajoutez le token BotFather
  Ou demarrez sans bot (sans -Telegram ni TELEGRAM=1)
"@ -ForegroundColor Yellow
  } else {
    Start-Process powershell -ArgumentList @(
      "-NoExit", "-Command",
      "Set-Location '$telegramDir'; npm run dev"
    )
    Write-Host "  Bot Telegram lance dans une nouvelle fenetre (npm run dev)." -ForegroundColor Green
  }
} else {
  Write-Host "`n  Telegram: ignore (activez avec -Telegram, TELEGRAM=1, ou TELEGRAM_BOT_TOKEN dans telegram-bot/.env)" -ForegroundColor Gray
}

Write-Step "URLs & checklist démo"
Write-Host @"
  Frontend (DApp)     http://localhost:5173
  Backend API         http://localhost:4000
  Santé               http://localhost:4000/health
  Config contrats     http://localhost:4000/api/config
  Hardhat RPC         http://127.0.0.1:8545  (chainId 31337)

  Checklist rapide:
    [ ] MetaMask: réseau Localhost 31337, comptes Hardhat #1 (prof) et #2 (étudiant)
    [ ] Settings → Connecter wallet → Se connecter (signature SIWE-like)
    [ ] Documents: upload PDF (prof)
    [ ] Annonces: publier (relay ou MetaMask)
    [ ] Détail annonce (étudiant): J'ai lu - MetaMask
    [ ] Analytics, Assistant RAG, verification PDF
    [ ] (Bonus) Telegram: .\scripts\setup-telegram.ps1 puis /ask sur Telegram
    [ ] Smoke: .\scripts\smoke-test.ps1

  Telegram: telegram-bot/README.md | setup: .\scripts\setup-telegram.ps1
  Documentation: docs/RAPPORT.md | docs/demo-script.md | docs/TESTING.md
"@ -ForegroundColor White

Set-Location $RepoRoot
