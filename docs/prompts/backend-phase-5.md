# Prompt — Phase 5 : bonus, unlocks produit et allunlocks

- Date : 2026-09-19
- Étape roadmap : 5.1, 5.2, 5.3
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

Ce prompt est la **phase 5 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x à 4.x cochées dans `docs/ROADMAP.md` (`world-engine.ts` contient `buyCost`,
`productionGain`, `updateWorld` ; `world-engine.spec.ts` est vert). Sinon, arrête-toi et signale-le.

### Objectif

Quand un joueur atteint une quantité seuil d'un produit (palier) ou de tous les produits
(allunlock), un bonus permanent s'applique : revenu multiplié, production accélérée ou bonus
d'anges augmenté. C'est ce qui donne un sens aux achats en masse. Cette phase écrit
l'application d'un bonus (réutilisée par les upgrades en phase 6) et la détection des paliers
après chaque achat. Elle correspond aux étapes 5.1, 5.2 et 5.3 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Unlocks et §Application d'un bonus — table `typeratio` → effet
3. `docs/SPEC-backend.md` §8
4. `docs/DECISIONS.md` — D7 (formules nommées), D10
5. `backend/src/world-engine.ts`, `backend/src/world-engine.spec.ts`, `backend/src/resolver.ts`,
   `backend/src/origworld.ts` (valeurs des paliers : seuils 25/50/100)

### Comportement attendu

Dans `world-engine.ts` (fonctions pures) :

- `applyBonus(world, palier): void` — cibles : `idcible > 0` → le produit d'id `idcible` ;
  `idcible === 0` → tous les produits ; `idcible === -1` → le monde. Effets :
  `gain` → `product.revenu *= ratio` ; `vitesse` → `product.vitesse = Math.floor(product.vitesse / ratio)`
  puis `product.timeleft = Math.min(product.timeleft, product.vitesse)` ; `ange` →
  `world.angelbonus += ratio` (quelle que soit la cible). Un `typeratio` `gain`/`vitesse` avec
  `idcible -1` ne fait rien ; un `ange` s'applique toujours au monde.
- `checkProductUnlocks(world, product): Palier[]` — pour chaque palier de `product.paliers` avec
  `!unlocked && product.quantite >= seuil` : `unlocked = true`, `applyBonus`. Retourne les paliers
  débloqués (utile pour les logs/tests).
- `checkAllUnlocks(world): Palier[]` — idem sur `world.allunlocks`, condition : **tous** les
  produits ont `quantite >= seuil`.

Dans `resolver.ts`, `acheterQtProduit` appelle, après la mise à jour de la quantité et avant
`saveWorld` : `checkProductUnlocks(world, product)` puis `checkAllUnlocks(world)`.

Exemple : joueur neuf (Item 1 `quantite 1`, `vitesse 500`, `revenu 1`, `money 2000`), achat de
24 → `quantite 25`, coût `4 × (1.07^24 − 1)/0.07 = 232.71` → `money 1767.29` ; `Unlock 1.1`
(seuil 25, `vitesse`, ratio 2) passe `unlocked: true` et `vitesse` devient `250`. `Unlock 1.2`
(seuil 50) reste verrouillé. `All Unlock 1` (seuil 25) reste verrouillé tant que les Items 2–6
sont à 0.

### Cas limites

- Achat qui saute plusieurs seuils d'un coup (1 → 120) : les trois paliers se débloquent dans
  le même appel, chacun une seule fois (`vitesse` 500 → 250 → 125, `revenu` 1 → 2).
- Palier déjà `unlocked` : jamais réappliqué (sinon double bonus) — condition `!unlocked` d'abord.
- `vitesse` ne descend pas sous 1 ms (`Math.max(1, …)`), et `timeleft` en cours est plafonné à
  la nouvelle `vitesse` pour ne pas dépasser un cycle.
- Allunlock : un produit à `quantite 0` bloque tous les allunlocks — c'est voulu.

### Contraintes (et pourquoi)

- `applyBonus` est **la seule** fonction qui modifie `revenu`/`vitesse`/`angelbonus` depuis un
  palier : la phase 6 (upgrades) et les angelupgrades la réutiliseront — pas de logique dupliquée
  dans le resolver.
- Appeler les checks **après** `updateWorld` et l'achat, **avant** `saveWorld` : un bonus
  `vitesse` appliqué avant l'évolution temporelle créditerait des productions plus rapides que
  celles réellement écoulées.
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` (D1).

### Hors périmètre

- `acheterCashUpgrade` / `acheterAngelUpgrade` (phase 6) — même si `applyBonus` est prêt.
- Unlocks déclenchés par autre chose qu'un achat (ils ne le sont jamais dans ce jeu).

### Étapes

1. Lire les fichiers ci-dessus ; montrer un plan de 5 lignes avant de coder.
2. `applyBonus`, `checkProductUnlocks`, `checkAllUnlocks` dans `world-engine.ts`.
3. Brancher les deux checks dans `acheterQtProduit`.
4. Tests dans `world-engine.spec.ts` (`describe('unlocks')`) : seuil atteint exactement ; seuil
   non atteint ; plusieurs seuils en un achat ; pas de double application ; allunlock refusé tant
   qu'un produit est en dessous, accepté quand tous y sont ; `applyBonus` pour chaque `typeratio`
   et chaque cible (0, id, −1).
5. Vérifier (section suivante).
6. Cocher 5.1, 5.2, 5.3 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` verts, ≥ 8 nouveaux tests.
- [ ] Preview `backend`, joueur `dave` : `getWorld`, `money: 1000000000` dans son fichier, puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"mutation { acheterQtProduit(user: \"dave\", id: 1, quantite: 24) { quantite vitesse revenu paliers { name unlocked } } }"}'
  ```
  Réponse : `quantite 25`, `vitesse 250`, `revenu 1`, `paliers[0].unlocked true`, `[1]` et `[2]` `false`.
- [ ] Puis `acheterQtProduit(id: 2..6, quantite: 25)` (cinq appels) ; `getWorld(user:"dave") { allunlocks { name unlocked } products { id revenu } }`
  → `All Unlock 1` `unlocked true`, les six `revenu` ont doublé (Item 1 : `2`, Item 2 : `120`).
- [ ] Relancer `acheterQtProduit(id: 1, quantite: 1)` : `vitesse` reste `250`, `revenu` reste `2`
  (pas de double application).

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm test` et des curl, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi les paliers existent, réutilisation en phase 6 |
| 2 | Instructions séquencées | 2 | — |
| 3 | Exemples concrets | 2 | 1.07^24 = 5.0724 vérifié ; exemple multi-seuils |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | Upgrades explicitement exclus |
| 6 | Critères mesurables | 2 | Réponses attendues chiffrées, test de non-double-application |
| 7 | Pourquoi des contraintes | 2 | Ordre des checks, fonction unique de bonus |
| 8 | Raisonnement guidé | 2 | Plan + liste de tests avant vérification |
| 9 | Format de sortie | 1 | Pas de nouvelle décision à noter ; la liste de tests est prescriptive mais sans noms |
| 10 | Concision | 1 | Les cas limites `vitesse ≥ 1` / `timeleft` plafonné sont des hypothèses ajoutées, motivées |

Historique : v1 15/20 → v2 18/20 (v1 ne disait pas comment traiter `timeleft` quand `vitesse`
change, ni le cas `ange` avec `idcible ≠ −1` ; ajout de la vérification allunlock en 5 appels).
