# Prompt — Phase 4 : moteur temporel `updateWorld`

- Date : 2026-09-19
- Étape roadmap : 4.1, 4.2, 4.3
- Sous-projet : backend
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt (série `backend-00-index.md`)

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes stockés en JSON dans
`backend/userworlds/`) et `frontend/` (Angular 22, hors périmètre ici). Réponds en français ;
code et commentaires selon les conventions de `CLAUDE.md`.

Ce prompt est la **phase 4 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x à 3.x cochées dans `docs/ROADMAP.md` (`world-engine.ts` existe avec `buyCost`, les
trois mutations de base fonctionnent). Sinon, arrête-toi et signale-le.

### Objectif

Le serveur est autoritaire sur l'état du jeu : le client ne fait que déclencher des actions, et
c'est le serveur qui, à chaque requête, calcule ce qui s'est produit depuis `world.lastupdate`
(productions terminées, argent gagné). Sans cela, `lancerProductionProduit` ne rapporterait jamais
rien. Cette phase correspond aux étapes 4.1, 4.2 et 4.3 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Production et §Évolution temporelle — **l'algorithme à implémenter tel quel**
3. `docs/SPEC-backend.md` §7 et §9
4. `docs/DECISIONS.md` — D6 (ms partout, `lastupdate: Float`), D10 (fonctions pures, `now` injecté)
5. `backend/src/world-engine.ts`, `backend/src/app.service.ts`, `backend/src/resolver.ts`,
   `backend/vitest.config.ts` (les tests `**/*.spec.ts` sont ramassés automatiquement)

### Comportement attendu

Dans `world-engine.ts` :

- `productionGain(world, product): number` =
  `product.quantite * product.revenu * (1 + world.activeangels * world.angelbonus / 100)`.
- `updateWorld(world: World, now: number = Date.now()): World` — mute `world` et le retourne :
  `elapsed = world.lastupdate === 0 ? 0 : now - world.lastupdate` ; pour chaque produit, appliquer
  les règles « sans manager » / « avec manager » de `GAME-RULES.md` ; chaque production terminée
  ajoute `gain` à `money` **et** à `score` ; enfin `world.lastupdate = now`.

Exemples (Item 1 : `quantite 11`, `revenu 1`, `vitesse 500`, `activeangels 0` → `gain = 11`) :

| Cas | Avant | `elapsed` | Après |
|---|---|---|---|
| Sans manager, terminée | `timeleft 300` | 1000 | `money +11`, `timeleft 0` |
| Sans manager, partielle | `timeleft 800` | 300 | `money +0`, `timeleft 500` |
| Sans manager, inactif | `timeleft 0` | 5000 | rien |
| Manager, en cours | `timeleft 200` | 1700 | `n = 1 + ⌊(1700−200)/500⌋ = 4` → `money +44`, `timeleft = 500 − (1500 mod 500) = 500` |
| Manager, inactif au départ | `timeleft 0` | 1200 | `timeleft := 500` d'abord, puis `n = 1 + ⌊700/500⌋ = 2` → `+22`, `timeleft = 500 − 200 = 300` |
| Premier accès | `lastupdate 0`, `timeleft 300` | — | `elapsed 0` → rien, `lastupdate = now` |
| Anges | `activeangels 300`, `angelbonus 2` | — | `gain = 11 × (1 + 6) = 77` |

`AppService.updateWorld(world)` délègue à la fonction pure (sans `now` → `Date.now()`).

**4.2** Dans `resolver.ts`, **toutes** les opérations (`getWorld` inclus) deviennent
`readUserWorld` → `updateWorld` → action → `saveWorld`.

**4.3** `backend/src/world-engine.spec.ts` (vitest, `describe('updateWorld')`) : un `it` par
ligne du tableau ci-dessus, en construisant le monde avec `structuredClone(origworld)` puis en
forçant les champs, et en passant `now` explicitement (`lastupdate: 10_000, now: 11_000` →
`elapsed 1000`). Ajouter un test de `buyCost` (Item 1, q=10 → `55.27` à 0.01 près) et un test
d'invariant : après `updateWorld`, `timeleft >= 0` et `score` n'a pas diminué.
Si le snippet officiel https://gitlab.com/-/snippets/2522185 est accessible, l'ajouter dans
`backend/test/` ; sinon le signaler dans le rapport, sans bloquer.

