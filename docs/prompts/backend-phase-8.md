# Prompt — Phase 8 : qualité, test e2e, README

- Date : 2026-09-19
- Étape roadmap : 8.1, 8.2, 8.3
- Sous-projet : backend
- Score (grille Anthropic) : 17/20 — voir notation en bas
- Source : /feature-to-prompt (série `backend-00-index.md`)

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22, hors périmètre ici). Réponds en français ;
code et commentaires selon les conventions de `CLAUDE.md`.

Ce prompt est la **phase 8 sur 8**, la dernière, d'une série (`docs/prompts/backend-phase-*.md`).
Prérequis : étapes 0.x à 7.x cochées dans `docs/ROADMAP.md` (la query et les 6 mutations du
schéma fonctionnent, `world-engine.spec.ts` est vert). Sinon, arrête-toi et signale-le.

### Objectif

Rendre le backend livrable pour le TP : lint et build propres, tests unitaires verts, un test
de bout en bout qui traverse HTTP → Apollo → resolver → fichier, et un README qui permet à
l'enseignant de lancer et d'interroger l'API en deux minutes. Cette phase correspond aux
étapes 8.1, 8.2 et 8.3 de `docs/ROADMAP.md`. Aucune nouvelle fonctionnalité.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `backend/test/app.e2e-spec.ts` (starter, à conserver et à compléter), `backend/vitest.config.e2e.ts`
3. `backend/src/resolver.ts`, `backend/src/app.service.ts` (messages d'erreur à comparer)
4. `backend/README.md` (celui du starter NestJS, à remplacer), `docs/ROADMAP.md` (exemples de requêtes)
5. `docs/DECISIONS.md` (résumé à reprendre dans le README)

### Comportement attendu

**8.1** `npm run lint`, `npm run build`, `npm test` sans erreur ni warning bloquant. Corriger le
code, pas la configuration du linter (sauf règle manifestement inadaptée à l'ESM — le dire).

**8.2** `backend/test/world.e2e-spec.ts` (supertest, même structure que `app.e2e-spec.ts` mais
avec `beforeAll`/`afterAll` : l'init de l'app régénère `graphql.ts`, inutile de le faire par test).
Utilisateur jetable `e2e-<Date.now()>` ; `afterAll` supprime `userworlds/<user>-world.json`.
Cas, dans l'ordre :
1. `getWorld` → 200, `body.data.getWorld.name === 'World'`, fichier créé.
2. Écrire `money: 1000` dans le fichier, `acheterQtProduit(id:1, quantite:10)` →
   `quantite 11`, `cout` ≈ 7.87 (à 0.01), fichier `money` ≈ 944.73.
3. `acheterQtProduit(id:99, quantite:1)` → `body.errors[0].message === "Le produit avec l'id 99 n'existe pas"`.
4. `engagerManager(name:"Manager 1")` → `"Pas assez d'argent"` (944.73 < 1000).
5. `resetWorld` → `money 0`, `products[0].quantite 1`, `totalangels 0`.

**8.3** `backend/README.md` remplacé par une doc courte (≤ 80 lignes) : présentation, prérequis
(Node ≥ 22), `npm install`, `npm run icons`, `npm run start:dev`, playground
http://localhost:3000/graphql, images `http://localhost:3000/icones/item1.png`, stockage
`userworlds/`, tableau des 7 opérations avec un exemple chaque (repris de `ROADMAP.md`, avec les
noms génériques `Item 1`, `Manager 1`, `Upgrade 1`, `Angel Upgrade 1`), commandes de test,
renvoi vers `docs/` pour les règles et décisions.

### Cas limites

- Le test e2e lit/écrit le fichier du joueur : `saveWorld` est synchrone (D8), donc lire le
  fichier juste après la réponse est fiable. Si un test est instable, c'est un bug à corriger,
  pas un `setTimeout` à ajouter.
- `test:e2e` lance `AppModule` complet, `ObserveModule` compris (clés vides) : des logs
  d'avertissement sont acceptables, une erreur ne l'est pas.
- Le dossier `userworlds/` doit exister quand le test tourne (il est versionné via `.gitkeep`).

### Contraintes (et pourquoi)

- Ne pas modifier le comportement des opérations pour faire passer un test : si un test e2e
  contredit une phase précédente, c'est le test qui reprend la valeur observée **si** elle est
  conforme à `GAME-RULES.md` — sinon signaler l'écart dans le rapport sans le corriger
  silencieusement.
- Ne pas ajouter de dépendance (supertest et vitest sont déjà là).
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` (D1).

### Hors périmètre

- Le frontend et son README.
- Couverture de code, CI, Docker.

### Étapes

1. Lire les fichiers ci-dessus.
2. 8.1 : lancer les trois commandes, corriger.
3. 8.2 : écrire `world.e2e-spec.ts`, `npm run test:e2e` vert.
4. 8.3 : README.
5. Vérifier (section suivante).
6. Cocher 8.1, 8.2, 8.3 dans `docs/ROADMAP.md` ; relire `DECISIONS.md` et retirer les mentions
   *(à confirmer)* devenues tranchées (D5, D6, D8).

### Vérification — critères de succès

- [ ] `cd backend && npm run lint && npm run build && npm test && npm run test:e2e` : les quatre
  commandes sortent en code 0 ; `test:e2e` rapporte ≥ 6 tests (1 starter + 5 nouveaux).
- [ ] Après `test:e2e`, `ls backend/userworlds` ne contient aucun fichier `e2e-*.json`.
- [ ] `backend/README.md` : ≤ 80 lignes, les 7 opérations y figurent avec un exemple, et chaque
  commande citée existe dans `package.json`.
- [ ] `docs/ROADMAP.md` : toutes les cases des phases 0 à 8 sont cochées.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle des quatre commandes (nombre de tests),
écarts éventuels entre un test e2e et `GAME-RULES.md`, ce qui reste incertain avant le
frontend (phase 9). Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 17/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Livrable pour l'enseignant |
| 2 | Instructions séquencées | 2 | Scénario e2e numéroté |
| 3 | Exemples concrets | 2 | Valeurs attendues du scénario (944.73, erreurs exactes) |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | CI/Docker/front exclus |
| 6 | Critères mesurables | 2 | Codes de sortie, nombre de tests, ≤ 80 lignes |
| 7 | Pourquoi des contraintes | 2 | Sync save, pas de setTimeout, test vs règle |
| 8 | Raisonnement guidé | 1 | Pas de plan ; la règle « test contredit phase précédente » guide le diagnostic |
| 9 | Format de sortie | 1 | Le plan du README est une liste, pas un gabarit exact (voulu : ≤ 80 lignes) |
| 10 | Concision | 1 | La contrainte sur les tests contradictoires est longue mais évite un contournement classique |

Historique : v1 15/20 → v2 17/20 (v1 disait « un test e2e getWorld puis acheterQtProduit » sans
valeurs ni gestion de l'argent initial à 0 — le test aurait échoué sur « Pas assez d'argent »).
