# Prompt — Frontend générique de test (phase 9)

- Date : 2026-09-19
- Étape roadmap : 9.1 + 9.2 (9.2 à reformuler en « front générique de test »)
- Sous-projet : frontend
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « fais le front end mais de manière générique pour
  tester le programme »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, terminé — phases 0 à 8 cochées) et
`frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular` 3, graphql-codegen).
Réponds en français ; code et commentaires selon les conventions de `CLAUDE.md` et
`frontend/CLAUDE.md`. Tu es le développeur Angular du TP ; le backend n'est pas ton périmètre.

### Objectif

Le sujet officiel du frontend n'existe pas encore. En attendant, on veut un **front générique de
test** : une seule page, sans design ni thème, qui exerce **toutes** les opérations du schéma
GraphQL (`getWorld` + les 6 mutations) dans un usage de jeu réaliste, pour vérifier le backend à
la main et servir de base quand le vrai sujet arrivera. Le frontend contient encore l'exercice
« patients » (`app.ts`, `app.html`, `queries.graphql`, `app.spec.ts`) : il est **remplacé**, pas
conservé. Cette feature correspond aux étapes 9.1 et 9.2 de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md`
2. `docs/GAME-RULES.md` §Achat de produits (formule du coût ×q à recalculer côté front) et
   §Production (formule du gain, sémantique de `timeleft` / `managerUnlocked`)
3. `docs/DECISIONS.md` — D6 (`lastupdate: Float!` : la copie du schéma doit porter cette
   modification, sinon codegen type `lastupdate` en `Int` et la sérialisation échoue), D12
   (`lancerProductionProduit` est idempotent : un double-clic n'est pas une erreur), D13 (les
   `ratio`/`typeratio` des managers sont décoratifs)
4. `backend/src/schema.graphql` (source à copier) et `backend/src/origworld.ts` (valeurs réelles
   du monde neuf, utilisées dans l'exemple chiffré et le scénario de vérification ci-dessous)
5. `frontend/codegen.ts`, `frontend/src/app/graphql/graphql.provider.ts`, `frontend/src/app/app.ts`
   (exemple d'usage de `apollo.signal.query` à remplacer), `frontend/src/app/app.config.ts`

### Comportement attendu

**Écran** (une seule route, `App`) :

- **Bandeau haut** : champ texte `user` (défaut `lucas`, persisté dans `localStorage` sous la clé
  `isiscapitalist.user` ; changer la valeur recharge le monde de cet utilisateur), puis `money`,
  `score`, `activeangels / totalangels`, `angelbonus %`, un sélecteur radio **x1 / x10 / x100**
  (multiplicateur d'achat global) et un bouton **Reset** (`resetWorld`, avec `confirm()` natif).
- **Bandeau d'erreur** : quand un appel GraphQL échoue, afficher le message serveur **tel quel**
  (ex. `Pas assez d'argent`) dans un `<div role="alert">` ; un clic dessus l'efface. Les boutons ne
  sont **jamais** désactivés pour raison d'argent : ce front sert justement à provoquer les
  erreurs serveur.
