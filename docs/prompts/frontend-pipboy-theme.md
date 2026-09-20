# Prompt — Thème Pip-Boy : vert monochrome, onglets en bas, écran Paramètres

- Date : 2026-09-19
- Étape roadmap : 9.7 (remplacer la ligne « 9.7 … (à compléter) », voir Étapes)
- Sous-projet : frontend
- Score (grille Anthropic) : 18/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « je veut une esthétique pipboys fallout, voir
  image en lien » — image copiée dans `docs/prompts/assets/pipboy-reference.png`.

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, terminé) et `frontend/` (Angular 22.1
standalone + signals, `@apollo-orbit/angular` 3, Angular Material 22.1.7, tests vitest). Réponds
en français ; code et commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur
Angular du TP ; le backend, le schéma GraphQL, `origworld.ts` et les PNG de
`backend/public/icones/` ne sont pas ton périmètre.

### Objectif

Le front est en Material (thème M3 clair azure, barre latérale gauche à onglets — D18, D19). On
veut l'esthétique du **Pip-Boy de Fallout** : écran cathodique **vert monochrome sur noir**,
police terminal, cadres en filets verts, scanlines et halo. Regarde
`docs/prompts/assets/pipboy-reference.png` : titre en haut à gauche, cases HP / AP / XP en haut
à droite, écran plein au centre, barre d'onglets en bas. On reproduit cette **disposition**
(bandeau stats en haut, onglets en bas, un écran plein par onglet) et on ajoute un onglet
**Paramètres** avec trois interrupteurs persistés (scanlines, halo, scintillement). Le
comportement de jeu ne change pas : mêmes mutations, mêmes règles D14 / D15 / D17 / D20, mêmes
libellés de boutons. C'est l'étape **9.7** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine — règle 8 : aucune dépendance nouvelle, tout se fait avec Angular
   Material déjà installé et du CSS) et `frontend/CLAUDE.md` (tableau des fichiers, conventions :
   composants présentationnels, `[disabled]` natif, un fichier de style par composant, couleurs
   via `var(--mat-sys-…)`, préférences localStorage une clé par préférence).
2. `docs/DECISIONS.md` — D18 (Material posé par `ng add`, thème dans `material-theme.scss`,
   Roboto + Material Icons via Google Fonts), D19 (onglets sans routeur : `activeTab`,
   `toggleTab`, clé `isiscapitalist.tab`, badge anges), D20 `basculerManager` (bouton
   Produire / Arrêter / Reprendre, à ne pas casser).
3. `frontend/src/material-theme.scss`, `src/styles.css` (vide), `src/index.html`,
   `angular.json` (`styles`, budget `anyComponentStyle` 4 kB warn / 8 kB error).
4. `frontend/src/app/` : `game.service.ts` (`Tab`, `TABS`, `DEFAULT_TAB`, `readStoredTab`,
   `toggleTab`, les `effect` localStorage), `app.ts/.html/.css`, `side-nav.ts/.html/.css/.spec.ts`,
   `product-card.css`, `palier-list.css`, `angels-panel.css`, `app.spec.ts`, `game.service.spec.ts`.
5. Doc Material : [Theming](https://material.angular.dev/guide/theming) (`mat.theme(…, $overrides:
   (…))`, schematic `theme-color`, tokens `--mat-sys-*`, mixins `mat.<composant>-overrides`),
   [Tabs](https://material.angular.dev/components/tabs/overview) § `mat-tab-nav-bar`,
   [Slide toggle](https://material.angular.dev/components/slide-toggle/overview). En local :
   `node_modules/@angular/material/core/tokens/_system.scss` (liste exacte des tokens système
   acceptés par `$overrides` : couleurs, `corner-*`, typographie) et
   `node_modules/@angular/material/fesm2022/tabs.mjs` (host bindings de `MatTabLink` — c'est là
   que tu vérifies comment Material marque le lien actif avant d'écrire un sélecteur de test).

### Comportement attendu

**Disposition** (desktop ; un seul `App`, pas de routeur) :

```
┌ ISIS CAPITALIST  [user______]  x1 x10 x100 max     ┃MONEY 1.23 M┃SCORE 45.60 K┃ANGES 5/15┃BONUS 2 %┃┐
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ── PRODUITS (6) ─────────────────────────────────────────────────────────────────────────────── │
│   écran de l'onglet actif, seul contenu visible (ici : les 6 mat-card, grille auto-fill 320 px)│
│                                                                                                │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│   [Produits]   Managers   Upgrades   Anges ⑮   Unlocks   Paramètres                            │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Bandeau** (`mat-toolbar`, fond `surface`, filet vert en bas) : titre `ISIS CAPITALIST`, champ
  user (`mat-form-field` outline, inchangé), `mat-button-toggle-group` du multiplicateur ; à
  droite quatre cases encadrées `MONEY` / `SCORE` / `ANGES actifs/total` / `BONUS n %` (mêmes
  valeurs qu'aujourd'hui, `formatNumber` inchangé). Sans monde : `aucun monde chargé` à la place
  des cases (texte lu par `app.spec.ts`).
