# Prompt — Pause de l'automatisation d'un manager (bouton Produire / Arrêter / Reprendre)

- Date : 2026-09-19
- Étape roadmap : 9.6 (nouvelle ligne à insérer, voir Étapes) — suppose 9.5 terminée
  (`frontend-sidebar-tabs.md`)
- Sous-projet : **les deux** (nouvelle mutation GraphQL + carte produit)
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « quand j'ai un manager pour un produit je veux
  que le bouton produire permette de stopper l'automatisation, en absence de manager il garde sa
  fonction de base »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL **schema-first**, Apollo, mondes stockés en JSON
dans `backend/userworlds/`, tests vitest + e2e supertest) et `frontend/` (Angular 22.1
standalone + signals, `@apollo-orbit/angular` 3, Angular Material 22.1, tests vitest). Réponds en
français ; code et commentaires selon `CLAUDE.md`, `backend/CLAUDE.md` et `frontend/CLAUDE.md`.
Tu es le développeur full-stack du TP : cette feature touche le schéma, le resolver et la carte
produit — rien d'autre.

### Objectif

Quand un joueur a engagé le manager d'un produit, la production tourne en boucle **côté
serveur** (`updateWorld` crédite l'argent à chaque `getWorld`, tant que `product.managerUnlocked`
est `true`) et le bouton « Produire » de la carte ne sert plus à rien. On veut que ce bouton
devienne l'interrupteur de l'automatisation : **« Arrêter »** quand le manager tourne,
**« Reprendre »** quand il est en pause, et **« Produire »** (comportement actuel, une production
manuelle) tant qu'aucun manager n'est engagé. Comme la boucle est serveur, la pause doit l'être
aussi : c'est une **nouvelle mutation** `basculerManager`, donc un écart au schéma imposé par le
sujet, à documenter (D20). C'est l'étape **9.6** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine), `backend/CLAUDE.md`, `frontend/CLAUDE.md`.
2. `docs/GAME-RULES.md` §Évolution temporelle — les deux branches « sans manager » / « avec
   manager » d'`updateWorld` : la pause s'appuie **uniquement** sur ce comportement existant.
