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
  canvas Pip-Boy, D35), police **VT323** dont les tailles relevées (`$pip-type-sizes`) valent
  pour les tokens `-size` **et** les raccourcis : écrire `font: var(--mat-sys-<rôle>)`, jamais de
  `font-size` en dur (D44). Coins à `0px`, jamais `0` nu : Material les place dans des `calc()` /
  `max()` (D45). `src/styles.css` porte la « peau » globale (`.pip-frame`,
  `.pip-title`, effets `crt-*`, teinte par `filter` sur `app-root[data-tint]`).
- GraphQL : `@apollo-orbit/angular` (`apollo.signal.query`, `apollo.signal.mutation`), endpoint
  dérivé de `src/app/settings/server.ts` (`SERVER() + 'graphql'`).
- Codegen : `npm run codegen` génère `src/app/graphql/types.ts` et `operations.ts` à partir de
  `schema.graphql` + `queries.graphql` / `mutations.graphql`.
- Tests : vitest via `ng test` (jsdom).
- **Node ≥ 22.22.3** requis par le CLI Angular 22.

## Fichiers (`src/app/`)

Rangés **par fonctionnalité**, comme le recommande le guide de style Angular (D51) : chaque
composant garde ensemble ses `.ts`, `.html`, `.css` et `.spec.ts`.

```text
app.ts .html .css .spec.ts, app.config.ts   page du sujet, providers (Apollo seulement, pas de routeur)
game/       game.service, game-math, sound.service   état, règles recopiées du serveur, sons
product/    product-card                             carte d'un produit
paliers/    palier-list, unlock-list                 managers, upgrades, unlocks
investors/  angels-panel                             fenêtre Investors
settings/   settings-panel, display-settings, server Paramètres, réglages, adresse du backend
layout/     modal, tab-bar                           fenêtre superposée, disposition à onglets
shared/     game-icon, pixel-art, bigvalue, second   icônes et pipes réutilisés partout
graphql/    (inchangé, imposé par F-01 / F-34)       requêtes, types générés, provider Apollo
testing/    test-world                               doublures pour les specs
```