- **Bandeau d'erreur** : même `div.alert[role="alert"]` cliquable, en **vidéo inversée** (fond
  vert, texte noir — tokens `error-container` / `on-error-container` de la table ci-dessous).
- **Écran** : zone centrale qui prend toute la hauteur restante (défilement interne, jamais la
  page), titre d'écran en capitales suivi d'un filet horizontal comme le `STATS` de l'image :

  | Onglet | Titre | Contenu | Aujourd'hui |
  |---|---|---|---|
  | Produits (défaut) | `PRODUITS (6)` | les 6 `ProductCard`, grille inchangée | `section.products`, toujours visible |
  | Managers / Upgrades / Unlocks | `MANAGERS` … | `PalierList`, inputs inchangés | panneau 420 px |
  | Anges | `ANGES` | `AngelsPanel` inchangé (sous-onglets Reset / Bonus, `confirm()` dans `App`) | panneau 420 px |
  | Paramètres | `PARAMÈTRES` | nouveau `SettingsPanel` : 3 `mat-slide-toggle` — **Scanlines** (on par défaut), **Halo** (on), **Scintillement** (off) | — |

  Les écrans Produits → Unlocks n'existent que si un monde est chargé (comme aujourd'hui) ;
  **Paramètres s'affiche même sans monde** (il n'en dépend pas).
- **Barre du bas** : nouveau composant `TabBar` (`app-tab-bar`, remplace `SideNav`) =
  `mat-tab-nav-panel` (qui **projette** l'écran via `<ng-content />`) puis `nav mat-tab-nav-bar
  [tabPanel]` avec 6 `a mat-tab-link` **texte seul** (pas de `mat-icon`, comme l'image),
  `[active]` sur l'onglet courant, `[attr.data-tab]`, badge `matBadge` des anges gagnables sur
  Anges (masqué à 0, D19). Inputs `active: Tab`, `angelsEarned: number` ; output `select(tab)`.
  Toujours un onglet actif : cliquer l'onglet actif ne fait rien.
- **Modèle d'onglet** (`game.service.ts`) : `Tab = 'products' | 'managers' | 'upgrades' | 'angels'
  | 'unlocks' | 'settings'`, `TABS` dans cet ordre, `DEFAULT_TAB = 'products'`,
  `activeTab: signal<Tab>` (plus jamais `null`), `selectTab(tab)` remplace `toggleTab`. Clé
  `isiscapitalist.tab` inchangée :

  | localStorage `isiscapitalist.tab` | `readStoredTab()` |
  |---|---|
  | absent | `'products'` |
  | `'upgrades'` | `'upgrades'` |
  | `'none'` (ancien « panneau fermé », D19) | `'products'` |
  | `'foo'` | `'products'` |

- **Réglages CRT** (`game.service.ts`, même patron `effect` + try/catch que `user` / `tab`) :
  signaux `scanlines`, `glow`, `flicker` (booléens), clés `isiscapitalist.scanlines` /
  `isiscapitalist.glow` / `isiscapitalist.flicker`, valeurs `'on'` / `'off'`, lues par un
  `readStoredFlag(key, fallback)` commun (absent ou inconnu → `fallback` : `true`, `true`,
  `false`). `App` les pose en classes sur `<app-root>` par host binding (`crt-scanlines`,
  `crt-glow`, `crt-flicker`) ; `SettingsPanel` les édite (`model()` ×3, liés `[(scanlines)]="game.scanlines"` …).
- **Effets CRT** — tout dans `styles.css` (global), aucune couleur en dur :
  - `app-root.crt-scanlines::after` : overlay `position: fixed; inset: 0; pointer-events: none;
    z-index: 1000`, `repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,.25) 2px 3px)` ;
  - `app-root.crt-glow` : `text-shadow: 0 0 0.35rem currentColor` (hérité par tout le texte,
    Material compris) + `box-shadow` léger sur les cadres `.pip-frame` ;
  - `app-root.crt-flicker::before` : overlay fixe couleur `var(--mat-sys-primary)`, `opacity: 0`,
    `animation: pip-flicker 4s steps(1) infinite` avec `@keyframes pip-flicker { 0%, 97% { opacity: 0 }
    98% { opacity: .04 } 99% { opacity: 0 } }` ; `@media (prefers-reduced-motion: reduce)` →
    `animation: none` (le réglage reste `'on'` en stockage ; le libellé du toggle précise « ignoré
    si votre système réduit les animations »).
- **Icônes produit** (PNG unis, D11) : teintées dans `product-card.css` —
  `filter: grayscale(1) sepia(1) saturate(6) hue-rotate(95deg)`, à ajuster pour approcher
  `#1aff80` : aucune couleur étrangère au monochrome ; peu importe si les 6 se ressemblent
  (les vraies images sont une étape séparée).

