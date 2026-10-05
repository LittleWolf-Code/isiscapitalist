# frontend/ — Angular 22 + Apollo Orbit

Voir `../CLAUDE.md` pour le contexte global. Le sujet est `frontendangularsignal.pdf`, transcrit en
exigences numérotées (`F-xx`) dans `../docs/CAHIER-DES-CHARGES.md`. Depuis la phase 10 (D36), le
front suit ce sujet : **client autonome** (il fait évoluer son monde lui-même toutes les 100 ms,
applique chaque action localement puis la transmet au serveur), mise en page du sujet (en-tête,
bandeau gauche de boutons badgés, produits au centre, fenêtres superposées), habillé du thème
« écran cathodique » vert (D22 / D34) et des icônes Pip-Boy (D35). Une seconde disposition, la
barre d'onglets en bas de la phase 9, se choisit dans Paramètres (D37).

## Stack

- Angular 22, composants **standalone**, **signals**, control flow `@if / @for / @switch`,
  formulaire signal (`form()` + `[formField]`, `@angular/forms/signals`) pour le pseudo.
- **Angular Material 22.1.x** (+ CDK) : thème M3 sombre monochrome vert dans
  `src/material-theme.scss` (seul fichier où une couleur est écrite en dur, hormis les 4 verts du
  canvas Pip-Boy, D35), police **VT323**. `src/styles.css` porte la « peau » globale (`.pip-frame`,
  `.pip-title`, effets `crt-*`, teinte par `filter` sur `app-root[data-tint]`).
- GraphQL : `@apollo-orbit/angular` (`apollo.signal.query`, `apollo.signal.mutation`), endpoint
  dérivé de `src/app/server.ts` (`SERVER() + 'graphql'`).
- Codegen : `npm run codegen` génère `src/app/graphql/types.ts` et `operations.ts` à partir de
  `schema.graphql` + `queries.graphql` / `mutations.graphql`.
- Tests : vitest via `ng test` (jsdom).
- **Node ≥ 22.22.3** requis par le CLI Angular 22.

## Fichiers (`src/app/`)