| Fichier | Rôle |
|---|---|
| `settings/server.ts` | `SERVER` : signal de l'adresse du backend, « / » final. `DEFAULT_SERVER` = `http://localhost:3000/` en mode dev, origine de la page dans le build de production servi par Nginx (D39). Départ = adresse mémorisée sous `isiscapitalist.server` (`readStoredServer`) si `normalizeServerUrl` l'accepte (http(s) seulement, origine + chemin terminé par « / », segment `/graphql` final retiré, D49), sinon le défaut. Changée sans recompiler par le champ « Adresse du serveur » de Paramètres → `GameService.setServer` (F-34, D41) ; sert à l'endpoint GraphQL (`uri` en fonction, lue à chaque opération) et aux images. |
| `game/game.service.ts` | `GameService` (`providedIn: 'root'`), seul fichier qui injecte Apollo. Signaux : `server` (= `SERVER`, changé par `setServer(url)` : mémorisé, message « Serveur : … », `refreshWorld`, D41), `UserloginModel` + `loginForm` (formulaire signal du pseudo), `user` (pseudo validé), `display` (réglages CRT, D34), `snackmessage` (message éphémère, `equal: () => false`), `worldQuery` (`getWorld`, `no-cache`, pas de poll), `world` (`linkedSignal` de la réponse, garde le dernier monde pendant un rechargement), `angeldivisor` (`linkedSignal` de `GetAngelDivisor`, `null` si le serveur la refuse ou avant sa réponse) et `effectiveAngelDivisor` (sinon 10¹⁵, D49). Boucle `calcScore` toutes les 100 ms (`performance.now`, `advanceProduction`) qui crédite par `productionDone(prod, qt)` ; appelée aussi en tête de chaque action, base de temps qui ne recule pas, premier passage après une nouvelle réponse de `getWorld` (`syncedWorld`) sans avance : le client n'est jamais en avance sur le serveur (D48). Actions locales puis mutation : `startProduction`, `buyProduct(qt, product)` (+ `applyUnlocks`, message « Achat : … » à chaque achat, D47), `hireManager`, `buyUpgrade`, `buyAngelUpgrade`, `reset` (mutation puis `refreshWorld`), `setAngelDivisor` (formule des anges du compte, D43). Refus du serveur → message « Erreur de transmission serveur… » + `refreshWorld` (le serveur fait foi). Pseudo : `readStoredUsername` (clé `username`, migration de `isiscapitalist.user`, sinon `Captain<n>`), `commitName` (Entrée), `refresh` (bouton Refresh : bascule sur le pseudo saisi s'il a changé, sinon `refreshWorld`, D47). |
| `game/game-math.ts` | Règles du jeu en fonctions **pures et immuables**, copies de `backend/src/engine/world-engine.ts` : `buyCost`, `maxAffordable`, `productionGain`, `advanceProduction`, `replaceProduct`, `applyBonus` (vitesse : production en cours accélérée), `applyUnlocks` (paliers du produit puis allunlocks), `totalAngelsFor` / `angelsEarned` (`150 × √(score / angeldivisor)`, 10¹⁵ du sujet par défaut, D43), `ANGEL_FORMULAS` / `angelFormulaLabel` (préréglages et libellé de la formule), `affordableCount` (badges), `blockedManagerNames` (managers dont le produit est à 0 exemplaire, D42). Affichage : `bigValue` (pipe `bigvalue`), `formatDuration` (`hh:mm:ss.d`, pipe `second`), `productionProgress` (`FAST_CYCLE_MS` = 400), `bonusLabel`, `nextUnlock`, `targetLabel`, `logoCandidates`. Exporte les types `WorldData`, `ProductData`, `PalierData` (ré-exportés par `game.service.ts`). |
| `shared/bigvalue.pipe.ts`, `shared/second.pipe.ts` | Pipes du sujet (F-09) : grand nombre → HTML `1.235 × 10<sup>6</sup>` (lier par `[innerHTML]`) ; ms → `hh:mm:ss.d`. |
| `app.ts/.html/.css` | Deux dispositions selon `display().layout` (D37, classe `layout-sujet` / `layout-onglets` sur l'hôte). **`'onglets'`** : `mat-toolbar.topbar` (titre, monde, pseudo, `mat-button-toggle-group.multiplier-toggle`, cases `.stat` argent / score / anges / bonus) puis `TabBar` enveloppant `main.screen` (un écran par onglet, signal `tab` mémorisé sous `isiscapitalist.tab`, pastilles `tabBadges`). **`'sujet'`** (défaut) : page du sujet décrite ci-après. Les contenus sont des `ng-template` (`worldTpl`, `userTpl`, `productsTpl`, `managersTpl`, `upgradesTpl`, `angelUpgradesTpl`, `unlocksTpl`, `investorsTpl`, `settingsTpl`) placés par `ngTemplateOutlet` dans une fenêtre ou un écran ; `onDisplayChange` garde le joueur sur ses réglages quand la disposition change. Page du sujet : en-tête (`.world` logo rond + nom, `#money`, bouton `.multiplier` qui cycle `QT_CYCLE` x1 → x10 → x100 → Max, champ « Your ID » `[formField]` + Refresh), `.main` en grille : `nav.menu` (6 `.menu-button` `data-window` : Unlocks, Cash Upgrades, Angel Upgrades, Managers, Investors, Paramètres, `matBadge` = `badges()`), `main.products` (grille 2 colonnes de `ProductCard`). Signaux `qtmulti` (F-13) et `modal` (fenêtre ouverte). Fenêtres `Modal` : Managers (`PalierList` sans effet, « Hire ! », `[showDone]="false"` : managers engagés non listés, D47, `[blockedNames]="blockedManagers()"`, aussi exclus du badge, D42), Cash Upgrades, Angel Upgrades (« Buy ! »), Unlocks (`UnlockList` + `PalierList` des allunlocks), Investors (`AngelsPanel`, `onReset` avec `confirm()`), Paramètres (`SettingsPanel`, même sans monde). `effect` qui ouvre un `MatSnackBar` (2 s) à chaque `snackmessage`, et `effect` qui pose `data-tint` sur le conteneur des overlays CDK (`OverlayContainer`, D41 : `styles.css` teinte chaque `.cdk-overlay-pane`, le conteneur étant hors de `app-root` et ses overlays dans un `[popover]` de la top layer). Upgrades / allunlocks reçoivent `doneLabel` « Acheté » / « Atteint » (D40). Host bindings CRT (classes `crt-*`, `data-tint`, variables `--crt-*`) et `div.crt-overlay` final. Sous 700 px : menu au-dessus des produits, la page entière défile. |
| `layout/tab-bar.ts/.html/.css` | `TabBar` (disposition « onglets », D22 rétablie par D37) : type `Tab`, `readStoredTab` / `TAB_STORAGE_KEY`, `NAV_ITEMS` (Produits, Managers, Upgrades, Anges, Unlocks, Paramètres) ; inputs `active`, `badges` (pastille par onglet, masquée à 0) ; output `select` (sauf onglet déjà actif). `mat-tab-nav-panel` qui projette l'écran, onglets étirés à parts égales, pagination Material en fenêtre étroite (sous ~650 px depuis les libellés en title-medium à 1,35 rem, étape 10.8, D44). |
| `layout/modal.ts/.html/.css` | Fenêtre superposée (F-18) : fond `.backdrop` (clic = fermer, seulement si l'appui a commencé sur le fond : `pointerdown` de l'hôte, D50), `section[role=dialog][aria-modal]` titrée, contenu projeté, bouton `.closebutton` « Close », Échap ; `cdkTrapFocus` + `cdkFocusInitial` sur Close (focus rendu à la fermeture). Output `closed`. |
| `product/product-card.ts/.html/.css` | Composant « produit » du sujet (F-07). Inputs `product`, `activeangels`, `angelbonus`, `qtmulti`, `money`, `pixelIcons` ; outputs `buy(quantite)`, `launch()`. À gauche `.product-visual` : `button.icon-button` rond (clic = `startFabrication` → `launch`, désactivé sans exemplaire ou si automatisé) avec `GameIcon`, et `.quantite` superposée en bas. À droite : nom + chip « manager », `mat-card-subtitle.palier` = nom du dernier palier atteint (`lastPalier`, plus grand seuil débloqué, ligne réservée même vide) dont l'image passe en tête des candidats de l'icône (`iconCandidates`, D40), `.product-gain` (barre de production 24 px sans transition, gain en `bigvalue` dedans, dans un `span` intérieur pour garder l'exposant sur la ligne, D44), `.product-buy` = `button.buy` « x<n> — <coût> » (`maxCanBuy`, `numberToBuy`, `canBuy`) et `.product-timer` (`second`, `timeleft` : 0 au repos, D47). |
| `paliers/palier-list.ts/.html/.css` | Liste d'une fenêtre (`rows`) : paliers **non débloqués** d'abord (sujet), puis débloqués en lignes `.done` atténuées et barrées avec la mention `doneLabel` à la place du bouton (D40), sauf si `showDone` est faux (fenêtre Managers, D47). Colonnes logo (rond 40 px) / nom / produit (`targetLabel`) / effet (`bonusLabel`, `showEffect`) / coût ou seuil / action (si `actionLabel` ou `doneLabel`). Bouton actif si `balance ≥ seuil` et si le nom du palier n'est pas dans `blockedNames` (managers sans exemplaire de leur produit, D42). `emptyText` au-dessus du tableau quand tout est débloqué. Output `action(palier)`. |
| `paliers/unlock-list.ts/.html/.css` | Prochain palier de chaque produit (option du sujet pour F-25) : produit, palier (icône), effet (`bonusLabel`), progression quantite / seuil. |
| `investors/angels-panel.ts/.html/.css` | Contenu de la fenêtre Investors (F-29, fig. 11) : anges actifs, total, bonus par ange, score, formule des anges du compte (D43) ; bouton `.reset` « N anges / à réclamer avec un reset » → output `resetRequested`. |
| `shared/game-icon.ts/.html/.css` | `GameIcon` : liste de candidats (`SERVER() + logo`), repli sur `error`, rendu Pip-Boy (D35, `pixel-art.ts`). |
| `shared/pixel-art.ts` | Conversion canvas → icône 96 × 96 en 4 verts (D35). |
| `game/sound.service.ts` | `SoundService` (D46) : `play(name)` par la Web Audio API (`SoundName`, fichiers `SOUND_FILES` de `public/sons/`, chargés une fois), `configure(enabled, level)` appelé par `GameService` depuis `display`. Silencieux sans `AudioContext` (specs) ou fichier absent. `GameService.sound` joue les sons de jeu (production lancée / terminée à la main, achat, palier ; `buy` provisoire pour managers et upgrades), `App` le `ui_click` (multiplicateur, fenêtres, Refresh, onglets). |
| `settings/settings-panel.ts/.html/.css`, `settings/display-settings.ts` | Réglages d'affichage (D34), clé localStorage `isiscapitalist.display` ; champ `layout` (`'sujet'` / `'onglets'`, D37) choisi par « Disposition » (`.layout`) en tête de la section Écran ; input `showTitle` du panneau (faux dans la fenêtre Paramètres). Cadre « Serveur » séparé (D41) : `mat-form-field.server-field` (inputs `server`, `defaultServer`, `httpsPage` ; saisie `serverDraft` en `linkedSignal`), Entrée / « Appliquer » → `normalizeServerUrl` puis output `serverChange`, sinon `mat-hint` d'erreur ; « Défaut » ; avertissement de contenu mixte (page https, saisie http). « Réinitialiser les réglages » ne touche pas au serveur. Section « Son » (D46) : `sound` + `soundLevel` (curseur « Volume des effets sonores »). Cadre « Démonstration » (D43, `.demo-settings`, masqué sans monde) : input `angelDivisor`, `mat-button-toggle-group.angel-formula` (Sujet / Démo / Express) → output `angelDivisorChange` → `GameService.setAngelDivisor`. |
| `testing/test-world.ts` | Pour les specs seulement : `makeWorld()` (monde réduit), `palier()`, `stubApollo()` (query pilotable, `GetAngelDivisor` à part : `divisorData` / `divisorError` / `divisorRefetches`, mutations enregistrées, `failNext`). |
| `graphql/queries.graphql`, `graphql/mutations.graphql` | `GetWorld` (+ fragment `PalierFields`), **strictement au schéma du sujet** pour jouer sur le serveur d'un autre groupe ; `GetAngelDivisor` facultative (D49) ; les 6 mutations du sujet et `ChangerFormuleAnges` (D43). |

## Conventions

- `src/app/graphql/schema.graphql` est **identique** à `backend/src/schema.graphql` (schéma du
  sujet, écarts `lastupdate: Float!`, D6, et `angeldivisor` / `changerFormuleAnges`, D43). Ne jamais éditer `types.ts` / `operations.ts`.
- Une opération GraphQL par bloc, nommée en PascalCase ; codegen expose `GET_WORLD_QUERY`,
  `ACHETER_QT_PRODUIT_MUTATION`, etc.
- **Même calcul que le serveur** : toute règle de jeu côté client est une copie d'une fonction de
  `backend/src/engine/world-engine.ts` portant le même nom ; modifier l'une impose de modifier l'autre
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
  serveur : `solde < seuil` → refus ; pour un manager, produit cible à `quantite = 0` → refus,
  D42). Le serveur reste juge : un refus est signalé et le monde
  rechargé.
- Images : `SERVER() + logo` via `GameIcon`, `alt=""` quand le nom est écrit à côté.
