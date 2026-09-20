# frontend/ — Angular 22 + Apollo Orbit

Voir `../CLAUDE.md` pour le contexte global. **Le sujet du frontend n'a pas encore été fourni**
(seul `backend.pdf` existe). En attendant, un **front générique de test** (une page, habillée
Angular Material depuis 9.4, navigation par onglets depuis 9.5, thème « écran cathodique »
vert avec barre d'onglets en bas depuis 9.8, carte produit allégée et onglet Unlocks par produit
depuis 9.9, barres de la carte à 16 px et barre d'achat dans l'en-tête depuis 9.10, gain dans la
barre de production et chrono à sa droite depuis 9.13, grands nombres en P / E / Z / Y puis
scientifique et barre de production sans transition depuis 9.14, toggle du multiplicateur
sélectionné en vidéo inversée depuis 9.16, logo + nom du monde, icônes des paliers avec repli et
colonne « produit » depuis 9.17, barres de la carte et chrono à 24 px avec texte 16 px depuis
9.18) exerce toutes les opérations du schéma pour vérifier le backend à la main ; il servira de base quand
`frontend.pdf` arrivera.

## Stack

- Angular 22, composants **standalone**, **signals**, control flow `@if / @for`.
- **Angular Material 22.1.x** (+ CDK même version, ajoutés par `ng add @angular/material`, D18) :
  thème M3 sombre monochrome vert (D22) dans `src/material-theme.scss` — palette générée par
  `ng generate @angular/material:theme-color` dans `src/_theme-colors.scss`, tokens système
  imposés par `$overrides` ; **seul fichier où une couleur est écrite en dur**. Police **VT323**
  (Google Fonts, `index.html`, une seule graisse) ; plus de Roboto ni de Material Icons (aucun
  `mat-icon`). `src/styles.css` (listé après le thème dans `angular.json`) porte la « peau » :
  `.pip-frame`, `.pip-title`, effets `crt-*`, halo / focus du toggle `.multiplier` (D31). Pas de
  `@angular/animations` (animations CSS). Overrides par composant dans `material-theme.scss` :
  `mat.progress-bar-overrides` (piste / indicateur, D22) et `mat.button-toggle-overrides`
  (état sélectionné en `primary` / `on-primary`, state layer `primary` à 0.12 / 0.24, D31).
- GraphQL : `@apollo-orbit/angular` (`inject(Apollo)`, `apollo.signal.query(...)`,
  `apollo.signal.mutation(...)`), endpoint `http://localhost:3000/graphql` défini dans
  `src/app/graphql/graphql.provider.ts`.
- Codegen : `npm run codegen` (`codegen.ts`) génère `src/app/graphql/types.ts` et `operations.ts` à
  partir de `src/app/graphql/schema.graphql` + `src/app/graphql/*.graphql` (opérations). Les
  paquets de codegen sont en `devDependencies` de **ce** `package.json` (pas de `package.json`
  racine, D16).
- Tests : vitest via `ng test`.
- **Node ≥ 22.22.3** requis par le CLI Angular 22 (`ng build` / `ng test` / `ng serve` refusent
  de démarrer en dessous).

## Fichiers (`src/app/`)

