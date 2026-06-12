# Matrice de tests manuels

Checklist alignée sur l’énoncé MVP + 4 extensions bonus. Cocher chaque scénario avant la soutenance.

**Prérequis communs** : Hardhat node, contrats déployés, rôles accordés, backend + frontend lancés, MetaMask sur chainId 31337.

| Compte Hardhat | Rôle | Groupe |
|----------------|------|--------|
| #1 `0x7099…79C8` | PROFESSOR | — |
| #2 `0x3C44…93BC` | STUDENT | cohort-a |

---

## MVP — Authentification & rôles

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| A1 | Tous | Ouvrir Settings, connecter MetaMask, signer | JWT actif, adresse + rôles affichés |
| A2 | Sans wallet | Accéder Documents / Annonces (lecture) | Listes visibles (si API publique) |
| A3 | Étudiant | Tenter publier une annonce | Refus 403 ou bouton absent |
| A4 | Prof | Tenter accuser réception | Bouton ack absent ou refus |

---

## MVP — Documents

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| D1 | Prof | Upload PDF via Documents | 201, hash SHA-256 + txHash (relay) |
| D2 | Prof | Consulter détail document | Métadonnées + lien explorer |
| D3 | Tous | Vérifier intégrité (même PDF, client-side) | `verified: true` |
| D4 | Tous | Vérifier PDF modifié | `verified: false` |
| D5 | API | `GET /api/documents/verify/:hash` | `{ verified: boolean }` |

---

## MVP — Annonces

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| N1 | Prof | Publier via relay backend | Annonce listée, hash on-chain |
| N2 | Prof | Publier via MetaMask | TX confirmée, id lié off-chain |
| N3 | Étudiant (groupe OK) | Ouvrir annonce ciblée | Corps + hash visibles |
| N4 | Prof | Vérifier annonce (détail) | « Contenu conforme au hash on-chain » |
| N5 | API | `GET /api/verify?announcementId=1&body=...` | `verified: true/false` |
| N6 | API | `POST /api/announcement` (alias) | Équivalent publish |

---

## MVP — Accusés de réception

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| K1 | Étudiant | « J’ai lu — MetaMask » | TX AcknowledgmentLog, statut vert |
| K2 | Étudiant | Re-cliquer ack | Déjà accusé (contrat revert ou UI grisée) |
| K3 | Prof | Tableau suivi sur détail annonce | Adresse étudiant + date + tx |
| K4 | API | `POST /api/acknowledge` | calldata ou confirmation |

---

## MVP — Endpoints énoncé (curl)

```bash
# Santé
curl -s http://localhost:4000/health
curl -s http://localhost:4000/api/config

# Vérification annonce (sans auth)
curl -s "http://localhost:4000/api/verify?announcementId=1&body=Texte%20exact"

# Vérification document
curl -s "http://localhost:4000/api/verify/document?hash=0x..."
```

| Endpoint | Auth | Attendu |
|----------|------|---------|
| `GET /health` | Non | `{ ok: true }` |
| `GET /api/config` | Non | adresses contrats |
| `GET /api/verify` | Non | hash comparé |
| `POST /api/chat` | JWT | réponse RAG |
| `POST /api/document` | JWT prof | upload PDF |
| `POST /api/announcement` | JWT prof | publication |

---

## Bonus 1 — Assistant RAG (+5)

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| R1 | Prof | Upload PDF puis question Assistant | Réponse avec citations |
| R2 | Étudiant | Question sans accès doc | Refus ou réponse vide filtrée |
| R3 | API | `POST /api/assistant/index` | Index mis à jour |

---

## Bonus 2 — Analytics (+5)

| # | Rôle | Action | Résultat attendu |
|---|------|--------|------------------|
| AN1 | Prof | Page Analytics | Compteurs annonces / acks cohérents |
| AN2 | API | `GET /api/analytics/...` | JSON stats |

---

## Bonus 3 — Slither (+5)

| # | Action | Résultat attendu |
|---|--------|------------------|
| S1 | `cd contracts && npm run slither` | Rapport sans erreur bloquante |
| S2 | Lire `docs/security/slither-report.md` | Findings documentés |

---

## Bonus 4 — Telegram (+5)

| # | Action | Résultat attendu |
|---|--------|------------------|
| T1 | `/start` sur le bot | Message bienvenue |
| T2 | `/link 0x…` (wallet étudiant) | Liaison OK |
| T3 | `/ask …` | Réponse via backend `/api/chat` |

---

## Smoke test automatisé

```powershell
.\scripts\smoke-test.ps1
```

```bash
chmod +x scripts/smoke-test.sh && ./scripts/smoke-test.sh
```

---

## Builds (CI locale)

| Package | Commande | Attendu |
|---------|----------|---------|
| contracts | `npx hardhat compile && npm test` | 0 échec |
| backend | `npm run build` | dist/ sans erreur |
| frontend | `npm run build` | dist/ sans erreur |
| rag | `npm run build` | dist/ |
| telegram-bot | `npm run build` | dist/ |

---

## Limitations connues (à mentionner à l’oral)

- Contenu annonce / PDF stocké off-chain (hash seul on-chain)
- Pas de IPFS dans le MVP
- Relay backend optionnel (clé #0 Hardhat)
- React au lieu de HTML pur (documenté dans architecture.md)
