#!/usr/bin/env bash
# start-dev.sh — Demarrage reproductible (Linux / macOS / Git Bash)
# Usage: ./scripts/start-dev.sh [--skip-deploy] [--skip-chain] [--telegram]
#        TELEGRAM=1 ./scripts/start-dev.sh
# Demarre aussi telegram-bot si TELEGRAM_BOT_TOKEN est defini dans telegram-bot/.env

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_DEPLOY=false
SKIP_CHAIN=false
START_TELEGRAM=false

for arg in "$@"; do
  case "$arg" in
    --skip-deploy) SKIP_DEPLOY=true ;;
    --skip-chain) SKIP_CHAIN=true ;;
    --telegram) START_TELEGRAM=true ;;
  esac
done

get_dotenv() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 1
  local line val
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*${key}[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      val="${BASH_REMATCH[1]}"
      val="${val%\"}"; val="${val#\"}"
      val="${val%\'}"; val="${val#\'}"
      val="$(echo "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
      [ -n "$val" ] && { echo "$val"; return 0; }
    fi
  done < "$file"
  return 1
}

should_start_telegram() {
  if [ "$START_TELEGRAM" = true ]; then return 0; fi
  if [ "${TELEGRAM:-}" = "1" ] || [ "${TELEGRAM:-}" = "true" ]; then return 0; fi
  local token
  token="$(get_dotenv "$REPO_ROOT/telegram-bot/.env" TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
  [ -n "${token:-}" ]
}

step() { echo -e "\n=== $1 ==="; }

rpc_ok() {
  curl -sf -X POST http://127.0.0.1:8545 \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    | grep -q '"result":"0x7a69"' 2>/dev/null
}

echo ""
echo "  Decentralized Academic Assistant — start-dev"
echo "  Rapport: docs/RAPPORT.md | Soumission: docs/SOUMISSION.md"
echo ""

step "Vérification Node.js / npm"
command -v node >/dev/null || { echo "ERREUR: installez Node 20+"; exit 1; }
command -v npm >/dev/null || { echo "ERREUR: npm introuvable"; exit 1; }
echo "  node $(node -v)"
echo "  npm  $(npm -v)"

CONTRACTS="$REPO_ROOT/contracts"
BACKEND="$REPO_ROOT/backend"
FRONTEND="$REPO_ROOT/frontend"
DEPLOYMENT="$CONTRACTS/deployments/localhost.json"

for pkg in contracts backend frontend telegram-bot; do
  if [ ! -d "$REPO_ROOT/$pkg/node_modules" ]; then
    echo "  AVERTISSEMENT: npm install manquant dans $pkg"
  fi
done

step "Blockchain locale (Hardhat, port 8545)"
CHAIN_OK=false
if rpc_ok; then
  CHAIN_OK=true
  echo "  OK — Hardhat node actif (chainId 31337)"
elif [ "$SKIP_CHAIN" = true ]; then
  echo "  SKIP — --skip-chain"
else
  echo "  Aucun nœud sur :8545. Lancez dans un autre terminal:"
  echo "    cd contracts && npx hardhat node"
  read -r -p "  Continuer sans chaîne ? (y/N) " ans
  [[ "$ans" =~ ^[yY] ]] || exit 1
fi

step "Compilation & déploiement contrats"
cd "$CONTRACTS"
npx hardhat compile

if [ "$SKIP_DEPLOY" = false ] && [ "$CHAIN_OK" = true ]; then
  if [ ! -f "$DEPLOYMENT" ]; then
    echo "  deploy:local..."
    npm run deploy:local
  else
    echo "  $DEPLOYMENT existe — déploiement ignoré"
  fi
  if [ ! -f "$BACKEND/.env" ] && [ -f "$BACKEND/.env.localhost.template" ]; then
    cp "$BACKEND/.env.localhost.template" "$BACKEND/.env"
    echo "  Copié backend/.env.localhost.template → backend/.env"
  fi
  echo "  Rôles: PROFESSOR_ADDRESSES=0x7099... npm run grant-roles:local (voir README)"
fi

step "Configuration frontend"
if [ ! -f "$FRONTEND/.env.local" ] && [ -f "$FRONTEND/.env.example" ]; then
  cp "$FRONTEND/.env.example" "$FRONTEND/.env.local"
  echo "  Copié frontend/.env.example → frontend/.env.local"
fi

step "Démarrage backend & frontend"
if ! curl -sf http://localhost:4000/health >/dev/null 2>&1; then
  (cd "$BACKEND" && npm run dev) &
  echo "  Backend PID $! — http://localhost:4000"
  sleep 2
else
  echo "  Backend déjà actif sur :4000"
fi

if ! curl -sf http://localhost:5173 >/dev/null 2>&1; then
  (cd "$FRONTEND" && npm run dev) &
  echo "  Frontend PID $! — http://localhost:5173"
else
  echo "  Frontend déjà actif sur :5173"
fi

TELEGRAM_DIR="$REPO_ROOT/telegram-bot"
if should_start_telegram; then
  step "Extension Telegram (bonus)"
  if [ ! -d "$TELEGRAM_DIR/node_modules" ]; then
    echo "  AVERTISSEMENT: npm install manquant dans telegram-bot"
  fi
  BOT_TOKEN="$(get_dotenv "$TELEGRAM_DIR/.env" TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
  if [ -z "${BOT_TOKEN:-}" ]; then
    echo "  TELEGRAM_BOT_TOKEN absent — ./scripts/setup-telegram.ps1 (Windows) ou voir telegram-bot/README.md"
  else
    (cd "$TELEGRAM_DIR" && npm run dev) &
    echo "  Bot Telegram PID $! — voir telegram-bot/README.md"
  fi
else
  echo ""
  echo "  Telegram: ignore (TELEGRAM=1, --telegram, ou token dans telegram-bot/.env)"
fi

step "URLs & checklist"
cat <<EOF

  Frontend     http://localhost:5173
  Backend      http://localhost:4000
  Health       http://localhost:4000/health
  Config       http://localhost:4000/api/config
  RPC          http://127.0.0.1:8545

  Checklist: MetaMask 31337 -> Settings -> sign-in -> Documents -> Annonces -> Ack MetaMask
  (Bonus) Telegram: ./scripts/setup-telegram.ps1 (Windows) puis /ask
  Smoke: ./scripts/smoke-test.sh
  Telegram: telegram-bot/README.md
  Rapport: docs/RAPPORT.md

EOF

cd "$REPO_ROOT"
