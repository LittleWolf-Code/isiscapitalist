# Prompt — Phase 6 : upgrades payés en argent et en anges

- Date : 2026-09-19
- Étape roadmap : 6.1, 6.2
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

Ce prompt est la **phase 6 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x à 5.x cochées dans `docs/ROADMAP.md` (`applyBonus` existe dans `world-engine.ts`).
Sinon, arrête-toi et signale-le.

### Objectif

Les upgrades sont des bonus que le joueur **achète** au lieu de les débloquer par quantité :
`world.upgrades` se paie en argent, `world.angelupgrades` en anges actifs (gagnés au reset,
phase 7). Cette phase ajoute les deux mutations correspondantes en réutilisant `applyBonus`.
Elle correspond aux étapes 6.1 et 6.2 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Upgrades — coût, ressource déduite, erreurs
3. `docs/SPEC-backend.md` §6.4
4. `docs/DECISIONS.md` — D10
5. `backend/src/world-engine.ts` (`applyBonus`), `backend/src/resolver.ts` (structure des
   mutations existantes), `backend/src/origworld.ts` (noms et seuils des upgrades)

### Comportement attendu

Facteur commun dans `world-engine.ts` :
`buyUpgrade(world, list: Palier[], name, resource: 'money' | 'activeangels'): Palier` — trouve
le palier par `name` sinon `throw new Error(\`L'upgrade ${name} n'existe pas\`)` ; déjà
`unlocked` → `throw new Error(\`L'upgrade ${name} est déjà achetée\`)` ; `world[resource] < seuil`
→ `"Pas assez d'argent"` si `money`, `"Pas assez d'anges"` si `activeangels` ; sinon déduire
`seuil`, `unlocked = true`, `applyBonus(world, palier)`, retourner le palier.

Resolver, schéma commun `readUserWorld` → `updateWorld` → action → `saveWorld` :
- `acheterCashUpgrade(user, name): Palier` → `buyUpgrade(world, world.upgrades, name, 'money')`.
- `acheterAngelUpgrade(user, name): Palier` → `buyUpgrade(world, world.angelupgrades, name, 'activeangels')`.
  `totalangels` ne change pas (il sert au calcul des anges gagnés au prochain reset).

Exemples (joueur neuf, `money 2000`, `activeangels 300`, `angelbonus 2`) :
- `acheterCashUpgrade("Upgrade 1")` (seuil 1000, `idcible 1`, `gain` ×3) → `money 1000`,
  Item 1 `revenu 1 → 3`, palier `unlocked true`.
- `acheterAngelUpgrade("Angel Upgrade 1")` (seuil 10, `idcible −1`, `ange` +1) →
  `activeangels 290`, `totalangels 300` inchangé, `angelbonus 3`. Le gain d'une production
  d'Item 1 passe de `3 × (1 + 300×2/100) = 21` à `3 × (1 + 290×3/100) = 29.1`.
- `acheterAngelUpgrade("Angel Upgrade 2")` (seuil 100, `idcible 0`, `gain` ×2) → tous les
  `revenu` doublés, `activeangels 190`.

### Cas limites

- Nom d'un manager ou d'un palier produit passé à `acheterCashUpgrade` → « n'existe pas »
  (chaque mutation ne cherche que dans sa liste).
- Ressource exactement égale au seuil → accepté.
- `activeangels 0` (joueur qui n'a jamais reset) → `"Pas assez d'anges"` pour tout angelupgrade.

### Contraintes (et pourquoi)

- Réutiliser `applyBonus` sans le modifier : c'est la même sémantique que les paliers, et la
  phase 5 l'a testée. Si un cas manque, l'ajouter dans `applyBonus` **et** dans ses tests.
- `updateWorld` avant l'achat, sinon l'argent produit depuis la dernière requête n'est pas
  disponible pour payer.
- Messages d'erreur exacts (le frontend et les tests e2e les comparent).
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` (D1).

### Hors périmètre

- Gagner des anges (`resetWorld`, phase 7) — pour tester, éditer `activeangels`/`totalangels`
  dans le fichier du joueur.

### Étapes

1. Lire les fichiers ci-dessus.
2. `buyUpgrade` dans `world-engine.ts` + 4 tests dans `world-engine.spec.ts` (succès argent,
   succès anges avec `totalangels` inchangé, déjà achetée, ressource insuffisante).
3. Les deux mutations dans `resolver.ts`.
4. Vérifier (section suivante).
5. Cocher 6.1 et 6.2 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test` verts.
- [ ] Preview `backend`, joueur `erin` : `getWorld`, puis dans son fichier `money: 2000`,
  `activeangels: 300`, `totalangels: 300`. Puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"mutation { acheterCashUpgrade(user: \"erin\", name: \"Upgrade 1\") { name unlocked } }"}'
  ```
  → `{"data":{"acheterCashUpgrade":{"name":"Upgrade 1","unlocked":true}}}` ; fichier :
  `money 1000`, `products[0].revenu 3`.
- [ ] Même appel une seconde fois → `errors[0].message == "L'upgrade Upgrade 1 est déjà achetée"`.
- [ ] `acheterCashUpgrade(name:"Upgrade 6")` (seuil 3.1e8) → `"Pas assez d'argent"`.
- [ ] `acheterAngelUpgrade(name:"Angel Upgrade 1")` → `unlocked true` ; fichier : `activeangels 290`,
  `totalangels 300`, `angelbonus 3`.
- [ ] `acheterAngelUpgrade(name:"Upgrade 1")` → `"L'upgrade Upgrade 1 n'existe pas"`.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle de `npm test` et des curl, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Différence unlock/upgrade, lien avec phase 7 |
| 2 | Instructions séquencées | 2 | — |
| 3 | Exemples concrets | 2 | Trois exemples chiffrés, gain recalculé (21 → 29.1) |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | Reset exclu, contournement de test indiqué |
| 6 | Critères mesurables | 2 | Réponses et erreurs exactes |
| 7 | Pourquoi des contraintes | 2 | applyBonus réutilisé, updateWorld avant |
| 8 | Raisonnement guidé | 1 | 2 fichiers, pas de plan demandé ; tests avant resolver |
| 9 | Format de sortie | 2 | — |
| 10 | Concision | 1 | Le facteur commun `buyUpgrade` est une recommandation d'implémentation, pas une exigence du sujet ; gardé pour éviter la duplication |

Historique : v1 16/20 → v2 18/20 (ajout des messages exacts et de l'exemple `totalangels`
inchangé, qui était l'hypothèse la plus ambiguë de GAME-RULES).
