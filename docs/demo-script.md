# Script de soutenance (~10 minutes)

Guide pas-à-pas pour la démo live. Prérequis : Hardhat node, contrats déployés, rôles accordés, backend + frontend lancés.

## 0. Introduction (1 min)

- Présenter le problème : traçabilité académique (documents, annonces, accusés de réception).
- Architecture en 30 s : React + Express + 4 contrats Solidity + RAG optionnel (voir `docs/architecture.md`).
- Mentionner l’écart React vs HTML énoncé (justification UX, API identiques).
- Bonus annoncés : RAG, Analytics, Slither (`docs/security/slither-report.md`), Telegram.

## 1. Authentification wallet (1 min)

1. Ouvrir http://localhost:5173
2. **Settings** → Connecter MetaMask (compte professeur #1)
3. Signer le message → JWT + rôles affichés

## 2. Professeur — documents & annonces (2 min)

1. **Documents** → glisser-déposer un PDF
2. Montrer hash SHA-256 + lien tx (explorer local ou Sepolia)
3. **Announcements** → publier titre, catégorie, groupe cible, corps
4. Montrer hash contenu on-chain

## 3. Étudiant — accusé MetaMask (2 min)

1. Changer de compte MetaMask (étudiant #2, STUDENT_ROLE + groupe)
2. Re-sign in
3. Ouvrir l’annonce → **« J’ai lu — signer avec MetaMask »**
4. Confirmer la TX → statut vert + hash tx

## 4. Professeur — suivi des lectures (1 min)

1. Revenir compte professeur
2. Même annonce → tableau **Suivi des accusés de réception** (adresse + date + tx)

## 5. Vérification intégrité document (1 min)

1. **Documents** → section **Vérifier l’intégrité**
2. Déposer le même PDF (ou une copie) sans upload serveur
3. Résultat `verifyDocument` = true si enregistré

## 6. Bonus — Assistant RAG (1 min)

1. **AI Assistant** → question sur le PDF uploadé
2. Montrer citations / extraits

## 7. Bonus — Analytics (30 s)

1. **Analytics** → stats annonces / accusés

## 8. Bonus — Slither (30 s)

1. Montrer `docs/security/slither-report.md`
2. Expliquer 1–2 findings acceptés vs corrigés

## 9. Bonus — Telegram (30 s)

1. `/start` puis `/link 0x…` (wallet étudiant)
2. `/ask Quelle est la date limite du devoir ?`
3. Réponse via même backend `/api/chat`

## 10. Conclusion (30 s)

- Récap : décentralisation (hashes + rôles + acks signés)
- Pistes : Sepolia public, IPFS contenu, base de données index events

## Dépannage rapide

| Problème | Action |
|----------|--------|
| TX revert ack | Vérifier STUDENT_ROLE + groupe annonce |
| verify false | PDF différent ou non enregistré |
| RAG vide | Attendre index auto ou `POST /api/assistant/index` |
| Bot 401 | `BACKEND_SERVICE_TOKEN` identique backend + bot ; `BOT_SERVICE_WALLET_ADDRESS` avec STUDENT_ROLE |
