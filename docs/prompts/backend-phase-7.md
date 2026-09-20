# Prompt — Phase 7 : `resetWorld` et anges

- Date : 2026-09-19
- Étape roadmap : 7.1, 7.2
- Sous-projet : backend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt (série `backend-00-index.md`)

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22, hors périmètre ici). Réponds en français ;
code et commentaires selon les conventions de `CLAUDE.md`.

Ce prompt est la **phase 7 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x à 6.x cochées dans `docs/ROADMAP.md`. Sinon, arrête-toi et signale-le.

### Objectif

Le « prestige » du jeu : le joueur abandonne sa partie (argent, produits, unlocks, upgrades)
contre des **anges**, calculés sur `score` (total gagné depuis le tout début), qui augmentent
définitivement ses revenus futurs et paient les angelupgrades. C'est la dernière mutation du
schéma. Cette phase correspond aux étapes 7.1 et 7.2 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Reset et §Revenu d'une production — formule des anges et du gain
3. `docs/SPEC-backend.md` §6.5
4. `docs/DECISIONS.md` — D3 (`structuredClone`), D7 (formule anges = hypothèse AdVenture Capitalist)
5. `backend/src/world-engine.ts`, `backend/src/world-engine.spec.ts`, `backend/src/resolver.ts`,
   `backend/src/app.service.ts`

### Comportement attendu

Dans `world-engine.ts` :
- `angelsEarned(world): number` = `Math.max(0, Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels)`.
- `resetWorld(world, now = Date.now()): World` — retourne un **nouveau** monde :
  `structuredClone(origworld)` dans lequel `score = world.score`,
  `totalangels = world.totalangels + gagnés`, `activeangels = world.activeangels + gagnés`,
  `money = 0`, `lastupdate = now`. Tout le reste (produits, quantités, paliers, upgrades,
  managers, `angelbonus`) revient à l'état initial.

Resolver `resetWorld(user): World` : `readUserWorld` → `updateWorld` → `resetWorld` →
`saveWorld(user, nouveauMonde)` → retourner le nouveau monde.

Exemples :
- `score 4e15`, `totalangels 0`, `activeangels 0` → gagnés `150 × √4 − 0 = 300` → nouveau monde
  `totalangels 300`, `activeangels 300`, `score 4e15`, `money 0`, `products[0].quantite 1`.
- Second reset immédiat (`score` inchangé, `totalangels 300`) → `0` gagné, anges inchangés.
- `score 9e15`, `totalangels 300`, `activeangels 190` (110 dépensés en angelupgrades) →
  gagnés `450 − 300 = 150` → `totalangels 450`, `activeangels 340`.
- Après le premier exemple, une production d'Item 1 rapporte `1 × 1 × (1 + 300 × 2/100) = 7`
  au lieu de `1` (étape 7.2 : c'est `productionGain` de la phase 4 qui doit déjà le faire —
  le vérifier par un test, pas le réécrire).

### Cas limites

- `score 0` → `0` gagné ; le reset reste possible (il remet juste le monde à zéro).
- `score < 1e15/22500` (moins de 4.4e10) → `√` donne moins de 1/150 → `floor` = 0 gagné.
- Le monde retourné est un **nouvel objet** : ne pas muter l'ancien puis le retourner (les
  paliers `unlocked` resteraient vrais).

### Contraintes (et pourquoi)

- `updateWorld` **avant** le calcul des anges : les productions terminées depuis la dernière
  requête font partie du `score` et donc des anges gagnés.
- `structuredClone(origworld)` (D3) : un `{ ...origworld }` partagerait les tableaux de produits
  avec le monde initial, et le premier achat après reset corromprait `origworld`.
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` (D1).

### Hors périmètre

- Changer la formule des anges (D7 la considère comme hypothèse : si l'enseignant en impose une
  autre, elle se change dans `angelsEarned` seul).
- Confirmation côté client, sauvegarde de l'ancien monde.

### Étapes

1. Lire les fichiers ci-dessus.
2. `angelsEarned` + `resetWorld` dans `world-engine.ts` ; tests : les trois exemples ci-dessus,
   `score 0`, et le test 7.2 (`productionGain` avec 300 anges = 7).
3. Mutation dans `resolver.ts`.
4. Vérifier (section suivante).
5. Cocher 7.1 et 7.2 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` verts.
- [ ] Preview `backend`, joueur `frank` : `getWorld`, puis dans son fichier `score: 4e15`,
  `money: 5000`, `products[0].quantite: 30`. Puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"mutation { resetWorld(user: \"frank\") { score totalangels activeangels money products { id quantite } } }"}'
  ```
  → `score 4e15`, `totalangels 300`, `activeangels 300`, `money 0`, `products[0].quantite 1`,
  `products[1..5].quantite 0`.
- [ ] Même appel une seconde fois → mêmes anges (`300`), pas d'`errors`.
- [ ] Ensuite : `money: 100` dans le fichier, `lancerProductionProduit(user:"frank", id:1)`,
  attendre 1 s, `getWorld` → `money ≈ 107` (gain 7 grâce aux 300 anges).

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm test` et des curl, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Rôle du prestige expliqué |
| 2 | Instructions séquencées | 2 | — |
| 3 | Exemples concrets | 2 | Trois cas chiffrés dont anges dépensés ; gain 7 vérifié |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | Formule non renégociable ici |
| 6 | Critères mesurables | 2 | Réponse JSON attendue, double reset, gain 107 |
| 7 | Pourquoi des contraintes | 2 | updateWorld avant, clone profond |
| 8 | Raisonnement guidé | 1 | Pas de plan (2 fichiers) ; tests demandés avant le resolver |
| 9 | Format de sortie | 2 | — |
| 10 | Concision | 1 | Le seuil `4.4e10` est un détail, mais il évite un test « pourquoi 0 ange ? » |

Historique : v1 16/20 → v2 18/20 (v1 ne traitait pas les anges déjà dépensés — l'exemple
`190 → 340` lève l'ambiguïté `activeangels += gagnés` vs `activeangels = totalangels`).
