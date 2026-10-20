# Décisions techniques (ADR allégé)

Format : **Dn — Titre** · Contexte · Décision · Conséquences. Ajouter une entrée à chaque choix
non trivial ou chaque écart par rapport au sujet. Les entrées marquées *(à confirmer)* sont des
hypothèses en attente de validation (enseignant, sujet frontend, tests fournis).

---

## D1 — Le backend est en ESM, les imports relatifs portent le suffixe `.js`

- **Contexte** : le starter NestJS cloné a `"type": "module"` et `module: nodenext`. Les extraits du
  PDF (`import { AppService } from './app.service'`) datent d'un starter CommonJS.
- **Décision** : suivre le starter actuel — `import … from './app.service.js'` — et ne pas
  repasser en CommonJS.
- **Conséquences** : adapter tous les extraits du sujet ; `__dirname` indisponible (voir D2).

## D2 — Chemins de fichiers via `process.cwd()`

- **Contexte** : `main.ts` du sujet utilise `join(__dirname, '..', 'public')`, impossible en ESM.
- **Décision** : `app.useStaticAssets(join(process.cwd(), 'public'))` ; `userworlds/` de même
  (déjà le cas dans le sujet). Le backend doit toujours être lancé depuis `backend/`.
- **Conséquences** : `.claude/launch.json` utilise `cwd: backend`.

## D3 — `origworld` n'est jamais muté

- **Contexte** : `readUserWorld` du sujet retourne directement `origworld` ; toute mutation ensuite
  corromprait le monde initial pour les autres utilisateurs et le reset.
- **Décision** : retourner `structuredClone(origworld)` (Node ≥ 17).
- **Conséquences** : `resetWorld` repart aussi d'un clone.

## D4 — L'exercice « patients » est supprimé, pas conservé à côté

- **Contexte** : le repo contient un TP précédent (patients/symptômes) dans le back et le front.
- **Décision** : le retirer entièrement (phase 0), le schéma GraphQL ne contenant que le domaine
  ISIS Capitalist.
- **Conséquences** : historique git conserve l'ancien code si besoin.

## D5 — `ObserveModule` et `AppController` (starter) conservés

- **Contexte** : le starter injecte `@nestjs/observe` avec des clés vides et expose un
  `AppController` (`GET /` → `Hello World!`) avec son test unitaire et son test e2e.
- **Décision** (phase 0.2, tranchée le 19/09/2026) : **conserver** `ObserveModule`, `AppController`,
  `app.controller.spec.ts`, `test/app.e2e-spec.ts` et la dépendance `@nestjs/observe`.
  Raison : choix de l'utilisateur ; aucun impact sur le sujet (le module tourne avec des clés vides,
  le contrôleur ne touche pas au domaine GraphQL).
