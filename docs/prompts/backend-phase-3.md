# Prompt — Phase 3 : mutations de base (achat, production, manager)

- Date : 2026-09-19
- Étape roadmap : 3.1, 3.2, 3.3
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

Ce prompt est la **phase 3 sur 8** d'une série (`docs/prompts/backend-phase-*.md`). Prérequis :
étapes 0.x à 2.x cochées dans `docs/ROADMAP.md` (`getWorld` fonctionne et crée le fichier du
joueur). Sinon, arrête-toi et signale-le.

### Objectif

Le joueur doit pouvoir acheter des exemplaires d'un produit, lancer une production et engager un
manager. Ce sont les trois mutations « simples » : elles modifient le monde et le sauvegardent,
sans encore tenir compte du temps écoulé (phase 4) ni des unlocks (phase 5). Cette phase
correspond aux étapes 3.1, 3.2 et 3.3 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `backend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Achat de produits, §Lancer une production, §Managers — formules et erreurs
3. `docs/SPEC-backend.md` §6.1 à §6.3 — signatures imposées des mutations
4. `docs/DECISIONS.md` — D3, D7 (formules centralisées dans des fonctions nommées)
5. `backend/src/app.service.ts`, `backend/src/resolver.ts`, `backend/src/origworld.ts`,
   `backend/src/schema.graphql` (signatures exactes)

### Comportement attendu

Créer `backend/src/world-engine.ts` : **fonctions pures** (pas d'injection Nest, pas d'accès
fichier) que `AppService` et le resolver importent. Cette phase y met `buyCost` ; la phase 4 y
ajoutera `updateWorld`. Noter dans `docs/DECISIONS.md` : **D10 — logique métier en fonctions
pures dans `world-engine.ts`, `AppService` gère la persistance** (raison : testable sans
instancier Nest, `now` injectable). C'est l'extraction prévue par `docs/ARCHITECTURE.md`
(« si `app.service.ts` devient trop gros ») ; la règle 3 de `CLAUDE.md` (« logique commune dans
`AppService` ») reste respectée dans l'esprit : rien de métier dans le resolver.

**`buyCost(product, q): number`** — avec `c = product.cout`, `g = product.croissance` :
`c * (g^q - 1) / (g - 1)`, ou `c * q` si `g === 1`.

**`acheterQtProduit(user, id, quantite): Product`** (resolver) :
1. `readUserWorld` ; produit d'id `id` sinon `throw new Error(\`Le produit avec l'id ${id} n'existe pas\`)` ;
   `quantite <= 0` → `throw new Error('La quantité doit être positive')`.
2. `total = buyCost(product, quantite)` ; `world.money < total` → `throw new Error("Pas assez d'argent")`.
3. `world.money -= total` ; `product.quantite += quantite` ; `product.cout = product.cout * g^quantite`.
4. `saveWorld` ; retourner le produit.

Exemple : Item 1 (`cout 4`, `croissance 1.07`, `quantite 1`), joueur avec `money 2000`, achat de
10 → `total = 4 × (1.07^10 − 1) / 0.07 = 55.27` ; après : `money 1944.73`, `quantite 11`,
`cout = 4 × 1.07^10 = 7.87`.

**`lancerProductionProduit(user, id): Product`** : produit introuvable → même erreur ;
`product.quantite === 0` → `throw new Error(\`Aucun exemplaire de ${product.name} à produire\`)` ;
`product.timeleft > 0` → ne rien changer (production déjà en cours, appel idempotent) ;
sinon `product.timeleft = product.vitesse`. `saveWorld`, retourner le produit. Noter D12 dans
`DECISIONS.md` (quantité nulle → erreur ; déjà en cours → no-op, pour qu'un double-clic côté
client ne soit pas une erreur).

**`engagerManager(user, name): Palier`** : manager de nom `name` dans `world.managers` sinon
`throw new Error(\`Le manager ${name} n'existe pas\`)` ; déjà `unlocked` →
`throw new Error(\`Le manager ${name} est déjà engagé\`)` ; `world.money < manager.seuil` →
`"Pas assez d'argent"` ; sinon `money -= seuil`, `manager.unlocked = true`, produit d'id
`manager.idcible` → `managerUnlocked = true`. `saveWorld`, retourner le manager.
Aucun bonus n'est appliqué (D13 : `ratio`/`typeratio` des managers sont décoratifs).

### Cas limites

- `acheterQtProduit` avec `croissance === 1` : coût linéaire (division par zéro sinon).
- `money` exactement égal au coût → achat accepté (`<` strict pour refuser).
- Le monde de test démarre à `money: 0` : pour tester, appeler `getWorld(user:"bob")`, puis
  éditer `backend/userworlds/bob-world.json` (`"money":2000`).

### Contraintes (et pourquoi)

- Messages d'erreur **exactement** ceux ci-dessus (français) : le frontend les affichera tels
  quels et les tests e2e de la phase 8 les comparent.
- Toute mutation : `readUserWorld` → action → `saveWorld` ; **ne pas** appeler `updateWorld`
  (n'existe pas encore, phase 4 l'insère).
- Ne pas appliquer d'unlocks ici (phase 5) — même si `quantite` dépasse 25.
- Ne pas modifier `backend/src/graphql.ts` ni `schema.graphql` ; suffixe `.js` sur les imports (D1).
- `Float` GraphQL : garder `number`, pas de `BigInt`, pas d'arrondi.

### Hors périmètre

- Évolution temporelle, unlocks, upgrades, reset.
- Tests vitest (ils arrivent avec `updateWorld` en phase 4).

### Étapes

1. Lire les fichiers ci-dessus ; comme la phase touche 3 fichiers + 1 nouveau, montrer un plan
   de 5 lignes avant de coder.
2. `world-engine.ts` avec `buyCost`.
3. Les trois mutations dans `resolver.ts` (aide commune — trouver un produit par id — dans `AppService`).
4. Vérifier (section suivante) ; ajouter D10 et D12 à `DECISIONS.md`.
5. Cocher 3.1, 3.2, 3.3 dans `docs/ROADMAP.md`.

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint` sans erreur.
- [ ] Préparer `bob` (`getWorld`, puis `money: 2000` dans le fichier), puis :
  ```bash
  curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" \
    -d '{"query":"mutation { acheterQtProduit(user: \"bob\", id: 1, quantite: 10) { id quantite cout } }"}'
  ```
  Réponse : `{"data":{"acheterQtProduit":{"id":1,"quantite":11,"cout":7.868…}}}` ; le fichier
  `bob-world.json` a `money ≈ 1944.73`.
- [ ] `acheterQtProduit(user:"bob", id: 99, quantite: 1)` → `errors[0].message == "Le produit avec l'id 99 n'existe pas"`.
- [ ] `acheterQtProduit(user:"bob", id: 6, quantite: 1)` → `"Pas assez d'argent"`, `money` inchangé dans le fichier.
- [ ] `lancerProductionProduit(user:"bob", id: 1)` → `{ id: 1, timeleft: 500 }` ; second appel
  immédiat → même réponse, pas d'erreur ; `id: 2` → `"Aucun exemplaire de Item 2 à produire"`.
- [ ] `engagerManager(user:"bob", name:"Manager 1")` → `{ name: "Manager 1", unlocked: true }`,
  fichier : `money ≈ 944.73`, `products[0].managerUnlocked == true` ; second appel →
  `"Le manager Manager 1 est déjà engagé"` ; `name:"Manager 9"` → `"Le manager Manager 9 n'existe pas"`.

### Rapport attendu

En fin de tâche : fichiers modifiés, sortie réelle des commandes de vérification, ce qui reste
incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Ce que fait le joueur, ce qui est repoussé |
| 2 | Instructions séquencées | 2 | Algorithmes numérotés par mutation |
| 3 | Exemples concrets | 2 | Calcul chiffré vérifié (1.07^10 = 1.9672) |
| 4 | Structure lisible | 2 | — |
| 5 | Rôle et périmètre | 2 | Pas d'unlocks, pas d'updateWorld |
| 6 | Critères mesurables | 2 | Réponses et messages d'erreur exacts |
| 7 | Pourquoi des contraintes | 2 | Messages exacts, no-op double clic, fonctions pures |
| 8 | Raisonnement guidé | 2 | Plan demandé |
| 9 | Format de sortie | 2 | Fichiers, D10/D12, ROADMAP |
| 10 | Concision | 0 | Le plus dense : trois mutations + décisions ; découpage refusé pour garder une session |

Historique : v1 15/20 → v2 18/20 (v1 laissait « refuser ou ignorer » pour `timeleft > 0` et ne
disait pas comment obtenir de l'argent pour tester ; ajout de D12, du monde `bob` à 2000 et des
messages d'erreur exacts).
