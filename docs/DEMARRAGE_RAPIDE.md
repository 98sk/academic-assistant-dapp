# Démarrage rapide (Windows / PowerShell)

Guide pas-à-pas pour relancer le projet **Decentralized Academic Assistant** en local.

## Racine du projet

Cloner ce dépôt, puis ouvrir un terminal à la racine (`academic-assistant-dapp/`).

Les commandes ci-dessous supposent que vous êtes déjà à cette racine.

## Prérequis

- **Node.js 20+** et **npm** (`node -v`, `npm -v`)
- **MetaMask** (réseau personnalisé chainId **31337**, RPC `http://127.0.0.1:8545`)
- **4 fenêtres PowerShell** (ou 3 + script automatique)

## Installation (une seule fois)

À la racine du projet :

```powershell
cd contracts; npm install
cd ..\backend; npm install
cd ..\frontend; npm install
cd ..
```

Optionnel (assistant RAG / bot Telegram) : `cd rag; npm install` et `cd telegram-bot; npm install`.

### Extension Telegram (bonus)

1. Préparer les secrets partagés (sans token BotFather) :

```powershell
.\scripts\setup-telegram.ps1
```

2. Créer le bot sur [@BotFather](https://t.me/BotFather), puis ajouter dans `telegram-bot/.env` :

```env
TELEGRAM_BOT_TOKEN=votre-jeton-botfather
```

3. Backend + index RAG actifs, puis lancer le bot :

```powershell
cd telegram-bot
npm run dev
```

Dans l'app : **Paramètres** → section **Extension Telegram (bonus)**.  
Test Telegram : `/start` puis `/ask Quel est le sujet du document ?`

Voir aussi [`telegram-bot/README.md`](../telegram-bot/README.md).

## Démarrage manuel (recommandé pour comprendre)

### Terminal 1 — Blockchain Hardhat

```powershell
cd contracts
npx hardhat node
```

Laisser cette fenêtre ouverte. Le RPC écoute sur **http://127.0.0.1:8545** (chainId **31337**).

### Terminal 2 — Déployer les contrats (si première fois ou nœud réinitialisé)

Attendre que le Terminal 1 affiche les comptes, puis :

```powershell
cd contracts
npm run deploy:local
```

Puis copier la configuration backend générée :

```powershell
Copy-Item ..\backend\.env.localhost.template ..\backend\.env -Force
```

Accorder les rôles démo (prof #1, prof MetaMask `0x7F48...`, étudiant #2) :

```powershell
npm run grant-roles:local
```

Le script inclut par défaut :

- Professeur : `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Hardhat #1)
- Professeur : `0x7F48fa16c4535Bc00Ce6315E377F93787B95319F` (portefeuille MetaMask fréquent)
- Étudiant : `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (Hardhat #2, `cohort-a`)

Pour votre propre adresse : ajoutez-la à `PROFESSOR_ADDRESSES` ou `STUDENT_ADDRESSES` avant `npm run grant-roles:local`.

### Terminal 3 — Backend API (port 4000)

```powershell
cd backend
npm run dev
```

Vérifier : http://localhost:4000/health et http://localhost:4000/api/config

### Terminal 4 — Frontend (port 5173)

```powershell
cd frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Ouvrir : **http://localhost:5173**

## Démarrage semi-automatique

Avec le **Terminal 1** (Hardhat) déjà lancé, à la racine du projet :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

Sans question interactive (démarre Hardhat si absent, ouvre backend/frontend) :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -NonInteractive
```

Avec le bot Telegram (après `setup-telegram.ps1` + `TELEGRAM_BOT_TOKEN` dans `telegram-bot/.env`) :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -Telegram
```

Options : `-SkipDeploy`, `-SkipChain`, `-Telegram`, `-NonInteractive`

## Données de démo (annonces + analytique)

Après déploiement (Terminal 2) :

```powershell
cd contracts
npm run seed:demo
```

## Vérification rapide

```powershell
.\scripts\smoke-test.ps1
```

## MetaMask (chainId 31337)

1. Réseau personnalisé : RPC `http://127.0.0.1:8545`, chainId **31337**, symbole ETH.
2. Importer un compte de test affiché par `npx hardhat node`, ou utiliser **`0x7F48fa16c4535Bc00Ce6315E377F93787B95319F`** (professeur après `grant-roles:local`) :
   - Compte **#1** : professeur (`0x7099...79C8`)
   - Compte **#2** : étudiant (`0x3C44...93BC`)
3. Dans l'app : **Paramètres** → **Connecter wallet** → **Se connecter** (signature).
4. Si le rôle affiché « Aucun » : `npm run grant-roles:local` dans `contracts`, puis reconnecter ou ouvrir le **Tableau de bord**.

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| API 401 / contrats vides | `backend/.env` copié depuis `.env.example` (adresses `0x000...`) | `Copy-Item backend\.env.localhost.template backend\.env -Force` puis redéployer si besoin |
| TX on-chain échouent | Hardhat arrêté ou mauvais chainId | Relancer Terminal 1 ; MetaMask sur 31337 |
| Page blanche / erreurs réseau | Backend arrêté ou mauvaise URL API | Backend sur 4000 ; `frontend/.env.local` : `VITE_API_BASE_URL=http://localhost:4000` |
| Port 4000 ou 5173 déjà utilisé | Ancienne session | Fermer l'ancien terminal ou tuer le processus sur le port |
| CORS | Origine non autorisée | `FRONTEND_ORIGIN=http://localhost:5173` dans `backend/.env` |
| Relay annonces/documents refuse | Rôles non accordés | `npm run grant-roles:local` (Terminal 2) |
| Tableau de bord « Rôle : Aucun » | Rôle non accordé ou JWT ancien | `npm run grant-roles:local` ; reconnecter ou recharger le tableau de bord |

## URLs utiles

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Santé | http://localhost:4000/health |
| Config contrats | http://localhost:4000/api/config |
| RPC Hardhat | http://127.0.0.1:8545 |

## Documentation complémentaire

- [README.md](../README.md)
- [docs/TESTING.md](TESTING.md)
- [docs/demo-script.md](demo-script.md)
- [docs/architecture.md](architecture.md)
