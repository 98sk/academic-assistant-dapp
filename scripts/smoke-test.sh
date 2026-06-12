#!/usr/bin/env bash
# Smoke test — Decentralized Academic Assistant
# Usage: ./scripts/smoke-test.sh [BACKEND_URL] [RPC_URL]

set -euo pipefail

BACKEND_URL="${1:-http://localhost:4000}"
RPC_URL="${2:-http://127.0.0.1:8545}"
SKIP_CHAIN="${SKIP_CHAIN:-0}"
FAILURES=0

pass() { echo "  OK"; }
fail() { echo "  ÉCHEC : $1"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "=== Smoke test DAA ==="
echo "Backend: $BACKEND_URL"
echo ""

if [[ "$SKIP_CHAIN" != "1" ]]; then
  echo "→ Hardhat node (optionnel) : $RPC_URL"
  if CHAIN_RESP=$(curl -sf -m 5 -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>/dev/null); then
    CHAIN_HEX=$(echo "$CHAIN_RESP" | sed -n 's/.*"result"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    CHAIN_ID=$((16#${CHAIN_HEX#0x}))
    if [[ "$CHAIN_ID" -eq 31337 ]]; then
      pass
    else
      echo "  AVERTISSEMENT : chainId=$CHAIN_ID (attendu 31337 pour Hardhat local)"
    fi
  else
    echo "  SKIP — node non joignable (démarrer: cd contracts && npx hardhat node)"
  fi
fi

check_json() {
  local name="$1"
  local url="$2"
  local assert_fn="$3"
  echo "→ $name : $url"
  if RESP=$(curl -sf -m 10 "$url" 2>/dev/null); then
    if eval "$assert_fn"; then
      pass
    else
      fail "assertion échouée pour $name"
    fi
  else
    fail "HTTP inaccessible"
  fi
}

check_json "GET /health" "$BACKEND_URL/health" 'echo "$RESP" | grep -q "\"ok\".*true"'
check_json "GET /api/health" "$BACKEND_URL/api/health" 'echo "$RESP" | grep -q "\"ok\".*true"'
check_json "GET /api/config" "$BACKEND_URL/api/config" 'echo "$RESP" | grep -q "announcementLog" && echo "$RESP" | grep -q "chainId"'

echo ""
echo "Réponses attendues :"
echo "  /health      → { \"ok\": true, \"service\": \"backend\" }"
echo "  /api/health  → { \"ok\": true, \"service\": \"api\" }"
echo "  /api/config  → { chainId, contracts: { roleManager, announcementLog, documentRegistry, acknowledgmentLog } }"
echo ""

if [[ "$FAILURES" -gt 0 ]]; then
  echo "Résultat : $FAILURES test(s) en échec."
  exit 1
fi
echo "Résultat : tous les tests HTTP ont réussi."
exit 0