**Palette** — `material-theme.scss` est la **seule** source des couleurs (aucun hex ailleurs).
Contraste `#1aff80` sur `#001609` ≈ 14 : 1, `#14a85a` sur `#001609` ≈ 6 : 1 (≥ 4,5 requis) :

| Token système (`$overrides`) | Valeur | Rôle |
|---|---|---|
| `surface`, `background` | `#001609` | fond (échantillonné sur l'image) |
| `surface-container-low` / `surface-container` / `surface-container-high` / `surface-container-highest` | `#02180b` / `#041a0d` / `#062211` / `#082a15` | cartes, tables, champs (léger relief) |
| `on-surface`, `primary`, `outline`, `on-secondary-container` | `#1aff80` | texte, filets, actions (vert Fallout 3) |
| `on-surface-variant`, `outline-variant`, `secondary` | `#14a85a` | texte secondaire, filets discrets |
| `on-primary`, `on-secondary`, `on-error`, `on-error-container`, `on-primary-container` | `#001609` | texte sur fond vert |
| `primary-container`, `error`, `error-container` | `#1aff80` | vidéo inversée : bandeau d'erreur, bouton Reset (`warn`), sélection |
| `secondary-container` | `#062211` | fond des états sélectionnés Material (toggle du multiplicateur) |
| `corner-extra-small`, `corner-small`, `corner-medium`, `corner-large`, `corner-extra-large`, `corner-full` | `0` | angles droits partout (cartes, boutons, champs, chips) |

Palette de base générée par le schematic, dans `frontend/` :

```bash
ng generate @angular/material:theme-color --primaryColor="#1aff80" --neutralColor="#0b3d21" --isScss=true --directory=src
```

→ fichier `src/_theme-colors.scss` (nom à confirmer après génération), consommé ainsi :

```scss
@use '@angular/material' as mat;
@use './theme-colors' as pip;

html {
  @include mat.theme((
    color: (primary: pip.$primary-palette, tertiary: pip.$tertiary-palette, theme-type: dark),
    typography: (plain-family: 'VT323, monospace', brand-family: 'VT323, monospace',
                 regular-weight: 400, medium-weight: 400, bold-weight: 400),
    density: 0,
  ), $overrides: ( /* la table ci-dessus, token: valeur */ ));
}
body { color-scheme: dark; }
```

VT323 n'a qu'une graisse (400) ; elle paraît ~20 % plus petite que Roboto à taille égale : si
le corps est illisible, surcharger les tailles de la typographie système dans `$overrides` (noms
dans `_system.scss`, ex. `body-medium-size`) plutôt que des `font-size` dans les composants.

### Cas limites

- **localStorage indisponible** (navigation privée) : valeurs par défaut, aucune erreur (même
  try/catch que `user` / `tab`).
- **Hors ligne** : VT323 absente → `monospace` système, mise en page intacte (les tests jsdom ne
  chargent aucune police).
- **`mat-progress-bar`** : piste et indicateur seraient tous deux verts ; imposer
  `mat.progress-bar-overrides((track-color: …, active-indicator-color: …))` (piste
  `surface-container-highest`, indicateur `primary`) pour que la barre de production reste lisible.
- **Sélection visible sans couleur supplémentaire** : onglet actif et toggle du multiplicateur
  sélectionné en vidéo inversée ou encadrés (l'image encadre l'onglet `Status`) ; boutons
  `[disabled]` (D17) : le rendu Material (`on-surface` à 38 %) donne un vert atténué, vérifier
  qu'on le distingue d'un bouton actif.
- **Badge ≥ 4 chiffres** sur l'onglet Anges : `mat-tab-link` peut le rogner comme
  `mat-list-item` le faisait (D20) ; recentrer par le même procédé que `side-nav.css` si besoin.
- **Backend arrêté** : bandeau d'erreur inversé visible sans monde, barre du bas et Paramètres
  utilisables.
- **Largeur 800 px** : la barre du bas pagine (flèches Material) ou réduit ses marges, le bandeau
  passe sur deux lignes, aucun défilement horizontal de la page.
- **jsdom et `mat-tab-nav-bar`** : si la pagination râle (ResizeObserver, largeur nulle),
  fournir `MATERIAL_ANIMATIONS` `{ animationsDisabled: true }` comme `angels-panel.spec.ts`
  avant d'envisager un mock.

### Contraintes (et pourquoi)

- **Aucune dépendance nouvelle** (règle 8) : pas de Web Component CRT tiers, pas de police
  auto-hébergée ; Material déjà installé + CSS. VT323 remplace Roboto dans le `<link>` Google
  Fonts d'`index.html` (même mécanisme que D18).
- **Rien ne change dans `backend/`, le schéma, `game-math.ts`, les mutations, les `ProductCard`
  / `PalierList` / `AngelsPanel` `.ts` et `.html`** : refonte visuelle + navigation ; si tu crois
  devoir y toucher, la structure choisie est mauvaise.
- **La peau Pip-Boy vit dans `material-theme.scss` (tokens) et `styles.css` (classes globales
  `.pip-frame`, `.pip-title`, `crt-*`)**, les CSS de composants ne portent que la mise en page :
  le budget `anyComponentStyle` (8 kB error) interdirait des effets dans `app.css`, et une classe
  globale atteint l'intérieur des composants Material sans `::ng-deep`. Encapsulation émulée
  conservée ; `::ng-deep` seulement si ni un token ni un mixin `mat.<composant>-overrides` ne
  suffit (cas du badge, D20).
- **`TabBar` et `SettingsPanel` présentationnels** (`input` / `output` / `model`, aucune
  injection) : testables avec TestBed sans serveur, comme les autres.
- **Les préférences restent dans `GameService`** (mêmes `effect`) : un seul endroit à stubber
  dans `app.spec.ts`.
- `[disabled]` natif conservé (D17) : les specs lisent l'attribut.
- **Retirer le `<link>` Material Icons** seulement après avoir vérifié qu'aucun `mat-icon` ne
  subsiste (`grep -r "mat-icon\|MatIconModule" src/`) : une police de moins à charger ; la barre
  est texte seul comme l'image.
- **Aucun actif Fallout** (Vault Boy, logos, sons : marques Bethesda) et pas le mot « Pip-Boy »
  dans l'interface ; l'image de référence reste dans `docs/`, jamais servie par l'app.
- Ne pas modifier `frontend/src/app/graphql/types.ts` / `operations.ts` (générés) ni
  `backend/src/graphql.ts`.

### Hors périmètre

- Choix de couleur d'écran (ambre / bleu / blanc) : refusé pour l'instant — garder les hex dans
  la seule `material-theme.scss` pour que ce soit une évolution d'un fichier.
- Renommage du monde, vraies icônes, contenu post-apo : étape séparée (backend).
- Courbure d'écran, vignette, bruit, sons, transitions animées entre écrans.
- Thème clair, sélecteur de thème, `Router`, `MatDialog`, `MatSnackBar`.
- Mobile en dessous de 800 px au-delà de « pas de défilement horizontal ».
- `formatNumber`, formules, ordre ou nombre des produits.

### Étapes

1. Lire les fichiers ci-dessus. La feature touche > 3 fichiers : écrire un plan en 5-8 lignes
   (fichiers créés / renommés / supprimés, tokens surchargés, ordre des étapes) et le montrer
   avant de coder.
2. **Thème** : lancer le schematic `theme-color` (options ci-dessus ; si le CLI refuse le `#`,
   le passer sans) ; relire le fichier généré (nom exact, palettes exportées) ; réécrire
   `material-theme.scss` (bloc SCSS ci-dessus + le mixin de la progress bar des Cas limites) ;
   `index.html` : `<link>` VT323 à la place de Roboto, `<title>` → `ISIS Capitalist`. Vérifier dans l'inspecteur que `--mat-sys-body-medium-font` vaut
   `VT323, monospace` et `--mat-sys-surface` `#001609`.
3. **`styles.css`** : `.pip-frame` (bordure 1 px `var(--mat-sys-outline)`), `.pip-title`
   (capitales, `letter-spacing`, filet), les trois classes `crt-*` et les `@keyframes`, la media
   query `prefers-reduced-motion`.
4. **`game.service.ts`** : nouveau `Tab` / `TABS` / `DEFAULT_TAB`, `readStoredTab` (table
   ci-dessus), `selectTab`, `readStoredFlag`, trois signaux + clés exportées, `effect` de
   persistance. `game.service.spec.ts` : adapter les tests `readStoredTab` / `toggleTab` et
   ajouter `readStoredFlag` (absent → défaut, `'off'` → `false`, `'on'` → `true`) et la
   persistance des trois clés.
5. **`TabBar`** (`tab-bar.ts/.html/.css/.spec.ts`, supprimer `side-nav.*`) : `NAV_ITEMS`
   (6 entrées `{ id, label }`), `mat-tab-nav-panel` + `ng-content`, `nav mat-tab-nav-bar`,
   badge. Spec : 6 libellés dans l'ordre, lien actif (sélecteur vérifié dans `tabs.mjs`), badge
   15 / masqué à 0, clic → `select`, contenu projeté présent.
6. **`SettingsPanel`** (`settings-panel.ts/.html/.css/.spec.ts`) : titre, 3 `mat-slide-toggle`
   (`MatSlideToggleModule`) sur 3 `model<boolean>()`, aide sous Scintillement. Spec : états
   initiaux reflétés, clic sur un toggle → `model` mis à jour.
7. **`App`** : bandeau (titre, user, multiplicateur, cases stats), bandeau d'erreur, `TabBar`
   enveloppant un `@switch` à 6 cas (Paramètres hors du `@if (game.world())`), host binding des
   classes `crt-*`, `selectTab` ; retirer `MatSidenavModule` / `SideNav`. `app.css` : colonne
   pleine hauteur (`100dvh`), écran `flex: 1; min-height: 0; overflow: auto`, grille produits
   inchangée. `app.spec.ts` : stub avec `activeTab` (`Tab`, non nul), `selectTab`, 3 signaux
   CRT ; cas sans monde (6 liens, ni `mat-card` ni `app-palier-list`, texte
   `aucun monde chargé`), cas `settings` sans monde (3 toggles), classes `crt-scanlines crt-glow`
   présentes et `crt-flicker` absente par défaut.
8. **Retouches composants** : `product-card.css` (filtre icônes, `.pip-frame` inutile si
   `mat-card` suffit), `palier-list.css`, `angels-panel.css` : uniquement si un token ne couvre
   pas le cas. Specs `product-card`, `palier-list`, `angels-panel` inchangées et vertes.
9. **Docs** :
   - `docs/DECISIONS.md` : entrée `## D21 — Frontend : thème Pip-Boy, onglets en bas, réglages
     CRT` (format D18-D20 ; **il existe déjà deux entrées numérotées D20, ne pas les
     renuméroter**) : contexte (demande, image de référence), décision (schematic + `$overrides`,
     VT323 à la place de Roboto et Material Icons retirées — amende D18 ; `Tab` élargi, plus de
     panneau fermé, `selectTab`, `'none'` → `'products'` — amende D19 ; effets en `styles.css`
     et pourquoi ; trois clés localStorage ; aucun actif Fallout), conséquences (bundle, budgets,
     hors ligne, couleur unique).
   - `frontend/CLAUDE.md` : Stack (VT323, plus de Material Icons, `_theme-colors.scss`), tableau
     des fichiers (`tab-bar.*`, `settings-panel.*`, `styles.css`, `material-theme.scss`,
     `side-nav.*` supprimés), conventions (`Tab` à 6 valeurs, `selectTab`, clés
     `isiscapitalist.scanlines/glow/flicker`, peau dans `styles.css`).
   - `docs/ROADMAP.md` : remplacer la ligne 9.7 par `- [x] 9.7 Thème Pip-Boy (D21) : …` (une
     phrase) et ajouter `- [ ] 9.8 … (à compléter quand frontend.pdf sera disponible).`
   - `CLAUDE.md` (racine), « État actuel » : une phrase sur 9.7.
10. Vérifier (section suivante).

### Vérification — critères de succès

- [ ] `npm run build` sans erreur dans `frontend/` (warnings de budget listés dans le rapport,
  budgets non modifiés).
- [ ] `npm test` vert : `game.service.spec.ts`, `tab-bar.spec.ts`, `settings-panel.spec.ts`,
  `app.spec.ts`, et les specs inchangées `game-math`, `product-card`, `palier-list`,
  `angels-panel`.
- [ ] `grep -r "mat-icon\|MatIconModule\|side-nav" frontend/src/` ne renvoie rien.
- [ ] Backend lancé avec la configuration `backend` de `.claude/launch.json`, frontend avec
  `frontend` (jamais via Bash). Sur http://localhost:4200, utilisateur **neuf**
  (`test-pip-<timestamp>`), localStorage vidé :
  - [ ] `getComputedStyle(document.body)` : `backgroundColor` = `rgb(0, 22, 9)`, `fontFamily`
    contient `VT323` ; `color` du titre = `rgb(26, 255, 128)`.
  - [ ] `nav[mat-tab-nav-bar]` contient 6 `a[mat-tab-link]` dans l'ordre Produits … Paramètres,
    et son `getBoundingClientRect().bottom` ≈ `window.innerHeight` (± 1 px).
  - [ ] Écran par défaut : 6 `mat-card`, aucun `app-palier-list` ;
    `a[mat-tab-link][data-tab="products"]` porte `aria-current="page"` (ou la classe
    `mdc-tab--active` — celui des deux que `tabs.mjs` pose) et aucun autre lien ne le porte ;
    `localStorage['isiscapitalist.tab']` = `'products'`.
  - [ ] Item 1, `money 0` : bouton Acheter `disabled`, et `getComputedStyle(acheter).color` ≠
    `getComputedStyle(produire).color` (le désactivé est un vert atténué, pas le même vert).
  - [ ] Clic Managers : `app-palier-list` (titre `MANAGERS`) visible, plus aucun `mat-card`,
    `localStorage['isiscapitalist.tab']` = `'managers'` ; rechargement → Managers toujours actif ;
    re-clic Managers → rien ne change.
  - [ ] `localStorage.setItem('isiscapitalist.tab', 'none')` + rechargement → écran Produits.
  - [ ] Éditer `backend/userworlds/test-pip-<timestamp>-world.json` (`"score": 750`), attendre
    le poll : badge `15` sur Anges ; Anges › Reset affiche `Anges gagnables : 15`.
  - [ ] Paramètres : 3 `mat-slide-toggle` (on, on, off) ; `document.querySelector('app-root').className`
    contient `crt-scanlines crt-glow` et pas `crt-flicker` ; décocher Scanlines → classe retirée,
    `localStorage['isiscapitalist.scanlines']` = `'off'`, rechargement → toujours décoché ; cocher
    Scintillement → classe `crt-flicker` présente.
  - [ ] Produits, Item 1 : `getComputedStyle` de la piste et de l'indicateur de la
    `mat-progress-bar` donnent deux couleurs différentes ; clic Produire → `aria-valuenow` de la
    barre passe de `0` à `100`, puis `money 1.00` au poll suivant.
  - [ ] Arrêter le backend : bandeau `role="alert"` avec `backgroundColor` `rgb(26, 255, 128)`
    et `color` `rgb(0, 22, 9)`.
  - [ ] Aucune erreur dans la console navigateur.
  - [ ] Largeur 800 px : `document.documentElement.scrollWidth <= window.innerWidth`.
- [ ] Trois captures jointes au rapport : Produits (desktop), Paramètres, largeur 800 px.

### Rapport attendu

En fin de tâche : fichiers créés / renommés / supprimés / modifiés, nom exact du fichier généré
par le schematic, commandes lancées avec leurs résultats réels (build avec ses warnings, tests),
les captures, les tokens dont la valeur a été ajustée à l'œil par rapport à la table, et ce qui
reste incertain. Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Thème M3 personnalisé | `ng generate @angular/material:theme-color` (palettes tonales depuis une couleur seed, fichier `_theme-colors.scss`) puis `mat.theme(…, $overrides: (…))` / `mat.theme-overrides()` pour les tokens système ; `theme-type: dark` + `color-scheme: dark` (Material n'applique aucune media query seul) | identique : seed `#1aff80`, neutre vert sombre, overrides monochromes (vérifié dans `core/tokens/_system.scss` 22.1.7 : `theme($config, $overrides: ())`) | reprendre |
| Typographie | `typography: (plain-family, brand-family, regular/medium/bold-weight)` ; police Google Fonts par `<link>` (Roboto posée par `ng add`, D18) | VT323, un seul poids (400) | reprendre ; D21 amende D18 |
| Onglets sans routeur | `mat-tab-nav-bar` + `a mat-tab-link [active]` + `mat-tab-nav-panel` **obligatoire** via `[tabPanel]` (erreur en dev sinon, `tabs.mjs` l. 1902) ; indépendant du routeur | `@switch` sur `activeTab` (D19) conservé, barre en bas, écran projeté dans le panel | reprendre ; D21 amende D19 (plus de `null`) |
| Effets CRT | vault66-crt-effect, wthouse/scanlines, article Codemotion : scanlines par gradient répété, glow `text-shadow: 0 0 …`, flicker en keyframes ; `prefers-reduced-motion` coupe les couches animées et garde scanlines / glow ; overlay `pointer-events: none` | identique en CSS pur global, 3 classes sur `app-root` + interrupteurs utilisateur | reprendre (pas de Web Component tiers : règle 8) |
| Scanlines par `mask-image` sur `body` (Codemotion) | touche aussi les scrollbars et rogne le texte fin | overlay fixe en pseudo-élément | diverge (lisibilité) |
| Couleur | Fallout 3 / NV `#1aff80` (26,255,128), Fallout 4 `#12ff15` ; image de référence échantillonnée : vert dominant `#21e874`, fond `#001609` | `#1aff80` sur `#001609` (≈ 14 : 1), vert atténué `#14a85a` (≈ 6 : 1) | reprendre |
| Préférences UI | localStorage, une clé par préférence, `effect` + try/catch (convention `frontend/CLAUDE.md`) | 3 clés `isiscapitalist.scanlines/glow/flicker` | reprendre |
| Actifs Fallout | Vault Boy, logos = marques Bethesda ; les thèmes open source n'embarquent que palette et police | aucun actif copié, image de référence dans `docs/` seulement | décision à noter (D21) |

Sources : [Theming — Angular Material](https://material.angular.dev/guide/theming),
[theme-color schematic README](https://github.com/angular/components/blob/main/src/material/schematics/ng-generate/theme-color/README.md),
[Tabs — Angular Material](https://material.angular.dev/components/tabs),
[issue #26270 `[tabPanel]` obligatoire](https://github.com/angular/components/issues/26270),
[vault66-crt-effect](https://github.com/mdombrov-33/vault66-crt-effect),
[wthouse/scanlines](https://github.com/wthouse/scanlines),
[Create Your Own Fallout Pip-Boy 3000 With CSS — Codemotion](https://www.codemotion.com/magazine/frontend/creating-a-fallout-style-ui-using-modern-css/),
[Pip-Boy colors — Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=652429945).

## Notation (grille Anthropic) — 18/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | État D18/D19, image de référence à regarder, ce qui change (disposition + peau + Paramètres) et ce qui ne change pas, 9.7 nommée. |
| 2 | Instructions séquencées | 2 | 10 étapes : plan → thème → styles → service → TabBar → SettingsPanel → App → retouches → docs → vérif. |
| 3 | Exemples concrets | 2 | v1 = 1 : ASCII, table de tokens et table `readStoredTab` présents, mais le schematic et `mat.theme` décrits en prose (options mélangées `primaryColor #1aff80` / `--isScss true`) ; v2 : commande `ng generate` complète en bloc `bash` et bloc SCSS de `material-theme.scss` tel qu'attendu. |
| 4 | Structure lisible | 2 | Schéma de disposition, table des écrans, table des tokens, contraintes une par ligne. |
| 5 | Rôle et périmètre | 2 | Dev Angular ; backend / schéma / `.ts` des composants existants exclus ; hors périmètre concret (couleur, courbure, thème clair, mobile). |
| 6 | Critères de succès mesurables | 2 | v1 = 1 : « le lien Produits est marqué actif », « la barre progresse », et le bouton désactivé (cas limite) sans contrôle ; v2 : `aria-current="page"` / `mdc-tab--active` sur un seul lien, `aria-valuenow` 0 → 100, `color` calculée du bouton `disabled` ≠ celle de Produire — à côté des contrôles déjà chiffrés (`rgb(0, 22, 9)`, `bottom ≈ innerHeight`, valeurs localStorage, `scrollWidth <= innerWidth`). |
| 7 | Pourquoi des contraintes | 2 | Budget `anyComponentStyle` → effets en global ; `tabPanel` obligatoire ; préférences dans le service → un seul stub ; Material Icons retirées seulement après grep ; marques Bethesda. |
| 8 | Raisonnement guidé | 2 | Plan avant code ; relire le fichier généré par le schematic ; vérifier `_system.scss` pour les noms de tokens et `tabs.mjs` pour le sélecteur actif ; inspecteur pour `--mat-sys-body-medium-font`. |
| 9 | Format de sortie | 2 | Fichiers nommés (créés, renommés, supprimés), contenu de D21 (avec l'avertissement des deux D20), lignes de `frontend/CLAUDE.md` et ROADMAP, rapport avec tokens ajustés. |
| 10 | Concision / contradictions | 0 | v1 = 0 : `mat.progress-bar-overrides` cité trois fois (cas limites, étape 2, vérification) ; contradiction latente entre « Paramètres s'affiche sans monde » et le test « pas de `main` » (qui imposait une structure de balises non décrite) ; v2 : le mixin n'est détaillé qu'en Cas limites (étape 2 y renvoie), le test sans monde lit `mat-card` / `app-palier-list`. Reste la redondance assumée table de tokens ↔ vérification, et la longueur (feature à 4 volets : thème, disposition, onglet, réglages). |

Historique : v1 16/20 → v2 18/20 (un tour ; ≥ 17, arrêt conforme au skill).

Améliorations retenues (v1 → v2) :
- critère 3 : commande `ng generate …theme-color` et bloc `mat.theme` / `$overrides` écrits tels
  quels au lieu d'une description ;
- critère 6 : onglet actif, progression et bouton désactivé lus dans le DOM (`aria-current`,
  `aria-valuenow`, `getComputedStyle`) au lieu d'être « visibles » ;
- critère 10 : un seul endroit pour le mixin de la progress bar ; test sans monde qui ne
  présuppose plus une balise `main`.