3. `docs/DECISIONS.md` — D6 (le schéma a déjà un écart documenté : `lastupdate: Float!`, D20 en
   sera le second), D12 (`lancerProductionProduit` no-op si production en cours), D13 (`engagerManager` ne fait
   que passer `unlocked` et `managerUnlocked` à `true` ; cette feature sépare les deux notions :
   `unlocked` = possédé, `managerUnlocked` = automatisation active), D14/D15 (le front refait `getWorld` après chaque mutation, le timer local
   suit `managerUnlocked`), D17 (le bouton Produire n'est jamais désactivé).
4. `backend/src/schema.graphql`, `backend/src/resolver.ts` (modèle : `lancerProductionProduit`
   et `engagerManager`), `backend/src/app.service.ts` (`findProduct`), `backend/src/world-engine.ts`
   (`updateWorld`, à ne pas modifier), `backend/test/world.e2e-spec.ts` (cas ordonnés, fichier
   `userworlds/` édité directement pour créditer de l'argent).
5. `frontend/src/app/` : `graphql/mutations.graphql`, `graphql/schema.graphql`, `game.service.ts`
   (`launch`, `run`, `tick`), `product-card.ts/.html/.spec.ts`, `app.html` (boucle
   `app-product-card`), `app.spec.ts` (stub de `GameService`).

### Comportement attendu

**Backend — `basculerManager(user: String!, id: Int!): Product`**, ajouté à `type Mutation` de
`backend/src/schema.graphql` (après `engagerManager`), même ossature que les autres mutations :
`readUserWorld → updateWorld → action → saveWorld → return product`.

- Le manager du produit est **possédé** si `world.managers` contient un palier avec
  `idcible === product.id` et `unlocked === true`. Sinon → `throw new Error(\`Aucun manager
  engagé pour ${product.name}\`)`.
- Sinon `product.managerUnlocked = !product.managerUnlocked`, rien d'autre : ni `timeleft`, ni
  `money`, ni le palier manager (`unlocked` reste `true` : le manager est acheté une fois pour
  toutes, on ne le rembourse pas).
- Retourne le `Product` (le front ne lit que `id`, `managerUnlocked`, `timeleft`).

Ce que ça produit avec `updateWorld` **inchangé** (Item 1 d'`origworld` : `revenu 1`,
`vitesse 500`, `quantite 1`, sans ange → gain 1 par production) :

| Instant | Action | État sauvegardé | Pourquoi |
|---|---|---|---|
| t0 | `engagerManager("Manager 1")` (money ≥ 1000) | `managerUnlocked true`, `timeleft 0` | achat, D13 |
| t0 + 2 s | `getWorld` | `+4 $` (`timeleft 0 → 500`, `n = 1 + floor(1500/500) = 4`), `timeleft 500` | branche « avec manager » |
| t0 + 2,2 s | `basculerManager(id: 1)` | `updateWorld` d'abord : `timeleft 300`, +0 $ ; puis `managerUnlocked false`, `timeleft 300` | on bascule, la production entamée reste |
| t0 + 4,2 s | `getWorld` | `+1 $` (300 ≤ 2000 → une production), `timeleft 0` | branche « sans manager » : elle finit, puis plus rien |
| t0 + 6,2 s | `getWorld` | `+0 $`, `timeleft 0` | rien ne redémarre |
| t0 + 6,3 s | `basculerManager(id: 1)` | `managerUnlocked true`, `timeleft 0` | reprise |
| t0 + 8,3 s | `getWorld` | `+4 $`, `timeleft 500` | la boucle repart comme au t0 + 2 s |

Sans la pause, entre t0 + 2,2 s et t0 + 6,2 s le joueur aurait gagné 8 $ ; avec, 1 $.

**Frontend — `ProductCard`**, un seul bouton à gauche des actions, trois états :

| Manager possédé (`managers[].unlocked`) | `product.managerUnlocked` | Libellé | Clic | Chip |
|---|---|---|---|---|
| non | `false` | **Produire** | `launch` (→ `lancerProductionProduit`, inchangé) | aucun |
| oui | `true` | **Arrêter** | `toggleManager` (→ `basculerManager`) | `manager` |
| oui | `false` | **Reprendre** | `toggleManager` (→ `basculerManager`) | `manager (en pause)` |

- Nouvel input `managerOwned: boolean` sur `ProductCard`, calculé dans `App` depuis
  `world.managers` (`some(m => m.idcible === product.id && m.unlocked)`) ; nouvel output
  `toggleManager: void`. Le bouton n'est **jamais désactivé** (comme Produire aujourd'hui, D17)
  et garde le style `matButton` (texte seul, pas d'icône).
- `GameService.toggleManager(id)` : même schéma `run(...)` que `launch` ; la mutation
  `BasculerManager` dans `mutations.graphql` sélectionne `id managerUnlocked timeleft`.
- Le timer local (`tick`, D15) n'est **pas modifié** : après la réponse `getWorld` qui suit la
  mutation, `managerUnlocked false` fait que la barre finit sa course et s'arrête à 0 ;
  `managerUnlocked true` la fait repartir de `vitesse`.

### Cas limites

- **Produit inconnu** → message existant de `findProduct` (`Le produit avec l'id 99 n'existe pas`).
- **Aucun manager engagé pour ce produit** → `Aucun manager engagé pour Item 1` ; le monde est
  quand même sauvegardé (`updateWorld` a tourné), comme pour les autres erreurs.
- **Pause avec `timeleft 0`** (produit déjà inactif au moment de la bascule) → rien à finir, le
  produit reste à 0 jusqu'à la reprise.
- **Reprise avec `timeleft > 0`** (une production « sans manager » était en cours) →
  `updateWorld` la reprend dans la boucle « avec manager » sans la redémarrer.
- **Reset** → `origworld` a `managerUnlocked false` et managers `unlocked false` : rien à faire,
  le bouton redevient « Produire ».
- **Double clic** → deux bascules = état initial ; pas d'idempotence à ajouter (contrairement à
  D12, la bascule est volontairement réversible).
- **Fichier `userworlds` incohérent** (`managerUnlocked true` sans manager `unlocked`, édité à la
  main) : la mutation refuse (« Aucun manager engagé »), le front affiche « Produire » sans chip.
  Pas de réparation automatique.
- **Monde non chargé** dans le front → pas de carte, rien à gérer.

### Contraintes (et pourquoi)

- **Ne pas modifier `updateWorld`** (`world-engine.ts`) : la pause est exactement la branche
  « sans manager » déjà testée (`world-engine.spec.ts`, échantillon officiel
  `production-samples.spec.ts`). Un flag `paused` supplémentaire doublerait les chemins à tester
  pour le même résultat.
- **Ne pas toucher au palier manager** (`unlocked` reste `true`, `seuil` n'est pas remboursé) :
  `PalierList` Managers grise déjà les managers achetés ; s'il repassait `unlocked false`, le
  joueur pourrait le racheter et le front le montrerait comme disponible.
- `backend/src/graphql.ts` est **généré** au démarrage du backend (`definitions.path` dans
  `app.module.ts`) : ne jamais l'éditer à la main ; lancer le backend une fois (configuration
  `backend` de `.claude/launch.json`, jamais via Bash) et vérifier que `IMutation` contient
  `basculerManager` avant d'écrire le resolver, sinon le type `Product` importé ne sera pas à jour.
- `frontend/src/app/graphql/schema.graphql` doit rester **identique** à `backend/src/schema.graphql`
  (copier, puis `npm run codegen` dans `frontend/`) ; ne jamais éditer `types.ts` / `operations.ts`.
- `docs/reference/schema.graphql` (le schéma **du sujet**) **ne change pas** : c'est la référence
  de l'écart documenté en D20, comme pour D6.
- `ProductCard` reste **présentationnel** (`input()` / `output()`, aucune injection) ; c'est
  `App` qui dérive `managerOwned` de `world.managers`, comme il dérive déjà `angelsEarned`.
- Messages d'erreur exacts (le front les affiche tels quels dans le bandeau, les e2e les comparent).

### Hors périmètre

- Pas de coût pour arrêter/reprendre, pas de remboursement du manager, pas de « licenciement ».
- Pas de champ `paused` sur `Product`, pas de modification de `engagerManager` ni de
  `lancerProductionProduit`.
- Pas de bouton « Tout arrêter / Tout reprendre » global, pas d'indicateur dans la `PalierList`
  Managers (le chip de la carte suffit).
- Pas d'icône, pas de couleur particulière sur le bouton, pas de `confirm()`.
- Pas de modification de `docs/reference/`, d'`origworld.ts`, de `world-engine.ts`.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche > 3 fichiers dans deux sous-projets : écrire un
   plan en 5-8 lignes (ordre schéma → génération → resolver → e2e → codegen front → service →
   carte → docs) et le montrer avant de coder.
2. **Schéma** : ajouter `basculerManager(user: String!, id: Int!): Product` à `type Mutation`
   de `backend/src/schema.graphql`, avec un commentaire `#` renvoyant à D20 (comme l'en-tête du
   fichier renvoie à D6). Copier le fichier dans `frontend/src/app/graphql/schema.graphql`.
3. Lancer le backend (config `backend`), vérifier `basculerManager` dans `src/graphql.ts`.
4. **Resolver** : `basculerManager` dans `backend/src/resolver.ts` avec un commentaire de tête
   dans le style des autres (ce qu'elle fait, pourquoi le palier n'est pas touché, pourquoi
   `updateWorld` suffit). La recherche du manager possédé peut rester dans le resolver (une
   ligne `some`) ou aller dans `AppService` si elle sert deux fois — pas de nouvelle fonction dans
   `world-engine.ts`.
5. **e2e** : dans `backend/test/world.e2e-spec.ts`, trois cas insérés **entre** « engagerManager
   refuse si l'argent manque » et « resetWorld repart du monde initial » — les cas sont ordonnés :
   avant, Manager 1 doit rester non acheté (sinon « déjà engagé » remplace « Pas assez
   d'argent ») ; après, le reset efface tout, donc l'ordre proposé n'impose rien au reste :
   - `basculerManager(id: 1)` sans manager engagé → `data.basculerManager` null,
     `errors[0].message === "Aucun manager engagé pour Item 1"`, `managerUnlocked` toujours
     `false` dans le fichier ;
   - créditer `money: 1000` dans le fichier (comme le cas `acheterQtProduit`), `engagerManager
     ("Manager 1")`, puis `basculerManager(id: 1)` → `managerUnlocked false` en réponse et dans le
     fichier, `managers[0].unlocked` toujours `true` ;
   - **la production entamée finit puis plus rien**, sans dépendre de l'horloge : écrire dans le
     fichier `products[0].timeleft = 300` et `lastupdate = Date.now() - 2000`, puis `getWorld` →
     `money` augmente d'exactement `products[0].quantite × products[0].revenu` (lus dans le
     fichier avant l'appel : `quantite` vaut 11 depuis le cas d'achat, `revenu` peut avoir été
     modifié par un unlock — ne pas coder 11 en dur), `timeleft 0` ; seconde `basculerManager` →
     `managerUnlocked true`.
6. **Front** : `mutations.graphql` (`BasculerManager`), `npm run codegen`,
   `GameService.toggleManager(id)`, `ProductCard` (input `managerOwned`, output `toggleManager`,
   libellé et chip selon le tableau), `app.html` (`[managerOwned]`, `(toggleManager)`), et si
   `App` a besoin d'un helper, un `computed` ou une méthode `managerOwned(product)` — pas de
   duplication dans `game-math.ts`.
7. **Tests front** : `product-card.spec.ts` — trois cas du tableau (libellé, chip, output émis :
   `launch` pour Produire, `toggleManager` pour Arrêter et Reprendre), et adapter le cas existant
   « chip « manager » affichée seulement si managerUnlocked » à la nouvelle règle. `app.spec.ts` :
   stub `GameService` complété par `toggleManager`. `game.service.spec.ts` : rien de nouveau
   si `toggleManager` n'est qu'un `run(...)` de plus (le dire dans le rapport).
8. **Docs** :
   - `docs/DECISIONS.md` : `## D20 — Mutation basculerManager : pause de l'automatisation d'un
     manager` (format D12-D19) : contexte (boucle serveur, schéma imposé sans mutation de pause),
     décision (nouvelle mutation, bascule de `managerUnlocked`, palier intact, `updateWorld`
     inchangé, `docs/reference/schema.graphql` intact), conséquences (`unlocked` = possédé vs
     `managerUnlocked` = actif — précise D13 ; deuxième écart au schéma après D6 ; le front
     dérive « possédé » de `world.managers`).
   - `docs/GAME-RULES.md` §Managers : une phrase sur la bascule et sur la distinction
     possédé / actif.
   - `docs/ROADMAP.md` : insérer `- [x] 9.6 Pause de l'automatisation d'un manager : mutation
     basculerManager (D20), bouton Produire / Arrêter / Reprendre sur la carte` après 9.5 et
     renuméroter « à compléter » en 9.7 ; ajouter `basculerManager` aux exemples de requêtes.
   - `frontend/CLAUDE.md` : lignes `game.service.ts` (7 mutations, `toggleManager`),
     `product-card.*` (input `managerOwned`, output `toggleManager`, trois libellés),
     `mutations.graphql` (7 mutations) ; convention « `Produire` … jamais désactivé » → « le
     bouton Produire / Arrêter / Reprendre ».
   - `backend/CLAUDE.md` et `backend/README.md` : la 7ᵉ mutation dans la liste et un exemple.
   - `CLAUDE.md` (racine), « État actuel » : une phrase sur 9.6.
9. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `cd backend && npm run build && npm run lint && npm test && npm run test:e2e` : tout vert,
  e2e = 9 tests (6 actuels + 3).
- [ ] `cd frontend && npm run build && npm test` : vert (warnings de budget listés dans le rapport).
- [ ] Backend lancé (config `backend`) — playground, utilisateur neuf `test-pause-<timestamp>` :
  - [ ] `mutation { basculerManager(user: "U", id: 1) { id managerUnlocked } }` →
    `data.basculerManager` null, `errors[0].message` = `Aucun manager engagé pour Item 1` ; le
    fichier `backend/userworlds/U-world.json` a été créé par cet appel.
  - [ ] Éditer ce fichier (`"money": 1000`), puis
    `mutation { engagerManager(user: "U", name: "Manager 1") { unlocked } }` → `true` ;
    attendre 2 s, `query { getWorld(user: "U") { money products { id timeleft managerUnlocked } } }`
    → `money ≥ 3`, produit 1 `managerUnlocked true`, `timeleft` dans `]0, 500]`.
  - [ ] `basculerManager(id: 1)` → `managerUnlocked false`. Attendre 1 s, `getWorld` → noter
    `money` (M1), `timeleft 0`. Attendre 3 s, `getWorld` → `money === M1`, `timeleft 0` (sans la
    pause, M1 aurait augmenté d'au moins 5). Fichier : `managers[0].unlocked` toujours `true`.
  - [ ] `basculerManager(id: 1)` → `managerUnlocked true` ; attendre 2 s, `getWorld` → `money`
    ≥ M1 + 3 et `timeleft > 0`.
- [ ] Frontend lancé (config `frontend`), http://localhost:4200, même utilisateur :
  - [ ] Carte Item 1 : bouton **Arrêter**, chip `manager`, barre qui boucle. Clic → bouton
    **Reprendre**, chip `manager (en pause)`, la barre finit sa course puis reste à 0 ; `money`
    du bandeau cesse d'augmenter (Item 1 est le seul produit actif). Clic → **Arrêter**, chip
    `manager`, la barre repart.
  - [ ] Carte Item 2 (sans manager) : bouton **Produire**, pas de chip ; clic → une barre, puis
    retour à 0 (comportement inchangé).
  - [ ] Onglet Managers : Manager 1 toujours grisé (acheté) pendant la pause.
  - [ ] Aucune erreur dans la console navigateur.
- [ ] `docs/reference/schema.graphql` non modifié (`git diff --stat docs/reference/` vide).
- [ ] Une capture d'écran de la carte Item 1 en pause (bouton Reprendre, chip « manager (en
  pause) ») jointe au rapport.