### Cas limites

- `elapsed < 0` (horloge modifiée, fichier venant d'une autre machine) → traiter comme `0`.
- Produit avec manager mais `quantite 0` → `gain 0` : les cycles tournent, l'argent ne bouge pas.
- Grand `elapsed` (jours d'absence) : `n` doit rester un calcul en O(1) (formule, pas de boucle).
- `timeleft` et `vitesse` sont `Int!` dans le schéma : garder des entiers (`Math.floor` si besoin).

### Contraintes (et pourquoi)

- `updateWorld` est appelé **avant** toute action de chaque mutation : sinon un achat serait
  facturé au prix courant sans que l'argent produit entre-temps ait été crédité, et un
  `lancerProductionProduit` écraserait une production déjà terminée.
- `now` en paramètre avec valeur par défaut, pas de `Date.now()` enfoui dans la boucle : c'est
  ce qui rend les tests déterministes sans mock (D10).
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` (D1).
- `score` ne décroît jamais ; `money` peut baisser seulement via un achat (jamais dans `updateWorld`).

### Hors périmètre

- Unlocks/bonus (phase 5), upgrades (6), reset (7).
- Tests e2e (phase 8).

### Étapes

1. Lire les fichiers ci-dessus ; montrer un plan de 5 lignes avant de coder.
2. `productionGain` + `updateWorld` dans `world-engine.ts` ; délégation dans `AppService`.
3. Insérer `updateWorld` dans les 4 opérations existantes du resolver.
4. Écrire `world-engine.spec.ts`, faire passer `npm test`.
5. Vérifier (section suivante).
6. Cocher 4.1, 4.2, 4.3 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` : tous verts, ≥ 9 tests.
- [ ] Preview `backend`, joueur `carol` : `getWorld` puis `money: 2000` dans son fichier, puis
  `acheterQtProduit(id:1, quantite:10)`, `engagerManager(name:"Manager 1")`, attendre 3 s, puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"{ getWorld(user: \"carol\") { money score lastupdate products { id timeleft managerUnlocked } } }"}'
  ```
  Réponse : `money` a augmenté d'environ `6 × 11 = 66` par rapport à `944.73` (≈ 3000 ms / 500 ms
  cycles, ±1 cycle), `score ≈ 66`, `products[0].timeleft` entre 1 et 500, `lastupdate`
  ≈ `Date.now()` (13 chiffres, pas d'`errors` de sérialisation).
- [ ] Sans manager : `lancerProductionProduit(user:"carol", id:2)` refusé (`quantite 0`) ;
  acheter `id:2, quantite:1` puis lancer, attendre 4 s, `getWorld` → `products[1].timeleft == 0`
  et `money` a gagné au moins `60` (Item 1, sous manager, continue de produire en parallèle).

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm test` et des curl, snippet officiel
récupéré ou non, ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Serveur autoritaire, pourquoi la phase existe |
| 2 | Instructions séquencées | 2 | — |
| 3 | Exemples concrets | 2 | Tableau de 7 cas chiffrés, recalculés contre GAME-RULES |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | — |
| 6 | Critères mesurables | 2 | `npm test` ≥ 9, curl avec tolérance ±1 cycle |
| 7 | Pourquoi des contraintes | 2 | Ordre updateWorld/action, `now` injecté |
| 8 | Raisonnement guidé | 2 | Plan + tests avant vérification manuelle |
| 9 | Format de sortie | 2 | Fichier de test nommé, rapport sur le snippet |
| 10 | Concision | 1 | Tableau long mais chaque ligne est un test |

Historique : v1 16/20 → v2 19/20 (v1 n'avait qu'un exemple ; le cas « manager inactif au
départ » et `elapsed < 0` manquaient — ce sont exactement les cas où deux implémentations
divergent).
