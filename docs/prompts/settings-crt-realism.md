# Prompt — Paramètres : réglages CRT réalistes (vignette, grille, grain, bande, bruit, teinte, curseurs, reset)

- Date : 2026-09-20
- Étape roadmap : 9.19 (nouvelle ligne à insérer, voir Étapes) — suppose 9.18 terminée
- Sous-projet : **frontend** seul
- Score (grille Anthropic) : 19/20 — voir notation en bas
- Source : /feature-to-prompt, demande initiale : « dans l'onglet parametre rajoute des parametre
  visuel pour rendre l'ecran type pip-boys plus realiste »

---

## Prompt

<!-- Début du texte à copier -->

Tu travailles sur **ISIS Capitalist**, un jeu idle type AdVenture Capitalist (TP ISIS) :
monorepo avec `backend/` (NestJS 12, GraphQL schema-first, mondes JSON dans `backend/userworlds/`)
et `frontend/` (Angular 22 standalone + signals, `@apollo-orbit/angular`, Angular Material 22.1
en thème « écran cathodique » vert monochrome, tests vitest). Réponds en français ; code et
commentaires selon `CLAUDE.md` et `frontend/CLAUDE.md`. Tu es le développeur frontend du TP :
cette feature ne touche que `frontend/src/` (réglages d'affichage) et la documentation — rien
dans `backend/`, aucune règle de jeu, aucune opération GraphQL.

### Objectif

L'onglet **Paramètres** (`SettingsPanel`, D22) a trois interrupteurs : Scanlines, Halo,
Scintillement. On veut que l'écran ressemble davantage à un vrai tube cathodique de Pip-Boy, avec
des réglages fins, comme le panneau « Effects » de cool-retro-term. Sept ajouts, **tous
d'affichage** — le jeu, les mutations et les autres onglets ne changent pas :

1. **Vignette + courbure** (toggle + curseur) : coins de l'écran assombris, angles arrondis et
   ombre interne — illusion de vitre bombée, **simulée en CSS** (pas de déformation SVG / 3D).
2. **Grille de pixels** (toggle) : trame verticale fine complétant les scanlines horizontales.
3. **Grain** (toggle) : texture statique de bruit très légère par-dessus l'image.
4. **Bande de balayage** (toggle) : barre horizontale claire qui descend lentement en boucle.
5. **Bruit animé** (toggle) : la même texture de grain, mais qui bouge (neige).
6. **Teinte** du phosphore (sélecteur) : Vert (actuel) / Ambre / Bleu / Blanc, appliquée par
   `filter` CSS sur toute l'app — texte, cadres **et icônes** changent ensemble.
7. **Curseurs d'intensité** 0-100 % pour Scanlines, Halo et Vignette ; **50 % = rendu actuel**.

Plus un bouton **« Réinitialiser les réglages »** qui remet tout à la valeur par défaut.
Défauts : tout ce qui est statique est actif (vignette, grille, grain), tout ce qui est animé
est inactif (scintillement, bande, bruit animé), teinte verte, curseurs à 50. C'est l'étape
**9.19** de `docs/ROADMAP.md`.

### À lire avant d'écrire

1. `CLAUDE.md` (racine) et `frontend/CLAUDE.md` — lignes `game.service.ts`, `settings-panel`,
   `app.ts` du tableau, et la convention « Préférences d'affichage persistées ».
2. `docs/DECISIONS.md` — **D22** (réglages CRT : signaux dans `GameService`, classes `crt-*`
   posées par `App` en host binding, effets globaux dans `styles.css` à cause du budget
   `anyComponentStyle` 8 kB et de la portée ; **aucune couleur en dur hors
   `material-theme.scss`**), **D31** (halo du toggle sous `crt-glow`). La nouvelle entrée sera
   **D34**.
3. `frontend/src/styles.css` — les trois effets existants : `app-root.crt-scanlines::after`
   (overlay fixe, gradient noir 0.25), `app-root.crt-glow` (`text-shadow` 0.35rem +
   `box-shadow` des cadres), `app-root.crt-flicker::before` (voile animé, coupé par
   `prefers-reduced-motion`). Les deux pseudo-éléments d'`app-root` sont **déjà pris**.
4. `frontend/src/app/game.service.ts` — `readStoredFlag` / `storeFlag`, les trois signaux
   `scanlines` / `glow` / `flicker`, les trois `effect` de persistance, les constantes
   `*_STORAGE_KEY` / `DEFAULT_*`.
5. `frontend/src/app/app.ts` (host bindings `[class.crt-*]`), `app.html` (ligne
   `<app-settings-panel [(scanlines)]… />`), `app.css` (`.screen` : l'écran qui défile).
6. `frontend/src/app/settings-panel.ts/.html/.css/.spec.ts`, `app.spec.ts` (stub
   `stubGameService` avec `scanlines` / `glow` / `flicker`), `game.service.spec.ts` (describe
   « GameService : onglet et réglages CRT »).
7. `frontend/src/material-theme.scss` — pour constater que `$pip-green` = `#1aff80` ; **ne pas
   le modifier**.

### Comportement attendu

#### Modèle (nouveau fichier `frontend/src/app/display-settings.ts`, pur, sans injection)

```ts
export type Tint = 'green' | 'amber' | 'blue' | 'white';
export const TINTS: readonly Tint[] = ['green', 'amber', 'blue', 'white'];
export interface DisplaySettings {
  scanlines: boolean; scanlinesLevel: number;   // 0-100
  glow: boolean;      glowLevel: number;        // 0-100
  vignette: boolean;  vignetteLevel: number;    // 0-100
  grid: boolean;      grain: boolean;
  flicker: boolean;   roll: boolean;  noise: boolean;
  tint: Tint;
}
export const DEFAULT_DISPLAY: DisplaySettings = {
  scanlines: true, scanlinesLevel: 50, glow: true, glowLevel: 50, vignette: true, vignetteLevel: 50,
  grid: true, grain: true, flicker: false, roll: false, noise: false, tint: 'green',
};
export const DISPLAY_STORAGE_KEY = 'isiscapitalist.display';
export function normalizeDisplay(raw: unknown): DisplaySettings;   // voir Cas limites
export function readStoredDisplay(): DisplaySettings;              // JSON + migration D22
```

- **Une seule clé** localStorage `isiscapitalist.display` (JSON de `DisplaySettings`), écrite par
  un `effect` sous try/catch dans `GameService`, comme `user` / `tab`. Les trois clés D22
  (`isiscapitalist.scanlines` / `.glow` / `.flicker`) ne sont plus écrites ; `readStoredDisplay`
  les **lit une fois en migration** si `isiscapitalist.display` est absent (via `readStoredFlag`,
  conservé), puis les supprime (`removeItem`, sous le même try/catch).
- `GameService` : les trois signaux `scanlines` / `glow` / `flicker` et leurs trois `effect` sont
  **remplacés** par un seul `readonly display = signal<DisplaySettings>(readStoredDisplay())`.
  Supprimer les constantes `*_STORAGE_KEY` / `DEFAULT_*` de D22 sauf celles que la migration lit.

#### Panneau (`SettingsPanel`, présentationnel)

- Un seul `readonly display = model.required<DisplaySettings>()` remplace les trois `model`.
  Helper `patch(partial: Partial<DisplaySettings>)` → `display.update(d => ({ ...d, ...partial }))`.
  Les toggles et curseurs appellent `patch` ; `App` lie `[(display)]="game.display"`.
- Trois sections dans le `.pip-frame`, chacune avec un sous-titre `h3` :
  - **Écran** : Teinte (`mat-button-toggle-group` à 4 boutons Vert / Ambre / Bleu / Blanc,
    `aria-label="Teinte"`), Vignette (toggle + curseur), Grille de pixels (toggle), Grain (toggle).
  - **Lumière** : Scanlines (toggle + curseur), Halo (toggle + curseur).
  - **Animations** : Scintillement, Bande de balayage, Bruit animé (toggles) + l'aide existante,
    reformulée : « Animations : ignorées si votre système réduit les animations. »
- Curseur = `mat-slider` (`MatSliderModule`, déjà dans `@angular/material`) `min="0" max="100"
  step="5" discrete [displayWith]="percent"` avec `<input matSliderThumb [value]="…"
  (valueChange)="patch(…)" aria-label="Intensité des scanlines">` (idem halo, vignette). Un
  curseur est **`[disabled]`** quand son toggle est off (l'intensité n'a pas d'effet).
- Bouton `matButton="outlined"` « Réinitialiser les réglages » en bas du cadre :
  `display.set({ ...DEFAULT_DISPLAY })`. Jamais désactivé.
- Ordre des `mat-slide-toggle` dans le DOM (les specs comptent dessus) : Vignette, Grille de
  pixels, Grain, Scanlines, Halo, Scintillement, Bande de balayage, Bruit animé.

#### Application des réglages (`App`, host bindings sur `<app-root>`)

```ts
host: {
  '[class.crt-scanlines]': 'game.display().scanlines',
  '[class.crt-glow]':      'game.display().glow',
  '[class.crt-flicker]':   'game.display().flicker',
  '[class.crt-vignette]':  'game.display().vignette',
  '[class.crt-grid]':      'game.display().grid',
  '[class.crt-grain]':     'game.display().grain',
  '[class.crt-roll]':      'game.display().roll',
  '[class.crt-noise]':     'game.display().noise',
  '[attr.data-tint]':      'game.display().tint',
  '[style.--crt-scanlines]': 'game.display().scanlinesLevel / 100',
  '[style.--crt-glow]':      'game.display().glowLevel / 100',
  '[style.--crt-vignette]':  'game.display().vignetteLevel / 100',
}
```

Dans `app.html`, ajouter **un** élément `<div class="crt-overlay" aria-hidden="true"></div>` en
dernier enfant de `<app-root>` : il porte (lui-même et ses deux pseudo-éléments) les couches
nouvelles — les deux pseudo-éléments d'`app-root` restent aux scanlines et au scintillement.

#### Effets (`styles.css`, règles globales, aucune couleur hors noir / transparent / tokens)

| Classe | Rendu | Intensité |
|---|---|---|
| `crt-scanlines` (existant) | gradient inchangé, `opacity: calc(var(--crt-scanlines) * 2)` sur l'overlay, borné 1 | 0.5 → `opacity` 1 × alpha 0.25 = **rendu actuel** ; 1 → alpha équivalente 0.5 |
| `crt-glow` (existant) | `text-shadow: 0 0 calc(0.7rem * var(--crt-glow)) currentColor` ; `box-shadow` des cadres et du toggle (D31) : rayon `calc(1rem * var(--crt-glow))` | 0.5 → 0.35rem / 0.5rem = **rendu actuel** |
| `crt-vignette` | sur `.crt-overlay` : `background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0, calc(0.9 * var(--crt-vignette))) 100%)` ; sur `app-root` : `border-radius: calc(24px * var(--crt-vignette))` + `box-shadow: inset 0 0 calc(4rem * var(--crt-vignette)) rgba(0,0,0,0.6)` | 0 → rien ; 1 → coins bien noirs |
| `crt-grid` | `.crt-overlay::before` : `repeating-linear-gradient(to right, transparent 0 2px, rgba(0,0,0,0.12) 2px 3px)` | fixe |
| `crt-grain` | `.crt-overlay::after` : `background-image: url("data:image/svg+xml,…feTurbulence baseFrequency=0.8…")`, `opacity: 0.06` | fixe |
| `crt-roll` | sur `.crt-overlay` lui-même, **seconde couche** de `background-image` (après la vignette) : `linear-gradient(to bottom, transparent, color-mix(in srgb, var(--mat-sys-primary) 8%, transparent), transparent)` de `100% 20vh`, `no-repeat`, animée par `@keyframes pip-roll` sur `background-position-y` (−20 vh → 100 vh, 8 s, linéaire, infini) | fixe |
| `crt-noise` | `.crt-overlay::after` : `animation: pip-noise 0.4s steps(4) infinite` qui décale `background-position` ; **remplace** le grain statique quand les deux sont actifs (le même pseudo-élément bouge) | fixe |
| `data-tint` | `app-root[data-tint="amber"] { filter: hue-rotate(-105deg) }` ; `blue` → `hue-rotate(51deg)` ; `white` → `saturate(0) brightness(1.25)` ; **`green` → aucune règle** (pas de `filter`) | fixe, valeurs à ajuster à l'œil |

`.crt-overlay` et ses pseudo-éléments : `position: fixed; inset: 0; pointer-events: none;
z-index: 999` (sous les scanlines à 1000 et le scintillement à 1001). Sans classe `crt-*`
correspondante sur `app-root`, chaque couche est `display: none` / `background: none`.
`@media (prefers-reduced-motion: reduce)` : `animation: none` pour `pip-roll` et `pip-noise`,
et la bande **disparaît** (`background-image: none`), comme `pip-flicker` aujourd'hui.

**Exemple attendu** (localStorage vide, premier lancement) : `game.display()` vaut
`DEFAULT_DISPLAY` ; `<app-root>` porte `crt-scanlines crt-glow crt-vignette crt-grid crt-grain`,
`data-tint="green"`, `style="--crt-scanlines: 0.5; --crt-glow: 0.5; --crt-vignette: 0.5"`, pas
de `filter` ; les scanlines et le halo ont exactement l'aspect d'avant (alpha 0.25, 0.35rem).
Passer le curseur Halo à 100 → `--crt-glow: 1`, `text-shadow` 0.7rem. Cliquer Ambre →
`data-tint="amber"`, `getComputedStyle(appRoot).filter` contient `hue-rotate`. Cliquer
Réinitialiser → tout revient à `DEFAULT_DISPLAY` et `localStorage['isiscapitalist.display']`
est le JSON des défauts.

### Cas limites

- `normalizeDisplay(raw)` : `raw` non-objet, champ absent ou de mauvais type → valeur par défaut
  du champ ; niveau hors 0-100 ou `NaN` → borné / défaut ; `tint` hors `TINTS` → `'green'`.
  Un JSON illisible (`JSON.parse` qui jette) → `DEFAULT_DISPLAY`. Jamais d'exception.
- Migration : `isiscapitalist.display` absent et `isiscapitalist.flicker = 'on'` → `flicker:
  true`, le reste par défaut ; les trois anciennes clés sont supprimées après lecture. Si la
  nouvelle clé existe, les anciennes sont ignorées (et supprimées).
- localStorage indisponible (navigation privée) → défauts, aucune erreur, réglages non persistés.
- Toggle off + curseur : le curseur est désactivé mais **garde sa valeur** (réactiver le toggle
  retrouve l'intensité précédente).
- Grain et Bruit animé tous les deux actifs → un seul calque (animé). Bruit animé seul → le même
  calque, animé. Sous `prefers-reduced-motion`, Bruit animé se comporte comme Grain.
- Teinte non verte : le `filter` sur `app-root` crée un bloc conteneur pour ses descendants
  `position: fixed` — sans conséquence, `app-root` fait déjà `100dvh` (`app.css`). C'est
  pourquoi la teinte est un `mat-button-toggle-group` et **pas un `mat-select`** : un overlay
  CDK monté sur `<body>` sortirait du filtre et resterait vert.
- Onglet Paramètres sans monde chargé (user vide) : le panneau reste affiché et fonctionnel
  (déjà le cas, D22).

### Contraintes (et pourquoi)

- **Une clé JSON `isiscapitalist.display`** au lieu d'une clé par réglage (convention D22) :
  douze réglages, un reset atomique et une seule `effect` ; c'est un écart à noter en **D34**,
  avec la migration des trois clés D22.
- **`display-settings.ts` pur** (comme `game-math.ts`) : `SettingsPanel` reste présentationnel
  et testable sans Apollo ; il importe `DEFAULT_DISPLAY` de ce fichier, jamais de
  `game.service.ts`.
- **Effets dans `styles.css`**, jamais dans `app.css` / `settings-panel.css` : budget
  `anyComponentStyle` (8 kB erreur) et portée globale (D22). `settings-panel.css` ne porte que la
  mise en page (sections, ligne toggle + curseur en `flex`, bouton).
- **Aucune couleur en dur** (D22) : noir / transparent et `var(--mat-sys-primary)` via
  `color-mix` seulement ; le SVG de bruit en data URI est en niveaux de gris.
- **50 % = rendu actuel** pour les trois curseurs : un joueur qui n'a rien touché ne doit voir
  aucune différence sur scanlines et halo après la mise à jour (la vignette et la grille, nouvelles,
  sont actives par défaut : c'est voulu).
- **Teinte verte = pas de `filter`** : un filtre sur tout l'écran recomposite à chaque tick de
  100 ms des barres ; le défaut ne doit rien coûter.
- **Pas de nouvelle dépendance** (règle 8 du `CLAUDE.md`) : `MatSliderModule` et
  `MatButtonToggleModule` sont déjà dans `@angular/material`.
- Ne pas toucher `material-theme.scss`, `product-card.*`, `tab-bar.*`, ni les icônes.

### Hors périmètre

- Une vraie déformation d'écran (SVG `feDisplacementMap`, `transform` 3D), la persistance des
  phosphores (burn-in), l'aberration chromatique, le jitter horizontal, les sons.
- Des palettes Material alternatives : la teinte est un `filter`, pas un second thème.
- Le backend, le schéma GraphQL, les règles de jeu, l'onglet actif ou `user` (le bouton
  Réinitialiser ne touche que `display`).

### Étapes

1. Lire les fichiers ci-dessus. La feature touche > 3 fichiers : écrire un plan de 5 lignes
   (fichiers, ordre) et le montrer avant de coder.
2. `display-settings.ts` (+ `display-settings.spec.ts` : `normalizeDisplay` et migration) ;
   `GameService` : signal `display`, `effect` JSON, suppression des trois signaux D22 ;
   `game.service.spec.ts` adapté (clé unique, migration).
3. `SettingsPanel` (`.ts/.html/.css/.spec.ts`) : sections, toggles, curseurs, teinte, reset.
4. `App` : host bindings, `[(display)]`, `div.crt-overlay` ; `app.spec.ts` (stub `display`,
   classes, `data-tint`, variables de style).
5. `styles.css` : **d'abord** une seule couche (vignette) et les trois variables, puis, dans le
   navigateur, vérifier que `getComputedStyle(appRoot).getPropertyValue('--crt-vignette')`
   vaut `"0.5"` et que le gradient réagit au curseur — c'est le moment de découvrir un binding
   `[style.--crt-*]` ou un `calc()` dans `rgba()` qui ne passerait pas, avant d'écrire les six
   autres couches. Ensuite le reste du tableau, `@keyframes pip-roll` / `pip-noise`,
   `data-tint`, `prefers-reduced-motion`.
6. Vérifier (section suivante). **Point de contrôle** : si un effet est illisible ou coûteux
   (bande qui saccade, grain qui brouille le texte 16 px des barres), baisser sa valeur fixe et
   le noter dans D34 — la doc décrit ce qui est livré.
7. Documentation : `docs/ROADMAP.md` (insérer `- [x] 9.19 Paramètres : réglages CRT réalistes —
   vignette, grille, grain, bande, bruit, teinte, curseurs, reset (D34) : display-settings.ts, clé
   isiscapitalist.display` et renuméroter le placeholder « … (à compléter) » en 9.20) ;
   `docs/DECISIONS.md` (**D34** : contexte / décision / conséquences, dont la clé JSON et la
   migration, les valeurs des filtres de teinte retenues) ; `frontend/CLAUDE.md` (lignes
   `game.service.ts`, `settings-panel`, `app.ts`, nouvelle ligne `display-settings.ts`,
   convention « Préférences d'affichage » : clé `isiscapitalist.display` remplace les trois
   clés D22) ; `CLAUDE.md` racine (phrase « Depuis 9.19, … »).

### Vérification — critères de succès

- [ ] `cd frontend && npm run build` sans erreur ni warning nouveau (warning de budget initial
      ~900 kB connu, D18 ; `settings-panel.css` < 4 kB).
- [ ] `cd frontend && npm test` vert, avec les specs nouvelles / adaptées : `normalizeDisplay`
      (objet vide → défauts, niveau 250 → 100, `tint: 'pink'` → `'green'`), migration
      (`flicker = 'on'` sans nouvelle clé → `flicker: true` et anciennes clés supprimées),
      `SettingsPanel` (8 toggles dans l'ordre indiqué, 3 curseurs, curseur Halo `disabled` quand
      Halo est off, clic Ambre → `display().tint === 'amber'`, clic Réinitialiser → égal à
      `DEFAULT_DISPLAY`), `App` (classes par défaut, `data-tint`, `style` contient
      `--crt-glow: 0.5`).
- [ ] Serveurs lancés via les configurations `backend` et `frontend` de `.claude/launch.json`
      (jamais Bash), localStorage vidé, onglet Paramètres, dans la console :
  - `[...document.querySelector('app-root').classList].sort()` contient `crt-glow`,
    `crt-grain`, `crt-grid`, `crt-scanlines`, `crt-vignette` et **pas** `crt-flicker`,
    `crt-noise`, `crt-roll` ; `getComputedStyle(appRoot).filter` → `"none"`.
  - `getComputedStyle(appRoot).getPropertyValue('--crt-glow').trim()` → `"0.5"`.
  - Halo à 100 : `getComputedStyle(document.querySelector('.brand')).textShadow` contient
    `11.2px` (0.7rem à 16 px de base ; vérifier le rem réel du projet).
  - Ambre : `getComputedStyle(appRoot).filter` contient `hue-rotate(-105deg)` ; les icônes des
    cartes sont ambre aussi (capture).
  - Réinitialiser : `JSON.parse(localStorage.getItem('isiscapitalist.display'))` égal aux
    défauts (`tint: 'green'`, `glowLevel: 50`, `roll: false`…).
  - Rechargement : les réglages sont conservés ; avec `localStorage.setItem('isiscapitalist.flicker','on')`
    et la nouvelle clé supprimée, au rechargement `flicker` est actif et
    `localStorage.getItem('isiscapitalist.flicker')` → `null`.
- [ ] Onglet Produits, tous les effets actifs, curseurs à 100 : le texte 16 px des barres
      (« 1 / 25 », gain) reste lisible ; `scrollWidth === clientWidth` sur `app-root` (les
      overlays ne créent aucun défilement).
- [ ] Deux captures d'écran de l'onglet Produits : défauts (vert) et Ambre + curseurs à 100 +
      bande de balayage.
- [ ] `docs/ROADMAP.md` (9.19 cochée, 9.20 = placeholder), `docs/DECISIONS.md` (D34),
      `frontend/CLAUDE.md`, `CLAUDE.md` mis à jour.

### Rapport attendu

En fin de tâche : fichiers créés / modifiés, commandes lancées avec leurs résultats réels (build,
tests, valeurs console, captures), les valeurs de `filter` réellement retenues pour les teintes
si elles diffèrent de celles proposées, et ce qui reste incertain (par exemple un effet baissé
au point de contrôle). Ne pas committer.

<!-- Fin du texte à copier -->

---

## Comparaison aux standards (étape 2)

Sources : [cool-retro-term (DeepWiki)](https://deepwiki.com/Swordfish90/cool-retro-term) et
[son guide thèmes / effets](https://deepwiki.com/Swordfish90/cool-retro-term/4.3-creating-custom-themes-and-effects)
(bloom, burn-in, curvature, jitter, static noise, ambient light, flicker, rasterization, chaque
effet avec un curseur ; retours d'utilisateurs : jitter / flicker / bande souvent coupés),
[cool-retro-term-webgl](https://github.com/remojansen/cool-retro-term-webgl) (même lot en WebGL),
[Angular Material slider](https://material.angular.dev/components/slider/overview) (`discrete`,
`displayWith`, `aria-label` sur l'`input matSliderThumb`) ; jeux idle de mémoire (aucun n'a de
réglages CRT : AdCap / Cookie Clicker ont seulement des toggles « particules / effets »).

| Point | Standard observé | Projet | Action |
|---|---|---|---|
| Lot d'effets | cool-retro-term : bloom, curvature, static noise, flicker, rasterization (scanlines / grille), burn-in, jitter, ambient light | vignette + courbure CSS, grille, grain, bande, bruit animé, teinte, scanlines, halo, scintillement ; **pas** de burn-in / jitter / déformation réelle (coût GPU, texte flou, hors CSS) | reprendre le lot « lisible », écarter le reste (Hors périmètre) |
| Réglage par effet | curseurs 0-1 pour chaque effet | curseurs pour les 3 effets dont l'intensité se voit (scanlines, halo, vignette), toggles pour les autres | diverge (moins de curseurs : panneau court, mat-slider par effet fixe = bruit d'UI) |
| Défauts | cool-retro-term : tout actif, valeurs moyennes ; utilisateurs coupent jitter / flicker / bande | statique actif à 50 %, animé inactif | reprendre les retours utilisateurs → décision D34 |
| Teinte | profils de couleur du terminal (ambre, vert, blanc) par palette | `filter: hue-rotate` / `saturate` sur `app-root`, icônes comprises, vert = pas de filtre | diverge (pas de second thème Material) → D34 |
| Persistance | QSettings : un objet | localStorage : convention « une clé par préférence » (D22) → **une clé JSON** `isiscapitalist.display` + migration | décision à noter (D34) |
| Accessibilité | Angular Material : `aria-label` sur l'`input matSliderThumb`, `discrete` + `displayWith` | idem, `prefers-reduced-motion` coupe les 3 animations | reprendre |
| Où mettre la logique | Angular : état dans un service, composant présentationnel avec `model()` | `display` signal dans `GameService`, `model<DisplaySettings>` dans `SettingsPanel`, fonctions pures dans `display-settings.ts` | identique (D22) |

## Notation (grille Anthropic) — 19/20

| # | Critère | Note | Remarque |
|---|---|---|---|
| 1 | Contexte et objectif | 2 | Objectif en 7 points numérotés, défauts explicités, référence cool-retro-term, étape 9.19. |
| 2 | Instructions séquencées | 2 | 7 étapes dans l'ordre des dépendances (modèle → service → panneau → App → CSS → vérif → doc), plan demandé avant de coder. |
| 3 | Exemples concrets | 2 | Modèle TS complet, host bindings complets, tableau des couches avec formules, exemple « premier lancement » avec attributs attendus et clé JSON. |
| 4 | Structure lisible | 2 | Sections du gabarit + sous-sections Modèle / Panneau / Application / Effets ; tableau pour les effets. |
| 5 | Rôle et périmètre | 2 | Frontend seul, fichiers à ne pas toucher nommés, Hors périmètre liste burn-in / jitter / déformation / palettes / backend. |
| 6 | Critères mesurables | 2 | Commandes console avec valeurs attendues (classes, `filter`, `--crt-glow`, JSON après reset, migration), specs nommées, captures. |
| 7 | Pourquoi des contraintes | 2 | Clé JSON (reset atomique), fichier pur (testabilité), `styles.css` (budget), pas de `mat-select` (overlay hors filtre), vert sans filtre (coût par tick), 50 % = actuel. |
| 8 | Raisonnement guidé | 2 | Plan avant de coder, étape 5 commence par une couche + les variables vérifiées dans le navigateur avant les six autres, point de contrôle après vérification. |
| 9 | Format de sortie | 2 | Fichiers à créer / modifier nommés, D34 / 9.19 / `CLAUDE.md` détaillés, rapport attendu avec les valeurs de filtre retenues. |
| 10 | Concision | 1 | Long (12 réglages, 7 couches, 3 sections de panneau) ; quelques rappels D22 se répètent entre À lire et Contraintes, prix d'un prompt autonome. |

Historique : v1 16/20 → v2 18/20 → v3 19/20.
Améliorations retenues : (v1 → v2) tableau des couches avec les formules et la règle
« 50 % = rendu actuel » (critères 3 et 6 : sans elles, deux implémentations auraient donné des
intensités différentes) ; cas limite « `filter` = bloc conteneur des `fixed` » et « pas de
`mat-select` » (critère 7) ; ordre DOM des toggles fixé pour les specs (critère 6). (v2 → v3)
ligne `crt-roll` réécrite en une seule mécanique (`background-position-y`, critère 10) ; étape 5
scindée : une couche vérifiée dans le navigateur avant les autres (critère 8). Le critère 10
reste à 1 : retirer du texte ferait diverger les implémentations.