### Rapport attendu

En fin de tâche : fichiers créés/modifiés (backend, frontend, docs), commandes lancées avec leurs
résultats réels (build, lint, tests, e2e), les valeurs observées dans le playground (money avant /
après pause), la capture, et ce qui reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Deux recherches web (Steam/AdVenture Capitalist, GitHub idle-game) n'ont rien donné de précis sur
une « pause de manager » ; le tableau s'appuie sur la connaissance du modèle des jeux cités (dit
explicitement). `docs/GAME-RULES.md` et le sujet priment.

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Pause d'un manager | AdVenture Capitalist : un manager est **définitif**, aucun moyen de l'arrêter ; la seule « pause » est celle du jeu entier | Bascule réversible par produit, sans coût | diverge (demande utilisateur) → D20 |
| Toggle par bâtiment | Jeux d'usine/idle (Industry Idle, automations d'Evolve) : un booléen `enabled` par entité, la production le lit à chaque tick | `managerUnlocked` joue ce rôle, `updateWorld` le lit déjà | reprendre (aucun nouveau champ) |
| Production entamée à la pause | Cookie Clicker / Idle Miner : ce qui est en cours se termine, rien n'est perdu | Branche « sans manager » d'`updateWorld` : la production finit, puis 0 | reprendre |
| Possédé ≠ actif | Jeux avec « désactiver » : l'achat reste acquis, seul l'état actif bascule | `managers[].unlocked` (possédé) vs `product.managerUnlocked` (actif) | reprendre, précise D13 |
| Ajout d'une mutation schema-first NestJS | Doc NestJS : ajouter au `.graphql`, laisser `definitions` régénérer les types, `@Mutation()` dans le resolver, `throw new Error` pour une erreur GraphQL | Identique (`graphql.ts` généré au démarrage) | reprendre |
| Nommage | Schéma du sujet : verbes français (`acheterQtProduit`, `engagerManager`) | `basculerManager(user, id): Product` | reprendre (choix utilisateur) |
| Bouton à états Angular Material | `matButton` texte, libellé calculé par `computed`, pas d'icône seule (accessibilité hors ligne, D18) | Idem, trois libellés | reprendre |

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi la boucle est serveur, pourquoi une mutation, 9.6 nommée, dépendance à 9.5. |
| 2 | Instructions séquencées | 2 | 9 étapes dans l'ordre imposé par la génération de `graphql.ts` et du codegen. |
| 3 | Exemples concrets | 2 | Chronologie chiffrée sur Item 1 (4 $ / 1 $ / 0 $ / 4 $, `timeleft 500 → 300 → 0`) vérifiée contre `updateWorld` ; tableau des trois états du bouton. |
| 4 | Structure lisible | 2 | Backend puis frontend, tableaux pour les états et la chronologie, contraintes une par ligne. |
| 5 | Rôle et périmètre | 2 | Full-stack limité à schéma / resolver / carte ; hors périmètre concret (pas de `paused`, pas de remboursement, pas de bouton global, `docs/reference` intact). |
| 6 | Critères de succès mesurables | 2 | v1 = 1 : « money a augmenté d'exactement 1 » n'était pas mesurable (la mutation ne retourne pas `money`, course avec le poll) ; v2 : playground `money === M1` après 3 s puis `≥ M1 + 3`, e2e déterministe via `lastupdate = now − 2000` (+ `quantite × revenu` exactement), 9 tests e2e, `git diff --stat docs/reference/` vide. |
| 7 | Pourquoi des contraintes | 2 | `updateWorld` intact (branche déjà testée), palier intact (rachat possible sinon), `graphql.ts` généré avant le resolver, `docs/reference` = référence de l'écart. |
| 8 | Raisonnement guidé | 2 | Plan avant code ; vérifier `graphql.ts` avant le resolver ; v1 plaçait les e2e avant « engagerManager refuse » (qui aurait alors levé « déjà engagé ») — v2 : entre ce cas et le reset, avec la raison. |
| 9 | Format de sortie | 2 | Signature, message d'erreur, input/output, contenu de D20, ligne ROADMAP, fichiers de doc listés, capture demandée. |
| 10 | Concision / contradictions | 0 | La règle « le palier manager reste `unlocked` » apparaît dans Comportement, Contraintes, étape 5 et D20 ; la chronologie chiffrée et la vérification playground se recouvrent ; l'étape 8 (docs) est longue parce que sept fichiers de doc sont concernés. Non retravaillé : chaque occurrence est à un endroit où le modèle en a besoin (règle, raison, test, ADR), et le fusionner obligerait à renvoyer d'une section à l'autre. |

Historique : v1 16/20 → v2 18/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 6 : critères playground réellement observables (`M1` noté après 1 s, égalité après
  3 s) et cas e2e déterministe en écrivant `lastupdate` / `timeleft` dans le fichier au lieu
  d'attendre l'horloge ;
- critère 8 : correction de l'emplacement des cas e2e (l'ordre v1 cassait le cas « engagerManager
  refuse si l'argent manque »), avec l'explication de la contrainte d'ordre.