| Fichier | Rôle |
|---|---|
| `game.service.ts` | `GameService` (`providedIn: 'root'`) : signaux `user` (localStorage `isiscapitalist.user`), `multiplier` (1/10/100/`'max'`), `activeTab` (`Tab`, jamais nul, localStorage `isiscapitalist.tab`, D19/D22) + `selectTab(tab)`, réglages CRT `scanlines` / `glow` / `flicker` (localStorage `isiscapitalist.scanlines` / `.glow` / `.flicker`, `readStoredFlag`, D22), `world` (dernier monde reçu), `errorMessage` ; query `getWorld` (`no-cache`, poll 2 s) ; 7 mutations (`buy(id, quantite)`, `launch`, `hireManager`, `toggleManager(id)` (D20), `buyUpgrade`, `buyAngelUpgrade`, `reset`) ; timer 100 ms qui n'anime que `timeleft` (D15). Seul fichier qui injecte Apollo ; `game.service.spec.ts` le teste avec un stub `Apollo` (`readStoredTab`, `readStoredFlag`, `selectTab`, persistance des clés). |
| `game-math.ts` | Fonctions pures `buyCost`, `maxAffordable` (quantité du mode « max », D17), `productionGain`, `angelsEarned` (anges qu'un reset rapporterait, D19), `formatNumber` (mêmes noms que `backend/src/world-engine.ts` ; suffixes SI k / M / G / T / P / E / Z / Y puis notation scientifique « 1.23e27 » dès 10²⁷, D29), `FAST_CYCLE_MS` (400 = 4 ticks de 100 ms) et `productionProgress` (barre de production en % : 0 si `vitesse ≤ 0`, 100 si `vitesse < FAST_CYCLE_MS`, sinon 100 × (vitesse − timeleft) / vitesse borné, D29), `nextUnlock` (palier verrouillé de plus petit seuil ou `null`, partagée par `ProductCard` et `UnlockList`, D23), `blockedManagerNames` (managers non possédés dont le produit cible est à 0 exemplaire, D24), `formatDuration` (ms → `mm:ss`, ou `h:mm:ss` au-delà d'une heure, seconde SUPÉRIEURE, `00:00` si ≤ 0 ou non fini ; chrono de la carte, D28), `targetLabel(palier, products)` (cible en toutes lettres : `idcible` 0 → « Global », -1 → « Anges », sinon `name` du produit ou `#id`, D32) et `logoCandidates(palier, products, worldLogo)` (chemins d'image à essayer dans l'ordre : `palier.logo` puis logo du produit ciblé si `idcible > 0`, logo du monde si `idcible === 0`, rien pour -1 ; sans chaîne vide ni doublon, D32), pour l'affichage seulement. |
| `game-icon.ts/.html/.css` | `GameIcon` (D32) : `app-game-icon`, inputs `candidates` (chemins relatifs, requis) et `alt` (défaut `''`, icône décorative). Exporte **`ICON_BASE_URL`** (`http://localhost:3000/`, importé par `ProductCard`). Index du candidat en `linkedSignal` dont la source est une **clé de contenu** (`candidates().join('\n')`), pas l'identité du tableau : les parents recalculent la liste dans leur template à chaque cycle (le timer 100 ms recrée `world.products`), suivre l'identité relancerait une image 404 sans fin ; un autre logo / autre monde réinitialise bien l'essai. `(error)` sur l'`<img>` → candidat suivant ; liste vide ou épuisée → aucun `<img>` (jamais l'icône « image cassée »), l'hôte garde 32 × 32 px (`display: inline-block`). `game-icon.spec.ts` simule l'échec par `dispatchEvent(new Event('error'))` (jsdom ne charge pas les images). |
| `product-card.ts/.html/.css` | `ProductCard` : inputs `product`, `activeangels`, `angelbonus`, `multiplier`, `money` (solde du dernier `getWorld` : quantité en mode max, bouton désactivé), `managerOwned` (manager acheté, dérivé par `App` de `world.managers`, D20) ; outputs `buy(quantite)`, `launch()`, `toggleManager()`. `mat-card` allégée (D23) avec **en-tête maison** `.product-header` (D25, pas de `mat-card-header` : il ne projette que title / subtitle sous l'avatar) : icône 64 px (`matCardAvatar.icon`, `iconUrl` = `ICON_BASE_URL` importé de `game-icon.ts` + `logo`, pas de `GameIcon` ici), puis colonne `.product-heading` = `.product-title-row` (`mat-card-title`, chip « manager » si `managerOwned` — texte constant, D30 ; l'état de pause ne se lit que sur le bouton Reprendre —, passe sous le nom sur carte étroite) et **barre d'achat** `.product-owned` (`mat-progress-bar` « Progression vers le prochain palier », `ownedProgress()` = 100 × quantite / seuil de `nextPalier()` = `nextUnlock(product)`, texte « quantite / seuil » ou quantité seule si tout est débloqué, centré **dans** la barre par `span.bar-label` en `mix-blend-mode: difference`) ; `mat-card-content` (D28) : plus de stats, une seule ligne flex `.product-progress` = `.product-gain` (barre de production, `progress()` = `productionProgress(product)` en % 0-100 — pleine en continu si `vitesse < FAST_CYCLE_MS` (400 ms), D29 —, `aria-label` « Production en cours », **sans la transition Material** : `.product-gain ::ng-deep .mdc-linear-progress__bar { transition: none }` pour suivre exactement le tick 100 ms, la barre d'achat garde la sienne ; avec le **gain d'une production** centré dedans par le même `span.bar-label`, règle partagée par les deux barres) puis `span.product-timer` (`role="timer"`, `aria-label` « Temps restant », rectangle 24 px à contour 1 px, `min-width: 5ch`) affichant `remainingLabel()` = `formatDuration(timeleft > 0 ? timeleft : vitesse)` : temps restant de la production en cours (suit le timer 100 ms de `GameService`, D15), ou durée d'un cycle au repos ; les deux barres de la carte et le chrono font 24 px (D33 : variable `--product-bar-height` sur `.product`, reprise par `--mat-progress-bar-track-height` / `-active-indicator-height` sur `.product mat-progress-bar` et par `height` du chrono, scopé : `UnlockList` reste à 4 px) et leur texte est en body-large (16 px, `--mat-sys-body-large` sur `.bar-label` et `.product-timer`) ; actions : bouton de production à trois libellés — **Produire** (`launch`, sans manager), **Arrêter** (`toggleManager`, manager possédé et `managerUnlocked`), **Reprendre** (`toggleManager`, manager possédé en pause), désactivé si `quantite = 0` (`canProduce`, D21) — au bord gauche, et Acheter (`class="buy"`, désactivé faute d'argent, `canBuy`, D17) **au bord droit** par `.buy { margin-left: auto }` dans `mat-card-actions` en `flex-wrap: nowrap` (D26 / D29) : les deux boutons restent **toujours sur une ligne** (`flex: 0 0 auto; white-space: nowrap`, Acheter à `--mat-button-filled-horizontal-padding: 12px` pour tenir à 360 px) ; il reste le second bouton (les specs comptent sur l'ordre). Plus d'`id`, `vitesse`, `cout`, `croissance`, `timeleft` ni de liste des paliers. Le `.css` ne porte que la mise en page interne de la carte. |
| `palier-list.ts/.html/.css` | `PalierList` : inputs `title`, `paliers`, `actionLabel` (null = lecture seule), `costUnit`, `balance` (solde dans l'unité de `costUnit`, null = pas de vérification), `blockedNames` (noms de paliers à griser quelle que soit la balance, défaut `[]` ; seule la liste Managers le reçoit, via `blockedManagerNames`, D24), `products` (défaut `[]`) et `worldLogo` (défaut `''`) pour la cible et le repli d'image (D32) ; output `action(name)`. `mat-table` de colonnes `logo` (en-tête vide, cellule `.logo-cell` à largeur fixe = `app-game-icon` sur `logoCandidates`), `name`, `seuil`, **`produit`** (`targetLabel` : Item N / Global / Anges / `#id` — l'id brut `idcible` n'est plus affiché), `ratio`, `typeratio`, `unlocked`, + `action` seulement si `actionLabel` est fourni ; ligne débloquée marquée `class.unlocked`. Sert aux 4 listes (managers, upgrades, angel upgrades, all unlocks). |
| `unlock-list.ts/.html/.css` | `UnlockList` (D23) : inputs `products`, `worldLogo` (défaut `''`, D32) ; aucun output. Section « Par produit » de l'onglet Unlocks : `h2.pip-title` puis `mat-table` d'une ligne par produit (produit / prochain palier — `app-game-icon` sur `logoCandidates` devant `next.name`, D32 — / effet `typeratio ×ratio` / progression `mat-progress-bar` + « quantite / seuil »), lignes dérivées par `nextUnlock` (computed `rows`) ; produit tout débloqué → « tous les paliers débloqués » sans icône, autres cellules vides, `class.unlocked`. |
| `tab-bar.ts/.html/.css` | `TabBar` (D22) : inputs `active` (`Tab`), `angelsEarned` ; output `select(tab)`. `mat-tab-nav-panel` qui projette l'écran de l'onglet actif (`ng-content`), puis `nav mat-tab-nav-bar [tabPanel]` de 6 `a mat-tab-link` texte seul (`NAV_ITEMS`, `[active]`, `data-tab`), `matBadge` = anges gagnables sur Anges (`matBadgeHidden` à 0, recentrée au-dessus du libellé par `::ng-deep`). Material pose `mdc-tab--active` / `aria-selected` sur le lien actif. Onglets **étirés à parts égales** sur toute la largeur (D26) : stretch Material par défaut (classe `mat-mdc-tab-nav-bar-stretch-tabs`, `flex-grow: 1`) + `flex-basis: 0` sur `.tab` dans le `.css` ; `min-width: 72px` conservé, sous ~450 px la pagination Material (flèches) prend le relais. N'émet que si l'onglet cliqué n'est pas l'actif. |
| `settings-panel.ts/.html/.css` | `SettingsPanel` (D22) : trois `model<boolean>()` `scanlines`, `glow`, `flicker` liés en two-way par `App` aux signaux de `GameService` ; trois `mat-slide-toggle` + aide (« ignoré si votre système réduit les animations »). |
| `angels-panel.ts/.html/.css` | `AngelsPanel` : inputs `score`, `totalangels`, `activeangels`, `angelbonus`, `angelsEarned`, `angelupgrades`, `products` et `worldLogo` (transmis tels quels à sa `PalierList`, D32) ; outputs `resetRequested()`, `buyAngelUpgrade(name)`. `mat-tab-group` : Reset (« Anges gagnables : N », stats, bouton Reset jamais désactivé, tokens erreur) et Bonus (`PalierList` des angel upgrades, `costUnit` `'anges'`, `balance` = `activeangels`). Le `confirm()` n'est pas ici (le panneau ne connaît pas `user`). |
| `app.ts/.html/.css` | Page unique (D22) : `mat-toolbar` (titre, puis `span.world-name` = `app-game-icon` sur `[world.logo]` + `world.name` quand un monde est chargé (D32, `--mat-sys-title-medium`, `inline-flex`), user en `mat-form-field`, `mat-button-toggle-group` du multiplicateur — toggle sélectionné en **vidéo inversée** par `mat.button-toggle-overrides` dans `material-theme.scss`, halo sous `crt-glow`, anneau de focus `currentColor` dans `styles.css`, D31 —, cases `.stat.pip-frame` money / score / anges / bonus, ou « aucun monde chargé »), bandeau d'erreur `role="alert"` en vidéo inversée (clic = effacer, tokens `--mat-sys-error-container`), puis `TabBar` enveloppant `main.screen` : `@if 'settings'` → `SettingsPanel` (même sans monde), sinon `@switch` sur `game.activeTab()` si un monde est chargé : Produits (grille de `ProductCard`), `PalierList` Managers / Upgrades, Unlocks = `section.unlocks` (`UnlockList` puis `PalierList` All unlocks, D23), `AngelsPanel` ; les trois `PalierList`, `UnlockList` et `AngelsPanel` reçoivent `[products]="world.products"` et `[worldLogo]="world.logo"` (D32). Host binding des classes `crt-scanlines` / `crt-glow` / `crt-flicker` sur `<app-root>`. `computed angelsEarned` calculé une fois pour la barre et l'écran Anges ; `onReset(earned)` porte le `confirm()` (texte D19) puis `game.reset()`. Le `.css` porte la mise en page : colonne `100dvh`, seul `.screen` défile. |
| `graphql/queries.graphql`, `graphql/mutations.graphql` | `GetWorld` (+ fragment `PalierFields`) et les 7 mutations (dont `BasculerManager`, D20). |

## Conventions

- `src/app/graphql/schema.graphql` doit être **identique** à `backend/src/schema.graphql`
  (copier, puis `npm run codegen`). Ne jamais éditer `types.ts` / `operations.ts` à la main.
  Le schéma porte `lastupdate: Float!` (D6) : sans cela le codegen typerait `Int` et les requêtes
  échoueraient à la sérialisation.
- Une opération GraphQL par bloc dans `queries.graphql` / `mutations.graphql`, nommée en PascalCase
  (`GetWorld`, `AcheterQtProduit`…) ; codegen expose `GET_WORLD_QUERY`, `ACHETER_QT_PRODUIT_MUTATION`, etc.
- `fetchPolicy: 'no-cache'` partout, aucune lecture du cache Apollo : le serveur est la seule source
  de vérité, `getWorld` est refait après chaque mutation (réussie ou non) — voir D14.
- Les composants autres que `App` sont **présentationnels** (`input()` / `output()`, aucune
  injection) : testables avec TestBed sans serveur (`product-card.spec.ts`, `palier-list.spec.ts`,
  `unlock-list.spec.ts`, `tab-bar.spec.ts`, `settings-panel.spec.ts`, `angels-panel.spec.ts`,
  `game-icon.spec.ts`). C'est pourquoi `products` et `worldLogo` descendent d'`App` en inputs
  (D32) plutôt que d'être lus dans `GameService`. `app.spec.ts` remplace
  `GameService` par un stub (signaux + `activeTab` / `selectTab` + `scanlines` / `glow` /
  `flicker`). Les specs qui lisent le contenu d'un `mat-tab` ou montent un `mat-tab-nav-bar`
  fournissent `MATERIAL_ANIMATIONS` `{ animationsDisabled: true }` (sans transitions CSS, jsdom
  n'attache le contenu qu'après un timer de repli de 100 ms).
- Préférences d'affichage persistées dans localStorage, une clé par préférence, lues au démarrage
  et écrites par un `effect` sous try/catch (navigation privée) : `isiscapitalist.user` (D14),
  `isiscapitalist.tab` (onglet actif parmi les 6 valeurs de `Tab`, absent / inconnu / ancien
  `'none'` → `'products'`, D19/D22), `isiscapitalist.scanlines` / `.glow` / `.flicker`
  (`'on'` / `'off'`, défauts on / on / off, D22). Pas de `Router` : la page est unique, un onglet
  n'a pas d'URL.
- Angular Material importé **module par module** dans chaque composant (`MatCardModule`,
  `MatButtonModule`…), jamais via un barrel « MaterialModule ». Un fichier de style par composant
  (`styleUrl`), encapsulation par défaut (pas de `ViewEncapsulation.None`) ; couleurs via les
  tokens du thème (`var(--mat-sys-…)`), pas de couleur en dur. Les CSS de composants ne portent
  que la mise en page ; la peau (cadres, titres, effets CRT, onglet actif) est dans
  `src/styles.css` en règles globales, et les couleurs dans `src/material-theme.scss` seul.
  Boutons : `matButton`, `matButton="filled"`, `matButton="outlined"`.
- Les boutons d'achat sont désactivés (`[disabled]` natif sur les boutons Material, pas de CSS) quand le dernier solde reçu
  ne permet pas de payer, avec les mêmes comparaisons strictes que le backend (D17) : produits
  (`quantite = 0` ou `buyCost > money`), managers (`money < seuil`, ou produit cible à
  `quantite = 0` — `blockedNames`, D24), upgrades (`money < seuil`), angel upgrades
  (`activeangels < seuil`), palier déjà `unlocked`. Le bouton de production Produire / Arrêter /
  Reprendre (D20) est désactivé si le produit n'a aucun exemplaire (`quantite = 0`, D21), jamais
  pendant une production en cours. `Reset` (panneau Anges, reset à 0 ange permis) et le champ
  user ne sont jamais désactivés. Le serveur reste seul juge : le solde
  peut dater de 2 s (D15), et le nombre d'anges gagnables affiché (`angelsEarned`, D19) est une
  estimation client que le serveur recalcule au reset.
- Les images du jeu viennent du backend : `http://localhost:3000/` + `logo` (`ICON_BASE_URL` de
  `game-icon.ts`). Hors carte produit, toute icône passe par `GameIcon` avec la liste de
  `logoCandidates` (repli logo du palier → produit ciblé → monde, D32) et `alt=""` : le nom est
  déjà écrit à côté.