| Fichier | Rôle |
|---|---|
| `server.ts` | `SERVER` : signal de l'adresse du backend (`http://localhost:3000/`, « / » final). **Seul endroit à changer** pour jouer sur le monde d'un autre groupe (F-34) : sert à l'endpoint GraphQL et aux images. |
| `game.service.ts` | `GameService` (`providedIn: 'root'`), seul fichier qui injecte Apollo. Signaux : `server` (= `SERVER`), `UserloginModel` + `loginForm` (formulaire signal du pseudo), `user` (pseudo validé), `display` (réglages CRT, D34), `snackmessage` (message éphémère, `equal: () => false`), `worldQuery` (`getWorld`, `no-cache`, pas de poll), `world` (`linkedSignal` de la réponse, garde le dernier monde pendant un rechargement). Boucle `calcScore` toutes les 100 ms (`performance.now`, `advanceProduction`) qui crédite par `productionDone(prod, qt)`. Actions locales puis mutation : `startProduction`, `buyProduct(qt, product)` (+ `applyUnlocks`, message), `hireManager`, `buyUpgrade`, `buyAngelUpgrade`, `reset` (mutation puis `refreshWorld`). Refus du serveur → message « Erreur de transmission serveur… » + `refreshWorld` (le serveur fait foi). Pseudo : `readStoredUsername` (clé `username`, migration de `isiscapitalist.user`, sinon `Captain<n>`), `commitName` (Entrée), `refreshWorld` (bouton Refresh). |
| `game-math.ts` | Règles du jeu en fonctions **pures et immuables**, copies de `backend/src/world-engine.ts` : `buyCost`, `maxAffordable`, `productionGain`, `advanceProduction`, `replaceProduct`, `applyBonus` (vitesse : production en cours accélérée), `applyUnlocks` (paliers du produit puis allunlocks), `totalAngelsFor` / `angelsEarned` (`150 × √(score / 10¹⁵)`), `affordableCount` (badges). Affichage : `bigValue` (pipe `bigvalue`), `formatDuration` (`hh:mm:ss.d`, pipe `second`), `productionProgress` (`FAST_CYCLE_MS` = 400), `bonusLabel`, `nextUnlock`, `targetLabel`, `logoCandidates`. Exporte les types `WorldData`, `ProductData`, `PalierData` (ré-exportés par `game.service.ts`). |
| `bigvalue.pipe.ts`, `second.pipe.ts` | Pipes du sujet (F-09) : grand nombre → HTML `1.235 × 10<sup>6</sup>` (lier par `[innerHTML]`) ; ms → `hh:mm:ss.d`. |
| `app.ts/.html/.css` | Deux dispositions selon `display().layout` (D37, classe `layout-sujet` / `layout-onglets` sur l'hôte). **`'onglets'`** : `mat-toolbar.topbar` (titre, monde, pseudo, `mat-button-toggle-group.multiplier-toggle`, cases `.stat` argent / score / anges / bonus) puis `TabBar` enveloppant `main.screen` (un écran par onglet, signal `tab` mémorisé sous `isiscapitalist.tab`, pastilles `tabBadges`). **`'sujet'`** (défaut) : page du sujet décrite ci-après. Les contenus sont des `ng-template` (`worldTpl`, `userTpl`, `productsTpl`, `managersTpl`, `upgradesTpl`, `angelUpgradesTpl`, `unlocksTpl`, `investorsTpl`, `settingsTpl`) placés par `ngTemplateOutlet` dans une fenêtre ou un écran ; `onDisplayChange` garde le joueur sur ses réglages quand la disposition change. Page du sujet : en-tête (`.world` logo rond + nom, `#money`, bouton `.multiplier` qui cycle `QT_CYCLE` x1 → x10 → x100 → Max, champ « Your ID » `[formField]` + Refresh), `.main` en grille : `nav.menu` (6 `.menu-button` `data-window` : Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors, Paramètres, `matBadge` = `badges()`), `main.products` (grille 2 colonnes de `ProductCard`). Signaux `qtmulti` (F-13) et `modal` (fenêtre ouverte). Fenêtres `Modal` : Managers (`PalierList` sans effet, « Hire ! »), Cash Upgrades, Angel Upgrades (« Buy ! »), Unlocks (`UnlockList` + `PalierList` des allunlocks), Investors (`AngelsPanel`, `onReset` avec `confirm()`), Paramètres (`SettingsPanel`, même sans monde). `effect` qui ouvre un `MatSnackBar` (2 s) à chaque `snackmessage`. Host bindings CRT (classes `crt-*`, `data-tint`, variables `--crt-*`) et `div.crt-overlay` final. Sous 700 px : menu au-dessus des produits, la page entière défile. |
| `tab-bar.ts/.html/.css` | `TabBar` (disposition « onglets », D22 rétablie par D37) : type `Tab`, `readStoredTab` / `TAB_STORAGE_KEY`, `NAV_ITEMS` (Produits, Managers, Upgrades, Anges, Unlocks, Paramètres) ; inputs `active`, `badges` (pastille par onglet, masquée à 0) ; output `select` (sauf onglet déjà actif). `mat-tab-nav-panel` qui projette l'écran, onglets étirés à parts égales, pagination Material en fenêtre étroite. |
| `modal.ts/.html/.css` | Fenêtre superposée (F-18) : fond `.backdrop` (clic = fermer), `section[role=dialog][aria-modal]` titrée, contenu projeté, bouton `.closebutton` « Close », Échap ; `cdkTrapFocus` + `cdkFocusInitial` sur Close (focus rendu à la fermeture). Output `closed`. |
| `product-card.ts/.html/.css` | Composant « produit » du sujet (F-07). Inputs `product`, `activeangels`, `angelbonus`, `qtmulti`, `money`, `pixelIcons` ; outputs `buy(quantite)`, `launch()`. À gauche `.product-visual` : `button.icon-button` rond (clic = `startFabrication` → `launch`, désactivé sans exemplaire ou si automatisé) avec `GameIcon`, et `.quantite` superposée en bas. À droite : nom + chip « manager », `.product-gain` (barre de production 24 px sans transition, gain en `bigvalue` dedans), `.product-buy` = `button.buy` « x<n> — <coût> » (`maxCanBuy`, `numberToBuy`, `canBuy`) et `.product-timer` (`second`, temps restant ou durée d'un cycle). |
| `palier-list.ts/.html/.css` | Liste d'une fenêtre : ne montre que les paliers **non débloqués** (`visible`), colonnes logo (rond 40 px) / nom / produit (`targetLabel`) / effet (`bonusLabel`, `showEffect`) / coût ou seuil / action (si `actionLabel`). Bouton actif si `balance ≥ seuil`. `emptyText` quand tout est débloqué. Output `action(palier)`. |
| `unlock-list.ts/.html/.css` | Prochain palier de chaque produit (option du sujet pour F-25) : produit, palier (icône), effet (`bonusLabel`), progression quantite / seuil. |
| `angels-panel.ts/.html/.css` | Contenu de la fenêtre Investors (F-29, fig. 11) : anges actifs, total, bonus par ange, score ; bouton `.reset` « N anges / à réclamer avec un reset » → output `resetRequested`. |
| `game-icon.ts/.html/.css` | `GameIcon` : liste de candidats (`SERVER() + logo`), repli sur `error`, rendu Pip-Boy (D35, `pixel-art.ts`). |
| `pixel-art.ts` | Conversion canvas → icône 96 × 96 en 4 verts (D35). |
| `settings-panel.ts/.html/.css`, `display-settings.ts` | Réglages d'affichage (D34), clé localStorage `isiscapitalist.display` ; champ `layout` (`'sujet'` / `'onglets'`, D37) choisi par « Disposition » (`.layout`) en tête de la section Écran ; input `showTitle` du panneau (faux dans la fenêtre Paramètres). |
| `test-world.ts` | Pour les specs seulement : `makeWorld()` (monde réduit), `palier()`, `stubApollo()` (query pilotable, mutations enregistrées, `failNext`). |
| `graphql/queries.graphql`, `graphql/mutations.graphql` | `GetWorld` (+ fragment `PalierFields`) et les 6 mutations du sujet. |

## Conventions

- `src/app/graphql/schema.graphql` est **identique** à `backend/src/schema.graphql` (schéma du
  sujet, seul écart `lastupdate: Float!`, D6). Ne jamais éditer `types.ts` / `operations.ts`.
- Une opération GraphQL par bloc, nommée en PascalCase ; codegen expose `GET_WORLD_QUERY`,
  `ACHETER_QT_PRODUIT_MUTATION`, etc.
- **Même calcul que le serveur** : toute règle de jeu côté client est une copie d'une fonction de
  `backend/src/world-engine.ts` portant le même nom ; modifier l'une impose de modifier l'autre
  (et leurs specs, qui partagent les cas chiffrés).
- Le monde est un signal : ne jamais le muter en place, toujours `world.set` / `world.update` avec
  un nouvel objet (fonctions immuables de `game-math.ts`).
- Composants autres que `App` présentationnels (`input()` / `output()`, aucune injection), testés
  avec TestBed sans serveur ; `app.spec.ts` et `game.service.spec.ts` utilisent le vrai
  `GameService` avec `stubApollo()`. Les specs qui touchent `calcScore` passent en
  `vi.useFakeTimers()`.
- Préférences en localStorage, lues au démarrage sous try/catch : `username` (pseudo, imposé par
  le sujet), `isiscapitalist.display` (réglages d'affichage, disposition comprise),
  `isiscapitalist.tab` (onglet de la disposition « onglets »). Pas de `Router` : page unique.
- Un contenu affiché dans les deux dispositions s'écrit **une seule fois**, dans un `ng-template`
  d'`app.html` ; ne pas dupliquer de balisage entre fenêtre et écran.
- Angular Material importé module par module dans chaque composant ; ne pas importer
  `MatSnackBarModule` dans un composant (il crée une seconde instance de `MatSnackBar`) : injecter
  le service suffit. Couleurs via les tokens (`var(--mat-sys-…)`).
- Boutons d'achat désactivés quand le monde local ne permet pas de payer (même comparaison que le
  serveur : `solde < seuil` → refus). Le serveur reste juge : un refus est signalé et le monde
  rechargé.
- Images : `SERVER() + logo` via `GameIcon`, `alt=""` quand le nom est écrit à côté.