- **Produits** (`ProductCard` × 6) : icône (`http://localhost:3000/` + `logo`), `name`,
  `quantite`, `revenu`, gain d'une production (`quantite × revenu × (1 + activeangels × angelbonus / 100)`),
  barre de progression `<progress [value]="vitesse - timeleft" [max]="vitesse">`, badge
  « manager » si `managerUnlocked`, liste des `paliers` (nom, seuil, ratio, typeratio, débloqué ou
  non), bouton **Produire** (`lancerProductionProduit`) et bouton **Acheter xN — <coût total>**
  (`acheterQtProduit` avec la quantité du multiplicateur ; coût total = formule géométrique de
  `GAME-RULES.md`, recalculée côté front pour l'affichage seulement).
- **Sections paliers** (`PalierList` × 4, même composant) : *Managers* (bouton Engager →
  `engagerManager`), *Upgrades* (bouton Acheter → `acheterCashUpgrade`, coût en $), *Angel
  upgrades* (bouton Acheter → `acheterAngelUpgrade`, coût en anges), *All unlocks* (lecture seule).
  Chaque ligne : `name`, `seuil`, `idcible`, `ratio`, `typeratio`, `unlocked` ; bouton désactivé
  **uniquement** si `unlocked` est déjà `true` (le backend refuse un double achat).

**Données** : le serveur est la seule source de vérité. Après **chaque** mutation réussie ou
échouée, refaire `getWorld` (le backend applique `updateWorld` à chaque appel, c'est ainsi que
l'argent produit est crédité). En plus, `getWorld` est refait automatiquement toutes les **2 s**
(`pollInterval`). Un `setInterval` de **100 ms** côté client fait uniquement **décroître
`timeleft`** des produits en cours (borné à 0 ; si `managerUnlocked`, repartir de `vitesse` quand
on atteint 0) pour animer les barres entre deux réponses serveur — il ne touche **ni** `money`
**ni** `score` (sinon double comptage visible au refetch). Toute réponse `getWorld` remplace
l'état local en entier.

**Exemple chiffré** (monde neuf, `money 0`) : cliquer 4 fois **Produire** sur Item 1 en attendant
la fin de chaque barre (500 ms) → `money 4`, `score 4`. Puis **Acheter x1** sur Item 1 (coût
affiché `4.00`) → `money 0`, Item 1 `quantite 2`, `cout 4.28` (= 4 × 1.07). Avec x10 sur un
Item 1 à `cout 4`, le bouton doit afficher `55.27` (= 4 × (1.07¹⁰ − 1) / 0.07) et le backend
rendre `cout 7.87` après achat.

### Cas limites

- Achat sans argent (ex. Acheter Item 2 avec `money 0`) → bandeau `Pas assez d'argent`, monde
  inchangé après refetch.
- **Produire** sur un produit `quantite 0` → bandeau `Aucun exemplaire de Item 2 à produire`.
- **Produire** pendant une production en cours → aucune erreur, `timeleft` inchangé (D12).
- Engager un manager déjà engagé → bouton désactivé côté front ; si forcé, bandeau
  `Le manager Manager 1 est déjà engagé`.
- `user` vide → ne pas appeler le serveur (garder le dernier monde affiché, bandeau
  `Utilisateur requis`).
- Backend arrêté → bandeau avec le message réseau d'Apollo, l'appli ne plante pas ; le polling
  continue et l'écran se remplit dès que le backend revient.
- `lastupdate` > 2³¹ : doit s'afficher sans erreur GraphQL (preuve que la copie du schéma porte
  bien `Float!`, D6).

### Contraintes (et pourquoi)

**Schéma et codegen**

- **Ne rien modifier dans `backend/`** ni dans le schéma : le front s'adapte au contrat existant.
- `frontend/src/app/graphql/schema.graphql` = copie **exacte** de `backend/src/schema.graphql`
  (qui contient déjà `lastupdate: Float!`). Ne jamais éditer `types.ts` / `operations.ts` à la main :
  ils sont générés par `npm run codegen`.
- Les dépendances de codegen ne sont **installées nulle part** : elles sont déclarées par erreur
  dans `isiscapitalist/package.json` (racine), qui n'a pas de `node_modules/`. Règle du projet :
  **chaque sous-projet a ses propres `node_modules/`, jamais à la racine**. Donc : ajouter en
  `devDependencies` de `frontend/package.json` les entrées `@graphql-codegen/cli`,
  `@graphql-codegen/add`, `@graphql-codegen/typescript`, `@graphql-codegen/typescript-operations`
  et `@apollo-orbit/codegen` (mêmes versions que le `package.json` racine), lancer `npm install`
  **dans `frontend/`**, puis supprimer `isiscapitalist/package.json` et
  `isiscapitalist/package-lock.json` (ils ne servaient qu'à déclarer ces dépendances). Noter en
  **D16** : « pas de `package.json` racine, dépendances par sous-projet ».
- Une opération par bloc dans `queries.graphql` (`GetWorld`) et `mutations.graphql`
  (`AcheterQtProduit`, `LancerProductionProduit`, `EngagerManager`, `AcheterCashUpgrade`,
  `AcheterAngelUpgrade`, `ResetWorld`), en PascalCase — codegen expose `GET_WORLD_QUERY`,
  `ACHETER_QT_PRODUIT_MUTATION`, etc. Un fragment `PalierFields` évite de répéter les 7 champs de
  `Palier` cinq fois.

**Conception du client**

- `fetchPolicy: 'no-cache'` sur la query et les mutations, et **aucune** lecture du cache Apollo :
  `World` n'a pas d'`id`, mais `Product` en a un — `InMemoryCache` normaliserait `Product:1` de
  l'utilisateur `lucas` et de l'utilisateur `bob` dans la même entrée, et les réponses partielles
  des mutations (un seul `Product` / `Palier`) écraseraient le monde affiché. La source de vérité
  est le refetch complet de `getWorld`. Noter cette décision dans `docs/DECISIONS.md` (**D14**).
- Noter en **D15** la règle du timer local (Comportement attendu) avec sa raison : le double
  comptage.
- `GameService` (injectable, `providedIn: 'root'`) porte le `user` signal, la query, les 6
  mutations, le timer et `errorMessage` ; `ProductCard` et `PalierList` sont **purement
  présentationnels** (`input()` / `output()`, aucune injection d'Apollo) — c'est ce qui permet de
  les tester avec `TestBed` sans serveur.
- Formules et formatage dans `frontend/src/app/game-math.ts` (fonctions pures : `buyCost`,
  `productionGain`, `formatNumber`), mêmes noms que `backend/src/world-engine.ts` pour que les
  deux implémentations restent comparables. `formatNumber` : 2 décimales en dessous de 1 000, puis
  `k`, `M`, `G`, `T` (ex. `1234567` → `1.23 M`).
- Vérifier le format d'erreur d'Apollo Client 4 : `mutate()` rejette avec `CombinedGraphQLErrors`
  dont `.errors[0].message` est le message serveur ; s'assurer que le bandeau affiche exactement
  `Pas assez d'argent` et pas un texte enveloppé.
- CSS minimal dans `app.css` (flex, bordures, `<progress>` natif) : le style n'est pas le sujet.

### Hors périmètre

- Pas de thème, d'animations, de sons, de responsive, de routing, d'i18n, d'authentification.
- Pas de bouton « max » ni d'estimation locale de l'argent gagné.
- Pas de modification du backend, du schéma, de `origworld.ts` ni des icônes.
- Pas de nouvelle dépendance npm dans `frontend/` en dehors des cinq paquets de codegen ci-dessus.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche plus de 3 fichiers : écrire un plan en 5-8
   lignes (fichiers créés/supprimés, signaux de `GameService`, inputs/outputs des deux composants)
   et le montrer avant de coder.
2. Déplacer les devDependencies de codegen dans `frontend/package.json`, `npm install` dans
   `frontend/`, supprimer le `package.json` racine ; copier le schéma ; écrire `queries.graphql`
   et `mutations.graphql` ; `npm run codegen` dans `frontend/` ; vérifier que `operations.ts` exporte
   `GET_WORLD_QUERY` et les 6 `*_MUTATION` et que `types.ts` type `lastupdate` en `number`
   (`Scalars['Float']`). Cocher 9.1 dans `docs/ROADMAP.md`.
3. Écrire `game-math.ts` puis `game-math.spec.ts` (cas : `buyCost` Item 1 x1 = 4, x10 = 55.27 à
   0.01 près, `croissance 1` → `cout × q` ; `productionGain` avec 0 ange puis 5 anges à 2 % =
   ×1.10 ; `formatNumber` sur 0, 999.5, 1234, 1234567).
4. Écrire `game.service.ts` (signals `user`, `world`, `errorMessage`, `multiplier` ; méthodes
   `buy(id)`, `launch(id)`, `hireManager(name)`, `buyUpgrade(name)`, `buyAngelUpgrade(name)`,
   `reset()` ; chaque méthode : `try { await mutate } catch { errorMessage.set(...) } finally { refetch }`).
5. Écrire `ProductCard` (`product-card.ts/.html`), `PalierList` (`palier-list.ts/.html`), puis
   réécrire `app.ts` / `app.html` / `app.css`. Supprimer `queries.graphql` de l'exercice patients
   (remplacé) et réécrire `app.spec.ts` (voir Vérification).
6. Écrire `product-card.spec.ts` (rendu du nom/quantité, bouton Acheter affiche `55.27` avec
   multiplier 10 sur Item 1, clic → `buy` émis avec la quantité).
7. Mettre à jour `frontend/CLAUDE.md` (retirer la mention de l'exercice patients, décrire les
   fichiers créés) et `docs/ARCHITECTURE.md` §Frontend (5 lignes max).
8. Vérifier (section suivante). Cocher 9.2 dans `docs/ROADMAP.md` en la renommant « Front
   générique de test (en attendant `frontend.pdf`) » ; ajouter D14, D15 et D16 dans
   `docs/DECISIONS.md` ; dans `CLAUDE.md` (racine), remplacer la section « État actuel » par
   l'état réel (backend terminé, front générique en place, `node_modules/` par sous-projet).

### Vérification — critères de succès

- [ ] `npm run build` sans erreur dans `frontend/` (les warnings éventuels sont listés dans le rapport).
- [ ] `npm test` (vitest via `ng test`) vert : `game-math.spec.ts`, `product-card.spec.ts` et
  `app.spec.ts` réduit à « le composant se crée » avec un `GameService` stub (pas d'Apollo réel
  en test).
- [ ] Backend lancé avec la configuration `backend` de `.claude/launch.json`, frontend avec
  `frontend` (jamais via Bash). Sur http://localhost:4200, avec un utilisateur **neuf** (ex.
  `test-front-<timestamp>`) :
  - [ ] le bandeau affiche `money 0`, 6 produits, 6 managers, 10 upgrades, 3 angel upgrades,
    3 all unlocks, sans erreur console ;
  - [ ] **Produire** sur Item 1 → la barre se remplit en ~0,5 s, puis `money 1` au refetch suivant ;
  - [ ] après 4 productions, **Acheter x1** Item 1 → `quantite 2`, `cout 4.28`, `money 0` ;
  - [ ] **Acheter x1** Item 2 → bandeau `Pas assez d'argent`, clic → bandeau disparaît ;
  - [ ] **Produire** Item 2 → bandeau `Aucun exemplaire de Item 2 à produire` ;
  - [ ] changer `user` en `lucas` (monde existant) → les valeurs changent, `lastupdate` est un
    nombre > 2³¹ sans erreur ;
  - [ ] **Reset** → `money 0`, `quantite 1` sur Item 1, `totalangels` conservé.
  - [ ] Pour tester manager/upgrade sans attendre : éditer `backend/userworlds/<user>-world.json`
    (`"money": 1e9`), recharger, **Engager** Manager 1 → badge manager, barre d'Item 1 qui boucle
    seule, `money` qui monte à chaque poll ; **Acheter** Upgrade 1 → `revenu` d'Item 1 ×3 ; le
    bouton devient désactivé.
- [ ] Capture d'écran de la page après ce scénario, jointe au rapport.
- [ ] `backend/userworlds/test-front-*.json` reflète les actions (quantite, managerUnlocked).

### Rapport attendu

En fin de tâche : fichiers créés/supprimés/modifiés, commandes lancées avec leurs résultats réels
(build, tests, codegen), la
capture d'écran, et ce qui reste incertain (notamment la forme exacte des erreurs Apollo 4 si
elle diffère de ce qui est décrit). Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Multiplicateur d'achat | AdVenture Capitalist : x1 / x10 / x100 / Max, coût total affiché sur le bouton | x1 / x10 / x100, coût total géométrique recalculé côté front | reprendre (sans Max, hors périmètre) |
| Progression hors-ligne / source de vérité | Idle games serveur : le serveur recalcule au retour, le client n'affiche qu'une interpolation | Identique : `updateWorld` côté backend à chaque appel, client = poll 2 s + tick 100 ms sur `timeleft` seul | reprendre → D15 |
| Dérive des timers `setInterval` | Recommandation : ne pas accumuler, resynchroniser sur une horloge de référence | Chaque réponse serveur écrase l'état local : la dérive est bornée à 2 s | reprendre |
| Queries réactives Angular | apollo-orbit : `apollo.signal.query({ query, variables: () => …, pollInterval })`, signaux `data/loading/error`, `refetch()` | Identique (`variables` dérivées du signal `user`) | reprendre |
| Mutations | apollo-orbit : `apollo.signal.mutation` → `mutate()` retourne une Promise, `refetchQueries` possible | `mutate()` + `refetch()` explicite dans `finally` (refetch aussi après erreur, pour rester aligné sur le serveur) | diverge (raison : refetch même en cas d'erreur) |
| Cache normalisé Apollo | Défaut `cache-first`, normalisation par `__typename:id` | `no-cache` : `World` sans id, `Product` avec id partagé entre utilisateurs | diverge → D14 |
| Composants Angular | Guide de style : composants présentationnels (`input`/`output`), logique dans un service | Identique (`ProductCard`, `PalierList` sans injection) | reprendre |
| Erreurs GraphQL côté client | Souvent boutons désactivés + toast | Boutons actifs + bandeau brut : le but est de tester les erreurs serveur | diverge volontairement (choix utilisateur) |

Sources : [apollo-orbit signal.query](https://wassim-k.github.io/apollo-orbit/docs/angular/fetching/queries/signal.query/),
[apollo-orbit signal.mutation](https://wassim-k.github.io/apollo-orbit/docs/angular/fetching/mutations/signal.mutation/),
[Apollo Angular — polling/refetch](https://the-guild.dev/graphql/apollo-angular/docs/data/queries),
[Building an idle game — timers](https://dev.to/1e4_/building-an-idle-game-part-2-the-code-1di9),
[Syncing countdown timers across clients](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a).

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Pourquoi (pas de sujet frontend → front de test), ce qui existe (backend fini, exercice patients à remplacer), étapes 9.1/9.2 citées. |
| 2 | Instructions séquencées | 2 | 8 étapes cochables, ordre codegen → maths → service → composants → docs. |
| 3 | Exemples concrets | 2 | Exemple chiffré vérifié contre `origworld.ts` (4 × 1.07 = 4.28 ; x10 = 55.27 ; `cout` 7.87) ; messages d'erreur exacts repris de `resolver.ts`. |
| 4 | Structure lisible | 2 | v1 = 1 : 10 contraintes en bloc ; v2 scindée en « Schéma et codegen » / « Conception du client ». |
| 5 | Rôle et périmètre | 2 | Rôle dev Angular, backend explicitement hors périmètre, liste Hors périmètre concrète (pas de Max, pas d'estimation locale de l'argent). |
| 6 | Critères de succès mesurables | 2 | v1 = 1 (« sans warning bloquant ») ; v2 : scénario navigateur pas à pas avec valeurs attendues, tests nommés, fichier `userworlds/`. |
| 7 | Pourquoi des contraintes | 2 | `no-cache` (normalisation `Product:id` entre utilisateurs), timer sans `money` (double comptage), deps codegen à déplacer dans `frontend/` (règle « un `node_modules/` par sous-projet »), `Float!` (D6). |
| 8 | Raisonnement guidé | 2 | Plan avant code, vérification du format d'erreur Apollo 4, vérification de `types.ts` après codegen. |
| 9 | Format de sortie | 2 | Fichiers nommés, D14/D15, ROADMAP 9.1/9.2, `frontend/CLAUDE.md`, rapport avec capture. |
| 10 | Concision / contradictions | 1 | v1 = 0 : règle du timer et valeurs d'`origworld` énoncées deux fois. v2 : redites retirées ; reste la redondance assumée exemple chiffré ↔ scénario de vérification (l'un explique la formule, l'autre sert de checklist) et une longueur importante pour un prompt frontend. |

Historique : v1 17/20 → v2 19/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 10 : la contrainte « timer local n'anime que `timeleft` » n'est plus écrite qu'une fois
  (Comportement attendu), la contrainte ne fait que renvoyer à D15 ; les valeurs d'`origworld`
  ne sont plus listées dans « À lire » (elles vivent dans l'exemple chiffré) ;
- critère 4 : section Contraintes scindée en deux sous-groupes pour retrouver une règle en
  quelques secondes ;
- critère 6 : « sans erreur ni warning bloquant » remplacé par « sans erreur, warnings listés dans
  le rapport » (deux relecteurs ne peuvent plus diverger sur « bloquant »).
