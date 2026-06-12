# Telegram Bot — Extension bonus

Bot minimal qui appelle `POST /api/chat` du backend (même RAG que l’UI web).

## Prérequis

- Backend en cours d’exécution (`cd backend && npm run dev`)
- Index RAG peuplé (upload PDF via l’UI)
- Token bot Telegram ([@BotFather](https://t.me/BotFather))

## Configuration

```bash
cd telegram-bot
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Token fourni par BotFather |
| `BACKEND_URL` | `http://localhost:4000` en local |
| `BACKEND_SERVICE_TOKEN` | Secret partagé avec `backend/.env` |

Dans **backend/.env** (mêmes valeurs) :

```env
BACKEND_SERVICE_TOKEN=votre-secret-long-aleatoire
BOT_SERVICE_WALLET_ADDRESS=0x7F48fa16c4535Bc00Ce6315E377F93787B95319F
```

Génération automatique (sans token BotFather) :

```powershell
cd ..
.\scripts\setup-telegram.ps1
```

Le wallet service doit être connu du `RoleManager` (prof ou étudiant après `grant-roles:local`) et avoir accès aux documents indexés (groupe / visibilité RAG). Par défaut le script utilise le prof démo MetaMask `0x7F48…` ; alternative étudiant : `0x3C44…`.

## Lancer le bot

```bash
npm install
npm run build
npm run dev
```

Depuis la **racine** du projet (apres configuration) :

```powershell
.\scripts\setup-telegram.ps1          # Windows — secrets partages
.\scripts\start-dev.ps1 -Telegram     # backend + frontend + bot
# ou
npm run dev:telegram                  # bot seul (package.json racine)
```

## Test pas-à-pas (soutenance)

1. Démarrer Hardhat node + déployer contrats + accorder rôles (voir README racine).
2. Démarrer le backend avec `BACKEND_SERVICE_TOKEN` et `BOT_SERVICE_WALLET_ADDRESS` configurés.
3. Uploader un PDF via l’UI (professeur) et attendre l’indexation (~30 s).
4. Démarrer le bot : `npm run dev` dans `telegram-bot/`.
5. Sur Telegram : `/start` — vérifier « Token service : configuré ✓ ».
6. `/ask Quel est le sujet du document ?` — réponse avec citations.
7. En cas d’erreur 401 : vérifier que les tokens backend/bot sont **identiques**.

## Commandes

| Commande | Action |
|----------|--------|
| `/start` | Accueil, état backend + index RAG, exemples |
| `/help` | Liste complète des commandes |
| `/status` | Santé API + index RAG + wallet lié |
| `/ask …` | Question RAG (citations, synthèse, erreurs FR) |
| `/link` ou `/link 0x…` | Associer un wallet démo (viem) |
| `/documents` | Liste des PDF (token service) |
| `/announcements` | Annonces récentes |

## Architecture

```
Telegram → telegraf → POST /api/chat (Bearer BACKEND_SERVICE_TOKEN)
                              → backend RAG (wallet BOT_SERVICE_WALLET_ADDRESS)
```