- **Conséquences** : `app.module.ts` et `main.ts` gardent l'instrumentation du starter ;
  `AppService.getHello()` reste (utilisé par `AppController`). En test e2e, `app.close()` termine le
  worker du module (`worker.terminate()` → exit 1) et la lib logue
  `ERROR [ObserveAgentWorker] Worker stopped with exit code 1` avant de le relancer : bug de la lib
  (le listener `exit` n'est pas retiré avant `terminate`), sans effet sur les tests ni le process.

## D6 — `lastupdate: Float!` (timestamps en millisecondes)

- **Contexte** : le schéma fourni déclare `lastupdate: Int!` ; GraphQL `Int` est un entier 32 bits
  signé, or `Date.now()` (~1.79e12) le dépasse → Apollo refuserait de sérialiser le champ.
- **Options** :
  1. Garder le schéma intact et stocker `lastupdate` en **secondes** (`Math.floor(Date.now()/1000)`),
     `vitesse`/`timeleft` restant en ms → conversions à chaque calcul, perte de précision < 1 s.
  2. Modifier le schéma : `lastupdate: Float!` (écart au sujet mais fidèle au ms partout).
- **Décision** (tranchée en phase 1, 19/09/2026) : **option 2**. `backend/src/schema.graphql` est la
  copie de `docs/reference/schema.graphql` avec cette unique différence. `lastupdate` reste en
  millisecondes (`Date.now()`), cohérent avec `vitesse`/`timeleft`.
- **Conséquences** : la copie `frontend/src/app/graphql/schema.graphql` devra recevoir la même
  modification en phase 9.1, sinon le codegen typera `lastupdate` en `Int` et les requêtes
  échoueront à la sérialisation.

## D7 — Formules « hypothèse » (coût géométrique, bonus, anges) *(à confirmer)*

- **Contexte** : le sujet ne précise ni la formule du coût d'achat multiple, ni l'effet exact de
  chaque `typeratio`, ni la formule des anges au reset.
- **Décision** : appliquer les conventions décrites dans `GAME-RULES.md` (coût géométrique,
  `gain` → `revenu *= ratio`, `vitesse` → `vitesse /= ratio`, `ange` → `angelbonus += ratio`,
  anges = `150 * sqrt(score / 1e15) - totalangels`). Centraliser ces formules dans des fonctions
  nommées pour pouvoir les changer en un point.
- **Amendement** : la formule des anges est remplacée par D20 (2 % du score) ; le reste de D7
  reste en vigueur.

## D8 — `saveWorld` synchrone (`fs.writeFileSync`)

- **Contexte** : le `saveWorld` du sujet utilise `fs.writeFile` avec callback, sans attendre.
  Deux requêtes rapprochées (typiquement un test e2e « `getWorld` puis `acheterQtProduit` ») peuvent
  alors lire un fichier pas encore écrit : la seconde repart de l'ancien état. De plus, un `throw`
  dans le callback ne remonte jamais au resolver GraphQL.
- **Décision** (tranchée en phase 2, 19/09/2026) : `fs.writeFileSync` dans un `try/catch` ; en cas
  d'erreur, `console.error(err)` puis `throw new Error("Erreur d'écriture du monde coté serveur")`
  (même message que le sujet, mais cette fois remonté au client dans `errors`).
- **Conséquences** : la réponse d'une query/mutation n'est envoyée qu'une fois le fichier écrit ; un
  appel suivant lit toujours l'état à jour. Le coût (écriture bloquante de quelques ko) est
  négligeable pour un TP.

## D9 — Fichiers `userworlds/*.json` ignorés par git

- **Décision** : ajouter `/userworlds/*.json` au `.gitignore` du backend (conserver un `.gitkeep`).
  Les mondes sont des données d'exécution, pas du code.

## D10 — Logique métier en fonctions pures dans `world-engine.ts`, `AppService` gère la persistance

- **Contexte** : `ARCHITECTURE.md` prévoyait d'extraire `world-engine.ts` « si `app.service.ts`
  devient trop gros ». Les formules (D7) et bientôt `updateWorld` doivent être testables avec vitest
  sans instancier Nest ni toucher au disque, et `updateWorld` doit pouvoir recevoir `now` en
  paramètre pour des tests déterministes.
- **Décision** (phase 3, 19/09/2026) : `src/world-engine.ts` contient des **fonctions pures** (pas
  d'injection Nest, pas d'accès fichier) importées par `AppService` et le resolver : `buyCost` (phase
  3), puis `updateWorld` (phase 4), `applyBonus` / `checkUnlocks` (phase 5). `AppService` conserve la
  persistance (`readUserWorld`, `saveWorld`) et les aides communes aux mutations (`findProduct`,
  `findManager`, avec leurs messages d'erreur).
- **Conséquences** : la règle 3 de `CLAUDE.md` (« logique commune dans `AppService` ») reste
  respectée dans l'esprit — rien de métier dans le resolver, qui n'orchestre que
  `read → action → save`. Les tests unitaires (phases 4.3, 5.3) importent `world-engine.ts` directement.

## D11 — Icônes générées par script, sans dépendance

- **Contexte** : le sujet demande des images dans `backend/public/icones/` sans en fournir ; le thème
  n'est pas encore choisi (phase 1 = noms génériques `Item N`, `Manager N`…).
- **Décision** (19/09/2026) : `backend/scripts/make-icons.mjs` (`npm run icons`, Node ≥ 22) génère
  15 PNG 64×64 unis (`world`, `all`, `angel`, `item1…6`, `manager1…6`), une couleur par icône,
  en encodant le PNG à la main avec `node:zlib` (`deflateSync`, `crc32`). Aucune dépendance ajoutée.
- **Conséquences** : les PNG sont versionnés (petits) et remplaçables par de vraies images quand le
  thème sera choisi, en conservant les mêmes noms de fichiers référencés par `origworld.ts`.

## D12 — `lancerProductionProduit` : quantité nulle → erreur, production en cours → no-op

- **Contexte** : `GAME-RULES.md` laissait « refuser (ou ignorer) » si `timeleft > 0` ou
  `quantite == 0`. Le frontend enverra la mutation au clic sur le produit ; un double-clic ne doit
  pas afficher d'erreur.
- **Décision** (phase 3, 19/09/2026) :
  - `product.quantite === 0` → `throw new Error(\`Aucun exemplaire de ${product.name} à produire\`)` ;
  - `product.timeleft > 0` → **no-op idempotent** : le produit est retourné tel quel (le monde est
    quand même sauvegardé) ;
  - sinon `product.timeleft = product.vitesse`.
- **Conséquences** : deux appels successifs renvoient la même réponse sans erreur ; la fin de
  production reste détectée par `updateWorld` (phase 4).

## D13 — Managers : `ratio: 1`, `typeratio: gain` purement décoratifs

- **Contexte** : `managers` est typé `[Palier!]!` par le schéma, donc chaque manager porte un `ratio`
  et un `typeratio` alors que son seul effet métier est l'automatisation de la production
  (`managerUnlocked = true`). Le squelette du sujet utilise `ratio: 0`.
- **Décision** (19/09/2026) : `ratio: 1`, `typeratio: gain` sur les 6 managers (bonus neutre).
  `engagerManager` (phase 3.3) n'appelle **pas** `applyBonus` : il débite le `seuil`, passe
  `unlocked` et `managerUnlocked` à `true`, rien d'autre.
- **Conséquences** : le frontend peut afficher ces champs sans qu'ils signifient quoi que ce soit.

## D14 — Frontend : `fetchPolicy: 'no-cache'`, le refetch complet de `getWorld` est la source de vérité

- **Contexte** : `InMemoryCache` d'Apollo normalise par `__typename:id`. `World` n'a pas d'`id`,
  mais `Product` en a un : `Product:1` de l'utilisateur `lucas` et de l'utilisateur `bob` seraient
  fusionnés dans la même entrée de cache, et les réponses partielles des mutations (un seul
  `Product` / `Palier`) écraseraient le monde affiché.
- **Décision** (phase 9.2, 19/09/2026) : `fetchPolicy: 'no-cache'` sur la query et les 6 mutations,
  aucune lecture du cache Apollo. Après chaque mutation, réussie **ou échouée**, `GameService`
  refait `getWorld` (le backend applique `updateWorld` à chaque appel : c'est ainsi que l'argent
  produit est crédité, et l'affichage reste aligné sur le serveur même après une erreur).
  `getWorld` est aussi refait automatiquement toutes les 2 s (`pollInterval`). Toute réponse
  remplace l'état local en entier.
- **Conséquences** : le `InMemoryCache` de `graphql.provider.ts` reste instancié (requis par le
  client) mais n'est jamais lu. Les mutations ne sélectionnent qu'un minimum de champs.

## D15 — Frontend : le timer local n'anime que `timeleft`

- **Contexte** : entre deux réponses serveur (2 s), les barres de production doivent avancer. Si le
  client créditait aussi `money` / `score` à la fin d'une barre, la valeur serait créditée une
  seconde fois par le serveur au refetch suivant (double comptage visible).
- **Décision** (phase 9.2, 19/09/2026) : un `setInterval` de 100 ms fait uniquement décroître
  `timeleft` des produits en cours (borné à 0 ; avec `managerUnlocked`, repart de `vitesse` quand
  0 est atteint). Il ne touche ni `money` ni `score` ; le serveur reste seul à créditer. L'écart
  réel entre deux ticks est mesuré (`Date.now()`) plutôt que supposé égal à 100 ms.
- **Conséquences** : la dérive est bornée à un intervalle de poll (2 s), chaque réponse serveur
  écrasant l'état local. Pas d'estimation locale de l'argent gagné (hors périmètre).

## D16 — Pas de `package.json` racine, dépendances par sous-projet

- **Contexte** : `isiscapitalist/package.json` (racine) déclarait les paquets de codegen
  (`@graphql-codegen/*`, `@apollo-orbit/codegen`) sans `node_modules/` racine : `npm run codegen`
  dans `frontend/` ne les trouvait pas.
- **Décision** (phase 9.1, 19/09/2026) : chaque sous-projet a ses propres `node_modules/`, jamais
  à la racine. Les paquets de codegen sont en `devDependencies` de `frontend/package.json`
  (`@graphql-codegen/cli`, `add`, `typescript`, `typescript-operations`, `@apollo-orbit/codegen`) ;
  `package.json` et `package-lock.json` racine sont supprimés.
- **Conséquences** : `npm install` se lance dans `backend/` et dans `frontend/` séparément.

## D17 — Frontend : boutons d'achat désactivés faute d'argent, multiplicateur « max » calculé côté client

- **Contexte** : le front de test 9.2 laissait tous les boutons actifs pour provoquer les erreurs
  serveur. Pour un vrai jeu idle, on veut un mode « max » (acheter le plus grand nombre payable)
  et des boutons grisés quand le joueur ne peut pas payer. `acheterQtProduit(quantite: Int!)`
  exige un entier : la quantité « max » doit donc être calculée par le client.
- **Décision** (phase 9.3, 19/09/2026) : `Multiplier = 1 | 10 | 100 | 'max'`. En mode max,
  `ProductCard` calcule `maxAffordable(product, money)` (`game-math.ts`, inverse de `buyCost`,
  corrigé contre `buyCost` pour l'arrondi flottant) à partir du dernier `money` reçu et émet cette
  quantité ; `GameService.buy(id, quantite)` la transmet telle quelle. Le bouton Acheter est
  désactivé (`[disabled]` natif) si `quantite = 0` ou `buyCost > money` ; les boutons des paliers
  si `balance < seuil` (`money` pour managers / upgrades, `activeangels` pour angel upgrades) —
  mêmes comparaisons strictes que `backend/src/resolver.ts`. Un solde exactement égal au coût permet
  l'achat. Aucune modification du backend ni du schéma.
- **Conséquences** : l'erreur « Pas assez d'argent » n'est plus déclenchable depuis l'UI (seulement
  via le playground GraphQL ou une course entre deux onglets). Le solde affiché pouvant dater de
  2 s (D15, pas d'estimation locale), un bouton peut être en retard sur l'état réel : le serveur
  reste seul juge et refuse l'achat si le solde a changé entre-temps ; le bandeau d'erreur
  l'affiche comme avant. `quantite: 0` n'est jamais envoyée.
- **Amendement** : depuis D21 (phase 9.7), le bouton de production (Produire / Arrêter /
  Reprendre) est lui aussi désactivé, si le produit n'a aucun exemplaire (`quantite = 0`). Reset
  et le champ user restent jamais désactivés.

## D18 — Frontend : Angular Material comme bibliothèque de composants

- **Contexte** : le front 9.2/9.3 était un front générique de test sans design (CSS de 25 lignes,
  boutons et tables natifs, `ViewEncapsulation.None` pour partager une seule feuille de style). Le
  sujet officiel du frontend (`frontend.pdf`) n'est toujours pas disponible ; l'utilisateur a
  décidé d'en faire un vrai jeu et choisi Angular Material, malgré la règle 8 (« pas de dépendance
  non prévue par le sujet ») : la dépendance est donc un choix explicite, documenté ici.
- **Décision** (phase 9.4, 19/09/2026) : `@angular/material@22.1.7` (+ `@angular/cdk@22.1.7`,
  même version que `@angular/core` 22.1.x) ajouté via `ng add @angular/material` (valeurs par
  défaut), jamais par `npm install` à la main. Sur ce projet en CSS pur, le schematic a :
  créé `src/material-theme.scss` (thème M3 `mat.theme()` — palettes `azure` / `blue`, typographie
  Roboto, densité 0 — plus `html, body { height: 100% }`, `body { margin: 0 }`, couleurs et police
  via les variables `--mat-sys-*`) ; ajouté ce fichier **avant** `src/styles.css` dans `styles` de
  `angular.json` (pas de renommage en `.scss`) ; ajouté dans `index.html` les liens Google Fonts
  Roboto (300/400/500) et **Material Icons** (police `Material+Icons`, pas Material Symbols) ; ajouté
  `@angular/cdk` et `@angular/material` à `package.json`. Il n'a **pas** touché aux animations :
  `@angular/animations` / `provideAnimations` ne sont pas installés (animations CSS depuis
  Material 19). Refonte purement visuelle : `GameService`, `game-math.ts`, les signaux, les
  mutations et les règles D14/D15/D17 sont inchangés ; `ProductCard` / `PalierList` restent
  présentationnels. Composants retenus : `mat-toolbar` (+ `mat-form-field`/`matInput` pour le
  user, `mat-button-toggle-group` pour le multiplicateur, bouton Reset `matButton="outlined"`),
  `mat-card` (avatar, titre, sous-titre, `mat-progress-bar` déterminée, `mat-chip` « manager »,
  `mat-card-actions`), `mat-table` (colonne `action` absente quand `actionLabel` est nul).
  Directive bouton : API `matButton` / `matButton="filled" | "outlined"` (recommandée depuis
  Material 20, équivalente à `mat-button` / `mat-flat-button` / `mat-stroked-button`).
- **Conséquences** : la police Roboto et les Material Icons sont chargées depuis Google Fonts
  (hors ligne : police système, icônes vides — aucune information ne passe uniquement par une
  icône, et aucun `mat-icon` n'est utilisé pour l'instant). Un fichier de style **par composant**
  (`app.css`, `product-card.css`, `palier-list.css`) et retour à l'encapsulation par défaut
  (`ViewEncapsulation.None` retiré : un style global fuiterait dans les composants de la lib) ;
  les couleurs passent par les tokens du thème (`--mat-sys-error-container`, `--mat-sys-primary`…).
  Import Material **module par module** dans chaque composant standalone (pas de barrel
  « MaterialModule »). `progress()` de `ProductCard` renvoie désormais un pourcentage 0-100
  (`mat-progress-bar`), au lieu de ms pour `<progress>`. Le bundle initial passe à ~763 kB
  (warning du budget `initial` de 500 kB dans `angular.json`, budget laissé tel quel). Les boutons
  Material posent l'attribut natif `disabled` : les specs D17 continuent de le lire.

## D19 — Frontend : navigation par onglets sans routeur, anges gagnables recalculés côté client

- **Contexte** : depuis 9.4 la page est en Material mais garde la disposition du front de test
  (produits à gauche, 4 tables empilées à droite, Reset dans le bandeau). Un vrai jeu idle
  navigue par onglets (Managers, Upgrades, Anges, Unlocks) avec une pastille « anges à réclamer »
  sur l'onglet Anges, comme l'onglet Investors d'AdVenture Capitalist. La page reste unique
  (poll `getWorld` et timer dans `GameService`), et aucune query du schéma n'expose le nombre
  d'anges qu'un reset rapporterait.
- **Décision** (phase 9.5, 19/09/2026) : pas de `Router` — l'onglet actif est une préférence
  d'affichage au même titre que `multiplier` : signal `activeTab: Tab | null` dans `GameService`
  (`Tab = 'managers' | 'upgrades' | 'angels' | 'unlocks'`, `null` = panneau fermé),
  `toggleTab(tab)` (re-clic sur l'onglet actif = fermeture), persisté dans localStorage sous
  `isiscapitalist.tab` (`'none'` quand fermé ; valeur absente ou inconnue → `'managers'`), même
  `effect` + try/catch que `isiscapitalist.user`. La formule des anges gagnés
  (`max(0, floor(150 × √(score / 1e15)) − totalangels)` à l'époque, recalibrée par D20 ; `angelsEarned` de
  `backend/src/world-engine.ts`) est **dupliquée** dans `frontend/src/app/game-math.ts` sous le
  même nom, pour l'affichage seulement : calculée une fois dans `App` (`computed` sur
  `game.world()`) et passée en input à `SideNav` (badge, masqué à 0) et à `AngelsPanel`. Le
  bouton Reset quitte le bandeau pour le sous-onglet Anges › Reset ; il n'est jamais désactivé
  (reset à 0 ange permis, comme dans le jeu original) ; le `confirm()` natif est conservé et
  reste dans `App` (seule à connaître `user`), avec le texte
  `Réinitialiser le monde de « <user> » ? Vous gagnerez <N> ange(s).`. `SideNav` et `AngelsPanel`
  sont présentationnels ; `ProductCard`, `PalierList`, le backend et le schéma sont inchangés.
- **Conséquences** : changer la formule des anges = deux fichiers (`world-engine.ts`,
  `game-math.ts`) et leurs specs ; le nombre affiché vient du dernier `getWorld` (≤ 2 s, D15) et
  peut différer de ce que le serveur calculera au reset — le serveur reste seul juge (D14). Un
  onglet n'a pas d'URL (pas de lien profond, pas d'historique navigateur). Le bundle initial
  passe à ~940 kB (sidenav, list, tabs, badge, icon ; budget `initial` de 500 kB toujours en
  warning, laissé tel quel). Les tests de `AngelsPanel` désactivent les animations Material
  (`MATERIAL_ANIMATIONS`) : sans transitions CSS (jsdom), le contenu d'un `mat-tab` n'est
  attaché qu'après un timer de repli de 100 ms. Premiers `mat-icon` du projet (police Material
  Icons de Google Fonts, D18) : chaque icône de la barre est doublée d'un libellé texte, donc
  hors ligne (icônes vides) la navigation reste lisible.

## D20 — Formule des anges recalibrée : 2 % du score (`SCORE_PER_ANGEL = 50`)

- **Contexte** : la formule AdVenture Capitalist retenue en D7, `floor(150 × √(score / 1e15))`, est
  calibrée pour des scores au-delà de 1e15. Avec l'`origworld` du TP (dernier produit à 622 080 par
  cycle), le premier ange demande un score ≈ 4,4e10 et le 1000ᵉ (prix d'« Angel Upgrade 3 »)
  ≈ 4,4e16 : injouable. Le monde réel de l'auteur (`lucas`, score 8 019 386) annonçait 0 ange au
  reset — ce n'était pas un bug, mais un calibrage inadapté.
- **Décision** (étape 7.3, 19/09/2026) : les anges gagnés valent **2 % du score**, linéaire :
  `angelsEarned = max(0, floor(score / SCORE_PER_ANGEL) − totalangels)` avec
  `SCORE_PER_ANGEL = 50`, constante exportée et commentée dans `backend/src/world-engine.ts` **et**
  `frontend/src/app/game-math.ts` (copie d'affichage, D19 — les deux specs partagent les mêmes cas
  chiffrés : 8 019 386 → 160 387 ; 12 000 / 100 → 140 ; seuils 49/50/99/100). On divise par 50
  plutôt que de multiplier par 0.02 : la division d'un multiple exact de 50 est exacte en IEEE 754,
  alors que 0.02 n'a pas de représentation binaire finie. Choix **assumé par l'auteur**, qui sait
  que c'est très généreux (AdCap et Cookie Clicker utilisent des courbes sous-linéaires pour freiner
  la boucle prestige). `resetWorld`, le schéma GraphQL et `origworld.ts` (`angelbonus = 2`, seuils
  10 / 100 / 1000 des angelupgrades) sont inchangés. Le test e2e du reset fixe `score = 5000` dans le
  fichier du user jetable et attend `totalangels = activeangels = 100` (il ne prouvait plus rien
  avec un score de 0). Badge de l'onglet Anges : en Material 22 (M3) `.mat-badge-content` est déjà
  une pilule à largeur automatique, mais ancrée à droite de l'icône et rognée par l'`overflow:
  hidden` de l'item de liste (63 px utiles) dès 4 chiffres ; `side-nav.css` la recentre sur
  l'item (`mat-icon` en `position: static`, `left: 50%` + `translate: -50% 0`, 8 px de
  recouvrement sur l'icône réservés par un `padding-top`). Valeur affichée inchangée
  (`side-nav.spec.ts` toujours vrai) ; au-delà de ~9 chiffres Material tronque avec « … ».
- **Conséquences** : boucle prestige très rapide — le premier reset de `lucas` donne ×3 208,74 de
  production (1 + 160 387 × 2 / 100) — et les trois angelupgrades sont achetables immédiatement
  après ce reset. Les très grands nombres deviennent probables : `formatNumber` plafonne à « T »
  (1e12) et affichera des valeurs à 4+ chiffres avant l'unité au-delà — à traiter séparément, pas
  ici. Les fichiers `backend/userworlds/*.json` existants ne sont pas migrés : le score étant
  conservé, le prochain reset applique la nouvelle formule de lui-même ; les mondes créés avec
  l'ancienne formule où `totalangels > floor(score / 50)` donnent simplement 0 (jamais négatif).
  Un rééquilibrage éventuel d'`angelbonus` ou des seuils d'angelupgrades est une décision séparée.

## D20 — Mutation `basculerManager` : pause de l'automatisation d'un manager

- **Contexte** : une fois un manager engagé, la production tourne en boucle **côté serveur**
  (`updateWorld` crédite l'argent à chaque `getWorld` tant que `product.managerUnlocked` est
  `true`) et le bouton « Produire » de la carte ne sert plus à rien. L'utilisateur veut que ce
  bouton devienne l'interrupteur de l'automatisation (« Arrêter » / « Reprendre »). Comme la
  boucle est serveur, la pause doit l'être aussi, or le schéma imposé par le sujet n'a aucune
  mutation de pause. Dans AdVenture Capitalist un manager est définitif : c'est un écart
  volontaire au modèle du jeu original.
- **Décision** (phase 9.6, 19/09/2026) : nouvelle mutation
  `basculerManager(user: String!, id: Int!): Product` dans `backend/src/schema.graphql` (même
  ossature que les autres : `read → updateWorld → action → save`). Elle exige qu'un palier de
  `world.managers` cible le produit avec `unlocked: true` (sinon
  `Aucun manager engagé pour <name>`), puis fait `product.managerUnlocked = !product.managerUnlocked`
  — rien d'autre : ni `timeleft`, ni `money`, ni le palier manager (`unlocked` reste `true`, `seuil`
  n'est pas remboursé : le manager est acheté une fois pour toutes ; sinon `PalierList` le
  proposerait à nouveau à l'achat). `updateWorld` (`world-engine.ts`) est **inchangé** : la pause
  est exactement sa branche « sans manager », déjà testée (la production entamée finit, puis plus
  rien) ; la reprise est sa branche « avec manager » (un `timeleft > 0` est repris sans redémarrer).
  Un flag `paused` supplémentaire aurait doublé les chemins à tester pour le même résultat.
  `docs/reference/schema.graphql` (schéma du sujet) n'est pas modifié : il reste la référence de
  l'écart. Le test de possession (`AppService.hasManager`) vit dans le service, pas dans le moteur.
- **Conséquences** : deuxième écart au schéma du sujet après D6 (commentaire en tête de
  `schema.graphql`). Les deux notions que D13 confondait sont désormais distinctes :
  `managers[].unlocked` = manager **possédé**, `product.managerUnlocked` = automatisation
  **active** ; possédé + inactif = en pause. Le frontend dérive « possédé » de `world.managers`
  (`App.managerOwned(world, product)`, input `managerOwned` de `ProductCard`) et affiche un
  bouton à trois états — Produire (`lancerProductionProduit`, inchangé) / Arrêter / Reprendre
  (`basculerManager`) — et une chip `manager` / `manager (en pause)` ; il n'est jamais désactivé
  (D17). Le timer local (D15) n'est pas modifié : le `getWorld` qui suit la mutation rapporte le
  nouveau `managerUnlocked`, la barre finit sa course et s'arrête à 0 (pause) ou repart de
  `vitesse` (reprise). Un fichier `userworlds` incohérent (`managerUnlocked true` sans manager
  acheté) n'est pas réparé : la mutation refuse, le front affiche « Produire » sans chip. La
  bascule est volontairement réversible (pas d'idempotence, contrairement à D12) et sans coût.
  Comme les six autres mutations, une erreur (`throw`) interrompt la requête avant `saveWorld`.
- **Amendement** : la chip affiche toujours `manager` depuis D30.

## D21 — Frontend : bouton de production désactivé sans exemplaire

- **Contexte** : dans un monde neuf, seul « Item 1 » a un exemplaire ; les cinq autres produits
  sont à `quantite: 0`. Cliquer « Produire » sur l'un d'eux envoie `lancerProductionProduit`, que
  le backend refuse (`throw`, D12 : « Aucun exemplaire de Item 2 à produire ») et le joueur voit
  le bandeau d'erreur rouge — ce qui n'a rien d'un jeu idle. D17 avait volontairement laissé ce
  bouton « jamais désactivé » parce qu'il est sans coût ; mais il a bien une précondition serveur.
- **Décision** (phase 9.7, 19/09/2026) : `ProductCard` expose un `computed`
  `canProduce = product().quantite > 0`, lié au bouton de production par `[disabled]` natif —
  même mécanisme que `canBuy` sur Acheter (D17). La règle est une seule condition, indépendante
  du libellé (Produire / Arrêter / Reprendre, D20), de `managerOwned` et de `managerUnlocked` :
  un manager engagé sur un produit à 0 exemplaire (atteignable : `engagerManager` ne vérifie pas
  `quantite`) affiche « Arrêter » grisé. On **ne désactive pas** pendant une production en cours
  (`timeleft > 0`) : le backend traite ce clic comme un no-op (D12) et l'état dépendrait du timer
  local 100 ms (D15) — on éviterait un « rien » au prix d'un bouton qui clignote. Pas de tooltip
  ni de texte explicatif (aligné sur Acheter ; un tooltip sur bouton `disabled` exigerait un
  wrapper). Aucune modification du backend : le `throw` D12 reste la défense en profondeur, le
  front se contente de ne plus envoyer une mutation vouée à l'échec.
- **Conséquences** : l'erreur « Aucun exemplaire de … à produire » n'est plus déclenchable depuis
  l'UI (seulement via le playground ou une course entre deux onglets : la quantité affichée peut
  dater de 2 s, D15, le serveur reste seul juge). `canProduce` est recalculé à la réception du
  `getWorld` qui suit l'achat (D14) : « Produire » redevient actif dès qu'un exemplaire est
  acheté. Un bouton désactivé ne déclenche pas `(click)` : `launch` / `toggleManager` ne sont pas
  émis, `productionLabel` et `onProductionClick` sont inchangés. La carte reste visible (on grise,
  on ne masque pas, contrairement à AdVenture Capitalist) tant que le sujet frontend n'est pas
  fourni. Amende D17 (« jamais désactivé ») ; Reset et le champ user restent jamais désactivés.

## D22 — Frontend : thème « écran cathodique » vert, onglets en bas, réglages CRT

- **Contexte** : depuis 9.4 / 9.5 le front est en Material (thème M3 clair azure, barre latérale
  gauche à onglets — D18, D19). L'utilisateur veut l'esthétique du Pip-Boy de Fallout : écran
  monochrome vert sur noir, police terminal, cadres en filets, scanlines et halo, avec la
  disposition de l'image de référence `docs/prompts/assets/pipboy-reference.png` (titre en haut à
  gauche, cases de stats en haut à droite, écran plein au centre, barre d'onglets en bas). Le
  comportement de jeu ne change pas (mêmes mutations, règles D14 / D15 / D17 / D20 / D21).
- **Décision** (phase 9.8, 19/09/2026) :
  - **Thème** : palette tonale générée par `ng generate @angular/material:theme-color`
    (seed `#1aff80`, neutre `#0b3d21`) dans `src/_theme-colors.scss` (le schematic l'a créée en
    `src_theme-colors.scss`, déplacée à la main), consommée par `mat.theme(…, theme-type: dark)`
    avec `$overrides` monochromes dans `src/material-theme.scss` — **seule source des couleurs**
    du projet : fond `#001609`, vert `#1aff80` (texte, filets, primary, outline ; ≈ 14:1), vert
    atténué `#14a85a` (texte secondaire, outline-variant ; ≈ 6:1), quatre surfaces de relief,
    `error` / `error-container` / `primary-container` = vert (vidéo inversée : bandeau d'erreur,
    Reset, sélection), `secondary-container` = surface haute (toggle du multiplicateur), tous les
    `corner-*` à 0, tailles de la typographie système relevées (~20 %) parce que VT323 est plus
    petite que Roboto à taille égale. `mat.progress-bar-overrides` sépare piste
    (`surface-container-highest`) et indicateur (`primary`). Amende D18 : **VT323** remplace
    Roboto dans le `<link>` Google Fonts, et **Material Icons est retiré** (plus aucun `mat-icon`,
    barre texte seul). `<title>` → « ISIS Capitalist ».
  - **Navigation** (amende D19) : `Tab` élargi à 6 valeurs
    (`'products' | 'managers' | 'upgrades' | 'angels' | 'unlocks' | 'settings'`),
    `DEFAULT_TAB = 'products'`, `activeTab: signal<Tab>` jamais nul (plus de « panneau fermé »),
    `selectTab(tab)` remplace `toggleTab` ; clé `isiscapitalist.tab` inchangée, l'ancienne valeur
    `'none'` est lue comme inconnue → `'products'`. `SideNav` (`mat-nav-list` + `mat-icon`) est
    supprimé au profit de `TabBar` : `mat-tab-nav-panel` (qui projette l'écran de l'onglet actif
    par `ng-content`) puis `nav mat-tab-nav-bar [tabPanel]` avec 6 `a mat-tab-link` texte seul,
    badge `matBadge` des anges gagnables sur Anges (masqué à 0). Avec un `[tabPanel]`, Material
    pose `mdc-tab--active` + `role="tab"` + `aria-selected` sur le lien actif (pas
    `aria-current`) : c'est ce que lisent les specs. Un seul écran visible à la fois : Produits
    (les 6 cartes, grille inchangée), Managers / Upgrades / Unlocks (`PalierList`), Anges
    (`AngelsPanel`), Paramètres (nouveau `SettingsPanel`, affiché même sans monde).
  - **Réglages CRT** : trois signaux `scanlines` / `glow` / `flicker` dans `GameService`
    (défauts on / on / off), persistés sous `isiscapitalist.scanlines` / `.glow` / `.flicker`
    (`'on'` / `'off'`, `readStoredFlag(key, fallback)`, même `effect` + try/catch que `user` et
    `tab`), édités par trois `mat-slide-toggle` (`model()`) de `SettingsPanel`, posés par `App` en
    classes `crt-*` sur `<app-root>` (host binding). Les effets vivent dans **`styles.css`**
    (global) : overlay `repeating-linear-gradient` en `::after` pour les scanlines, `text-shadow`
    hérité + `box-shadow` des cadres pour le halo, voile vert animé en `::before` pour le
    scintillement (`@keyframes pip-flicker`, coupé par `prefers-reduced-motion`). Global plutôt
    que dans `app.css` : le budget `anyComponentStyle` (8 kB error) et la portée (atteindre
    l'intérieur des composants Material sans `::ng-deep`). `styles.css` porte aussi `.pip-frame`
    (filet 1 px), `.pip-title` (capitales + filet, appliqué aussi aux `h2` de `PalierList` /
    `AngelsPanel` par sélecteur d'élément pour ne pas toucher à leurs templates) et le cadre de
    l'onglet actif. Les PNG unis des produits (D11) sont teintés en vert par un `filter` CSS
    (`product-card.css`).
  - **Aucun actif Fallout** (Vault Boy, logos, sons : marques Bethesda) et le mot « Pip-Boy »
    n'apparaît pas dans l'interface ; l'image de référence reste dans `docs/`, jamais servie.
- **Conséquences** : bundle initial ~893 kB (contre ~940 kB : sidenav, list, icon retirés ;
  budget `initial` de 500 kB toujours en warning, budgets inchangés). Hors ligne : VT323 absente
  → monospace système, mise en page intacte ; plus aucune police d'icônes à charger. Une seule
  couleur d'écran : changer de teinte (ambre, bleu…) = éditer les 7 variables de
  `material-theme.scss`. Un seul écran visible à la fois (plus de panneau à côté des produits).
  `side-nav.spec.ts` remplacé par `tab-bar.spec.ts` ; `settings-panel.spec.ts` et les cas
  `readStoredFlag` / persistance des trois clés ajoutés à `game.service.spec.ts` ; `app.spec.ts`
  stubbe `selectTab` et les trois signaux CRT. Les specs de `TabBar` et `App` fournissent
  `MATERIAL_ANIMATIONS { animationsDisabled: true }` (pagination de `mat-tab-nav-bar` sous jsdom).

## D23 — Frontend : carte produit allégée, barre d'achat vers le prochain palier, onglet Unlocks par produit

- **Contexte** : jusqu'en 9.8, `ProductCard` restait un écran de debug : `id`, `quantite`,
  `revenu`, gain/production, `vitesse`, `cout`, `croissance`, « timeleft N ms » et la liste des
  trois paliers de chaque produit. Un joueur n'a pas besoin de la moitié de ces champs (le coût
  est déjà sur le bouton « Acheter x1 — 4.00 », D17) et rien ne lui disait combien d'exemplaires
  il lui manque pour le prochain unlock — l'information clé d'*AdVenture Capitalist*, où le
  compteur de chaque business se remplit vers le palier suivant. L'onglet Unlocks n'affichait que
  la table brute des all unlocks.
- **Décision** (phase 9.9, 2026-09-19) : aucune nouvelle règle de jeu, affichage seul.
  1. `nextUnlock(product)` dans `game-math.ts` : le palier **verrouillé de plus petit seuil**
     (`<` strict, donc le premier du tableau à seuil égal), ou `null` si tout est débloqué / aucun
     palier. On cherche le minimum plutôt que « le premier verrouillé du tableau » : `origworld`
     est trié mais un `userworlds/*.json` édité à la main ne l'est pas forcément, et le backend
     teste chaque palier indépendamment (GAME-RULES.md §Unlocks). **Une seule définition**,
     appelée par la carte et par l'onglet, sinon les deux finiraient par diverger.
  2. `ProductCard` ne garde que revenu, gain/production, la barre de production (sans le texte
     timeleft) et les deux boutons (D17 / D20 / D21 intouchés). La stat `quantite` devient un bloc
     `.product-owned` : `mat-progress-bar` « Progression vers le prochain palier » + texte
     « quantite / seuil » (ou la quantité seule si `nextUnlock` rend `null`). `ownedProgress` est
     un `computed` sur `product()` seulement — jamais sur le timer 100 ms (D15) — borné à 0-100
     et 100 si `seuil <= 0` (même garde-fou que `progress()`), car `quantite` ne change qu'à la
     réception d'un `getWorld` (D14). Ordre : stats → barre d'achat → barre de production.
     Une seule règle CSS pour les deux blocs (`.product-owned, .product-progress`).
  3. Nouveau composant présentationnel `UnlockList` (`app-unlock-list`, input `products`,
     aucun output) : titre « Par produit » en `.pip-title`, `mat-table` d'une ligne par produit
     — produit / prochain palier / effet (`typeratio ×ratio`, libellé brut du schéma) /
     progression (`mat-progress-bar` + « quantite / seuil ») ; « tous les paliers débloqués »
     avec les autres cellules vides et `class.unlocked` (couleur `--mat-sys-primary`, comme
     `PalierList`). L'onglet Unlocks devient `<section class="unlocks">` = `UnlockList` puis la
     table « All unlocks » **inchangée** (`PalierList` sert toujours aux 4 listes ; pas de mode
     supplémentaire). `mat-progress-bar` plutôt qu'un `<div>` maison : le thème (D22) sépare
     déjà piste et indicateur par tokens.
- **Conséquences** : `id`, `vitesse`, `cout`, `croissance`, `timeleft` et les paliers
  n'apparaissent plus sur la carte (ils restent dans le playground et le JSON). Une quantité
  supérieure au seuil d'un palier encore `unlocked: false` (JSON édité à la main : le backend ne
  vérifie les unlocks qu'après `acheterQtProduit`, pas au `getWorld`) donne une barre à 100 % et
  « 120 / 25 » sans erreur ; l'achat suivant, même x1, fait passer les paliers à `unlocked` et la
  carte bascule sur « 121 » seul (vérifié avec l'user `test-9-9`). Les deux tests `progress()` de `product-card.spec.ts` ciblent désormais la barre
  par `aria-label="Production en cours"` (la première barre de la carte est celle d'achat) ; les
  tests D17 / D20 / D21 sont inchangés. `unlock-list.spec.ts` couvre Item 1 neuf (1 / 25, 4 %),
  Unlock 1.1 débloqué (32 / 50, 64 %), tout débloqué, et quantité > seuil. Hors périmètre :
  progression des all unlocks (table brute), tooltip / badge ailleurs, traduction de `typeratio`.

## D24 — Engager un manager exige un exemplaire du produit cible

- **Contexte** : dans un monde neuf, seul « Item 1 » a un exemplaire ; les cinq autres produits
  sont à `quantite: 0`. `engagerManager` ne vérifiait que « déjà engagé » puis l'argent : avec
  20 000 $ on pouvait engager « Manager 2 » sur « Item 2 » à 0 exemplaire. Le resolver passait
  `product.managerUnlocked = true` et `updateWorld` suivait la branche « avec manager » : la barre
  de production d'Item 2 tournait en boucle sur l'écran Produits pour un gain de 0
  (`quantite × revenu × …`). Le joueur avait payé 15 000 $ pour une barre qui avance à vide. D21
  avait relevé le cas (« Arrêter » grisé sur un produit à 0) sans le bloquer à la source.
- **Décision** (phase 9.11, 2026-09-19) : refus aux deux niveaux habituels du projet.
  - **Backend** : dans `engagerManager`, après « déjà engagé » et **avant** « pas assez
    d'argent », `product.quantite === 0` →
    `throw new Error(\`Aucun exemplaire de ${product.name} : achetez le produit avant d'engager son manager\`)`
    (même schéma que D12). Rien n'est débité, aucun flag ne change. La quantité passe avant
    l'argent parce que « pas assez d'argent » enverrait sur une fausse piste un joueur qui ne
    possède pas encore le produit. **Écart au sujet** (§6.3 ne prévoit pas cette vérification),
    troisième après D6 et D20. `updateWorld` n'est **pas** touché : le jeu de tests officiel
    (`test/production-samples.*`) fixe son comportement, on bloque l'entrée dans l'état
    incohérent au lieu de changer le moteur.
  - **Frontend** : `PalierList` gagne un input optionnel `blockedNames: readonly string[]`
    (défaut `[]`) ; `isDisabled` rend aussi `true` si le `name` du palier y figure — `[disabled]`
    natif, mêmes règles que D17 / D21 (pas de tooltip, pas de CSS, pas de masquage). La liste
    reste présentationnelle et agnostique des produits (elle sert à quatre listes dont trois
    n'ont pas de produit cible) : `App` fournit l'input à la seule liste Managers via le
    `computed` `blockedManagers`, alimenté par la fonction pure `blockedManagerNames(world)` de
    `game-math.ts` (managers non `unlocked` dont le produit `idcible` a `quantite === 0`).
    Fonction pure plutôt que `computed` inline : `app.spec.ts` n'a aucun test avec un monde
    chargé, `game-math.spec.ts` teste la logique sans TestBed.
- **Conséquences** : dans un monde neuf, « Manager 2 » à « Manager 6 » sont grisés jusqu'à
  l'achat d'un exemplaire de leur produit ; le bouton redevient actif au `getWorld` suivant
  (D14). Un manager déjà `unlocked` n'est pas listé (déjà grisé par `palier.unlocked`, et le
  backend répond « déjà engagé » en premier). `quantite: 0` **et** argent insuffisant → message
  « Aucun exemplaire … ». Les listes Upgrades, Bonus et All unlocks ne passent pas l'input :
  comportement inchangé. Les fichiers `userworlds/` déjà dans l'état bogué (manager engagé sur
  un produit à 0 avant cette correction) sont laissés tels quels : la barre tourne à gain 0
  jusqu'à l'achat d'un exemplaire ou un reset. Le solde et la quantité affichés peuvent dater de
  2 s (D15) : le serveur reste seul juge, le bandeau d'erreur reste en place pour le playground
  ou une course entre deux onglets. Hors périmètre : masquer la ligne tant que le produit n'est
  pas possédé (*AdVenture Capitalist*), migrer les `userworlds/`, appliquer la règle aux upgrades
  (ils ne déclenchent aucune production).

## D25 — Frontend : carte produit, barres 16 px et barre d'achat dans l'en-tête sous le nom

- **Contexte** : depuis D23, la carte porte deux `mat-progress-bar` à 4 px (hauteur M3 par
  défaut) : la barre d'achat « quantite / seuil » et la barre de production. Trop discrètes pour
  un jeu, et la barre d'achat était perdue au milieu de la carte alors que dans *AdVenture
  Capitalist* le compteur d'exemplaires est collé à l'icône du business. Demande : barres plus
  grosses, barre d'achat à droite de l'icône, sous le nom.
- **Décision** (phase 9.11, 2026-09-19) : affichage seul, `product-card.ts` intouché
  (`ownedProgress`, `nextPalier`, `progress`, boutons D17 / D20 / D21 inchangés).
  1. **En-tête maison** `div.product-header` à la place de `mat-card-header` : celui-ci ne
     projette dans sa colonne de texte (`.mat-mdc-card-header-text`) que `mat-card-title` /
     `mat-card-subtitle` ; tout autre enfant atterrit à côté, dans la ligne flex — une barre y
     serait à droite du nom, pas dessous. Les directives `matCardAvatar` et `mat-card-title`
     restent utilisables hors de `mat-card-header` (sélecteurs libres) et gardent la typographie
     du thème. Structure : icône 64 px (`.icon`, neutralise les 40 px et le `margin-bottom` de
     `.mat-mdc-card-avatar`, filtre vert D22 conservé) ; à droite, `.product-heading` (colonne,
     `min-width: 0` pour qu'un nom long n'empêche pas la barre de rétrécir) = `.product-title-row`
     (nom + chip manager, `flex-wrap` : sur carte étroite le chip passe sous le nom, jamais le nom
     tronqué) puis `.product-owned`. Même `padding: 16px 16px 0` que `mat-card-header`, le reste
     de la carte ne bouge pas. `mat-card-content` ne garde que les stats et la barre de production.
  2. **Hauteur 16 px** des deux barres de la carte par les variables système de Material
     `--mat-progress-bar-track-height` et `--mat-progress-bar-active-indicator-height` posées sur
     `.product mat-progress-bar` (la hauteur rendue est le max des deux : n'en poser qu'une donne
     une piste épaisse avec un indicateur fin). Dans `product-card.css` et non par un
     `mat.progress-bar-overrides` dans `material-theme.scss` : l'override serait global (les
     barres de `UnlockList` doivent rester à 4 px), et ces variables ne sont pas des couleurs
     (D22 respectée : `material-theme.scss` reste le seul fichier de couleurs).
  3. **Texte dans la barre** : `span.owned-label` (ex-`span.muted`, il n'est plus « discret »)
     en `position: absolute; inset: 0; display: grid; place-items: center` par-dessus la barre
     (`.product-owned { position: relative; isolation: isolate }`), `pointer-events: none`.
     Lisibilité sur la partie remplie (`--mat-sys-primary`) comme sur la piste sombre :
     **`color: var(--mat-sys-primary); mix-blend-mode: difference`** — vert sur vert donne du
     noir, vert sur sombre reste vert, on ne sort pas du monochrome. La variante de repli
     (`--mat-sys-on-primary` + halo `text-shadow` en primary) a été essayée dans le navigateur
     et rejetée : sur la piste sombre le texte sombre halé devient une tache illisible.
     Police `--mat-sys-label-large` (14 px) plutôt que `label-medium` (12 px) : les raccourcis
     `--mat-sys-*` ne reprennent pas les tailles relevées du thème (`label-medium-size: 1rem`
     n'est pas propagée à `--mat-sys-label-medium`, qui reste à 0.75rem), et 12 px de VT323
     dans 16 px de barre est trop petit. `line-height: 1` posé **après** le raccourci `font`
     (qui le réinitialise). La barre de production grossit mais reste sans texte.
- **Conséquences** : vérifié avec l'user `verif-910` — `getComputedStyle(...).height` = `16px`
  pour les deux barres de la carte, `4px` dans `app-unlock-list` ; icône 64 × 64 ; centre du
  texte à 0 px du centre de la barre ; « 1 / 25 » (4 %), « 22 / 25 » (88 %), « 120 » seul
  (100 %, tout débloqué) et « 30 / 25 » (borné, JSON édité) lisibles halo activé et désactivé ;
  à 700 px de large (cartes de 328 px) avec Manager 1 en pause, le chip « manager (en pause) »
  passe sous « Item 1 », la barre garde la largeur de la colonne, aucun débordement horizontal.
  `product-card.spec.ts` : `ownedBar()` inchangé (même `aria-label`), `.product-owned .muted` →
  `.product-owned .owned-label`, nouveau test de structure (barre d'achat dans
  `.product-header .product-heading`, absente de `mat-card-content`, plus de `mat-card-header`).
  Les hauteurs ne se testent pas en jsdom (pas de variables CSS depuis une feuille de style).
  Budget `initial` de 500 kB toujours en warning (D18), bundle inchangé (896 kB). Hors
  périmètre : `UnlockList`, texte dans la barre de production, boutons, icônes.

## D26 — Frontend : barre du bas pleine largeur, Acheter au bord droit de la carte

- **Contexte** : la barre d'onglets du bas (D22) était posée avec `mat-stretch-tabs="false"`
  pour que les 6 onglets tiennent à 800 px sans pagination ; résultat, à 1024 px ils occupaient
  ~500 px tassés à gauche, le reste de la barre restait vide — l'inverse d'une barre de jeu
  mobile (M3 navigation bar, *AdVenture Capitalist*). Sur la carte produit, Produire et Acheter
  étaient collés côte à côte à gauche de `mat-card-actions`, alors qu'AdCap sépare le bouton
  d'achat du reste en le mettant à droite. Demande : barre sur toute la largeur, Acheter à
  droite.
- **Décision** (phase 9.12, 2026-09-19) : disposition pure, `tab-bar.ts` et `product-card.ts`
  intouchés, aucune couleur ni token touché (`material-theme.scss` inchangé, D22).
  1. **Onglets à parts égales** : `mat-stretch-tabs="false"` retiré du `nav` — le défaut
     Material (`stretchTabs = true`) pose la classe `mat-mdc-tab-nav-bar-stretch-tabs` qui donne
     `flex-grow: 1` à chaque `.mat-mdc-tab-link`. Ce seul `flex-grow` ne fait pas des parts
     égales : chaque onglet grandit depuis sa largeur naturelle (83 / 83 / 83 / 72 / 77 / 96 px)
     et « Paramètres » resterait 24 px plus large qu'« Anges ». D'où **`flex-basis: 0` sur
     `.tab`** dans `tab-bar.css` (mise en page du composant, pas `styles.css` qui ne porte que la
     peau), qui l'emporte sur le `.mdc-tab { flex: 1 0 auto }` de Material par l'attribut
     d'encapsulation émulée, comme le `min-width: 72px` déjà en place. Ce `min-width` est
     **conservé** : sous ~450 px les 6 × 72 px ne tiennent plus et la pagination Material
     (flèches `< >`) prend le relais — repli accepté, pas de media query. Le cadre de l'onglet
     actif (`styles.css`) et la pastille Anges (centrée par `left: 50%`) suivent la nouvelle
     largeur sans modification.
  2. **Acheter au bord droit** : `class="buy"` sur le bouton Acheter (accroche CSS, seul
     changement de template) ; `mat-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem }`
     et **`.buy { margin-left: auto }`**. Marge automatique plutôt que
     `justify-content: space-between` : quand la carte est trop étroite (multiplicateur x100 /
     max, libellé « Reprendre »), Acheter passe seul à la ligne suivante et `space-between` le
     ramènerait à gauche (seul élément de sa ligne), tandis que la marge le garde à droite dans
     les deux cas. `align="end"` de Material n'existe que pour tout aligner à droite. Libellés,
     ordre, `[disabled]` (D17 / D20 / D21) et en-tête / barres (D23 / D25) inchangés.
- **Conséquences** : vérifié avec l'user `verif-911`. À 1024 px : `nav.bar` porte
  `mat-mdc-tab-nav-bar-stretch-tabs`, les 6 `a.tab` font 170.7 px chacun (somme 1024.2 =
  largeur de `.mat-mdc-tab-links`) ; carte Item 1 (322.7 px) : bord droit d'Acheter = bord droit
  de `mat-card-actions` − 8 px (delta 0), bord gauche de Produire = bord gauche + 8 px (delta 0),
  même ligne. À 360 px avec x100 : « Acheter x100 — 469.72 M » (Item 2) et « 385.27 G »
  (Item 6) passent seuls sur une 2ᵉ ligne, toujours au bord droit (delta 0), les autres restent
  sur la ligne de Produire ; pagination Material active, onglets à 82.7 px (≥ 72), aucun
  débordement horizontal (`scrollWidth` = `innerWidth`). Pastille « 20000 » (score 1 000 000)
  centrée au-dessus d'« Anges » à 0.01 px près. `tab-bar.spec.ts` : test de la classe
  `mat-mdc-tab-nav-bar-stretch-tabs` ; `product-card.spec.ts` : Acheter porte `.buy` et reste
  le second bouton de `mat-card-actions` (les tests D20 / D21 comptent sur l'ordre). Largeurs et
  alignements ne se testent pas en jsdom. Bundle inchangé (896 kB, warning de budget D18). Hors
  périmètre : toolbar du haut, stats, multiplicateur, en-tête et barres de la carte, nombre /
  ordre / libellés des onglets, `PalierList`, `UnlockList`, `AngelsPanel`, `SettingsPanel`,
  backend.

## D27 — `totalangels` / `activeangels: Float!` (anges au-delà de 2^31)

- **Contexte** (19/09/2026) : le schéma fourni déclare `totalangels: Int!` et `activeangels: Int!`.
  Avec la formule D20 (1 ange pour 50 de score, linéaire) un score de 6,04e13 — atteint en jouant
  normalement — donne 1 207 647 699 334 anges au reset, bien au-delà de l'entier 32 bits signé de
  GraphQL (2 147 483 647). Apollo refuse alors de sérialiser le monde :
  `Int cannot represent non 32-bit signed integer value: 1207647699334`, et **toutes** les
  opérations de l'utilisateur échouent (le fichier `userworlds/<user>-world.json` est valide, c'est
  la réponse GraphQL qui casse). Le seuil est atteint dès `score ≥ 50 × 2^31 ≈ 1,07e11`.
- **Options** :
  1. Borner les anges à `2^31 − 1` dans `angelsEarned` : schéma intact, mais plafond arbitraire et
     `score` continue de croître → l'écart `floor(score/50) − totalangels` resterait bloqué.
  2. Revenir à une formule sous-linéaire (racine carrée, D7) : rejetée par D20 (injouable avec
     l'origworld du TP) ; changer la courbe pour un problème de sérialisation serait disproportionné.
  3. Déclarer les deux champs en `Float!`, comme `money`, `score` et `lastupdate` (D6) : un `Float`
     GraphQL est un double IEEE 754, exact jusqu'à 2^53 ≈ 9e15 anges (score ≈ 4,5e17).
- **Décision** : **option 3**, même traitement que D6. `backend/src/schema.graphql` et
  `frontend/src/app/graphql/schema.graphql` déclarent `totalangels: Float!` et
  `activeangels: Float!` ; le codegen du front est relancé (`npm run codegen`), les types TypeScript
  restent `number` des deux côtés donc aucun code métier ne change. Les valeurs restent entières
  (`Math.floor` dans `angelsEarned`, `seuil` entier des angelupgrades) : seul le type de transport
  change.
- **Conséquences** : troisième écart au schéma du sujet (après D6 et D20), noté dans l'en-tête des
  deux copies du schéma. `docs/reference/schema.graphql` reste la version originale du sujet.

## D28 — Frontend : gain dans la barre de production, chrono encadré à sa droite, ligne revenu retirée

- **Contexte** (phase 9.13, 2026-09-19) : `mat-card-content` montrait une ligne de stats
  « revenu 1.00 · gain/production 1.00 » puis la barre de production seule, sans texte. Dans
  *AdVenture Capitalist*, la ligne d'un business porte le montant de la production **dans** la
  barre et un chrono encadré collé à sa droite ; le revenu unitaire n'est pas affiché. Demande :
  retirer le revenu, mettre le gain dans la barre, ajouter le chrono à droite. Aucune règle de
  jeu, donnée ni comportement nouveau : affichage seul.
- **Décision** :
  1. **`formatDuration(ms)`** dans `game-math.ts` (fonction pure testée sans TestBed, à côté de
     `formatNumber` dont elle reprend les conventions : pas de locale, garde-fou sur les valeurs
     non finies) : `s = ceil(ms / 1000)` (0 si `ms ≤ 0` ou non fini), `mm:ss` sur deux chiffres,
     `h:mm:ss` à partir d'une heure, heures sans zéro devant et non bornées. **Seconde
     supérieure** (`ceil`) et non `floor` : avec `floor`, `00:00` s'afficherait pendant la
     dernière seconde alors que la barre n'est pas pleine — contradiction visuelle ; avec `ceil`
     une production en cours n'affiche jamais `00:00`. **`mm:ss`** plutôt que le `hh:mm:ss`
     permanent d'AdCap : 5 caractères stables en VT323 pour les vitesses de l'origworld (0,5 s à
     2 min), `h:mm:ss` seulement au-delà d'une heure (upgrades / JSON édité).
  2. **`remainingLabel`** (computed de `ProductCard`) : `formatDuration(timeleft > 0 ? timeleft :
     vitesse)` — temps restant de la production en cours, ou **durée d'un cycle au repos** comme
     AdCap (le joueur voit ce que coûtera la prochaine production). Aucun timer ajouté :
     `product().timeleft` est déjà décrémenté toutes les 100 ms par `GameService` (D15), le
     computed suit ; avec manager actif `timeleft` reboucle sur `vitesse` sans passer par 0.
  3. **Template** : `.product-stats` supprimée ; `.product-progress` devient une ligne flex
     `.product-gain` (barre « Production en cours » inchangée + `span.bar-label` = `fmt(gain())`)
     puis `span.product-timer` avec `role="timer"` et `aria-label="Temps restant"` (un
     `aria-label` sur un `span` sans rôle est ignoré par les lecteurs d'écran ; et le mot
     `timeleft` ne doit pas apparaître dans la carte, un test s'en assure).
  4. **CSS** : `.owned-label` renommé **`.bar-label`**, une seule règle partagée par la barre
     d'achat et la barre de production (technique D25 : `position: absolute; inset: 0; display:
     grid; place-items: center; mix-blend-mode: difference`) — deux règles identiques
     divergeraient au premier ajustement ; `.product-owned, .product-gain { position: relative;
     isolation: isolate }`. `.product-gain { flex: 1 1 auto; min-width: 0 }` (la barre prend la
     place restante et rétrécit avec la carte), `gap: 0.5rem`, pas de `flex-wrap`.
     **`.product-timer`** : `height: 16px` (bordure comprise, `box-sizing: border-box`), `border:
     1px solid var(--mat-sys-primary)`, **`min-width: 5ch`** et non des px : VT323 est à chasse
     fixe, 5 ch = « 00:00 » exactement, et `h:mm:ss` (7 ch) élargit la boîte sans la tronquer.
     Pas de `mix-blend-mode` (le fond est celui de la carte), pas de `.pip-frame` (cadre global
     de `styles.css` à padding de bloc, trop épais pour 16 px). Aucune couleur nouvelle,
     `material-theme.scss` intouché (D22).
- **Conséquences** : vérifié avec l'user `verif-913`. À 1024 px, carte Item 1 (322.7 px) :
  `.product-stats` absente, aucun mot « revenu », gain « 1.00 » dans `.product-gain .bar-label`,
  chrono « 00:01 » de 16 px (`height`) avec bordure 1 px, même `top` que la barre (delta 0),
  gap 8 px à droite, largeur 32.8 px. Clic Produire (vitesse 500) : 20 lectures à 100 ms donnent
  `00:01` de bout en bout pendant que la barre passe de 21.6 à 100 %, jamais `00:00`. Item 6 avec
  `timeleft` édité dans le JSON : décroît de 1 s en 1 s (`00:56 00:55 00:54…`, la valeur lue
  dépend de l'écoulement que le backend applique entre l'écriture du fichier et le poll) ;
  `timeleft` > 1 h → « 1:01:31 », boîte élargie à 44 px, `scrollWidth ≤ clientWidth`. À 360 px
  avec x100 : les 6 lignes `.product-progress` restent sur une ligne (delta `top` 0), barre
  réduite à 253 px (242 px pour Item 6 en `h:mm:ss`), `scrollWidth` = `innerWidth`. Halo activé
  puis désactivé : gain lisible sur la partie remplie comme sur la piste, chrono lisible.
  `game-math.spec.ts` : 8 tests `formatDuration` (0, 1, 500, 2 950, 3 000, 61 001, 120 000,
  3 599 000, 3 599 001, 90 000 000, −5, NaN, Infinity) ; `product-card.spec.ts` : `.owned-label`
  → `.bar-label` dans 3 tests existants, 3 tests ajoutés (gain « 1.00 » / « 10.00 » sans
  « revenu », chrono 00:01 / 01:02 / 00:01 / 02:00, structure `.product-gain` puis
  `.product-timer[role=timer]`) ; 96 tests verts. Hauteurs et alignements ne se testent pas en
  jsdom. Bundle 897 kB (warning de budget D18, inchangé). **Hors périmètre** : un mode
  « cash/sec » à la AdCap pour les cycles sous 1 s (un upgrade de vitesse ramenant `vitesse`
  sous 1000 ms affiche `00:01` en permanence), un affichage du revenu unitaire ailleurs, un
  tooltip, l'en-tête et les boutons de la carte (D25 / D26 / D17 / D20 / D21), `UnlockList`
  (barres 4 px sans texte), le timer 100 ms. Note : au repos (`timeleft = 0`) la barre de
  production est pleine (`progress()` = 100, comportement antérieur à cette étape, inchangé).

## D29 — Frontend : `formatNumber` jusqu'à Y puis scientifique, actions de la carte en nowrap, barre de production sans transition et pleine sous 400 ms

- **Contexte** (phase 9.14, 2026-09-19) : deux défauts visibles dès qu'un monde est avancé
  (user `lucas` : money ≈ 6e17, Item 1 à `cout` ≈ 3,85e17 et `vitesse` = 125 ms).
  1. **Le bouton Acheter descendait sous Produire.** `formatNumber` s'arrêtait au suffixe T
     (10¹²) : au-delà, le montant s'allongeait sans limite (« Acheter x100 — 4772000000.00 T »)
     et, `mat-card-actions` étant en `flex-wrap: wrap` (D26), le bouton trop large passait à la
     ligne suivante.
  2. **La barre de production « démarrait au milieu ».** Material anime le remplissage de
     `mat-progress-bar` par `transition: transform 250ms` sur `.mdc-linear-progress__bar` ; le
     timer de `GameService` avance `timeleft` par pas de 100 ms (D15). Avec `vitesse` = 500 ms,
     le retour de ~80 % à 0 % en fin de cycle est étalé sur 250 ms, soit deux ticks et demi : la
     barre ne revient jamais visiblement à 0. Avec `vitesse` = 125 ms il n'y a plus qu'un ou deux
     pas par cycle : sans transition la barre paraîtrait stroboscopique, voire reculer (0 → 80 →
     60 → 40 %…) — repliement entre le tick et la vitesse qu'aucun CSS ne corrige.
- **Décision** : frontend seul, aucune règle de jeu, donnée ni requête GraphQL modifiée.
  1. **`formatNumber` : suffixes SI jusqu'à Y puis notation scientifique.** `UNITS` étendu à
     `P E Z Y` (10¹⁵ … 10²⁴) ; au-delà, `toExponential(2)` de la valeur d'origine, sans le `+`
     (« 1.00e27 », pas « 1.00e+27 »). Signe, `toFixed(2)`, point décimal fixe et espace avant le
     suffixe inchangés. **SI + scientifique** plutôt que les noms anglais d'AdCap / Cookie
     Clicker (million, billion… puis aa, ab) : cohérent avec les suffixes k / M / G / T déjà en
     place et testés, court (≤ 8 caractères hors signe), sans limite d'ordre de grandeur ; pas de
     suffixes R / Q (10²⁷ / 10³⁰) : la scientifique prend le relais. `formatNumber` étant
     partagée (bandeau money / score, `PalierList`, `AngelsPanel`, carte), les grands soldes
     deviennent courts partout — voulu.
  2. **Actions de la carte toujours sur une ligne.** `mat-card-actions { flex-wrap: nowrap }`
     (le `display: flex`, le `gap` et `.buy { margin-left: auto }` de D26 restent), boutons en
     `flex: 0 0 auto; white-space: nowrap` : un bouton qui rétrécit replierait son libellé sur
     deux lignes et le montant « descendrait » quand même. À 360 px (carte 328 px, 310 px pour
     les actions), « Reprendre » (91 px) + gap 8 + « Acheter x100 — 469.72 M » (220 px à 24 px de
     retrait) déborderait de 9 px : **`--mat-button-filled-horizontal-padding: 12px` sur `.buy`**
     (token Material, 24 px par défaut ; pas en dessous de 12) plutôt que toucher au libellé ou à
     la police ; le pire cas tient alors en ≈ 295 px. **La phrase de D26 « sur carte étroite
     Acheter passe seul à la ligne suivante » n'est plus vraie** : la marge automatique sert
     uniquement à pousser Acheter à droite.
  3. **Barre de production sans transition, pleine sous 400 ms.** Nouvelle fonction pure
     **`productionProgress({ vitesse, timeleft })`** et constante **`FAST_CYCLE_MS = 400`** dans
     `game-math.ts` : 0 si `vitesse ≤ 0` (garde-fou existant), **100 si `vitesse <
     FAST_CYCLE_MS`**, sinon `100 × (vitesse − timeleft) / vitesse` borné 0-100 ; `progress()`
     de `ProductCard` délègue (même schéma que `nextPalier` / `nextUnlock`). **400 ms = 4 ticks
     de 100 ms** : en dessous la barre n'a pas assez de pas pour être lisible, on la montre pleine
     en continu comme AdVenture Capitalist pour ses business trop rapides ; seuil strict (400 ms
     = barre normale). L'option « tick plus fin » a été écartée : le seuil est la réponse au
     repliement, pas un timer plus rapide (D15 intouché). **`remainingLabel` inchangé** : à
     125 ms le chrono affiche `00:01` en permanence (D28), accepté. Transition retirée par
     **`.product-gain ::ng-deep .mdc-linear-progress__bar { transition: none }`** dans
     `product-card.css` : `mat-progress-bar` est en `ViewEncapsulation.None`, ses `div` ne
     portent pas l'attribut d'encapsulation de la carte, d'où le `::ng-deep` borné à
     `.product-gain` (même technique que la pastille de `tab-bar.css`) ; la règle Material est à
     une classe, le sélecteur compilé (deux classes + un attribut) l'emporte sans `!important`.
     **Pas de `MATERIAL_ANIMATIONS { animationsDisabled: true }`** en providers du composant :
     il couperait aussi les ripples des boutons et l'animation de la barre d'achat
     (`.product-owned`), qui reste animée comme les barres d'`UnlockList`.
- **Conséquences** : vérifié dans le navigateur (backend et frontend d'une autre session sur
  3000 / 4200, mêmes sources). User `lucas`, x100, 1024 px : « Acheter x100 — 4.77 Z » (Item 1,
  « Reprendre » / « Arrêter »), « 469.72 M », « 2.52 G », « 13.50 G », « 72.16 G »,
  « 215.33 E » ; les 6 cartes ont Produire et Acheter au même `top` (delta 0), Acheter à
  9 px du bord droit de la carte (padding 8 + bordure 1) ; money « 632.68 P », score
  « 6.14 E ». À 360 px : mêmes deltas 0 sur les 6 cartes (y compris « Reprendre » sur Item 1),
  padding d'Acheter 12 px, largeur max 195.5 px, `scrollWidth` = `innerWidth` = 360. Item 1
  de `lucas` (125 ms, manager actif) : `transitionDuration` de la barre de production `0s`, de
  la barre d'achat `0.25s`, `aria-valuenow` = 100 sur 10 lectures à 100 ms, chrono `00:01`.
  User neuf `verif-914` (Item 1 à 500 ms, money 5 000) : Acheter x1 (« 2 / 25 ») puis Produire
  → première lecture 1, puis 21 / 41.2 / 60.8 / 81.2 / 100, jamais décroissante, 100 au repos.
  User `verif-915` (JSON : Item 1 `vitesse: 500`, `managerUnlocked: true`, `timeleft: 500`,
  Manager 1 `unlocked: true`) : 20 lectures à 100 ms = 34 54 74 94 **14** 34 54 74 94 **14** …
  chaque cycle repart du début. `game-math.spec.ts` : 13 cas `formatNumber` (999.5 → 3.2e17
  négatif, Infinity) + `FAST_CYCLE_MS` + 7 cas `productionProgress` ; `product-card.spec.ts` :
  vitesse 125 / timeleft 25 → `aria-valuenow` « 100 », 500 / 500 → « 0 » ; 119 tests verts.
  Largeurs, alignements et transitions ne se testent pas en jsdom. Bundle 897.6 kB (warning de
  budget D18, inchangé). Défaut préexistant non corrigé : `formatNumber(999.999e3)` donne
  « 1000.00 k » (arrondi de `toFixed`). **Hors périmètre** : revenu par seconde pour les
  produits rapides (AdCap le fait ; le gain d'une production reste dans la barre, D28), format de
  la quantité `xN`, libellé « Acheter », police / taille des boutons, tick de `GameService`,
  media / container query sous 360 px, backend.

## D30 — Frontend : chip « manager » à texte constant

- **Contexte** : depuis D20, la chip à droite du nom du produit changeait de texte selon
  `product.managerUnlocked` : `manager` quand l'automatisation tourne, `manager (en pause)` après
  un clic sur « Arrêter ». Le joueur trouve ce changement inutile : le bouton qui passe d'« Arrêter »
  à « Reprendre » et la barre de production qui s'arrête à 0 disent déjà que le manager est en
  pause. Une chip Material représente un attribut (ici : « ce produit a un manager »), pas un état
  transitoire, et le ternaire métier dans le template était le seul du composant.
- **Décision** (phase 9.15, 2026-09-19) : dans `product-card.html`, la chip devient
  `<mat-chip>manager</mat-chip>` — texte constant dès que `managerOwned` est vrai, quel que soit
  `managerUnlocked`. Le `@if (managerOwned())`, la classe `manager` et l'`aria-label`
  « Manager engagé » du `mat-chip-set` restent ; `productionLabel`, `onProductionClick`, l'input
  `managerOwned` et la mutation `basculerManager` (backend, `GameService`, `App`) sont inchangés :
  la pause reste fonctionnelle, seul son reflet dans la chip disparaît. Pas de style différent
  pour la chip en pause (opacité, couleur), pas de tooltip : choix explicite de l'utilisateur,
  « Reprendre » suffit. Ni `product-card.css` (le `flex-wrap: wrap` de `.product-title-row`
  protège toujours le nom sur carte étroite) ni `docs/GAME-RULES.md` (aucune règle ne change) ne
  bougent.
- **Conséquences** : « Reprendre » est le seul indicateur textuel de la pause (avec la barre de
  production à 0 et le chrono à `vitesse`, D28) ; un lecteur d'écran connaît l'état par le libellé
  du bouton, la chip n'a plus à le répéter. Le cas « fichier `userworlds` incohérent »
  (`managerUnlocked: true` sans manager possédé) est inchangé : chip absente, « Produire ». Le
  texte étant plus court, le passage de la chip sous le nom sur carte étroite (~328 px) devient
  plus rare. `product-card.spec.ts` : le test « manager possédé en pause » attend `manager` et
  vérifie que `(en pause)` n'apparaît nulle part dans la carte. D25 garde sa mention historique de
  la chip « (en pause) » (compte rendu d'une vérification passée à 700 px) ; D20 (seconde entrée)
  porte un amendement. Vérifié : `grep -rn "(en pause)" frontend/src` ne trouve plus que
  l'assertion négative du spec.

## D31 — Frontend : toggle du multiplicateur sélectionné en vidéo inversée, survol / focus teintés

- **Contexte** (phase 9.16, 2026-09-19) : le joueur ne voyait pas quel mode d'achat (x1 / x10 /
  x100 / max, D17) était sélectionné. Deux causes, toutes deux héritées du thème monochrome
  (D22). (1) Material peint le toggle coché avec `secondary-container` / `on-secondary-container`,
  que `$overrides` fixe à `#062211` / vert sur un fond de page `#001609` : contraste ≈ 1,2:1,
  invisible sur un écran un peu clair. (2) La coche M3 de l'état sélectionné est masquée
  (`hideSingleSelectionIndicator`) parce que le projet n'embarque pas Material Icons (VT323
  seule) : elle s'afficherait comme un carré vide. Par ailleurs le state layer de survol / focus
  est `on-surface` à 8 % / 10 % — imperceptible sur noir — et Material met `outline: none` sur le
  bouton interne : aucun retour au clavier.
- **Décision** : frontend seul, trois retouches, aucune règle de jeu ni requête modifiée.
  1. **`mat.button-toggle-overrides` dans `material-theme.scss`** (même bloc `html { … }` que
     `progress-bar-overrides`) : `selected-state-background-color: var(--mat-sys-primary)`,
     `selected-state-text-color: var(--mat-sys-on-primary)`, `state-layer-color:
     var(--mat-sys-primary)`, `hover-state-layer-opacity: 0.12`, `focus-state-layer-opacity:
     0.24` (noms vérifiés dans `button-toggle/_m3-button-toggle.scss` de Material 22.1). Le
     toggle sélectionné est donc en **vidéo inversée** (vert phosphore, texte noir), même langage
     que le bandeau d'erreur et le bouton Reset. **Override ciblé plutôt que changer le token
     global `secondary-container`** : ce token est lu par d'autres composants Material (chips
     sélectionnés, etc.) ; le toucher aurait inversé des surfaces qu'on ne voulait pas inverser.
     Le token reste, son commentaire est mis à jour. Pas de coche : `hideSingleSelectionIndicator`
     et l'absence de `mat-icon` (D22) sont maintenus.
  2. **Halo et focus dans `styles.css`** (effets CRT = peau, pas `app.css`) :
     `.multiplier.mat-button-toggle-group { overflow: visible }` — Material rogne le contenu du
     groupe (`overflow: hidden`, prévu pour ses angles arrondis) ; nos angles sont à 0, on
     libère le halo ; `app-root.crt-glow .multiplier .mat-button-toggle-checked { box-shadow:
     0 0 0.5rem color-mix(in srgb, var(--mat-sys-primary) 35%, transparent) }`, valeur
     identique à `.pip-frame`, conditionnée à `crt-glow` pour honorer le réglage « Halo » de
     Paramètres ; `.multiplier .mat-button-toggle-button:focus-visible { outline: 1px solid
     currentColor; outline-offset: -2px }` — **`currentColor` plutôt que `var(--mat-sys-primary)`**
     : le toggle focalisé peut être le sélectionné (fond vert), où un anneau vert serait
     invisible ; en `currentColor` il est vert sur noir et noir sur vert. Motif inset 1 px
     cohérent avec l'onglet actif (D26). Aucune couleur en dur hors `material-theme.scss`.
  3. **Test `app.spec.ts`** : stub `multiplier` à 10 → seul le `mat-button-toggle` « x10 » porte
     `mat-button-toggle-checked` ; clic sur le `button` interne de x100 → `multiplier()` vaut
     `100` (nombre, D17) et la classe a changé de toggle.
- **Conséquences** : vérifié dans le navigateur (frontend d'une autre session sur 4200, mêmes
  sources, user `lucas`). Toggle coché : `background-color: rgb(26, 255, 128)`, `color: rgb(0,
  22, 9)`, `box-shadow: color(srgb …/0.35) 0 0 8px` ; les trois autres `rgba(0, 0, 0, 0)` sans
  ombre ; clic x100 → classe sur x100 seul ; survol max → `.mat-button-toggle-focus-overlay` à
  `opacity: 0.12`, fond `rgb(26, 255, 128)` ; Tab depuis le champ user → focus sur le toggle
  coché, `outline: solid 1px rgb(0, 22, 9)`, `outline-offset: -2px`, overlay 0.24 ; Halo
  décoché dans Paramètres → `box-shadow: none`, fond vert conservé ; 360 px : `scrollWidth` =
  360 sur `html`, `body`, `app-root` et la toolbar, le halo ne crée pas de défilement. 120 tests
  verts (9 fichiers), bundle 898.3 kB (warning de budget D18, inchangé). Numérotation : le prompt
  visait 9.15 / D30, pris entre-temps par la chip « manager » ; cette décision est donc **D31 /
  9.16**. **Hors périmètre** : bouton cyclique unique à la AdCap, cadre `.pip-frame` autour du
  groupe, libellés, autres composants Material (boutons, onglets, chips, slide-toggles) qui
  auraient le même problème de contraste, nouveau réglage dans Paramètres.

## D32 — Frontend : logo + nom du monde, icônes des paliers avec repli, colonne « produit »

- **Contexte** (phase 9.17, 2026-09-19) : le monde (`world.logo`, `world.name`) et chaque palier
  (`PalierFields.logo`) sont déjà requêtés par `GetWorld`, mais l'interface n'utilisait que
  l'icône 64 px de la carte produit (D25). Les quatre tables `PalierList` (Managers, Upgrades,
  Angel upgrades, All unlocks) montraient l'id brut `idcible` — un entier dont la sémantique
  (`0` = tous les produits, `-1` = anges, sinon l'id d'un produit, GAME-RULES.md §Vocabulaire /
  §Unlocks) n'est lisible que le sujet en main. Un palier peut aussi avoir un `logo` vide ou une
  image absente du backend (`userworlds/*.json` édité à la main) : un `<img>` nu afficherait
  l'icône « image cassée » du navigateur.
- **Décision** : frontend seul, aucun changement de schéma ni d'opération GraphQL (tout est déjà
  requêté), `ProductCard` inchangée hors le déménagement de `ICON_BASE_URL`.
  1. **Fonctions pures dans `game-math.ts`** : `targetLabel(palier, products)` (`0` → « Global »,
     `-1` → « Anges », sinon `name` du produit d'`id === idcible` ou `#id` s'il n'existe pas) et
     `logoCandidates(palier, products, worldLogo)` (chemins à essayer dans l'ordre : `palier.logo`
     puis un repli tiré de la cible — logo du produit visé si `idcible > 0` et trouvé, logo du
     monde si `idcible === 0`, rien pour `-1` — sans chaîne vide ni doublon : les upgrades
     d'`origworld` portent déjà le logo de leur produit).
  2. **Composant présentationnel `GameIcon`** (`app-game-icon`, inputs `candidates` requis et
     `alt` défaut `''`) : affiche le premier candidat, passe au suivant sur `(error)`, plus
     d'`<img>` du tout quand la liste est vide ou épuisée ; l'hôte réserve 32 × 32 px pour que
     les cellules ne bougent pas. `ICON_BASE_URL` est exporté d'ici et importé par `ProductCard`
     (`iconUrl` inchangé). **Index en `linkedSignal` dont la source est une clé de contenu**
     (`candidates().join('\n')`) et non l'identité du tableau — écart assumé par rapport au
     prompt (« revient à 0 dès que la liste change ») : les parents appellent `logoCandidates`
     dans leur template, donc rendent un **nouveau tableau à chaque cycle de détection**, et le
     timer 100 ms de `GameService` (D15) recrée `world.products` dix fois par seconde ; sur
     l'identité, une image 404 serait retentée sans fin (requête réseau à chaque tick, image
     cassée clignotante). Sur le contenu, l'essai repart bien à zéro dès qu'un autre logo ou un
     autre monde arrive (reset, changement d'utilisateur), et une même liste ne relance rien —
     vérifié dans le navigateur : après deux `error` forcés sur Manager 1, l'`<img>` n'est pas
     revenu au bout de 2,5 s de polls. `linkedSignal` plutôt qu'un `effect` qui écrit un signal
     (motif Angular ≥ 19 pour un état local réinitialisé par un input).
  3. **`PalierList`** : nouveaux inputs `products` (défaut `[]`) et `worldLogo` (défaut `''`) ;
     colonnes `['logo', 'name', 'seuil', 'produit', 'ratio', 'typeratio', 'unlocked']` (+ `action`
     si `actionLabel`). La colonne `idcible` disparaît : l'id brut n'est plus affiché nulle part
     (`grep -rn idcible frontend/src/app/*.html` vide). La cellule logo `.logo-cell` fait la
     largeur de l'icône (`line-height: 0`, padding gauche nul). **`UnlockList`** : input
     `worldLogo`, icône devant `next.name`, aucune quand tout est débloqué. **`AngelsPanel`** :
     inputs `products` / `worldLogo` relayés à sa `PalierList`. Les quatre composants restent
     **sans injection** : `products` et `worldLogo` descendent d'`App` en inputs pour que les
     specs les montent sans serveur.
  4. **`App`** : `span.world-name` (icône 32 px sur `[world.logo]` — littéral de template mémoïsé
     par Angular, donc stable — puis `world.name`, `--mat-sys-title-medium`, `inline-flex`)
     entre `.brand` et le champ user, seulement si `game.world()` est défini ; `[products]` et
     `[worldLogo]` passés aux trois `PalierList`, à `UnlockList` et à `AngelsPanel`.
  5. **`alt=""`** sur toutes les icônes de tables et de toolbar : le nom est déjà dans la cellule
     ou à côté, un lecteur d'écran ne doit pas l'entendre deux fois. Aucune couleur ajoutée, pas
     de `mat-icon` (D22).
- **Conséquences** : 138 tests verts (10 fichiers, +18 : 8 cas `targetLabel` / `logoCandidates`,
  5 `game-icon.spec.ts` dont « même contenu dans un nouveau tableau → index conservé », 3
  `palier-list`, 1 `unlock-list`, 1 `app`), bundle 901.9 kB (warning de budget D18). Vérifié dans
  le navigateur (backend 3000 et frontend 4200 d'une autre session, mêmes sources) : toolbar
  `.world-name` = « World » avec `img.src = http://localhost:3000/icones/world.png` ; sans monde
  (user vide au chargement) ni `.world-name` ni icône ; Managers : `manager1.png … manager6.png`,
  colonne « produit » Item 1 … Item 6, en-tête `idcible` absent ; Unlocks : All unlocks → Global
  × 3 avec `all.png`, « Par produit » (monde neuf `test-9-17`) → `item1.png … item6.png` devant
  Unlock N.1, aucune icône sur « tous les paliers débloqués » ; Anges › Bonus : `angel.png`,
  Angel Upgrade 1 / 3 → **Anges**, Angel Upgrade 2 → **Global** (son `idcible` vaut 0 dans
  `origworld` : c'est un bonus global, le libellé dit vrai — le critère « Anges sur chaque ligne »
  du prompt supposait `-1` partout) ; repli : `error` forcé sur Manager 1 → `item1.png`, second
  `error` → plus d'`<img>`, cellule toujours à 36 px ; 360 px : `scrollWidth` 360 sur
  `app-root` et la toolbar, qui passe sur plusieurs lignes (« ISIS CAPITALIST » et le monde sur
  la première). **Comportement préexistant conservé** : vider le champ user après coup garde le
  dernier monde (et donc `.world-name`), comme les cases de stats (D14) ; seul un chargement sans
  user n'affiche rien. **Hors périmètre** : `ProductCard` sur `GameIcon`, tri / filtre des
  tables, tooltip avec l'id brut, ajout d'images côté backend, texte alternatif descriptif.

## D33 — Frontend : barres de la carte et chrono à 24 px, texte des barres en body-large 16 px

- **Contexte** (phase 9.18, 2026-09-20) : depuis D25 / D28 les deux `mat-progress-bar` de la
  carte produit font 16 px, avec un texte de 14 px (`--mat-sys-label-large`) centré dedans, et le
  chrono encadré fait 16 px en dur à côté. À 16 px le texte occupe 7/8 de la barre (serré) et les
  barres restent discrètes alors qu'elles sont l'élément principal de la ligne d'un business dans
  *AdVenture Capitalist*. Demande : augmenter la hauteur des deux barres. Affichage seul, aucune
  règle de jeu, donnée ni structure nouvelle.
- **Décision** : `product-card.css` est le seul fichier de code modifié (`product-card.ts` /
  `.html` / `.spec.ts` intouchés).
  1. **Variable `--product-bar-height: 24px` sur `.product`**, source unique des trois hauteurs :
     les deux tokens Material `--mat-progress-bar-track-height` /
     `--mat-progress-bar-active-indicator-height` de `.product mat-progress-bar` (la hauteur rendue
     est le max des deux, D25) et `height` de `.product-timer`. D28 avait déjà dû unifier deux
     règles identiques qui divergeaient ; le chrono doit rester exactement bord à bord avec la
     barre de production. Le sélecteur reste scopé à `.product` : pas de
     `mat.progress-bar-overrides` dans `material-theme.scss`, qui toucherait aussi les barres de
     `UnlockList` (4 px).
  2. **Texte des barres et du chrono en `--mat-sys-body-large`** (16 px) au lieu de
     `--mat-sys-label-large` (14 px) : un cran au-dessus dans l'échelle des raccourcis
     `--mat-sys-*`, 16 px dans 24 px = ratio 2/3 habituel des jeux. Pas
     `font-size: var(--mat-sys-label-large-size)` : cette taille est relevée à 1.15 rem par le
     thème (18.4 px, deux crans), et pas de `font-size` en px (convention « tailles relevées dans
     le thème seul »). `line-height: 1` reste posé après le raccourci `font`, `mix-blend-mode:
     difference` conservé sur `.bar-label`, aucune couleur ajoutée (D22), la règle `transition:
     none` de la barre de production (D29) intouchée.
  3. Rien d'autre ne bouge : `.icon` 64 px (nom 28 px de hauteur de ligne + gap 4 px + barre
     24 px = 56 px, 60 px avec le chip manager : l'icône couvre toujours les deux lignes ; à
     32 px de barre ce ne serait plus vrai), `min-width: 5ch` du chrono, `.product-progress`,
     `.product-header`, actions.
- **Conséquences** : vérifié avec l'user `verif-918` (monde neuf, serveurs backend 3000 /
  frontend 4200 d'une autre session, mêmes sources). À 1024 px (cartes de 408 px) :
  `getComputedStyle(...).height` = `24px` pour `.product-owned mat-progress-bar`, `.product-gain
  mat-progress-bar` et `.product-timer` ; `fontSize` = `16px` pour les deux `.bar-label` et le
  chrono ; delta de `top` chrono / barre de production = 0 ; `.icon` 64 px, `.product-heading`
  56 px ; chrono « 00:01 » large de 37.2 px ; `app-unlock-list mat-progress-bar` = `4px`. À
  360 px avec x100 (« Acheter x100 — 385.27 G » sur Item 6) : les 6 cartes font 326 px avec
  `scrollWidth === clientWidth`, barre de production 248.8 px, barre d'achat 218 px, delta `top`
  0 partout. Item 6 avec `timeleft` = 4 000 000 ms édité dans le JSON → « 1:06:34 », boîte élargie
  à 50 px (7 ch), toujours 24 px et sur la même ligne, barre réduite à 236 px, aucun
  débordement. Capture halo activé : « 1 / 25 » à 4 %, gain « 1.00 » sur la partie remplie d'Item
  1 en production (clic Produire) et « 622.08 k » sur la piste sombre d'Item 6 lisibles.
  `npm run build` : 902 kB (warning de budget D18, inchangé) ; `npm test` : 138 tests verts, aucun
  spec modifié (les hauteurs ne se mesurent pas en jsdom). **Hors périmètre** : les barres
  d'`UnlockList` et toute autre `mat-progress-bar`, la taille de l'icône, des boutons, du nom et
  du chip, les tokens de `material-theme.scss`.
- **Amendement** : depuis D44, le raccourci body-large suit la taille relevée du thème : texte
  de la barre et du chrono à 20 px (1,25 rem) ; barres et chrono restent à 24 px.

## D34 — Frontend : réglages CRT réalistes (vignette, grille, grain, bande, bruit, teinte, curseurs, reset)

- **Contexte** (phase 9.19, 2026-09-20) : l'onglet Paramètres (D22) n'avait que trois
  interrupteurs (Scanlines, Halo, Scintillement). L'utilisateur veut un écran plus proche d'un
  vrai tube cathodique de Pip-Boy, avec des réglages fins à la manière du panneau « Effects » de
  cool-retro-term. Affichage seul : aucune règle de jeu, aucune opération GraphQL, rien dans
  `backend/`.
- **Décision** :
  1. **Modèle pur `display-settings.ts`** (comme `game-math.ts`) : `DisplaySettings` (12 champs :
     `scanlines` / `glow` / `vignette` + leur niveau 0-100, `grid`, `grain`, `flicker`, `roll`,
     `noise`, `tint` parmi `TINTS` = green / amber / blue / white), `DEFAULT_DISPLAY` (statique
     actif, animé inactif, teinte verte, niveaux à 50), `normalizeDisplay(raw)` (jamais
     d'exception : non-objet / champ absent ou de mauvais type → défaut du champ, niveau borné
     0-100, NaN → défaut, teinte inconnue → `'green'`), `readStoredDisplay()`.
     `SettingsPanel` importe `DEFAULT_DISPLAY` d'ici, jamais de `game.service.ts` : il reste
     présentationnel et testable sans Apollo. `readStoredFlag` (D22) déménage dans ce fichier.
  2. **Une seule clé localStorage `isiscapitalist.display`** (JSON de `DisplaySettings`), écart à
     la convention « une clé par préférence » de D22 : douze réglages, un reset atomique, un seul
     `effect` (try/catch, comme `user` / `tab`). Les trois clés D22 (`isiscapitalist.scanlines` /
     `.glow` / `.flicker`) ne sont plus écrites ; `readStoredDisplay` les lit une fois en
     **migration** si la nouvelle clé est absente, puis les supprime (`removeItem`) dans tous les
     cas. JSON illisible → défauts. `GameService` : les trois signaux `scanlines` / `glow` /
     `flicker` et leurs trois `effect` sont remplacés par `readonly display =
     signal<DisplaySettings>(readStoredDisplay())`.
  3. **`SettingsPanel`** : un seul `model.required<DisplaySettings>()` (App lie
     `[(display)]="game.display"`), helper `patch(partial)`. Trois sections `h3` dans le
     `.pip-frame` : Écran (Teinte en `mat-button-toggle-group` Vert / Ambre / Bleu / Blanc,
     Vignette + curseur, Grille de pixels, Grain), Lumière (Scanlines + curseur, Halo + curseur),
     Animations (Scintillement, Bande de balayage, Bruit animé + aide « ignorées si votre système
     réduit les animations »), puis bouton `matButton="outlined"` « Réinitialiser les réglages »
     (`display.set({ ...DEFAULT_DISPLAY })`, jamais désactivé). Curseurs = `mat-slider` 0-100 pas
     5, `discrete`, `displayWith` « N % », `aria-label` sur l'`input matSliderThumb`, `[disabled]`
     quand le toggle est off (la valeur est conservée). Ordre DOM des 8 `mat-slide-toggle` figé
     (specs) : Vignette, Grille, Grain, Scanlines, Halo, Scintillement, Bande, Bruit. Teinte en
     `mat-button-toggle-group` et non `mat-select` : un overlay CDK monté sur `<body>` sortirait
     du filtre et resterait vert.
  4. **`App`** : host bindings `[class.crt-*]` (8 classes), `[attr.data-tint]` et
     `[style.--crt-scanlines]` / `--crt-glow` / `--crt-vignette` = niveau / 100 ; un
     `<div class="crt-overlay" aria-hidden="true">` en dernier enfant d'`app-root` porte (avec ses
     deux pseudo-éléments) les couches nouvelles ; les deux pseudo-éléments d'`app-root` restent
     aux scanlines (`::after`) et au scintillement (`::before`).
  5. **Effets dans `styles.css`** (global, D22 ; noir / transparent et `--mat-sys-primary` via
     `color-mix` seulement) :
     - scanlines : gradient inchangé, `opacity: min(1, calc(var(--crt-scanlines) * 2))` ; halo :
       `text-shadow 0 0 calc(0.7rem * var(--crt-glow))`, `box-shadow` des cadres et du toggle
       (D31) de rayon `calc(1rem * var(--crt-glow))` — **50 % = rendu D22** (0.25 / 0.35 rem /
       0.5 rem), un joueur qui n'a rien touché ne voit aucune différence sur ces deux effets ;
     - `.crt-overlay` : `position: fixed; inset: 0; pointer-events: none; z-index: 999` (sous
       1000 / 1001), masqué (`display: none`) si aucune des cinq classes n'est posée ;
       `background-image` à deux couches pilotées par des variables (`--crt-vignette-layer`,
       `--crt-roll-layer`, `none` par défaut) ;
     - vignette : `radial-gradient(ellipse, transparent 55%, rgb(0 0 0 / calc(0.9 *
       var(--crt-vignette))))`, `border-radius: calc(24px * var(--crt-vignette))` et
       `box-shadow: 0 0 0 4rem #000, inset 0 0 calc(4rem * var(--crt-vignette)) rgb(0 0 0 / 0.6)`
       **sur l'overlay** et non sur `app-root` comme d'abord envisagé : `body` et `app-root` ont
       la même surface (arrondir `app-root` ne montrerait rien) et une ombre interne sur
       `app-root` serait recouverte par les fonds de ses enfants ; l'ombre externe de l'overlay
       peint en noir les coins hors de l'arrondi ;
     - grille : `.crt-overlay::before`, `repeating-linear-gradient(to right, transparent 0 2px,
       rgba(0,0,0,0.12) 2px 3px)` ; grain : `.crt-overlay::after`, SVG `feTurbulence`
       (`baseFrequency` 0.8, `feColorMatrix saturate 0`, tuile 200 px) en data URI, opacité 0.06 ;
       bruit animé : le même pseudo-élément, `@keyframes pip-noise` 0.4 s `steps(4)` sur
       `background-position` (un seul calque quand grain et bruit sont actifs) ;
     - bande : seconde couche `linear-gradient(transparent, color-mix(primary 8 %), transparent)`
       de `100% 20vh`, `@keyframes pip-roll` sur `background-position-y` (−20 vh → 100 vh, 8 s,
       linéaire, infini) ;
     - `prefers-reduced-motion: reduce` : `pip-roll` et `pip-noise` coupés, la bande disparaît
       (`--crt-roll-layer: none`), le bruit animé se comporte comme le grain ;
     - **teinte** : `filter` sur `app-root[data-tint]` — ambre `hue-rotate(-105deg)`, **bleu
       `hue-rotate(70deg)`** (le +51° proposé donnait un cyan à 197° ; vert #1aff80 = 146°, +70°
       ≈ 216°), blanc `saturate(0) brightness(1.25)` ; vert = aucune règle (le filtre
       recomposite tout l'écran à chaque tick de 100 ms, le défaut ne doit rien coûter).
       `app-root:not([data-tint='green'])` reçoit `background: var(--mat-sys-surface)` : sans
       cela le fond de `body` (même couleur, mais hors du filtre) restait vert sous les zones
       transparentes d'`app-root`. Un `filter` fait d'`app-root` le bloc conteneur de ses
       descendants `fixed` : sans effet, `app-root` fait déjà `100dvh`.
- **Conséquences** : vérifié sur le serveur 4200 d'une autre session (mêmes sources), localStorage
  vidé : classes `crt-glow crt-grain crt-grid crt-scanlines crt-vignette`, `data-tint="green"`,
  `style="--crt-scanlines: 0.5; --crt-glow: 0.5; --crt-vignette: 0.5"`, `filter: none`, gradient
  de vignette à alpha 0.45, `text-shadow` de `.brand` 5.6 px (0.35 rem) ; curseur Vignette à 100
  → alpha 0.9, rayon 24 px ; Halo à 100 → 11.2 px ; Ambre → `hue-rotate(-105deg)`, icônes ambre
  aussi ; Réinitialiser → JSON des défauts ; `isiscapitalist.flicker = 'on'` + `.glow = 'off'`
  sans nouvelle clé → au rechargement `crt-flicker` posé, `crt-glow` absent, les trois anciennes
  clés à `null`. Onglet Produits, tout actif et curseurs à 100 : texte 16 px des barres lisible,
  `scrollWidth === clientWidth` = 1280 sur `app-root`. `npm run build` : 948 kB (warning de budget
  D18 ; +46 kB pour `MatSliderModule` / `MatButtonToggleModule` dans le panneau),
  `settings-panel.css` 1 kB ; `npm test` : 160 tests verts (12 fichiers, dont
  `display-settings.spec.ts`). Aucune valeur fixe baissée au point de contrôle. **Hors
  périmètre** : déformation réelle (`feDisplacementMap`, 3D), burn-in, aberration chromatique,
  jitter, sons, palettes Material alternatives ; `material-theme.scss`, `product-card.*`,
  `tab-bar.*` et les icônes sont intouchés.

## D35 — Icônes « écran Pip-Boy » rendues par le frontend (canvas)

- **Contexte** (20/09/2026, prompt `docs/prompts/frontend-pixel-icons-canvas.md`) : les icônes du
  thème « Nuka Capitalist » étaient converties en 96 × 96 et 4 verts par un script Python côté
  backend ; l'utilisateur voulait garder les images d'origine et laisser le frontend les pixeliser
  et les colorier.
- **Décision** : le backend sert les sources couleur 512 × 512 (`public/icones/`), avec CORS posé
  **avant** les fichiers statiques (`main.ts`) pour que le canvas ne soit pas « tainted ».
  `frontend/src/app/pixel-art.ts` porte à l'identique l'ancien script (réduction lissée → alpha
  binarisé → luminance → autocontraste 2 % → gamma 0,65 → seuils 0 / 60 / 130 / 205 → 4 verts) et
  produit une data URL ; `GameIcon` l'affiche (input `pixelIcons`, défaut vrai, `image-rendering:
  pixelated`), et retombe sur l'image couleur si le canvas est indisponible (jsdom).
- **Conséquences** : les 4 verts de `PIPBOY_GREENS` sont la seule couleur écrite hors de
  `material-theme.scss` (un canvas ne lit pas les tokens CSS). `pixel-art.spec.ts` teste les
  fonctions pures. Pas de réglage utilisateur pour revenir à la couleur (input seulement).

## D36 — Conformité au sujet : le cahier des charges prime sur les choix de la phase 9

- **Contexte** (05/10/2026) : le sujet frontend (`frontendangularsignal.pdf`) est arrivé après la
  phase 9, construite sans lui. La recette (`docs/RECETTE.md`) contre le cahier des charges
  (`docs/CAHIER-DES-CHARGES.md`) classait 1 exigence backend et 25 exigences frontend « Partiel »
  ou « Non conforme ». Consigne de l'utilisateur : **se conformer au cahier des charges**.
- **Règle générale** : une décision antérieure qui contredit une exigence est remplacée ; un ajout
  hors sujet qui ne contredit rien est gardé (thème cathodique D22 / D34, rendu Pip-Boy D35).
- **Backend (phase 10.1)** :
  - **Anges** : `floor(150 × √(score / 10¹⁵)) − totalangels` (RG-09) remplace la formule linéaire
    de **D20** (anges). Total plafonné à 2 147 483 647 (`MAX_INT32`), atteint au-delà d'un score de
    ~2·10²⁹ seulement.
  - **Schéma** : retour au schéma du sujet. `totalangels` / `activeangels` redeviennent `Int!`
    (**D27 annulée** : la racine carrée les garde petits) ; la mutation `basculerManager` et la
    pause des managers (**D20**, pause) sont retirées, le sujet n'en parle pas et un client conforme
    ne pourrait pas s'en servir sur un autre serveur. Seul écart restant : `lastupdate: Float!`
    (D6), le sujet lui-même hésitant entre `String!` et `Int!` (ambiguïté A1).
  - **Règles ajoutées retirées** : `engagerManager` n'exige plus d'exemplaire du produit (**D24
    annulée**) et `lancerProductionProduit` n'est plus refusé à 0 exemplaire (**D12**, première
    moitié) : un client écrit d'après le sujet ne connaît pas ces règles et divergerait. Le no-op
    pendant une production en cours (D12, seconde moitié) est gardé.
  - **Accélération** (RG-07, « la barre de progression accélère ») : un bonus de vitesse divise
    aussi le temps restant d'une production en cours (`ceil(timeleft / ratio)`, borné à la
    nouvelle vitesse) au lieu de le plafonner.
  - **Même calcul des deux côtés** : `advanceProduction(product, elapsed)` est extraite
    d'`updateWorld` et recopiée à l'identique dans le client (le sujet le recommande).
  - **Sécurité** (défaut D-01 de la recette) : le pseudo passe par `encodeURIComponent` (et `*` →
    `%2A`) avant de devenir un nom de fichier ; `getWorld(user: "../x")` reste dans `userworlds/`.
- **Frontend, logique (phase 10.2)** — **D14 et D15 remplacées** : le client n'interroge plus le
  serveur toutes les 2 s et ne se contente plus d'animer `timeleft`. Il est autonome comme le
  demande le sujet : `world` est un `linkedSignal` de la réponse de `getWorld` (chargée au
  démarrage, au changement de pseudo, sur Refresh, après un reset et après un échec de
  transmission) ; la boucle `calcScore` (100 ms, `performance.now`) avance chaque produit avec
  `advanceProduction` et crédite argent et score par `productionDone` ; chaque action (production,
  achat + unlocks / allunlocks, manager, cash upgrade, angel upgrade) est appliquée au monde local
  par des fonctions immuables de `game-math.ts` (`replaceProduct`, `applyBonus`, `applyUnlocks`),
  puis transmise par la mutation du sujet. Un refus du serveur affiche son message dans le
  snack-bar et recharge le monde (le serveur fait foi). Le bandeau d'erreur est remplacé par le
  snack-bar `snackmessage` (F-16, F-20). Pseudo : formulaire signal `form()` + `[formField]`,
  `commitName` sur Entrée, clé `username` (l'ancienne `isiscapitalist.user` est migrée), défaut
  `Captain<n>` aléatoire, bouton Refresh (`refreshWorld`). Adresse du serveur en un seul endroit
  (`server.ts`, signal `SERVER`, exposé comme `GameService.server`).
- **Frontend, interface (phase 10.3)** — **D19, D22 (barre d'onglets), D23 / D25 (barre d'achat de
  la carte), D26, D28 (chrono mm:ss), D29 (`formatNumber`), D30 et D31 remplacées** par la mise en
  page du sujet : en-tête (logo + nom du monde, argent, bouton multiplicateur unique « Buy x1 →
  x10 → x100 → Max », champ « Your ID » + Refresh), bandeau gauche de boutons (Unlocks, Cash
  Upgrades, Angel Upgrades, Managers, Investors, plus Paramètres) badgés par `matBadge` (nombre
  d'éléments achetables ; anges à réclamer pour Investors), produits sur deux colonnes, fenêtres
  superposées `Modal` (Close, Échap, clic sur le fond, `cdkTrapFocus`) qui ne listent que les
  paliers non débloqués. Carte produit du sujet : image ronde cliquable (production, F-10) avec la
  quantité superposée, barre de production avec le gain, bouton « x<n> — <coût> » et temps restant
  à côté. Pipes `bigvalue` (4 chiffres significatifs et `10ⁿ`) et `second` (`hh:mm:ss.d`). Le
  thème cathodique (D22 couleurs / police, D34) et le rendu Pip-Boy (D35) restent : le sujet laisse
  le design libre. Sur téléphone (< 700 px), le menu passe au-dessus des produits et la page entière
  défile.
- **Monde final (phase 10.4, F-33)** : le casting validé de `docs/THEME.md` est appliqué à
  `origworld.ts` (noms et images ; chiffres inchangés), avec des noms *proposés* pour les cases
  restantes et deux icônes dessinées (`global.png`, `bobblehead.png`). Équilibrage vérifié par
  `backend/scripts/simulate-balance.mjs` (règles réelles du moteur, joueur actif, pas de 100 ms) :
  6 managers en 8 min 34 s, score 10⁹ en 17 min, premier ange en 28 min, 10¹² en 58 min, tous les
  upgrades en moins d'une heure ; sans reset, 150 anges en 57 h ; avec un reset dès que les anges
  doublent, 10 anges à 1 h 30, puis 20, 40, 80, et 150 en 32 h. Début rapide, puis courbe d'idle
  game classique ; aucun chiffre n'a été modifié.
- **Budget du bundle** (défaut D-04) : 987 kB après l'ajout du formulaire signal, du badge et du
  CDK a11y (Material + Apollo forment l'essentiel) ; budget initial relevé à 1,1 Mo (avertissement)
  / 1,5 Mo (erreur) dans `angular.json`.
- **Conséquences** : les parties créées sous D20 dont les anges dépassent 2^31 (seule `lucas`, à
  4,6·10²³) ne peuvent plus être servies (`Int cannot represent…`) : à réinitialiser à la main.
  Tests : `world-engine.spec.ts` (advanceProduction, accélération, nouvelle formule) et
  `world.e2e-spec.ts` (manager sans exemplaire, production à 0, `basculerManager` absent, pseudo
  « ../ », reset à 300 anges pour un score de 4·10¹⁵) ; les noms du monde y sont lus dans
  `origworld`.

## D37 — Disposition au choix : celle du sujet (défaut) ou la barre d'onglets de la phase 9

- **Contexte** (05/10/2026) : D36 a remplacé la barre d'onglets du bas (D22) par la mise en page
  du sujet. L'utilisateur veut pouvoir revenir à l'esthétique précédente, au choix, depuis les
  options.
- **Décision** : nouveau réglage `layout` dans `DisplaySettings` (`'sujet'` par défaut,
  `'onglets'`), persisté dans le JSON `isiscapitalist.display` (valeur inconnue → `'sujet'`),
  choisi dans Paramètres → Écran → « Disposition » (`mat-button-toggle-group.layout` : « Menu à
  gauche (sujet) » / « Onglets en bas »). En `'onglets'`, `App` affiche la barre du haut de la
  phase 9 (titre, logo + nom du monde, pseudo + Refresh, multiplicateur en 4 boutons
  `.multiplier-toggle` avec le style D31, cases argent / score / anges / bonus) et la `TabBar`
  rétablie (6 onglets, un écran par onglet, onglet mémorisé sous `isiscapitalist.tab`). Le contenu
  des écrans et des fenêtres est écrit une seule fois dans des `ng-template` (produits, managers,
  cash upgrades, angel upgrades, unlocks, Investors, Paramètres) placés par `ngTemplateOutlet`.
  La logique de jeu (client autonome, D36) est la même dans les deux dispositions. Changer de
  disposition garde le joueur sur ses réglages (fenêtre Paramètres ↔ onglet Paramètres).
  `SettingsPanel` reçoit `showTitle` (faux dans la fenêtre, qui porte déjà le titre).
- **Ce qui n'est pas rétabli** : la carte produit de la phase 9 (barre « quantite / seuil »,
  bouton Produire / Arrêter / Reprendre — la mutation de pause n'existe plus, D36) et les nombres
  en k / M (le pipe `bigvalue` du sujet sert partout). La pastille de l'onglet Anges compte les
  angel upgrades achetables (comme les autres onglets), et non plus les anges gagnables.
- **Conséquences** : la conformité est inchangée, la disposition du sujet restant celle par
  défaut. La règle « page entière qui défile sous 700 px » ne vaut que pour `'sujet'`
  (`:host(.layout-sujet)`) ; en `'onglets'` la barre reste collée en bas, avec la pagination
  Material en fenêtre étroite (D26). Tests : `display-settings.spec.ts`, `settings-panel.spec.ts`,
  `tab-bar.spec.ts` (rétabli), `app.spec.ts` (disposition « onglets » et bascule) — 173 tests.

## D38 — Images de la version du 05/10/2026 de « Nuka Capitalist.pdf »

- **Contexte** : l'utilisateur a complété le PDF du thème (Bureau, 10 pages au lieu de 4) avec 10
  images placées sous les rubriques manager / palier / upgrade, sans nouveau nom, et demandé leur
  intégration, avec l'upgrade 2 sur les Armes.
- **Décision** : chaque image va à la case sous laquelle elle est placée dans le PDF (détail et
  réglages de détourage dans `docs/THEME.md`). Les noms *proposés* suivent les images : paliers
  Nuka-Cola « Nuka-Cola Classic » / « Nuka-Cherry » / « Nuka-Cola Quantum » (le PDF met la
  Quantum au palier 100), palier Armes 25 « Gunslinger », manager des Armes « Commando » (Vault Boy
  à la mitraillette), upgrade 1 « Affiche Nuka-Cola », upgrade 2 « Pinkie Pie » avec
  `idcible: 4` (Armes). Aucun chiffre ne change (seuils, ratios, coûts).
- **Conséquences** : le Stimpak n'a plus d'upgrade propre et les Armes en ont deux (upgrade 2 à
  15 000 $, upgrade 4 à 2,16 M$). Simulation (`simulate-balance.mjs`) : tous les managers en
  5 min 34 s (8 min 34 s avant), premier ange en 20 min (28), 10¹² en 49 min (58) ; 150 anges en
  52 h sans reset (57), 29 h avec resets (32). Les parties existantes gardent leurs anciens noms
  et images jusqu'à leur prochain reset. Tests backend inchangés et verts (86 + 10), les noms y
  étant lus dans `origworld`.


## D39 — Mise en ligne sur le VPS : https://capitalist.lucaslopvet.fr

- **Contexte** : l'utilisateur a demandé de déployer l'application sur son VPS (Ubuntu 25.04,
  alias SSH `MonServeurAntigravity`, `152.228.129.169`), qui héberge déjà d'autres sites derrière
  Nginx + certbot, avec ufw (seuls 22, 80 et 443 ouverts) et Node 24.
- **Décision** : un seul domaine. Nginx sert le build Angular (`/opt/isiscapitalist/frontend`)
  et relaie `/graphql` et `/icones/` au backend NestJS, lancé par le service systemd
  `isiscapitalist` (utilisateur système `capitalist`, `127.0.0.1:3200` côté Nginx, port fermé
  par ufw, `NODE_ENV=production`, écriture limitée à `userworlds/` et `src/` par
  `ProtectSystem=strict`). Certificat Let's Encrypt (`certbot certonly --nginx`, renouvellement par
  `certbot.timer`), HTTP redirigé vers HTTPS. Pas de Docker ni de PM2 : un seul processus Node,
  systemd suffit.
- **Frontend** : `SERVER` (`server.ts`) vaut `http://localhost:3000/` en mode dev (`ng serve`,
  tests) et l'origine de la page dans le build de production (`isDevMode()`). Le front parle donc
  à son propre hôte : ni CORS, ni canvas « tainted » pour les icônes Pip-Boy (D35). Pour jouer sur
  le monde d'un autre groupe (F-34), `server.ts` reste le seul endroit à modifier.
- **Déploiement** : `deploy/deploy.sh` (Git Bash) compile les deux applications, envoie une
  archive par SSH et lance `deploy/remote-install.sh` sur le serveur. Celui-ci remplace le code
  (rsync `--delete`) sans toucher à `userworlds/` ni à `node_modules/`, fait `npm ci --omit=dev`,
  installe le service et le site Nginx (`deploy/*.service`, `deploy/*.conf`, versionnés), puis
  redémarre. Sous Windows, il utilise le `ssh.exe` du système, seul à passer par le service
  `ssh-agent` qui garde la clé (protégée par passphrase) déverrouillée. `.gitattributes` force LF
  sur `deploy/` et les `*.sh` (`core.autocrlf=true` sur le poste).
- **Conséquences** : avec `NODE_ENV=production`, Apollo désactive l'introspection et la sandbox
  sur `/graphql` en ligne ; le playground reste celui de `npm run start:dev` en local. Les mondes
  des joueurs en ligne vivent dans `/opt/isiscapitalist/backend/userworlds/` (non sauvegardés).

## D40 — Achats barrés en fin de liste, dernier palier sur la carte produit

> **Remplacée par D47 pour la fenêtre Managers** (managers engagés retirés de la liste, comme le
> demande la grille d'évaluation) ; inchangée pour les upgrades et les allunlocks.

- **Contexte** : retours du joueur (étape 10.8, prompt `docs/prompts/settings-server-purchased-paliers-snack-tint.md`).
  Un manager engagé ou un upgrade acheté disparaissait de sa fenêtre, comme le demande le sujet
  (F-18, F-25, F-27, F-31 : lister ce qui n'est **pas encore** débloqué) ; le joueur veut garder
  la trace de ses achats. Il veut aussi voir sur la carte d'un produit le palier qu'il a atteint.
- **Décision** : `PalierList` affiche d'abord les paliers non débloqués (inchangés : ordre du
  monde, bouton actif si le solde suffit), puis les débloqués, dans l'ordre du monde, en lignes
  `.done` atténuées et barrées, avec à la place du bouton une mention texte (`doneLabel` :
  « Engagé », « Acheté », « Atteint ») — le barré seul ne serait pas annoncé par un lecteur
  d'écran. `emptyText` passe au-dessus du tableau barré quand tout est débloqué. Les badges ne
  comptent toujours que l'achetable ; `UnlockList` (prochain palier de chaque produit) ne change
  pas. `ProductCard` montre le dernier palier atteint (plus grand seuil débloqué de
  `product.paliers`) en sous-titre et met son image en tête des candidats de l'icône, avec repli
  sur l'image du produit ; la ligne du sous-titre est réservée même vide, pour aligner les cartes.
- **Écart assumé avec le sujet** : la partie « non débloqués » de chaque fenêtre reste conforme ;
  les éléments débloqués viennent en plus, après, et ne sont pas sélectionnables. Comme Cookie
  Clicker, et contrairement à AdVenture Capitalist qui les retire.
- **Conséquences** : 6 paliers seulement ont une image propre (Nuka-Cola Classic et Quantum,
  Gunslinger, Fat Man, Ogive MIRV, Missile nucléaire) ; pour les autres, seul le sous-titre change.
  Les allunlocks ne changent pas les cartes. Après un reset, la carte revient au produit.

## D41 — Adresse du serveur modifiable dans Paramètres, teinte des overlays

- **Contexte** : F-34 demande de pouvoir jouer sur le monde d'un autre groupe en changeant
  l'adresse du serveur ; il fallait jusqu'ici modifier `server.ts` et recompiler. Les
  notifications (snack-bar) restaient vertes quelle que soit la teinte choisie (D34).
- **Décision (serveur)** : cadre « Serveur » dans `SettingsPanel`, séparé des réglages
  d'affichage (« Réinitialiser les réglages » ne le touche pas). Saisie validée par Entrée ou
  « Appliquer » via `normalizeServerUrl` (`server.ts`, fonction pure : http(s) uniquement,
  origine + chemin terminé par « / », requête et ancre ignorées), sinon message d'erreur en
  `mat-hint` (`mat-error` exige un contrôle de formulaire). `GameService.setServer` met à jour
  `SERVER`, mémorise l'adresse sous `isiscapitalist.server` (l'adresse par défaut efface la clé),
  affiche « Serveur : … » et relance `getWorld`. « Défaut » revient à `DEFAULT_SERVER`. L'endpoint
  Apollo devient `uri: () => SERVER() + 'graphql'`, fonction évaluée à chaque opération : sans
  elle, la chaîne calculée au démarrage ignorait tout changement. Un `mat-hint` prévient,
  sans bloquer, qu'une page https peut voir un serveur http bloqué par le navigateur (contenu mixte).
- **Décision (teinte)** : `App` pose `data-tint` sur `OverlayContainer.getContainerElement()`
  (le conteneur est un enfant de `<body>`, hors du filtre de `app-root`) et `styles.css` applique
  le filtre de la teinte à chaque `.cdk-overlay-pane`. Pas sur le conteneur lui-même : la CDK
  d'Angular 22 place ses overlays dans un `div.cdk-overlay-popover[popover]` de la top layer du
  navigateur, que le filtre d'un ancêtre n'atteint pas (constaté dans Chrome ; jsdom ne le
  reproduit pas). Pas de `panelClass` non plus : il ne suivrait pas un changement de teinte
  pendant qu'une notification est ouverte.
- **Conséquences** : un serveur injoignable est signalé par le message existant « Erreur de
  chargement du monde » ; le dernier monde reste affiché jusqu'à correction ou « Défaut ». Un
  serveur sans CORS sur `/icones` donne des icônes en couleur (repli D35). Les effets CRT
  (scanlines, halo…) ne s'appliquent pas aux notifications, seule la teinte.
- **À savoir (onglets, même étape)** : `material-theme.scss` relève les tokens `-size` du thème
  (title-medium 1,35 rem…) mais les raccourcis `var(--mat-sys-title-medium)` gardent la taille
  Material par défaut (1 rem). La barre d'onglets utilise donc les tokens séparés ; ses libellés
  passent de 14 px (raccourci `label-large`) à 21,6 px, et la pagination apparaît sous ~650 px
  au lieu de ~500 px. Les autres `font: var(--mat-sys-…)` du projet ont le même décalage.
- **Amendement** : décalage corrigé dans le thème par D44 ; la barre d'onglets utilise de nouveau
  le raccourci, au même rendu.

## D42 — Engager un manager exige de nouveau un exemplaire du produit cible

- **Contexte** (12/10/2026) : demande du joueur, « ne pas pouvoir acheter de manager pour un objet
  qu'on n'a pas acheté ». D36 avait retiré la règle D24 pour coller au sujet : dans un monde neuf,
  on pouvait engager le manager d'un produit à `quantite: 0` et payer pour une barre qui tourne à
  gain nul.
- **Décision** : règle D24 rétablie aux deux niveaux, **écart assumé au sujet** (B-11, F-19 ne
  la prévoient pas).
  - **Backend** : dans `engagerManager`, après « déjà engagé » et avant « pas assez d'argent »,
    `product.quantite === 0` → `Aucun exemplaire de <produit> : achetez le produit avant
    d'engager son manager`. Rien n'est débité.
  - **Frontend** : fonction pure `blockedManagerNames(world)` (`game-math.ts`) = managers non
    engagés dont le produit cible est à 0 ; `App.blockedManagers` la passe à la seule
    `PalierList` des managers par l'input `blockedNames` (bouton « Hire ! » grisé, ligne non mise
    en avant) et l'exclut du badge Managers (F-21) ; `GameService.hireManager` ignore l'action
    comme quand l'argent manque.
- **Conséquences** : un client d'un autre groupe, écrit d'après le sujet, se voit refuser
  l'engagement sur notre serveur tant qu'il n'a pas acheté le produit (il recharge son monde) —
  c'est la raison du retrait en D36, acceptée ici. `updateWorld` n'est pas touché ; un monde
  `userworlds/` déjà engagé à 0 exemplaire reste tel quel. Upgrades et angel upgrades inchangés.

## D43 — Formule des anges réglable par compte (démonstration)

- **Contexte** (12/10/2026) : avec la formule du sujet `150 × √(score / 10¹⁵)`, le premier ange
  arrive vers 4,45·10¹⁰ de score, hors de portée d'une démonstration de quelques minutes ; il
  fallait éditer le fichier `userworlds/` pour montrer le reset et les angel upgrades.
- **Décision** : le diviseur du score devient une donnée **du compte**, **écart assumé au
  schéma du sujet** (ajouts seulement, aucun champ du sujet modifié).
  - **Schéma** (backend et frontend) : `World.angeldivisor: Float!` (10¹⁵ dans `origworld`) et
    `changerFormuleAnges(user: String!, diviseur: Float!): World`.
  - **Backend** : `totalAngelsFor(score, divisor = SUBJECT_ANGEL_DIVISOR)`, `angelsEarned` lit
    `world.angeldivisor` ; `resetWorld` le recopie dans le nouveau monde (réglage du compte, pas
    de la partie). La mutation suit read → updateWorld → save et refuse un diviseur nul, négatif
    ou non fini (`Le diviseur doit être un nombre strictement positif`). `readUserWorld` donne
    10¹⁵ aux mondes sauvegardés avant D43 (le champ est non nul).
  - **Frontend** : mêmes fonctions dans `game-math.ts` (+ `ANGEL_FORMULAS`, `angelFormulaLabel`) ;
    Paramètres → cadre « Démonstration » (affiché quand un monde est chargé) avec trois choix :
    **Sujet** (10¹⁵), **Démo** (10⁶ : 150 anges à 10⁶ de score), **Express** (10³ : 150 anges à
    10³). `GameService.setAngelDivisor` l'applique au monde local puis envoie la mutation. La
    fenêtre Investors affiche la formule en vigueur.
- **Conséquences** : les anges déjà acquis ne bougent pas quand on change de formule ; revenir à
  « Sujet » après une démo donne 0 ange au reset tant que le score ne rattrape pas `totalangels`
  (borné à 0, comme pour les mondes de D20). Un client écrit d'après le sujet ignore le champ et
  la mutation : rien ne change pour lui. N'importe quel diviseur positif peut être posé depuis le
  playground ; l'interface ne propose que les trois préréglages.

## D44 — Raccourcis `--mat-sys-<rôle>` alignés sur les tailles relevées du thème

- **Contexte** (12/10/2026, constat de l'étape 10.8, D41 « À savoir ») : `material-theme.scss`
  relève les tokens `-size` de neuf rôles (body, label, title : VT323 paraît ~20 % plus petite que
  Roboto), mais `mat.theme` émet aussi pour chaque rôle un raccourci `--mat-sys-<rôle>`
  (« graisse taille / interligne police ») calculé avec la taille Material par défaut. Les
  composants Material lisent les tokens séparés et étaient agrandis ; nos 23 règles
  `font: var(--mat-sys-…)` lisent le raccourci et ne l'étaient pas (title-medium 16 px au lieu de
  21,6, label-large 14 au lieu de 18,4, body-large 16 au lieu de 20…). D25 et D33 avaient choisi
  leurs rôles d'après ce décalage ; la barre d'onglets de 10.8 le contournait par les tokens séparés.
- **Décision** :
  1. **Correction centrale** dans `material-theme.scss` : map `$pip-type-sizes` (les neuf tailles,
     valeurs inchangées) et fonction `pip-typescale()` qui en tire, pour chaque rôle, le token
     `<rôle>-size` et le raccourci `<rôle>`, fusionnés dans les `$overrides` de `mat.theme`. Les
     raccourcis sont des clés acceptées : `system-level-typography`
     (`@angular/material/core/tokens/_system.scss`) émet chaque clé de `md-sys-typescale-values`
     par `map.get($overrides, $name) or $value`. Le raccourci est recomposé à partir des tokens
     séparés, `var(--mat-sys-<rôle>-weight) var(--mat-sys-<rôle>-size) / var(--mat-sys-<rôle>-line-height)
     var(--mat-sys-<rôle>-font)` : une seule source par taille, et il suit la graisse,
     l'interligne et la police du thème. Interlignes Material conservés (1,5 rem pour body-large
     à 1,25 rem, 1,75 rem pour title-large à 1,7 rem…). headline / display ne sont pas relevés,
     leurs raccourcis étaient déjà cohérents. Aucun composant Material utilisé ne lit les
     raccourcis (seuls `grid-list` et `typography-hierarchy`, absents du projet) : seules nos
     règles changent.
  2. **Les 23 occurrences prennent la taille relevée**, sans exception :
     - `app.css` : `.money .label` body-large 16 → 20 px ; `.user-field` body-medium 14 → 17,6
       (texte saisi compris : le raccourci posé sur l'hôte du `mat-form-field` l'emporte sur le
       token du champ) ; `.stat` body-medium 14 → 17,6 ; `.section-title`, `.topbar .world-name`,
       `.stat dd` title-medium 16 → 21,6 ; `.brand` title-large 22 → 27,2. `.world-name`
       (headline-small) et `.money` (headline-medium) inchangés.
     - `product-card.css` : `.quantite` label-large 14 → 18,4 ; `.bar-label` et `.product-timer`
       body-large 16 → 20 (point 3).
     - `palier-list.css` : `.done-label` label-large 14 → 18,4, la taille du bouton « Hire ! » /
       « Buy ! » qu'elle remplace ; `.empty` body-large 16 → 20.
     - `settings-panel.css` : `.section-title` title-medium 16 → 21,6 ; `.setting-label`
       body-medium 14 → 17,6, comme les libellés des `mat-slide-toggle` ; `.hint` body-small
       12 → 15,2.
     - `angels-panel.css` : `.stats` et `.claim` body-large 16 → 20 ; `.earned` (headline-small)
       inchangé. `unlock-list.css` : `.progression .muted` body-small 12 → 15,2.
     - `tab-bar.css` : pastille label-small 11 → 14,4, la taille que Material donne déjà aux
       pastilles du bandeau gauche ; `.tab-label` revient au raccourci
       `font: var(--mat-sys-title-medium)`, même rendu qu'en 10.8 (21,6 / 24 px).
     - `styles.css` : `.pip-title` title-large 22 → 27,2.
  3. **Barre de production et chrono à 20 px** (D33 disait 16 px). Le ratio « 16 px dans 24 px »
     de D33 portait sur la taille nominale ; VT323 est une police pixel dont les chiffres font
     10 px de haut à 16 px et 11 px à 20 px (`measureText`) : la barre de 24 px reste aérée, seule
     la largeur grandit (+25 %, le `min-width: 10ch` du chrono suit). Garder 16 px aurait demandé
     `label-medium` (relevé à 1 rem), sans rapport de rôle, ou un `font-size` en dur.
  4. **Bug préexistant corrigé au passage** : `.bar-label` est en `display: grid`, et le HTML de
     `bigvalue` (« 1.664 × 10<sup>6</sup> ») y formait deux éléments de grille sur deux rangées :
     l'exposant tombait sous la barre (17 px sous le chiffre, quelle que soit la taille).
     `product-card.html` enveloppe le contenu dans un `span` : un seul élément de grille,
     l'exposant reste sur la ligne (0 → 17 px dans les 24 px de la barre).
- **Conséquences** : vérifié dans la preview avec l'user `verif-d42` (monde édité : 1,2 × 10¹⁵ $,
  quantités jusqu'à 1234, deux managers, paliers et un upgrade débloqués), dispositions du sujet
  et « onglets », à 1280 et 450 px, page puis chaque fenêtre / onglet : `scrollWidth` du document
  = sa largeur, aucun élément rogné (`overflow: hidden` dépassé) ni hors écran. En « Max » à
  450 px, libellé d'achat de 139 px dans un bouton de 194 px ; chrono avec 3 px de marge de
  chaque côté ; pastille d'onglet 15 px de texte dans 16 px. Inchangés (largeurs identiques en
  réinjectant les anciens raccourcis) : le défilement horizontal des tableaux des fenêtres à
  450 px (`overflow-x: auto` de `.palier-list` / `.unlock-list`) et la pagination de la barre
  d'onglets sous ~650 px (D41). À 450 px, le titre « Managers make you feel better ! » passe sur
  deux lignes. title-large (27,2 px : titres de fenêtres, `.brand`) dépasse désormais
  headline-small (24 px : nom du monde, anges à réclamer) ; hiérarchie acceptée, les headline ne
  sont pas relevés. `npx ng test --watch=false` : 202 tests verts (14 fichiers), aucun spec
  modifié ; `npm run build` passe. Constaté, sans rapport et laissé à part : les coins `0` sans
  unité du thème invalident le `max(16px, … + 4px)` du retrait des champs `outline` (texte du
  champ « Your ID » collé au bord gauche), corrigé par D45.

## D45 — Coins du thème en `0px` : retrait des champs `outline` rétabli

- **Contexte** (12/10/2026, constaté pendant D44) : les `$overrides` de `mat.theme` fixaient les
  onze tokens `corner-*` à `0` sans unité (« angles droits partout », D22). Material place
  certains de ces tokens dans des fonctions mathématiques : neuf règles, toutes du champ
  `outline` sauf deux du FAB (absent du projet). `.mdc-text-field--outlined` a
  `padding-left / right: max(16px, <coin> + 4px)`, le segment d'en-tête du contour
  `width: max(12px, <coin>)`, l'encoche et le libellé flottant
  `max-width: min(…, calc(100% - max(12px, <coin>) * 2))`. Un `0` sans unité est un `<number>` :
  `0 + 4px` et `max(12px, 0)` sont invalides au calcul et la propriété retombe à sa valeur
  initiale. Champ « Your ID » (seul champ `outline`, en-tête des deux dispositions) : marges
  intérieures 0 / 0, texte collé aux deux bords du contour, segment d'en-tête réduit à son bord
  (1 px), libellé flottant à 5 px du bord. Le champ « Adresse du serveur » (`fill`) n'utilise
  pas ces règles et avait déjà ses 16 px.
- **Décision** : les onze tokens passent à `0px` dans `material-theme.scss`, avec un commentaire
  qui en donne la raison. Les `border-radius` gardent la même valeur et le même rendu ; seuls les
  calculs redeviennent valides. Pas de surcharge du token du champ
  (`--mat-form-field-outlined-container-shape`) : la cause est dans le thème, et tout autre
  composant qui calcule avec un coin en profite.
- **Conséquences** : vérifié dans la preview (user `verif-d42`), dispositions du sujet et
  « onglets », à 450 et 1280 px : champ « Your ID » avec des marges de 16 / 16 px, texte à 16 px
  des deux bords, segment d'en-tête de 12 px, libellé flottant aligné sur le texte (x = 16 px)
  dans une encoche bornée (`min(100%, 100% - 24px)`) ; la zone de saisie perd 32 px (160 px sur
  192), « verif-d42 » y tient. Page puis chaque fenêtre / onglet : aucun débordement ni élément
  rogné. Les `border-radius` non nuls de la page, des fenêtres Paramètres / Managers / Investors et
  de la snack-bar (« Vault Boy engagé… ») sont les seuls ronds voulus (icônes `.round` et
  `.icon-button` à 50 %, vignette `.crt-overlay`, ondulation des `mat-slide-toggle`) et des
  rayons écrits en dur par Material, indépendants des tokens de coin et déjà là avant : chip
  « manager » à 8 px (`chip-container-shape-radius`), bulle de valeur du `mat-slider` en goutte
  (`50% 50% 50% 0`), 4 px en haut de `.mdc-text-field` (invisible en `outline`, sans fond ni
  bordure). Laissés tels quels ; un `mat.chips-overrides` rendrait le chip carré si on le
  souhaite. `npx ng test --watch=false` : 208 tests verts (14 fichiers) ; `npm run build` passe,
  `--mat-sys-corner-*: 0px` dans le CSS produit.

## D46 — Effets sonores (premier lot du brief sonore)

- **Contexte** (12/10/2026) : un brief sonore « Nuka Capitalist » (20 effets, 3 musiques) a été
  rédigé pour un artiste ; il a livré un premier lot de 5 MP3 (44,1 kHz, stéréo, 0,1 à 1,3 s) :
  `sfx_production_start`, `sfx_production_done`, `sfx_buy`, `sfx_palier`, `sfx_ui_click`. Les
  sons ne figurent pas dans le sujet : ajout au cahier des charges, côté frontend seulement.
- **Décision** :
  - Fichiers dans `frontend/public/sons/`, servis avec le front (`ng serve`, puis Nginx avec le
    build : la règle `/` les couvre, rien à changer dans `deploy/`). Pas sur le backend : ce ne
    sont pas des données du monde comme les `logo`.
  - `SoundService` (`sound.service.ts`) joue les sons par la **Web Audio API** (aucune
    dépendance) : un son peut se superposer à lui-même lors de clics rapides, ce que ne permet
    pas un `<audio>` unique. Chargement paresseux (un `fetch` par son, gardé), contexte audio
    créé au premier son, qui suit un clic (règle d'autoplay des navigateurs). Sans
    `AudioContext` (jsdom des specs) ou fichier absent : silence sans erreur.
  - Réglages `sound` (actif par défaut) et `soundLevel` (50) ajoutés à `DisplaySettings` : même
    clé JSON `isiscapitalist.display`, même panneau, même « Réinitialiser les réglages ».
    Section « Son » entre Animations et Serveur.
  - Déclencheurs : `GameService` pour les événements de jeu (seulement quand l'action locale
    réussit) — `startProduction` → `production_start` ; fin d'une production **manuelle** dans
    `calcScore` → `production_done` (un seul son par passage ; les productions des managers sont
    muettes, sinon plusieurs sons par seconde) ; `buyProduct` → `palier` si un palier est
    débloqué, sinon `buy` ; `hireManager`, `buyUpgrade`, `buyAngelUpgrade` → `buy` **en
    attendant** `sfx_manager`, `sfx_upgrade`, `sfx_angel_upgrade`. `App` pour l'interface :
    `ui_click` sur le multiplicateur, l'ouverture / fermeture des fenêtres, Refresh et les onglets.
- **Conséquences** : les 15 sons restants du brief (dont `sfx_denied`, `sfx_reset`,
  `sfx_production_auto`) et les musiques s'ajouteront à `SOUND_FILES` et aux déclencheurs ;
  `sfx_production_auto` devra être limité (≈ 1 toutes les 2 s). Vérifié dans la preview : les
  trois sons joués se chargent (200), aucune erreur console, section « Son » affichée.
  `npx ng test --watch=false` : 217 tests verts (15 fichiers) ; `npx ng build` passe et copie
  `sons/` dans `dist/`.

## D47 — Mise en conformité avec la grille d'évaluation fonctionnelle

- **Contexte** (14/10/2026) : la grille d'évaluation du projet
  (`docs/grille évaluation fonctionnelle.pdf`, 8 sections, 26 sous-critères) a été confrontée à
  l'application. Quatre sous-critères n'étaient pas tenus à la lettre :
  1. *Pseudo → Refresh* : « le bouton Refresh recharge le monde avec le nouveau pseudo ». Refresh
     relisait le monde du pseudo **déjà validé** par Entrée ; un pseudo tapé puis Refresh
     rechargeait l'ancienne partie.
  2. *Feedback → SnackBar* : « tous les événements critiques (achat, …) affichent un message ».
     L'achat d'un produit n'en affichait un que s'il débloquait un palier.
  3. *Managers → Affichage modal* : la fenêtre doit lister « uniquement les managers non
     débloqués ». D40 y gardait les managers engagés, barrés en fin de liste.
  4. *Production → Temps restant* : `timeleft` « passe à 0 quand la production est terminée ». Le
     champ revenait bien à 0, mais le minuteur affichait au repos la durée d'un cycle (`vitesse`).
- **Décision** :
  1. `GameService.refresh()` (bouton Refresh) : si le champ contient un pseudo non vide différent
     de `user`, `commitName()` (mémorisé, le changement de variables relance `getWorld`) ; sinon
     `refreshWorld()`. Entrée garde son comportement.
  2. `buyProduct` pose toujours un message : « Achat : <n> × <produit> », suivi de
     « — palier(s) débloqué(s) : … » si l'achat en débloque.
  3. `PalierList` reçoit l'input `showDone` (vrai par défaut) ; la fenêtre Managers passe
     `[showDone]="false"` : un manager engagé disparaît, « Tous les managers sont engagés. » reste
     seul quand il n'y en a plus. **D40 est remplacée pour les managers seulement** : cash
     upgrades, angel upgrades et allunlocks gardent leurs lignes barrées (la grille ne l'exige que
     pour les managers).
  4. `ProductCard.remaining` = `timeleft` : le minuteur décroît pendant la production et affiche
     `00:00:00.0` au repos.
- **Points de la grille laissés tels quels** (à expliquer à l'évaluation) : après un reset, le
  premier produit revient à 1 exemplaire et non à 0 (c'est `origworld`, sans quoi le joueur à 0 $
  ne pourrait rien faire) ; un manager ne s'engage qu'avec un exemplaire de son produit (D42).
- **Conséquences** : `npx ng test --watch=false` : 221 tests verts (15 fichiers, +4) ;
  `npx ng build` passe. Vérifié dans la preview avec un joueur jetable (supprimé ensuite) :
  pseudo tapé puis Refresh sans Entrée → monde du nouveau pseudo ; minuteurs à 0 au repos,
  0,4 s pendant une production de Nuka-Cola puis 0 ; achat → « Achat : 1 × Nuka-Cola ».

## D48 — Le client ne prend plus d'avance sur le serveur (défaut G-D1)

- **Contexte** (14/10/2026) : la recette contre la grille d'évaluation (`docs/RECETTE.md` § 3)
  a laissé G-26 « lors du refresh du monde l'argent correspond à la dernière valeur affichée »
  partiel : après l'engagement d'un manager, le client avait un cycle d'avance sur le serveur et
  l'argent affiché reculait d'un cycle au Refresh (544 585 → 543 511 $). Deux causes, toutes deux
  dans `calcScore`, qui avance le monde par pas de 100 ms en décomptant tout le temps écoulé depuis
  le passage précédent :
  1. une action faite entre deux passages (`startProduction`, `hireManager`) pose
     `timeleft = vitesse`, puis le passage suivant décompte aussi le temps écoulé **avant**
     l'action (jusqu'à 100 ms d'avance) ; le serveur, lui, applique `updateWorld` avant l'action
     (règle 5) ;
  2. un monde rechargé par `getWorld` (Refresh, reset, changement de serveur) arrive entre deux
     passages ; le passage suivant l'avance aussi du temps écoulé avant la réponse.
- **Décision** :
  1. Chaque action locale (`startProduction`, `buyProduct`, `hireManager`, `buyUpgrade`,
     `buyAngelUpgrade`) appelle d'abord `calcScore()`, comme `updateWorld` en tête de chaque
     mutation : la production en cours est avancée et créditée jusqu'à l'instant de l'action.
  2. `calcScore` ignore un instant antérieur au passage précédent au lieu d'y recaler sa base de
     temps (la base ne recule jamais ; les specs, qui pilotent `calcScore` avec une horloge
     explicite, ne sont pas perturbées par les `performance.now()` des actions).
  3. `calcScore` retient la dernière réponse de `getWorld` prise en compte (`syncedWorld`) ; le
     premier passage qui en voit une nouvelle n'avance rien. Le client reste au pire légèrement
     **en retard** sur le serveur, jamais en avance.
- **Conséquences** : au Refresh, l'argent ne peut plus que rester égal ou monter (du retard du
  client), jamais reculer. Reste la latence réseau : le serveur démarre une production à la
  réception de la mutation, quelques ms en local, quelques dizaines vers le VPS ; le client est
  alors en avance d'autant, ce qui ne touche qu'un Refresh tombant dans cette fenêtre.
  Vérifié dans la preview (joueur jetable supprimé ensuite) : après engagement de Cappy, client −
  serveur = 0 à −2 cycles sur 40 mesures (au lieu de +1 cycle) ; 10 Refresh sans aucun recul.
  `npx ng test --watch=false` : 226 tests verts (+5) ; `npx ng build` passe.

## D49 — GetWorld au schéma du sujet : le diviseur des anges lu à part

- **Contexte** (14/10/2026) : impossible de jouer sur le serveur d'un autre groupe
  (`https://isiscapitalist.chl.connected-health.fr/graphql`), alors qu'il répond et que son CORS
  est ouvert (`Access-Control-Allow-Origin: *`). Cause : depuis D43, `GetWorld` demandait
  `angeldivisor`, champ absent du schéma du sujet ; ce serveur refusait donc **toute** la requête
  (« Cannot query field "angeldivisor" on type "World" », `GRAPHQL_VALIDATION_FAILED`) et aucun
  monde ne se chargeait. Régression de F-34 / API-02 (nos opérations doivent être valides contre le
  serveur d'un autre groupe) et du critère « Adresse du back » de la grille d'évaluation. Second
  piège : l'adresse attendue est la racine du serveur, mais on colle volontiers celle de
  l'endpoint (`…/graphql`) ; l'app appelait alors `…/graphql/graphql` et cherchait les images sous
  `…/graphql/icones/`.
- **Décision** :
  1. `GetWorld` revient **strictement** au schéma du sujet (`angeldivisor` retiré).
  2. Nouvelle requête facultative `GetAngelDivisor` (`getWorld { angeldivisor }`), lancée avec
     `GetWorld` et relue avec lui (`refreshWorld`). `GameService.angeldivisor` (`linkedSignal`) :
     sa valeur, ou `null` si la requête est refusée (serveur au schéma du sujet) ou pas encore
     reçue ; `effectiveAngelDivisor` = celui du compte, sinon 10¹⁵ du sujet. Un refus n'est pas
     signalé (il est attendu). `null` masque le cadre « Démonstration » de Paramètres et rend
     `setAngelDivisor` sans effet : `ChangerFormuleAnges` n'est jamais envoyée à un tel serveur.
  3. `angelsEarned(world, divisor = 10¹⁵)` reçoit le diviseur en argument (il n'est plus dans
     `WorldData`).
  4. `normalizeServerUrl` retire un segment `/graphql` final (`…/graphql` ou `…/graphql/` →
     racine) ; « mygraphql » n'est pas touché.
- **Conséquences** : sur notre serveur, deux requêtes `getWorld` au chargement et au Refresh au
  lieu d'une (la seconde ne lit qu'un nombre ; `getWorld` est idempotent à `lastupdate` près).
  Validation par introspection du schéma de ce serveur (`validate()` de graphql-js) : `GetWorld`
  et les 6 mutations du sujet valides, seules `GetAngelDivisor` et `ChangerFormuleAnges`
  refusées. Vérifié dans la preview : adresse collée avec `/graphql` → racine retenue, monde
  « A Nice World 2 » chargé (6 produits, images), aucun message d'erreur, cadre Démonstration
  masqué ; une production lancée donne le même solde au client et au serveur distant. Un joueur de
  diagnostic, `diag-lucas-1014`, existe désormais sur ce serveur. `npx ng test --watch=false` :
  231 tests verts (+5).

## D50 — Une fenêtre ne se ferme que sur un clic commencé et fini sur le fond

- **Contexte** (14/10/2026) : retour du joueur. Pour remplacer l'adresse du serveur, il
  sélectionne tout le texte du champ à la souris en glissant ; le bouton est relâché hors de la
  fenêtre, sur le fond assombri. La fenêtre Paramètres se fermait aussitôt, avant qu'il puisse
  coller ; sans monde chargé, rien ne s'affichait derrière. Effacer au clavier fonctionnait.
  Cause : le fond se fermait sur tout `click` qu'il recevait ; or certains navigateurs envoient le
  `click` d'un appui-glisser à l'élément où le bouton est relâché. Non reproduit dans la preview
  (Chromium envoie ce `click` à l'ancêtre commun, `app-modal`, et la fenêtre restait ouverte).
- **Décision** : `Modal` retient sur son hôte (`pointerdown`) si le dernier appui a commencé sur
  le fond (`.backdrop`) ; un `click` du fond ne ferme la fenêtre que dans ce cas. Close, Échap et
  un vrai clic sur le fond ferment comme avant. Même comportement que les dialogues d'Angular
  Material.
- **Conséquences** : un glisser parti du fond et relâché dans la fenêtre ne la ferme pas non
  plus. Spec ajoutée (appui dans la fenêtre puis `click` reçu par le fond → fenêtre ouverte),
  qui échouait avec l'ancien code ; `npx ng test --watch=false` : 232 tests verts.

## D51 — Fichiers rangés par fonctionnalité (frontend) et moteur à part (backend)

- **Contexte** (20/10/2026) : demande de l'utilisateur, ranger les fichiers selon les règles de
  « clean code ». `frontend/src/app` comptait 50 fichiers à plat ; `backend/src`, 11.
- **Décision** :
  - **Frontend**, rangé par fonctionnalité comme le recommande le guide de style officiel
    d'Angular (plutôt que par type : `components/`, `services/`…) : `game/` (`game.service`,
    `game-math`, `sound.service`), `product/`, `paliers/` (`palier-list`, `unlock-list`),
    `investors/` (`angels-panel`), `settings/` (`settings-panel`, `display-settings`, `server`),
    `layout/` (`modal`, `tab-bar`), `shared/` (`game-icon`, `pixel-art`, pipes `bigvalue` et
    `second`), `testing/` (`test-world`). `graphql/` ne bouge pas (F-01, F-34) ; `app.*` et
    `app.config.ts` restent à la racine. Chaque composant garde ensemble ses `.ts`, `.html`,
    `.css` et `.spec.ts`.
  - Code mort retiré : `app.routes.ts` (tableau de routes vide) et `provideRouter` ; l'application
    est une page unique sans routeur. Bundle initial : 1,03 Mo → 959 kB.
  - **Backend** : les fichiers nommés par le sujet restent à la racine de `src/` (`schema.graphql`,
    `graphql.ts` B-02, `origworld.ts` B-04, `resolver.ts` B-06, `app.service.ts` B-07) ; seul notre
    moteur de jeu va dans `src/engine/` (`world-engine.ts` et sa spec). Un premier essai qui
    renommait `resolver.ts` en `app.resolver.ts` et rangeait `origworld.ts` dans `engine/` a été
    annulé : B-04 et B-06 imposent ces chemins.
  - Déplacements par `git mv` (historique conservé) ; imports relatifs recalculés ; le script
    `simulate-balance.mjs` lit `dist/engine/world-engine.js`.
- **Conséquences** : aucun changement de comportement. Frontend : build OK, 232 tests verts.
  Backend : build, lint (0 avertissement), 90 tests unitaires, 13 e2e et la simulation
  d'équilibrage OK. Les chemins des documents historiques (`docs/prompts/`, anciennes décisions,
  recette) ne sont pas réécrits ; la doc vivante (`CLAUDE.md`, `ARCHITECTURE.md`, `GAME-RULES.md`,
  README du backend) et les commentaires de code donnent les nouveaux chemins.
